// ============================================================
// KIRA RESEARCH — api/chain-search.js
// Public GET. Finds the Kira Chain (value chain of a product or service) that
// matches what a reader typed.
//
// GET /api/chain-search?q=<text>
// → { items: [{ country_code, country_name, slug, name, summary, stats, score }], all: boolean }
//
// With no query (or one shorter than 2 characters) it lists every published
// chain (all: true), which is what the landing page shows as "available now".
// Matching is done here, not in SQL: the table holds one row per product and
// country, so a few hundred rows at most. It forgives case, accents, a typo or
// two, and filler words ("coffee market in vietnam" finds Vietnam · Coffee).
// ============================================================

import { norm, matchChains } from './_lib/chain-match.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function rest(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const raw = String(req.query?.q || '').slice(0, 80);
  try {
    const [chains, countries] = await Promise.all([
      rest('chains?status=eq.published&select=country_code,slug,name,aliases,summary,stats&limit=500'),
      rest('tax_countries?select=code,name').catch(() => [])
    ]);
    const cname = Object.fromEntries(countries.map((c) => [c.code, c.name]));
    const shape = (c, score) => ({ country_code: c.country_code, country_name: cname[c.country_code] || c.country_code,
      slug: c.slug, name: c.name, summary: c.summary, stats: c.stats, score });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');

    if (norm(raw).length < 2) return res.status(200).json({ items: chains.map((c) => shape(c, 0)).slice(0, 50), all: true });

    const items = matchChains(raw, chains, countries).slice(0, 8).map((m) => shape(m.chain, m.score));

    return res.status(200).json({ items, all: false });
  } catch (err) {
    console.error('[chain-search]', err.message);
    return res.status(500).json({ error: 'search_failed' });
  }
}
