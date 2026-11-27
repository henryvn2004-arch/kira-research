#!/usr/bin/env node
// Dry run of migration 079: prints old -> new price for every published report and transcript, and the price range of
// the company lists. Writes nothing. Needs SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment.
//
//   node scripts/reprice-dry-run.mjs            # table on stdout
//   node scripts/reprice-dry-run.mjs --csv      # CSV
//
// Uses the same rules as api/_lib/pricing.js (and as the SQL functions in supabase/migrations/079_effort_prices.sql).
import { reportPrice, transcriptPrice, pagesFromReadMinutes, listPrice } from '../api/_lib/pricing.js';

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required'); process.exit(2); }
const csv = process.argv.includes('--csv');
async function get(path) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
    if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
    const rows = await r.json(); out.push(...rows); if (rows.length < 1000) return out;
  }
}
const line = (...c) => console.log(csv ? c.join(',') : c.map((x, i) => String(x).padEnd([34, 6, 8, 6, 10, 8][i] || 8)).join(' '));

const reports = await get('living_reports?status=eq.published&select=id,slug,pages,price,rarity,published_at&order=published_at.desc');
const ex = new Map((await get('report_exhibits?select=report_id,exhibit_count')).map((r) => [r.report_id, r.exhibit_count]));
console.log('# reports'); line('slug', 'pages', 'charts', 'old', 'new', 'change');
let changed = 0;
for (const r of reports) {
  if (!(r.pages > 0)) { line(r.slug, '(none)', '', r.price, 'kept', 0); continue; }   // no page count: price kept, as in the migration
  const e = ex.get(r.id) > 0 ? ex.get(r.id) : null;
  const next = reportPrice({ pages: r.pages, exhibits: e, rarity: r.rarity ?? 1, publishedAt: r.published_at });
  if (next !== Number(r.price)) changed++;
  line(r.slug, r.pages, e ?? '(est)', r.price, next, next - r.price);
}
console.log(`# ${reports.length} reports, ${changed} change`);

const trs = await get('expert_transcripts?status=eq.published&select=id,slug,rarity');
const labels = new Map((await get('expert_transcript_translations?locale=eq.en&select=transcript_id,length_label')).map((r) => [r.transcript_id, r.length_label]));
console.log('# transcripts'); line('slug', 'minutes', '', 'old', 'new');
for (const t of trs) {
  const m = Number((String(labels.get(t.id) || '').match(/\d+/) || [0])[0]);
  line(t.slug, m, '', 29, transcriptPrice({ printedPages: pagesFromReadMinutes(m), rarity: t.rarity ?? 1 }));
}
console.log(`# ${trs.length} transcripts`);

const maps = await get('market_maps?status=eq.published&select=n_companies');
const lp = maps.map((m) => listPrice(m.n_companies));
console.log(`# company lists: ${maps.length} maps, price ${Math.min(...lp)}-${Math.max(...lp)} (old rule: 36 up to 500 companies, 57 above)`);
