#!/usr/bin/env node
// Fill the join key report / transcript -> market map (migration 077): living_reports.market_map_country + market_map_segment and the same on
// expert_transcripts. Code match only (api/_lib/market-map-match.js); anything ambiguous stays NULL.
//   node scripts/match-market-maps.mjs --dry-run [--out file.json]      read, match, write a JSON report; touches nothing (default)
//   node scripts/match-market-maps.mjs --write [--only reports|transcripts] [--slug <slug>] [--force]
//        writes the key; skips rows that already have one unless --force. Needs migration 077 applied.
// Publish step: `--write --slug <report-slug>` (batch_runner Step 5.3b-4c). Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (or KIRA_ prefixed).
import { writeFileSync } from 'node:fs';
import { matchMarketMap } from '../api/_lib/market-map-match.js';

const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : null; };
const has = (k) => process.argv.includes(k);
const WRITE = has('--write'), FORCE = has('--force'), ONLY = arg('--only'), SLUG = arg('--slug'), OUT = arg('--out');
const URL_ = process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing'); process.exit(3); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const get = async (p) => { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: H }); if (!r.ok) throw new Error(`${p}: ${r.status} ${await r.text()}`); return r.json(); };
async function all(p) { const out = []; for (let o = 0; ; o += 1000) { const r = await get(`${p}&limit=1000&offset=${o}`); out.push(...r); if (r.length < 1000) return out; } }

const maps = await all('market_maps?status=eq.published&select=country,segment_key,title,l2_family&order=country,segment_key');
const slugQ = SLUG ? `&slug=eq.${encodeURIComponent(SLUG)}` : '';
const keyed = FORCE ? '' : '&market_map_segment=is.null';
const result = { reports: [], transcripts: [] };

if (ONLY !== 'transcripts') {
  const rows = await all(`living_reports?status=eq.published&select=slug,country,industry,segment,keywords${keyed}${slugQ}&order=slug`);
  for (const r of rows) {
    // only the first two keywords are the report's own subject ("<Country> <segment>", "<segment>"); the rest are incidental terms and languages
    const kw = Array.isArray(r.keywords) ? r.keywords.slice(0, 2) : [];
    result.reports.push({ slug: r.slug, country: r.country, segment: r.segment, match: matchMarketMap({ country: r.country, segment: r.segment, keywords: kw, industry: r.industry }, maps) });
  }
}
if (ONLY !== 'reports') {
  const rows = await all(`expert_transcripts?select=slug,market,industry${keyed}${slugQ}&order=slug`);
  for (const r of rows) {
    // the industry text of a transcript is specific ("Edible oils"), so it counts as the segment; the slug words help as a hint
    result.transcripts.push({ slug: r.slug, country: r.market, industry: r.industry, match: matchMarketMap({ country: r.market, segment: r.industry, keywords: [], industry: '' }, maps) });
  }
}
const sum = (a) => ({ total: a.length, matched: a.filter((x) => x.match).length, unmatched: a.filter((x) => !x.match).length });
const summary = { reports: sum(result.reports), transcripts: sum(result.transcripts), mode: WRITE ? 'write' : 'dry-run' };

if (WRITE) {
  let ok = 0, bad = 0;
  for (const [table, list] of [['living_reports', result.reports], ['expert_transcripts', result.transcripts]]) {
    for (const x of list.filter((y) => y.match)) {
      const r = await fetch(`${URL_}/rest/v1/${table}?slug=eq.${encodeURIComponent(x.slug)}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ market_map_country: x.match.country, market_map_segment: x.match.segment_key }) });
      if (r.ok) ok++; else { bad++; console.error('FAIL', table, x.slug, r.status); }
    }
  }
  summary.written = ok; summary.failed = bad;
}
if (OUT) writeFileSync(OUT, JSON.stringify({ summary, ...result }, null, 1));
console.log(JSON.stringify(summary));
