#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/fetch-bizdirect-fact.mjs — W3 (GEO, 2026-11-27)
//
//   node scripts/fetch-bizdirect-fact.mjs <queue-id> > <scratch>/bizdirect_fact.json
//
// Prints the one citable company-count fact for a topic: { country, segment, n_companies, built, source, sentence_en }
// from the published, indexable KIRA market map of the same country and segment (matched by api/_lib/market-map-match.js,
// code match only). Prints nothing and exits 0 when the topic, a single clear match, the number or the date is missing.
// The report writes this sentence in its Who's who chapter; it never estimates counts of its own.
// ---------------------------------------------------------------
import { matchMarketMap } from '../../../api/_lib/market-map-match.js';
import { citeSentence } from '../../../api/_lib/bizdirect-cite.js';
import { isIndexable } from '../../../api/_lib/market-map/gate.js';

const [, , id] = process.argv;
const URL_ = process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY;
if (!id || !URL_ || !KEY || !/^[a-z0-9][a-z0-9-]{2,120}$/.test(id)) process.exit(0);
const sb = async (p) => { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }); if (!r.ok) throw new Error(`Supabase ${r.status}`); return r.json(); };

try {
  const [t] = await sb(`topics?slug=eq.${id}&select=country_code,industry_id,title,signals&limit=1`);
  if (!t) process.exit(0);
  const [c] = await sb(`tax_countries?code=eq.${encodeURIComponent(t.country_code)}&select=name&limit=1`);
  const [ind] = t.industry_id ? await sb(`tax_industries?id=eq.${t.industry_id}&select=name&limit=1`) : [];
  if (!c) process.exit(0);
  const sig = t.signals && typeof t.signals === 'object' ? t.signals : {};
  const maps = await sb('market_maps?status=eq.published&select=country,segment_key,title,l2_family,indexable&limit=5000');
  const m = matchMarketMap({ country: c.name, segment: sig.segment || '', keywords: [], industry: ind ? ind.name : '', title: t.title }, maps);
  if (!m) process.exit(0);
  const [row] = await sb(`market_maps?country=eq.${encodeURIComponent(m.country)}&segment_key=eq.${encodeURIComponent(m.segment_key)}&status=eq.published&select=n_companies,built_at,indexable,seg:stats->>segment,cn:stats->>country,stages:stats->stages&limit=1`);
  if (!row || row.indexable !== true || !isIndexable({ companies: row.n_companies, stages: row.stages })) process.exit(0);
  const s = citeSentence({ n: row.n_companies, built: row.built_at, segment: row.seg, country: row.cn }, 'en');
  if (!s) process.exit(0);
  console.log(JSON.stringify({ country: row.cn, segment: row.seg, n_companies: Number(row.n_companies), built: row.built_at.slice(0, 10), source: 'BizDirect Asia company database', sentence_en: s.text }, null, 2));
} catch (e) {
  console.error(`fetch-bizdirect-fact: ${e.message}`);
}
