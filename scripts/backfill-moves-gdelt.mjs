#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/backfill-moves-gdelt.mjs
//
// Operator script (run from a shell, not from Vercel): backfills company_events from GDELT for a date range, in small windows,
// through the same query builder (api/_lib/moves/gdelt.js), rules (rules.js) and collect()/insert path as /api/cron-moves, so
// rows land as `draft` exactly like the cron's. A URL already stored is never inserted twice (on_conflict=url, ignore) and the
// same story from another outlet is added to `also`.
//
//   node scripts/backfill-moves-gdelt.mjs --since 2026-10-15 --until 2026-11-23 [--window 2] [--dry-run] [--state <file>]
//
// Dry run reads GDELT and classifies but writes nothing to Supabase (it still reads company_events to dedupe).
// Resumable: the state file (default ./.backfill-moves-state.json in the working directory, git-ignored, mode 0600) lists the windows that finished with every query
// answered; a window where some queries failed (429 ...) is re-read on the next run (inserts are idempotent).
// GDELT is paced by gdelt.js (one call per 6 s, back-off on 429). No proxy tricks: if https is unreachable from your network set
// GDELT_API=http://api.gdeltproject.org/api/v2/doc/doc (same public service).
// Env: KIRA_SUPABASE_URL / KIRA_SUPABASE_SERVICE_KEY (or SUPABASE_URL / SUPABASE_SERVICE_KEY). Never prints the key.
// ---------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { items } from '../api/_lib/moves/gdelt.js';
import { collect } from '../api/_lib/moves/index.js';

const URL_ = process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY;
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry-run');
const since = arg('--since'), until = arg('--until');
const win = Math.max(1, Number(arg('--window', 2)));
const stateFile = arg('--state', path.resolve('.backfill-moves-state.json'));
if (!since || !until || !/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until) || since > until) {
  console.error('usage: backfill-moves-gdelt.mjs --since YYYY-MM-DD --until YYYY-MM-DD [--window 2] [--dry-run] [--state file]'); process.exit(2);
}
if (!URL_ || !KEY) { console.error('backfill-moves: Supabase URL / service key missing in env'); process.exit(2); }

async function sb(p, method = 'GET', body, prefer = '') {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { method, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

const windows = [];
for (let s = since; s <= until; s = addDays(s, win)) { const e = addDays(s, win - 1); windows.push([s, e > until ? until : e]); }
let state = {};
try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (_e) { /* first run */ }

const report = [];
for (const [s, e] of windows) {
  const key = `${s}..${e}`;
  if (state[key] && state[key].done) { console.log(`${key} skip (done: ${state[key].added} added)`); continue; }
  const t0 = Date.now();
  let raw = [], failed = [], err = null;
  try { raw = await items({ since: s, until: e, budgetMs: 15 * 60000, log: (q, n) => console.log(`  ${q}… ${n}`) }); failed = raw.failed || []; }
  catch (x) { err = x.message; }
  let added = 0, repeats = 0, scanned = raw.length;
  if (!err) {
    // dedupe against what is stored for this window (+ 14 days before, as the cron does)
    const recent = await sb(`company_events?event_date=gte.${addDays(s, -14)}&event_date=lte.${addDays(e, 14)}&select=id,url,title,investor_country,host_country,type,also&limit=5000`);
    const out = await collect({ recent, preloaded: raw });
    added = out.events.length; repeats = out.dupes.length;
    if (!DRY) {
      for (let i = 0; i < out.events.length; i += 200) await sb('company_events?on_conflict=url', 'POST', out.events.slice(i, i + 200), 'resolution=ignore-duplicates,return=minimal');
      for (const d of out.dupes) await sb(`company_events?id=eq.${d.id}`, 'PATCH', { also: d.also }, 'return=minimal');
    } else if (out.events.length) for (const ev of out.events.slice(0, 5)) console.log(`  [dry] ${ev.event_date} ${ev.investor_country}->${ev.host_country} ${ev.type}: ${ev.title.slice(0, 100)}`);
  }
  const row = { window: key, scanned, added, repeats, failed_hosts: failed, error: err, seconds: Math.round((Date.now() - t0) / 1000), dry: DRY };
  report.push(row);
  console.log(JSON.stringify(row));
  if (!DRY) { state[key] = { done: !err && failed.length === 0, added: Number(added) || 0, scanned: Number(scanned) || 0 };   // only what we compute: no response text
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 1), { mode: 0o600 }); fs.chmodSync(stateFile, 0o600); }
}
console.log('TOTAL', JSON.stringify({ windows: report.length, scanned: report.reduce((a, r) => a + r.scanned, 0), added: report.reduce((a, r) => a + r.added, 0), incomplete: report.filter((r) => r.error || r.failed_hosts.length).map((r) => r.window), dry: DRY }));
