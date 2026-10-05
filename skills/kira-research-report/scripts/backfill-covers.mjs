#!/usr/bin/env node
// Give every published report and insight a cover image (one-off backfill;
// new reports get theirs in the batch pipeline, new insights in insight_runner).
//
//   node skills/kira-research-report/scripts/backfill-covers.mjs [--kind report|insight] [--limit N] [--jobs 4] [--dry-run]
//
// Reports without cover_url: gen-cover.mjs (style rotates by slug) then
// upload-cover.mjs, which also hands the cover to insights linked to the report.
// Insights still without cover_url afterwards (no linked report with a cover)
// get their own illustration from their country, industry and title.
// Prints one JSON line per item and a summary with the image token usage.
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY.
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const arg = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const only = arg('kind'), limit = parseInt(arg('limit', '1000'), 10), jobs = parseInt(arg('jobs', '4'), 10);
const dry = process.argv.includes('--dry-run');
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing'); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kira-covers-'));

const sb = async p => {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
};
const run = args => new Promise(res => execFile('node', args, { maxBuffer: 1 << 20 }, (e, out) => {
  const line = String(out || '').trim().split('\n').pop();
  try { res(JSON.parse(line)); } catch { res({ ok: false, error: (e && e.message) || 'no output' }); }
}));

const usage = { input: 0, output: 0, images: 0 };
async function one(kind, slug, country, industry, angle) {
  const out = path.join(tmp, `${kind}-${slug}.jpg`);
  const g = await run([path.join(here, 'gen-cover.mjs'), '--id', slug, '--country', country || 'Southeast Asia',
    '--industry', industry || 'Market', '--angle', (angle || '').slice(0, 160), '--out', out,
    '--quality', kind === 'report' ? 'high' : 'medium', ...(dry ? ['--dry-run'] : [])]);
  if (!g.ok || dry) return { kind, slug, style: g.style, ok: g.ok, dry, error: g.error };
  if (g.usage) { usage.input += g.usage.input_tokens || 0; usage.output += g.usage.output_tokens || 0; }
  usage.images++;
  const u = await run([path.join(here, 'upload-cover.mjs'), '--kind', kind, '--slug', slug, '--in', out]);
  fs.rmSync(out, { force: true });
  return { kind, slug, style: g.style, ok: u.ok, insights: u.insights, error: u.error };
}
async function pool(items, fn) {
  const results = []; let i = 0;
  await Promise.all(Array.from({ length: jobs }, async () => {
    while (i < items.length) { const it = items[i++]; const r = await fn(it); results.push(r); console.log(JSON.stringify(r)); }
  }));
  return results;
}

let done = [];
if (!only || only === 'report') {
  const reports = await sb('living_reports?status=eq.published&cover_url=is.null&select=id,slug,country,industry&order=published_at.desc&limit=1000');
  const titles = new Map((await sb('report_translations?locale=eq.en&select=report_id,title&limit=2000')).map(t => [t.report_id, t.title]));
  done = done.concat(await pool(reports.slice(0, limit), r => one('report', r.slug, r.country, r.industry, titles.get(r.id))));
}
if (!only || only === 'insight') {
  const ins = await sb('insights?status=eq.published&cover_url=is.null&select=id,slug,country,industry&order=published_at.desc&limit=1000');
  const titles = new Map((await sb('insight_translations?locale=eq.en&select=insight_id,title&limit=2000')).map(t => [t.insight_id, t.title]));
  done = done.concat(await pool(ins.slice(0, Math.max(0, limit - done.length)), r => one('insight', r.slug, r.country, r.industry, titles.get(r.id))));
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ summary: true, ok: done.filter(d => d.ok).length, failed: done.filter(d => !d.ok).map(d => d.slug), usage }));
