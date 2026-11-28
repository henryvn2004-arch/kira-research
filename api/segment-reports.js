// ============================================================
// KIRA RESEARCH — api/segment-reports.js   (public path /api/public/segment-reports, rewrite in vercel.json)
// Public read-only API for the sister site BizDirect Asia (W6 cross-sell). Contract, do not change the shape:
//   GET /api/public/segment-reports?country=<market_map_country slug>&segment=<market_map_segment>&limit=3
//   -> { country, segment, source: "KIRA Research",
//        reports: [{ url, title, analysis, published_at, price_usd|null, kind: "report"|"transcript" }],
//        market_map: { url, n_companies } | null }
// Published items with exactly that join key (migration 077), newest first, reports before transcripts, at most `limit`
// (default 3, max 10). price_usd only while the matching checkout switch is on. market_map only when the map is indexable.
// Titles / links / prices only: no report or transcript content ever leaves here. 200 with [] when nothing matches, 400 on a bad parameter.
// ============================================================
import { sb } from './_lib/geo.js';
import { getConfig } from './_lib/config.js';
import { getMapFacts } from './_lib/bizdirect-cite.js';

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const BASE = 'https://kiraresearch.com';

// Pure: raw rows -> response items (report rows first, then transcripts; newest first inside each; cut to limit).
export function buildItems({ reports = [], transcripts = [], enTitles = {}, trTitles = {}, priceReports = false, priceTranscripts = false, limit = 3 }) {
  const byNew = (a, b) => String(b.published_at || '').localeCompare(String(a.published_at || ''));
  const price = (on, p) => (on && Number(p) > 0 ? Number(p) : null);
  const r = [...reports].sort(byNew).map((x) => ({
    url: `${BASE}/en/reports/${x.slug}`, title: enTitles[x.id] || x.slug, analysis: x.analysis || null,
    published_at: x.published_at || null, price_usd: price(priceReports, x.price), kind: 'report',
  }));
  const t = [...transcripts].sort(byNew).map((x) => ({
    url: `${BASE}/en/experts/transcripts/${x.slug}`, title: trTitles[x.id] || x.slug, analysis: x.interview_type || null,
    published_at: x.published_at || null, price_usd: price(priceTranscripts, x.price), kind: 'transcript',
  }));
  return [...r, ...t].slice(0, limit);
}

export const parseParams = (q) => {
  const country = String(q.get('country') || ''), segment = String(q.get('segment') || '');
  if (!SLUG.test(country) || !SLUG.test(segment)) return null;
  const raw = q.get('limit');
  let limit = 3;
  if (raw !== null && raw !== '') { if (!/^\d{1,3}$/.test(raw) || Number(raw) < 1) return null; limit = Math.min(10, Number(raw)); }
  return { country, segment, limit };
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const p = parseParams(new URL(req.url, 'https://x').searchParams);
  if (!p) { res.setHeader('Cache-Control', 'public, s-maxage=3600'); res.status(400).json({ error: 'bad_parameters' }); return; }
  try {
    const key = `market_map_country=eq.${encodeURIComponent(p.country)}&market_map_segment=eq.${encodeURIComponent(p.segment)}&status=eq.published`;
    const [reports, transcripts, priceReports, priceTranscripts, facts] = await Promise.all([
      sb(`living_reports?${key}&order=published_at.desc&limit=${p.limit}&select=id,slug,analysis,published_at,price`),
      sb(`expert_transcripts?${key}&order=published_at.desc&limit=${p.limit}&select=id,slug,interview_type,published_at,price`),
      getConfig('checkout.single_report_enabled'), getConfig('checkout.transcript_enabled'),
      getMapFacts(p.country, p.segment, 'en'),
    ]);
    const enTitles = {}, trTitles = {};
    if (reports.length) for (const t of await sb(`report_translations?report_id=in.(${reports.map((r) => r.id).join(',')})&locale=eq.en&select=report_id,title`)) enTitles[t.report_id] = t.title;
    if (transcripts.length) for (const t of await sb(`expert_transcript_translations?transcript_id=in.(${transcripts.map((r) => r.id).join(',')})&locale=eq.en&status=eq.published&select=transcript_id,title`)) trTitles[t.transcript_id] = t.title;
    const out = {
      country: p.country, segment: p.segment, source: 'KIRA Research',
      reports: buildItems({ reports, transcripts, enTitles, trTitles, priceReports, priceTranscripts, limit: p.limit }),
      market_map: facts && facts.slug ? { url: `${BASE}/en/market-maps/${facts.slug}`, n_companies: facts.n } : null,
    };
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json(out);
  } catch (err) {
    console.error('[segment-reports]', err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ error: 'server_error' });
  }
}
