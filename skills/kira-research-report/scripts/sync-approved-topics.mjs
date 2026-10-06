#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/sync-approved-topics.mjs — Phase S, Sprint S3
//
// Pulls owner-approved topics from Supabase (`topics.status = 'approved'`)
// into data/report_queue.csv as `pending` rows, then marks them `queued`.
//
// Called from batch_runner.md Step 0.6. Idempotent: a topic whose slug is
// already in the CSV is only marked queued. The CSV is written BEFORE the
// database is updated, so a crash can duplicate nothing (next run sees the
// slug in the CSV) and loses nothing.
//
// Needs SUPABASE_URL + SUPABASE_SERVICE_KEY. Without them (or when Supabase
// is unreachable) it prints `added=0` and exits 0: the queue just keeps
// working on what it already has.
//
// Reader demand (migration 027): approved topics are appended most-requested
// first, and `pending` rows whose topic readers asked for are moved to the front
// of the pending block (stable, so equal demand keeps its order). The runner
// picks the first pending row top-down, so requested topics are produced first.
//
// Prints `added=<N>` on stdout (rows appended + rows moved). Caller commits the CSV when N > 0.
// ---------------------------------------------------------------

import fs from 'fs';
import path from 'path';

const QUEUE_PATH = path.resolve('data/report_queue.csv');
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const LANGS = process.env.QUEUE_TARGET_LANGUAGES || 'en,ja,ko,zh';  // Phase S4: ZH is the 4th locale

function done(n, note) {
  if (note) console.error(note);
  console.log(`added=${n}`);
  process.exit(0);
}

async function sb(p, method = 'GET', body) {
  const r = await fetch(`${URL}/rest/v1/${p}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

if (!URL || !KEY) done(0, 'sync-approved-topics: no Supabase env, skipping');

let approved, industries;
const demand = new Map();   // topic slug → number of reader requests
try {
  approved = await sb('topics?status=eq.approved&select=id,slug,country_code,industry_id,year,title&order=decided_at.asc&limit=200');
  industries = await sb('tax_industries?select=id,name&limit=1000');
} catch (e) {
  done(0, `sync-approved-topics: ${e.message}`);
}
try {
  const reqs = await sb('topic_requests?select=topic:topics(slug)&topic_id=not.is.null&limit=10000');
  for (const r of reqs) if (r.topic && r.topic.slug) demand.set(r.topic.slug, (demand.get(r.topic.slug) || 0) + 1);
} catch (e) {
  console.error(`sync-approved-topics: demand unavailable (${e.message}), keeping queue order`);
}
approved.sort((a, b) => (demand.get(b.slug) || 0) - (demand.get(a.slug) || 0));   // stable: ties keep decided_at order

const indName = new Map(industries.map(i => [i.id, i.name]));
const text = fs.readFileSync(QUEUE_PATH, 'utf8');
const header = text.split('\n', 1)[0].replace(/\r$/, '').split(',');
const need = ['id', 'topic', 'country', 'industry', 'year', 'target_languages', 'status', 'output_paths', 'date_added', 'date_completed', 'error_log', 'claimed_at'];
if (need.some(c => !header.includes(c))) done(0, 'sync-approved-topics: unexpected CSV header, skipping');

const existing = new Set(text.split('\n').slice(1).map(l => l.split(',', 1)[0].replace(/^"|"$/g, '')));
const today = new Date().toISOString().slice(0, 10);
const lines = [];
const toMark = [];
for (const t of approved) {
  toMark.push(t.id);
  if (existing.has(t.slug)) continue;
  const row = {
    id: t.slug, topic: t.title, country: t.country_code, industry: indName.get(t.industry_id) || '',
    year: t.year, target_languages: LANGS, status: 'pending', output_paths: '',
    date_added: today, date_completed: '', error_log: '', claimed_at: ''
  };
  lines.push(header.map(c => csvCell(row[c])).join(','));
}

let out = text;
if (lines.length) {
  const sep = text.endsWith('\n') ? '' : '\n';
  out = text + sep + lines.join('\n') + '\n';
}

// Move requested pending rows to the front of the pending block.
const csvFirstCell = (l) => l.split(',', 1)[0].replace(/^"|"$/g, '');
const statusOf = (l) => {   // minimal CSV split: quoted cells may contain commas
  const cells = []; let cur = '', q = false;
  for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { cells.push(cur); cur = ''; } else cur += ch; }
  cells.push(cur);
  return cells[header.indexOf('status')];
};
let moved = 0;
if (demand.size) {
  const all = out.split('\n');
  const trail = all[all.length - 1] === '' ? all.pop() : null;
  const body = all.slice(1);
  const pendingIdx = body.map((l, i) => (l && statusOf(l) === 'pending' ? i : -1)).filter(i => i >= 0);
  const pending = pendingIdx.map(i => body[i]);
  const sorted = pending.map((l, i) => ({ l, i })).sort((a, b) => (demand.get(csvFirstCell(b.l)) || 0) - (demand.get(csvFirstCell(a.l)) || 0) || a.i - b.i).map(x => x.l);
  moved = sorted.filter((l, i) => l !== pending[i]).length;
  if (moved) {
    pendingIdx.forEach((bi, k) => { body[bi] = sorted[k]; });
    out = [all[0], ...body].join('\n') + (trail !== null ? '\n' : '');
  }
}
if (out !== text) fs.writeFileSync(QUEUE_PATH, out);

try {
  const now = new Date().toISOString();
  for (const id of toMark) {
    await sb(`topics?id=eq.${id}&status=eq.approved`, 'PATCH', { status: 'queued', queued_at: now });
  }
} catch (e) {
  console.error(`sync-approved-topics: rows written, status update failed (${e.message}); next run is idempotent`);
}
done(lines.length + moved);
