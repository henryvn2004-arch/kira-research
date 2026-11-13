// ============================================================
// KIRA RESEARCH — api/geo-feed.js
// Public, read-only feed of published GEO data so BizDirect can pull without a KIRA key.
//   GET /api/geo-feed?country=<ISO2>      one country; no country = the pilot countries (VN, TH, SG, ID)
//   → 200 { crosswalk, answers, claims, generated_at }
// Only status = 'published' rows (crosswalk: 'approved') and only the columns listed below.
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PILOT = ['VN', 'TH', 'SG', 'ID'];
const PAGE = 1000;   // PostgREST caps a response at 1000 rows by default: page through

async function rows(table, filter, select, order) {
  const out = [];
  for (let from = 0; from < 20000; from += PAGE) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}&select=${select}&order=${order}&limit=${PAGE}&offset=${from}`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    const page = await r.json();
    out.push(...page);
    if (page.length < PAGE) break;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const raw = (new URL(req.url, `https://${req.headers.host || 'x'}`).searchParams.get('country') || '').trim().toUpperCase();
  if (raw && !/^[A-Z]{2}$/.test(raw)) { res.status(400).json({ error: 'bad_country' }); return; }
  const codes = raw ? [raw] : PILOT;
  const cc = `country_code=in.(${codes.join(',')})`;
  try {
    const [crosswalk, answers, claims] = await Promise.all([
      rows('segment_crosswalk', `status=eq.approved&${cc}`, 'country_code,segment_key,bizdirect_country,bizdirect_term_slugs', 'country_code.asc,segment_key.asc,id.asc'),
      rows('kira_answers', `status=eq.published&${cc}`, 'id,question,intent,country_code,segment_key,answer_short,source_kind,source_ref,updated_at,i18n', 'id.asc'),
      rows('field_claims', `status=eq.published&${cc}`, 'id,topic,industry,country_code,speaker_role,claim_text,transcript_slug,basis_label,updated_at,i18n', 'id.asc'),
    ]);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ crosswalk, answers, claims, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[geo-feed]', err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ error: 'server_error' });
  }
}
