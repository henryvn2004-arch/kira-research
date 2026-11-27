// ============================================================
// KIRA RESEARCH — api/market-maps.js
// Market mapping: free overview page per (country x segment), server-rendered from the stats JSON in table
// `market_maps` (migration 070) by api/_lib/market-map/render.js.
//   GET /api/market-maps?type=hub&loc=en                              /<loc>/market-maps  (the "Company lists" library table)
//   GET /api/market-maps?type=list                                    the same table as JSON { items, total, page, pages, page_size }
//   Hub params (hub and list): country=<slug>&industry=<family>&kind=goods|services&size=u100|b100|b300|o500&q=<words>&sort=small|az&page=<n>, 50 rows a page (default sort: largest first)
//   GET /api/market-maps?type=country&loc=en&country=vietnam          /<loc>/market-maps/<country> (every map of the country, grouped by industry)
//   GET /api/market-maps?type=map&loc=en&country=vietnam&segment=soft-drinks   /<loc>/market-maps/<country>/<segment>
// Four languages (migration 073): /ja /ko /zh use the fixed texts of api/_lib/market-map/i18n.js, segment titles and family names
// from table market_map_names (English when missing) and commentary from market_maps.i18n[loc] ONLY while it is current
// (i18n[loc].src_built_at = commentary_built_at); otherwise the page shows no commentary block for that language.
// Robots: noindex everywhere unless setting `marketmaps.indexing_enabled` is on AND the row is indexable
// (>= 50 companies, >= 2 stages with 5+ companies). A ja/ko/zh map page also needs a current commentary translation AND a
// translated segment title. Hubs and country hubs index when at least one map of theirs is indexable in that language.
// hreflang (en/ja/ko/zh-Hans + x-default = en) lists only the languages a page may be indexed in. Canonical is per language.
// A missing table, an empty table or a database error all end as "no maps" (hub 200, map 404), never a 500.
// The page never contains a phone number, an email or a named person: the stats hold none.
// ============================================================
import { getConfig } from './_lib/config.js';
import { BASE, LOCALES, esc } from './_lib/ssr.js';
import { renderDocument, renderHub, renderCountryHub } from './_lib/market-map/render.js';
import { getIndex, getNames, parseParams, isFiltered, hubModel, countryModel, hubHref, localizeItems, indexableLocales } from './_lib/market-map/hub.js';
import { isIndexable, i18nCurrent } from './_lib/market-map/gate.js';
import { ui, LOCS, countryLabel } from './_lib/market-map/i18n.js';
import { listPrice } from './_lib/pricing.js';
import { getBizdirectLists } from './_lib/bizdirect-lists.js';

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
async function loadNames() {
  try { return await getNames(fetchRange); } catch (err) { console.warn('[market-maps] names', err.message); return null; }
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
  // 1 hour fresh (was 10 minutes), then stale up to a day while it refreshes: every page is a server render plus a Supabase read
  // and ~3,000 of them are open to crawlers. Same life as api/listing.js.
  res.setHeader('Cache-Control', cache ? 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' : 'public, max-age=0, s-maxage=60');
  if (!index) res.setHeader('X-Robots-Tag', 'noindex, follow');
  res.status(status).send(html);
}

function notFound(res, loc = 'en') {
  const t = ui(loc);
  const body = `<main class="mm"><h1>${esc(t.nfTitle)}</h1><p class="dek">${esc(t.nfText)} <a href="/${loc}/market-maps">${esc(t.nfLink)}</a>.</p></main>`;
  const html = `<!doctype html><html lang="${t.htmlLang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.nfTitle)} | KIRA Research</title><meta name="robots" content="noindex,follow"><link rel="stylesheet" href="/css/kira.css"><style>.mm{max-width:1120px;margin:0 auto;padding:40px 16px}.mm h1{font-size:28px}.mm a{color:var(--primary)}</style></head><body>${body}<script src="/js/nav.js" defer></script></body></html>`;
  send(res, html, { status: 404, cache: false });
}

// Pages take no parameters beyond the ones the rewrite adds (hub: the filter set). Every other query string would be a new CDN key
// (a server render plus Supabase reads) per value, which is how a crawler turns ~3,000 cached pages into unlimited misses, so a
// stray parameter is dropped with a cheap permanent redirect to the clean URL. Ad and share tracking parameters stay on the URL
// (the browser's track.js reads them after load).
const TRACKING = /^(utm_[a-z0-9_]{1,30}|gclid|gbraid|wbraid|gad_source|gad_campaignid|fbclid|msclkid|ref)$/i;
const OWN = { map: ['type', 'loc', 'country', 'segment'], country: ['type', 'loc', 'country'], hub: ['type', 'loc', 'country', 'industry', 'kind', 'size', 'q', 'sort', 'page'] };
function strayRedirect(q, loc, res) {
  const own = OWN[q.type];
  if (!own || !Object.keys(q).some((k) => !own.includes(k) && !TRACKING.test(k))) return false;
  const country = String(q.country || ''), segment = String(q.segment || '');
  let path;
  if (q.type === 'hub') path = hubHref(parseParams(q), {}, loc);
  else if (SLUG.test(country) && (q.type === 'country' || SLUG.test(segment))) path = `/${loc}/market-maps/${country}${q.type === 'map' ? `/${segment}` : ''}`;
  else return false;   // a bad slug falls through to the normal 404
  const keep = new URLSearchParams();
  for (const k of Object.keys(q)) if (TRACKING.test(k)) keep.set(k, String(Array.isArray(q[k]) ? q[k][0] : q[k]).slice(0, 200));
  const tail = keep.toString();
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
  res.setHeader('Location', tail ? `${path}${path.includes('?') ? '&' : '?'}${tail}` : path);
  res.status(308).end();
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const q = req.query || {};
  const loc = LOCALES.includes(q.loc) ? q.loc : 'en';
  if (strayRedirect(q, loc, res)) return;
  const indexingOn = await getConfig('marketmaps.indexing_enabled');
  const buy = { enabled: await getConfig('checkout.list_enabled') };

  if (q.type === 'hub' || q.type === 'list') {
    const p = parseParams(q);
    const ix = await loadIndex();
    if (q.type === 'list') {
      const model = hubModel(ix, p);
      model.items = await enrich(model.items);
      res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
      res.status(200).json({ items: model.items.map((i) => ({ slug: i.slug, country: i.country, country_name: i.country_name, segment_key: i.segment_key, title: i.title, l2_family: i.l2_family, kind: i.kind, companies: i.companies, phone_pct: i.phone_pct, email_pct: i.email_pct, price: i.price, built: i.built })), total: model.total, page: model.page, pages: model.pages, page_size: model.pageSize });
      return;
    }
    const names = await loadNames();
    const model = hubModel({ ...ix, items: localizeItems(ix.items, names, loc) }, p);
    model.items = await enrich(model.items);
    // Only the clean first page is a search landing page; filtered views and later pages are noindex (crawlers still follow them).
    const index = indexingOn && model.anyIndexable && !isFiltered(p) && model.page === 1;
    const langs = index ? indexableLocales(ix.items, names) : [];
    send(res, renderHub(model, p, { loc, canonical: `${BASE}${hubHref(p, { page: model.page }, loc)}`, robots: index ? 'index,follow' : 'noindex,follow', alternates: alternatesFor(langs, (l) => `${BASE}/${l}/market-maps`) }), { index });
    return;
  }

  if (q.type === 'country') {
    const slug = String(q.country || '');
    const ix = SLUG.test(slug) ? await loadIndex() : null;
    const names = ix ? await loadNames() : null;
    const c = ix ? countryModel({ ...ix, items: localizeItems(ix.items, names, loc) }, slug) : null;
    if (!c) { notFound(res, loc); return; }
    const index = indexingOn && c.indexableCount > 0;
    const langs = index ? indexableLocales(ix.items, names, (i) => i.country === slug) : [];
    send(res, renderCountryHub(c, { loc, canonical: `${BASE}/${loc}/market-maps/${c.slug}`, robots: index ? 'index,follow' : 'noindex,follow', alternates: alternatesFor(langs, (l) => `${BASE}/${l}/market-maps/${c.slug}`) }), { index });
    return;
  }

  const country = String(q.country || ''), segment = String(q.segment || '');
  if (!SLUG.test(country) || !SLUG.test(segment)) { notFound(res, loc); return; }
  const [rows, nameRows] = await Promise.all([
    sb(`market_maps?country=eq.${encodeURIComponent(country)}&segment_key=eq.${encodeURIComponent(segment)}&status=eq.published&select=*&limit=1`),
    sb(`market_map_names?kind=eq.segment&key=eq.${encodeURIComponent(segment)}&select=lang,name`),
  ]);
  const row = rows[0];
  if (!row || !row.stats || !row.stats.meta) { notFound(res, loc); return; }
  const segNames = Object.fromEntries((nameRows || []).filter((r) => r && r.name).map((r) => [r.lang, String(r.name)]));
  const enOk = row.indexable === true && isIndexable(row.stats);
  // a language is open to search engines only with a current commentary translation and a translated segment title
  const current = (l) => i18nCurrent(row.commentary_built_at, row.i18n && row.i18n[l] && row.i18n[l].src_built_at);
  const langOk = (l) => (l === 'en' ? enOk : enOk && current(l) && !!segNames[l]);
  const index = indexingOn && langOk(loc);
  const langs = index ? LOCALES.filter(langOk) : [];
  row.stats.price_usd = listPrice(row.n_companies);   // the price is always the server rule, whatever the stats file says
  const C = loc === 'en' ? (row.commentary || null) : (current(loc) && row.i18n[loc].commentary) || null;
  const bdLists = await getBizdirectLists(row.country, row.segment_key);   // [] when the partner is slow or down: the page is unchanged
  const html = renderDocument(row.stats, C, {
    loc, bdLists, canonical: `${BASE}/${loc}/market-maps/${row.slug}`, robots: index ? 'index,follow' : 'noindex,follow', buy,
    segName: loc === 'en' ? row.stats.segment : (segNames[loc] || row.stats.segment), countryName: countryLabel(row.country, row.stats.country, loc),
    alternates: alternatesFor(langs, (l) => `${BASE}/${l}/market-maps/${row.slug}`),
  });
  send(res, html, { index });
}

// [[loc, url]] of the languages a page may be indexed in; hreflang is only written when there are two or more.
function alternatesFor(langs, url) { return langs.length > 1 ? LOCS.filter((l) => langs.includes(l)).map((l) => [l, url(l)]) : []; }
