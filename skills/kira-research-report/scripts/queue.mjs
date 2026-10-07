#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/queue.mjs — report production queue CLI (Postgres, replaces data/report_queue.csv)
//
// The batch runner (prompts/batch_runner.md) and the admin Pipeline page share ONE queue:
// Supabase tables `report_queue` + `report_queue_events` (migration 031).
//
//   queue.mjs recover                        revert stale *_in_progress claims          → recovered=<N>
//   queue.mjs sync-topics                    approved topics → pending rows, demand → priority → added=<N>
//   queue.mjs next [--model <m>]             pick the most-advanced row and CLAIM it    → one JSON line, or "none"
//   queue.mjs advance <id> <status> [--paths "a|b"] [--model <m>] [--cost <usd>]   stage succeeded
//   queue.mjs fail <id> "<message>" [--paths "a|b"] [--model <m>]                  stage failed → status=error
//   queue.mjs import <csv>                   one-off: load the old CSV (upsert, idempotent)
//
// Claiming is compare-and-swap (PATCH ... WHERE status = <picked status>), so two overlapping
// fires can never claim the same row. Needs SUPABASE_URL + SUPABASE_SERVICE_KEY.
// ---------------------------------------------------------------
import fs from 'fs';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const STALE_MIN = 150;                       // above the 90-min EN cap
const LANGS = process.env.QUEUE_TARGET_LANGUAGES || 'en,ja,ko,zh';

// picked status → [claim status, stage]; order = pick priority (most advanced first, backfill last)
const ROUTE = [
  ['ko_done',     'zh_in_progress', 'zh'],
  ['ja_done',     'ko_in_progress', 'ko'],
  ['en_done',     'ja_in_progress', 'ja'],
  ['pending',     'en_in_progress', 'en'],
  ['zh_backfill', 'zh_in_progress', 'zh_backfill'],
];
const PRIOR = { en_in_progress: 'pending', ja_in_progress: 'en_done', ko_in_progress: 'ja_done', zh_in_progress: 'ko_done' };
const STAGE_OF = { en_in_progress: 'en', ja_in_progress: 'ja', ko_in_progress: 'ko', zh_in_progress: 'zh' };

if (!URL || !KEY) { console.error('queue: SUPABASE_URL / SUPABASE_SERVICE_KEY missing'); process.exit(2); }

async function sb(path, method = 'GET', body, prefer) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const enc = encodeURIComponent;
const nowIso = () => new Date().toISOString();
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const event = (e) => sb('report_queue_events', 'POST', e).catch(err => console.error(`queue: event log failed (${err.message})`));
const secondsSince = (iso) => (iso ? Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000)) : null);

async function recover() {
  const cutoff = new Date(Date.now() - STALE_MIN * 60000).toISOString();
  const rows = await sb(`report_queue?status=in.(en_in_progress,ja_in_progress,ko_in_progress,zh_in_progress)&or=(claimed_at.is.null,claimed_at.lt.${cutoff})&select=*`);
  let n = 0;
  for (const r of rows) {
    const strike2 = /auto-recovered/.test(r.error_log || '');
    const backfill = r.status === 'zh_in_progress' && (/\bzh-backfill\b/.test(r.error_log || '') || (r.output_paths || '').trim() !== '');
    const to = strike2 ? 'error' : (backfill ? 'zh_backfill' : PRIOR[r.status]);
    const note = strike2
      ? `second-strike auto-recover skipped ${nowIso()}: ${r.status} re-stale; manual review`
      : `auto-recovered ${nowIso()}: ${r.status} stale > ${STALE_MIN}min`;
    const upd = await sb(`report_queue?id=eq.${enc(r.id)}&status=eq.${r.status}`, 'PATCH',
      { status: to, claimed_at: null, error_log: (r.error_log ? r.error_log + ' · ' : '') + note, updated_at: nowIso() }, 'return=representation');
    if (upd.length) { n++; await event({ queue_id: r.id, stage: 'recover', outcome: 'recovered', from_status: r.status, to_status: to, note }); }
  }
  console.log(`recovered=${n}`);
}

async function syncTopics() {
  const approved = await sb('topics?status=eq.approved&select=id,slug,country_code,industry_id,year,title&order=decided_at.asc&limit=200');
  const industries = await sb('tax_industries?select=id,name&limit=1000');
  const demand = new Map();
  try {
    const reqs = await sb('topic_requests?select=topic:topics(slug)&topic_id=not.is.null&limit=10000');
    for (const r of reqs) if (r.topic && r.topic.slug) demand.set(r.topic.slug, (demand.get(r.topic.slug) || 0) + 3);
    const searched = await sb('topics?select=slug,search_count&search_count=gt.0&limit=10000');
    for (const t of searched) demand.set(t.slug, (demand.get(t.slug) || 0) + t.search_count);
  } catch (e) { console.error(`queue: demand unavailable (${e.message})`); }
  const indName = new Map(industries.map(i => [i.id, i.name]));
  const existing = new Set((await sb('report_queue?select=id&limit=100000')).map(r => r.id));
  const fresh = approved.filter(t => !existing.has(t.slug)).map(t => ({
    id: t.slug, topic: t.title, country: t.country_code, industry: indName.get(t.industry_id) || '', year: t.year,
    target_languages: LANGS, status: 'pending', priority: demand.get(t.slug) || 0
  }));
  if (fresh.length) await sb('report_queue', 'POST', fresh, 'resolution=ignore-duplicates');
  // requested topics already waiting get their demand as priority (admin-set higher values are kept)
  let bumped = 0;
  const pending = await sb('report_queue?status=eq.pending&select=id,priority&limit=100000');
  for (const r of pending) {
    const d = demand.get(r.id) || 0;
    if (d > r.priority) { await sb(`report_queue?id=eq.${enc(r.id)}`, 'PATCH', { priority: d, updated_at: nowIso() }); bumped++; }
  }
  const now = nowIso();
  for (const t of approved) await sb(`topics?id=eq.${t.id}&status=eq.approved`, 'PATCH', { status: 'queued', queued_at: now });
  console.log(`added=${fresh.length + bumped}`);
}

