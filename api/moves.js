// ============================================================
// KIRA RESEARCH — api/moves.js
// Public. Kira Data (D4): published company moves (company_events, migration 060) from public sources.
//   GET /api/moves?host=VN&investor=JP&type=acquisition&limit=50&before=<event_date>
//     → { events[], names, sources[] }
//   With both host and investor (a corridor page, e.g. Japan in Vietnam) the reply adds
//     corridor: { fdi, links[] }   fdi = the investor's net direct investment in the host, last 12 months
//     (BoJ, Japan only); links = trade and visitor flows between the two (api/_lib/econ/summarise.js)
// ============================================================

import { LINK_PRODUCTS, summarise } from './_lib/econ/summarise.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TYPES = ['acquisition', 'stake', 'investment', 'plant', 'jv', 'subsidiary', 'expansion', 'exit', 'other'];

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
const code = (v) => (/^[A-Z]{2}$/.test(String(v || '').toUpperCase()) ? String(v).toUpperCase() : null);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const q = req.query || {};
  const host = code(q.host), investor = code(q.investor);
  const type = TYPES.includes(String(q.type || '')) ? String(q.type) : null;
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
  const before = /^\d{4}-\d{2}-\d{2}$/.test(String(q.before || '')) ? String(q.before) : null;
  try {
    const [countries, sources] = await Promise.all([
      sb('tax_countries?select=code,name'),
      sb('data_sources?public=eq.true&select=key,name,url,attribution')
    ]);
    const srcIn = `in.(${sources.map((s) => s.key).join(',')})`;
    const filt = [`status=eq.published`, `source_key=${srcIn}`];
    if (host) filt.push(`host_country=eq.${host}`);
    if (investor) filt.push(`investor_country=eq.${investor}`);
    if (type) filt.push(`type=eq.${type}`);
    if (before) filt.push(`event_date=lt.${before}`);
    const events = (await sb(`company_events?${filt.join('&')}&select=id,source_key,url,title,domain,lang,event_date,investor_country,host_country,type,company,value_usd,tier,also` +
      `&order=event_date.desc,id.desc&limit=${limit}`)).map((e) => ({ ...e, also: (e.also || []).length }));

    let corridor = null;
    if (host && investor && host !== investor) {
      const since = String(new Date().getUTCFullYear() - 3);
      const flows = await sb(`econ_flows?or=(and(reporter.eq.${host},partner.eq.${investor}),and(reporter.eq.${investor},partner.eq.${host}))` +
        `&source_key=${srcIn}&product=in.(${LINK_PRODUCTS.join(',')})&period=gte.${since}` +
        `&select=source_key,reporter,partner,product,flow,freq,period,value,currency&order=period.desc&limit=5000`);
      corridor = { links: summarise(flows) };
    }
    const used = new Set([...events.map((e) => e.source_key), ...(corridor ? corridor.links.map((l) => l.source_key) : [])]);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ events, corridor, names: Object.fromEntries(countries.map((c) => [c.code, c.name])), sources: sources.filter((s) => used.has(s.key)) });
  } catch (err) {
    console.error('[moves] error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
