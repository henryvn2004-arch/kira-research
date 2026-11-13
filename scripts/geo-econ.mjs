#!/usr/bin/env node
// geo-econ.mjs — Kira Data → GEO answers (kira_answers, source_kind 'econ'), by code, no model.
//   node scripts/geo-econ.mjs                 dry run: prints counts per country and sample rows, writes nothing
//   node scripts/geo-econ.mjs --apply         upsert by content_hash; rows no longer produced are set to 'retired'
//   node scripts/geo-econ.mjs --out rows.json also write the rows to a file
//   node scripts/geo-econ.mjs --sample 10     number of sample rows to print (default 10)
// Needs SUPABASE_URL and SUPABASE_SERVICE_KEY. The weekly run is api/cron-geo-econ.js (same code: api/_lib/geo-econ.js).
import fs from 'node:fs';
import { buildRows, syncRows } from '../api/_lib/geo-econ.js';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const url = process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('needs SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(2); }
// A real service key goes in both headers; a placeholder (a proxy adds the real key to apikey) must not go in Authorization.
const H = { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json' };

const read = async (path) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`${path.slice(0, 80)}: ${r.status} ${await r.text()}`);
  return r.json();
};
const write = async (path, method, body, headers = {}) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { method, headers: { ...H, ...headers }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`write ${path.slice(0, 80)}: ${r.status} ${await r.text()}`);
  return null;
};

const { rows, stats } = await buildRows(read);
if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(rows, null, 2));

const per = {};
for (const r of rows) {
  const c = (per[r.country_code] ||= { segment: 0, country: 0 });
  c[r.segment_key ? 'segment' : 'country']++;
}
console.log(`${rows.length} rows · segments without a data profile: ${stats.skipped_no_profile} · with a profile but no data: ${stats.skipped_no_data}`);
console.log('country  segment-rows  country-rows');
for (const [c, v] of Object.entries(per).sort()) console.log(`${c.padEnd(8)} ${String(v.segment).padStart(12)} ${String(v.country).padStart(13)}`);
const n = Number(opt('--sample') || 10);
const step = Math.max(1, Math.floor(rows.length / n));
for (let i = 0; i < rows.length && i < n * step; i += step) {
  const r = rows[i];
  console.log(`\n[${r.country_code} · ${r.segment_key || 'country'} · ${r.intent}]\nQ: ${r.question}\nA: ${r.answer_short}\nJA: ${r.i18n.ja.answer_short}`);
}
if (args.includes('--apply')) console.log('\n' + JSON.stringify(await syncRows(rows, { read, write })));
else console.log('\n(dry run: nothing written; add --apply to write)');