async function next() {
  const model = arg('--model') || null;
  for (const [picked, claim, stage] of ROUTE) {
    const rows = await sb(`report_queue?status=eq.${picked}&order=priority.desc,position.asc&limit=1&select=*`);
    if (!rows.length) continue;
    const r = rows[0];
    let log = r.error_log || '';
    if (picked === 'zh_backfill' && !/\bzh-backfill\b/.test(log)) log = (log ? log + ' · ' : '') + 'zh-backfill';
    const got = await sb(`report_queue?id=eq.${enc(r.id)}&status=eq.${picked}`, 'PATCH',
      { status: claim, claimed_at: nowIso(), error_log: log, attempts: r.attempts + 1, updated_at: nowIso() }, 'return=representation');
    if (!got.length) continue;               // lost the race: try the next candidate
    await event({ queue_id: r.id, stage, outcome: 'claimed', from_status: picked, to_status: claim, model });
    console.log(JSON.stringify({ id: r.id, topic: r.topic, country: r.country, industry: r.industry, year: r.year,
      target_languages: r.target_languages, stage, picked_status: picked, claim_status: claim,
      output_paths: r.output_paths, error_log: log, has_zh: r.target_languages.split(',').map(s => s.trim()).includes('zh') }));
    return;
  }
  console.log('none');
}

async function finish(id, status, note, outcome) {
  const [r] = await sb(`report_queue?id=eq.${enc(id)}&select=*`);
  if (!r) { console.error(`queue: unknown id ${id}`); process.exit(2); }
  const paths = arg('--paths');
  const patch = { status, claimed_at: null, updated_at: nowIso() };
  if (paths !== undefined) patch.output_paths = paths;
  if (status === 'done') { patch.date_completed = nowIso().slice(0, 10); patch.error_log = ''; }
  if (status === 'error') { patch.date_completed = nowIso().slice(0, 10); patch.error_log = (/\bzh-backfill\b/.test(r.error_log || '') ? 'zh-backfill · ' : '') + note; }
  await sb(`report_queue?id=eq.${enc(id)}`, 'PATCH', patch);
  const cost = arg('--cost');
  await event({ queue_id: id, stage: STAGE_OF[r.status] || (/zh-backfill/.test(r.error_log || '') ? 'zh_backfill' : 'admin'), outcome,
    from_status: r.status, to_status: status, model: arg('--model') || null,
    duration_s: secondsSince(r.claimed_at), cost_usd: cost ? Number(cost) : null, note: outcome === 'error' ? note : null });
  console.log(`ok id=${id} status=${status}`);
}

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 1);
}

async function importCsv(file) {
  const [h, ...body] = parseCsv(fs.readFileSync(file, 'utf8'));
  const out = body.map(f => {
    const o = Object.fromEntries(h.map((k, i) => [k, f[i] || '']));
    return {
      id: o.id, topic: o.topic, country: o.country || null, industry: o.industry || null, year: o.year ? Number(o.year) : null,
      target_languages: o.target_languages || 'en,ja,ko', status: o.status || 'pending', output_paths: o.output_paths,
      date_added: o.date_added || nowIso().slice(0, 10), date_completed: o.date_completed || null,
      error_log: o.error_log, claimed_at: o.claimed_at || null
    };
  });
  for (let i = 0; i < out.length; i += 100) await sb('report_queue?on_conflict=id', 'POST', out.slice(i, i + 100), 'resolution=merge-duplicates');
  console.log(`imported=${out.length}`);
}

const [cmd, a1, a2] = process.argv.slice(2);
try {
  if (cmd === 'recover') await recover();
  else if (cmd === 'sync-topics') await syncTopics();
  else if (cmd === 'next') await next();
  else if (cmd === 'advance' && a1 && a2) await finish(a1, a2, '', 'ok');
  else if (cmd === 'fail' && a1 && a2) await finish(a1, 'error', a2, 'error');
  else if (cmd === 'import' && a1) await importCsv(a1);
  else { console.error('usage: queue.mjs recover | sync-topics | next | advance <id> <status> | fail <id> <msg> | import <csv>'); process.exit(2); }
} catch (e) {
  console.error(`queue: ${e.message}`);
  process.exit(1);
}
