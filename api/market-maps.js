// ============================================================
// KIRA RESEARCH — api/market-maps.js
// Market mapping: free overview page per (country x segment), server-rendered from the stats JSON in table
// `market_maps` (migration 070) by api/_lib/market-map/render.js.
//   GET /api/market-maps?type=hub&loc=en                              /<loc>/market-maps  (the "Company lists" library table)
//   GET /api/market-maps?type=list                                    the same table as JSON { items, total, page, pages, page_size }
//   Hub params (hub and list): country=<slug>&industry=<family>&kind=goods|services&size=u100|b100|b300|o500&q=<words>&sort=small|az&page=<n>, 50 rows a page (default sort: largest first)
//   GET /api/market-maps?type=country&loc=en&country=vietnam          /<loc>/market-maps/<country> (every map of the country, grouped by industry)
//   GET /api/market-maps?type=map&loc=en&country=vietnam&segment=soft-drinks   /<loc>/market-maps/<country>/<segment>
// English only: ja/ko/zh paths serve the English page with the English canonical and noindex.
// Robots: noindex everywhere unless setting `marketmaps.indexing_enabled` is on AND the row is indexable
// (>= 50 companies, >= 2 stages with 5+ companies) AND the language is English. Not linked from nav or footer.
// A missing table, an empty table or a database error all end as "no maps" (hub 200, map 404), never a 500.
// The page never contains a phone number, an email or a named person: the stats hold none.
// ============================================================
import { getConfig } from './_lib/config.js';
import { BASE, LOCALES } from './_lib/ssr.js';
import { renderDocument, renderHub, renderCountryHub } from './_lib/market-map/render.js';
import { getIndex, parseParams, isFiltered, hubModel, countryModel, hubHref } from './_lib/market-map/hub.js';
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

// One slice of a query (PostgREST answers at most 1,000 rows at a time) plus the total from Content-Range. Throws on any
// error, so a half-read index is never cached; the handler turns that into "no maps".
async function fetchRange(path, from, to) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { rows: [], total: 0 };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Range-Unit': 'items', Range: `${from}-${to}`, Prefer: 'count=exact' } });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  const total = Number(String(r.headers.get('content-range') || '').split('/')[1]);
  return { rows: await r.json(), total: Number.isFinite(total) ? total : 0 };
}
async function loadIndex() {
  try { return await getIndex(fetchRange); } catch (err) { console.warn('[market-maps] index', err.message); return { items: [] }; }
}
// Phone / email shares and the build date sit in the stats JSON: read for the 50 rows of a page only.
async function enrich(items) {
  if (!items.length) return items;
  const list = items.map((i) => `"${i.slug}"`).join(',');
  const rows = await sb(`market_maps?status=eq.published&slug=in.(${encodeURIComponent(list)})&select=slug,phone_pct:stats->contacts->>with_phone_pct,email_pct:stats->contacts->>with_email_pct,built:stats->>built&limit=${items.length}`);
  const by = new Map(rows.map((r) => [r.slug, r]));
  return items.map((i) => { const r = by.get(i.slug); return { ...i, phone_pct: r && r.phone_pct != null ? Number(r.phone_pct) : null, email_pct: r && r.email_pct != null ? Number(r.email_pct) : null, built: (r && r.built) || i.built }; });
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
    const p = parseParams(q);
    const model = hubModel(await loadIndex(), p);
    model.items = await enrich(model.items);
    if (q.type === 'list') {
      res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
      res.status(200).json({ items: model.items.map((i) => ({ slug: i.slug, country: i.country, country_name: i.country_name, segment_key: i.segment_key, title: i.title, l2_family: i.l2_family, kind: i.kind, companies: i.companies, phone_pct: i.phone_pct, email_pct: i.email_pct, price: i.price, built: i.built })), total: model.total, page: model.page, pages: model.pages, page_size: model.pageSize });
      return;
    }
    // Only the clean first page is a search landing page; filtered views and later pages are noindex (crawlers still follow them).
    const index = indexingOn && loc === 'en' && model.anyIndexable && !isFiltered(p) && model.page === 1;
    send(res, renderHub(model, p, { loc, canonical: `${BASE}${hubHref(p, { page: model.page })}`, robots: index ? 'index,follow' : 'noindex,follow' }), { index });
    return;
  }

  if (q.type === 'country') {
    const slug = String(q.country || '');
    const c = SLUG.test(slug) ? countryModel(await loadIndex(), slug) : null;
    if (!c) { notFound(res); return; }
    const index = indexingOn && loc === 'en' && c.indexableCount > 0;
    send(res, renderCountryHub(c, { canonical: `${BASE}/en/market-maps/${c.slug}`, robots: index ? 'index,follow' : 'noindex,follow' }), { index });
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
