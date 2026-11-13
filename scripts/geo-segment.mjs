#!/usr/bin/env node
// geo-segment.mjs — resolve the KIRA level-2 segment (tax_industries.slug) for a report or a transcript,
// so GEO answers land on a hub keyed by (country, segment_key).
//
//   node scripts/geo-segment.mjs --report <slug>
//   node scripts/geo-segment.mjs --transcript <slug>
//
// Prints one JSON line: { segment_key, country_code, method, candidates }
//   method "topic"          the report's topic (topics.report_id) names a level-2 segment
//   method "source_report"  the transcript's source_report_code is a KIRA report with a topic
//   method "candidates"     no direct link: segment_key is null and `candidates` lists up to 8 of the country's active
//                           level-2 segments ranked by shared words. The extraction step picks one of them only when the
//                           document is clearly about it (confidence >= 0.7), otherwise leaves segment_key null.
// Needs SUPABASE_URL and SUPABASE_SERVICE_KEY. Read-only.

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const url = process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('needs SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(2); }

const COUNTRY = { vietnam: 'VN', thailand: 'TH', singapore: 'SG', indonesia: 'ID', malaysia: 'MY', philippines: 'PH',
  japan: 'JP', 'south korea': 'KR', korea: 'KR', taiwan: 'TW', australia: 'AU', 'new zealand': 'NZ', cambodia: 'KH',
  laos: 'LA', myanmar: 'MM', brunei: 'BN' };
const STOP = new Set('and for of the to in a an with from by on vs market report 2025 2026 2027 2028 services service'.split(' '));

async function get(path) {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}
const one = async (path) => (await get(path))[0] || null;

async function topicSegment(reportId) {
  const t = await one(`topics?report_id=eq.${reportId}&select=industry_id&limit=1`);
  if (!t?.industry_id) return null;
  const ti = await one(`tax_industries?id=eq.${t.industry_id}&select=slug,level`);
  return ti?.level === 2 ? ti.slug : null;
}

const words = (s) => [...new Set(String(s || '').toLowerCase().split(/[^a-z0-9]+/)
  .filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/s$/, '')))];

async function candidates(cc, text) {
  const links = await get(`tax_country_industry?country_code=eq.${cc}&status=neq.rejected&select=industry_id`);
  if (!links.length) return [];
  const ids = links.map((l) => l.industry_id).join(',');
  const segs = await get(`tax_industries?id=in.(${ids})&level=eq.2&select=slug,name`);
  const want = words(text);
  return segs
    .map((s) => ({ slug: s.slug, score: words(`${s.slug.replace(/-/g, ' ')} ${s.name}`).filter((w) => want.includes(w)).length }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => s.slug);
}

let out;
if (opt('--report')) {
  const r = await one(`living_reports?slug=eq.${encodeURIComponent(opt('--report'))}&select=id,country,industry,segment`);
  if (!r) { console.error('report not found'); process.exit(1); }
  const cc = COUNTRY[String(r.country || '').toLowerCase()] || r.country;
  const seg = await topicSegment(r.id);
  out = seg ? { segment_key: seg, country_code: cc, method: 'topic', candidates: [] }
    : { segment_key: null, country_code: cc, method: 'candidates', candidates: await candidates(cc, `${r.industry} ${r.segment} ${opt('--report')}`) };
} else if (opt('--transcript')) {
  const t = await one(`expert_transcripts?slug=eq.${encodeURIComponent(opt('--transcript'))}&select=country_code,industry,market,source_report_code`);
  if (!t) { console.error('transcript not found'); process.exit(1); }
  let seg = null;
  if (t.source_report_code) {
    const r = await one(`living_reports?code=eq.${encodeURIComponent(t.source_report_code)}&select=id`);
    if (r) seg = await topicSegment(r.id);
  }
  out = seg ? { segment_key: seg, country_code: t.country_code, method: 'source_report', candidates: [] }
    : { segment_key: null, country_code: t.country_code, method: 'candidates', candidates: await candidates(t.country_code, `${t.industry} ${opt('--transcript')}`) };
} else {
  console.error('usage: --report <slug> | --transcript <slug>');
  process.exit(2);
}
console.log(JSON.stringify(out));
