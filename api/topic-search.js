// ============================================================
// KIRA RESEARCH — api/topic-search.js
// Public. Fuzzy lookup of Topic Planner topics that have no published report
// yet, so a search with no library hit can still land on a "coming soon" page.
//
// GET /api/topic-search?q=convenience stores vietnam
//   → { items: [{ slug, title, country, country_code, industry, competency, year, state }] }
//
//   state  scoping       proposed — not yet approved, no date promised
//          in_progress   approved or queued — in the production queue
// Typo-tolerant (pg_trgm, migration 027). Rejected and published topics never appear.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  // Letters/digits/space/&/- only; short queries match too much.
  const q = String((req.query || {}).q || '').replace(/[^\p{L}\p{N} &-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (q.length < 3) return res.status(200).json({ items: [] });

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_topics`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, lim: 6 })
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    const rows = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      items: rows.map(t => ({
        slug: t.slug, title: t.title, country: t.country_name, country_code: t.country_code,
        industry: t.industry, competency: t.competency, year: t.year,
        state: t.status === 'proposed' ? 'scoping' : 'in_progress'
      }))
    });
  } catch (err) {
    console.error('[topic-search]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
