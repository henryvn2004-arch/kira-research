// ============================================================
// KIRA RESEARCH — api/chain.js
// Public GET. The data of one published Kira Chain.
//
// GET /api/chain?country=vn&slug=coffee
// → { chain: { country_code, country_name, slug, name, summary, stats, updated_at },
//     payload?: {...}, payload_url?: "/chain-data/vn-coffee.json" }
//
// `payload` holds the chain itself (stages, flows, companies, facts). A chain
// kept in a static file returns `payload_url` instead, and the page fetches it.
// Draft chains are never returned.
// ============================================================

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

  const country = String(req.query?.country || '').trim().toUpperCase();
  const slug    = String(req.query?.slug || '').trim().toLowerCase();
  if (!/^[A-Z]{2}$/.test(country) || !/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) return res.status(400).json({ error: 'bad_request' });

  try {
    const rows = await rest(`chains?country_code=eq.${country}&slug=eq.${encodeURIComponent(slug)}&status=eq.published`
      + '&select=country_code,slug,name,summary,stats,payload,payload_url,updated_at&limit=1');
    if (!rows.length) return res.status(404).json({ error: 'chain_not_found' });
    const c = rows[0];
    const names = await rest(`tax_countries?code=eq.${country}&select=name&limit=1`).catch(() => []);

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    const out = { chain: { country_code: c.country_code, country_name: names[0]?.name || c.country_code,
      slug: c.slug, name: c.name, summary: c.summary, stats: c.stats, updated_at: c.updated_at } };
    if (c.payload) out.payload = c.payload; else out.payload_url = c.payload_url;
    return res.status(200).json(out);
  } catch (err) {
    console.error('[chain]', err.message);
    return res.status(500).json({ error: 'load_failed' });
  }
}
