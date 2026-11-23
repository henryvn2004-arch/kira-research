// ============================================================
// KIRA RESEARCH — api/market-maps.js
// Market mapping: free overview page per (country x segment), server-rendered from the stats JSON in table
// `market_maps` (migration 070) by api/_lib/market-map/render.js.
//   GET /api/market-maps?type=hub&loc=en                              /<loc>/market-maps  (the "Company lists" library table)
//   GET /api/market-maps?type=list                                    the same table as JSON { items: [...] }
//   GET /api/market-maps?type=map&loc=en&country=vietnam&segment=soft-drinks   /<loc>/market-maps/<country>/<segment>
// English only: ja/ko/zh paths serve the English page with the English canonical and noindex.
// Robots: noindex everywhere unless setting `marketmaps.indexing_enabled` is on AND the row is indexable
// (>= 50 companies, >= 2 stages with 5+ companies) AND the language is English. Not linked from nav or footer.
// A missing table, an empty table or a database error all end as "no maps" (hub 200, map 404), never a 500.
// The page never contains a phone number, an email or a named person: the stats hold none.
// ============================================================
import { getConfig } from './_lib/config.js';
import { BASE, LOCALES } from './_lib/ssr.js';
import { renderDocument, renderHub } from './_lib/market-map/render.js';
import { isIndexable } from './_lib/market-map/gate.js';
import { listPrice } from './_lib/pricing.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

async function sb(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
    if (!r.ok) { console.warn('[market-maps] supabase', r.status); return []; }
    return await r.json();
  } catch (err) { console.warn('[market-maps]', err.message); return []; }
}

function send(res, html, { status = 200, index = false, cache = true } = {}) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache ? 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400' : 'public, max-age=0, s-maxage=60');
  if (!index) res.setHeader('X-Robots-Tag', 'noindex, follow');
  res.status(status).send(html);
}

function notFound(res) {
  const body = `<main class="mm"><h1>Market map not found</h1><p class="dek">This map is not published. <a href="/en/market-maps">See all market maps</a>.</p></main>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Market map not found | KIRA Research</title><meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/css/kira.css"><style>.mm{max-width:1120px;margin:0 auto;padding:40px 16px}.mm h1{font-size:28px}.mm a{color:var(--primary)}</style></head><body>${body}<script src="/js/nav.js" defer></script></body></html>`;
  send(res, html, { status: 404, cache: false });
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const q = req.query || {};
  const loc = LOCALES.includes(q.loc) ? q.loc : 'en';
  const indexingOn = await getConfig('marketmaps.indexing_enabled');
  const buy = { enabled: await getConfig('checkout.list_enabled') };

  if (q.type === 'hub' || q.type === 'list') {
    // Only the few fields the table needs are read from the stats JSON (PostgREST path operators), not the whole blob.
    const rows = await sb('market_maps?status=eq.published&select=country,segment_key,slug,title,l2_family,n_companies,indexable,built_at,kind:stats->meta->>kind,phone_pct:stats->contacts->>with_phone_pct,email_pct:stats->contacts->>with_email_pct,country_name:stats->>country,built:stats->>built&order=l2_family.asc,country.asc,title.asc&limit=1000');
    const items = rows.map((r) => ({
      slug: r.slug, country: r.country, country_name: r.country_name || r.country, segment_key: r.segment_key, title: r.title, l2_family: r.l2_family,
      kind: r.kind || 'goods', companies: r.n_companies, phone_pct: r.phone_pct == null ? null : Number(r.phone_pct), email_pct: r.email_pct == null ? null : Number(r.email_pct),
      price: listPrice(r.n_companies), built: r.built || String(r.built_at || '').slice(0, 10),
    }));
    if (q.type === 'list') { res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400'); res.status(200).json({ items }); return; }
    const index = indexingOn && loc === 'en' && rows.some((r) => r.indexable);
    send(res, renderHub(items, { loc, canonical: `${BASE}/en/market-maps`, robots: index ? 'index,follow' : 'noindex,follow' }), { index });
    return;
  }

  const country = String(q.country || ''), segment = String(q.segment || '');
  if (!SLUG.test(country) || !SLUG.test(segment)) { notFound(res); return; }
  const rows = await sb(`market_maps?country=eq.${encodeURIComponent(country)}&segment_key=eq.${encodeURIComponent(segment)}&status=eq.published&select=*&limit=1`);
  const row = rows[0];
  if (!row || !row.stats || !row.stats.meta) { notFound(res); return; }
  const index = indexingOn && loc === 'en' && row.indexable === true && isIndexable(row.stats);
  row.stats.price_usd = listPrice(row.n_companies);   // the price is always the server rule, whatever the stats file says
  const html = renderDocument(row.stats, row.commentary || null, {
    canonical: `${BASE}/en/market-maps/${row.slug}`, robots: index ? 'index,follow' : 'noindex,follow', buy,
  });
  send(res, html, { index });
}
