// ============================================================
// KIRA RESEARCH — api/_lib/market-map/hub.js
// Data layer of the market-map hub and the country hubs: one light index of every published row (no stats blob),
// kept in memory for 10 minutes, and the pure functions that filter, count and page it. The hub is a small landing page
// (search, sidebar filters, 50 rows a page); everything else is reached through query parameters
//   ?country=<slug>&industry=<family>&kind=goods|services&size=u100|b100|b300|o500&q=<words>&sort=small|az&page=<n>
// and plain <a href> links, so a crawler can follow every page. No model, no per-request scan of the stats JSON.
// ============================================================
import { listPrice } from '../pricing.js';
import { i18nCurrent } from './gate.js';
import { countryLabel } from './i18n.js';

export const PAGE_SIZE = 50;
export const BANDS = [['u100', 'Under 100', 0, 99], ['b100', '100 to 299', 100, 299], ['b300', '300 to 500', 300, 500], ['o500', 'Over 500', 501, Infinity]];
export const bandOf = (n) => (BANDS.find((b) => n >= b[2] && n <= b[3]) || BANDS[0])[0];
export const TOP_FAMILIES = 12;
export const SORTS = [['', 'Largest', 'largest first'], ['small', 'Smallest', 'smallest first'], ['az', 'A–Z', 'A to Z']];
const TTL_MS = 10 * 60 * 1000;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

export const countryName = (slug) => String(slug || '').split('-').map((w) => w.slice(0, 1).toUpperCase() + w.slice(1)).join(' ');

// ── query parameters ──
export function parseParams(q = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const s = (v, max) => String(one(v) == null ? '' : one(v)).replace(/\s+/g, ' ').trim().slice(0, max);
  const country = s(q.country, 81).toLowerCase();
  const kind = s(q.kind, 10).toLowerCase();
  const size = s(q.size, 6).toLowerCase();
  const page = parseInt(s(q.page, 5), 10);
  return {
    country: SLUG.test(country) ? country : '',
    industry: s(q.industry, 80),
    kind: kind === 'goods' || kind === 'services' ? kind : '',
    size: BANDS.some((b) => b[0] === size) ? size : '',
    q: s(q.q, 60),
    sort: ['small', 'az'].includes(s(q.sort, 6).toLowerCase()) ? s(q.sort, 6).toLowerCase() : '',
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 500) : 1,
  };
}
export const isFiltered = (p) => !!(p.country || p.industry || p.kind || p.size || p.q || p.sort);

// Query string in a fixed order; page 1 is left out. Returns '' when nothing is set.
export function queryString(p, over = {}) {
  const m = { ...p, ...over };
  const out = [];
  for (const k of ['country', 'industry', 'kind', 'size', 'q', 'sort']) if (m[k]) out.push(`${k}=${encodeURIComponent(m[k])}`);
  if (m.page > 1) out.push(`page=${m.page}`);
  return out.length ? `?${out.join('&')}` : '';
}
export const hubHref = (p, over = {}, loc = 'en') => `/${loc}/market-maps${queryString(p, over)}`;

// ── filtering, facets, paging (pure) ──
const matchQ = (i, words) => { if (!words.length) return true; const t = `${i.title} ${i.title_loc || ''} ${i.country_name} ${i.family_loc || ''} ${i.l2_family || ''} ${i.segment_key}`.toLowerCase(); return words.every((w) => t.includes(w)); };
export function applyFilters(items, p, skip = '') {
  const words = p.q.toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((i) =>
    (skip === 'country' || !p.country || i.country === p.country)
    && (skip === 'industry' || !p.industry || (i.l2_family || 'Other segments') === p.industry)
    && (skip === 'kind' || !p.kind || i.kind === (p.kind === 'services' ? 'service' : 'goods'))
    && (skip === 'size' || !p.size || bandOf(i.companies) === p.size)
    && (skip === 'q' || matchQ(i, words)));
}

// Counts for the filter links: each group counts with every OTHER filter applied, so the numbers match what a click shows.
export function buildFacets(items, p) {
  const tally = (list, key) => { const m = new Map(); for (const i of list) { const k = key(i); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const byCountry = tally(applyFilters(items, p, 'country'), (i) => i.country);
  const names = new Map(items.map((i) => [i.country, i.country_name]));
  const countries = [...byCountry.entries()].map(([slug, n]) => ({ slug, name: names.get(slug) || countryName(slug), n })).sort((a, b) => a.name.localeCompare(b.name));
  const fam = tally(applyFilters(items, p, 'industry'), (i) => i.l2_family || 'Other segments');
  // name = the English family text (the filter key in the URL); label = its translation when the row carries one
  const famLabel = new Map(); for (const i of items) if (i.family_loc && !famLabel.has(i.l2_family)) famLabel.set(i.l2_family, i.family_loc);
  let industries = [...fam.entries()].map(([name, n]) => ({ name, label: famLabel.get(name) || '', n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  industries = industries.slice(0, TOP_FAMILIES);
  if (p.industry && !industries.some((x) => x.name === p.industry)) industries.push({ name: p.industry, label: famLabel.get(p.industry) || '', n: fam.get(p.industry) || 0 });
  const kinds = tally(applyFilters(items, p, 'kind'), (i) => (i.kind === 'service' ? 'services' : 'goods'));
  const sizes = tally(applyFilters(items, p, 'size'), (i) => bandOf(i.companies));
  return {
    countries, industries,
    kinds: [['goods', 'Goods'], ['services', 'Services']].filter(([k]) => kinds.has(k) || p.kind === k).map(([k, name]) => ({ key: k, name, n: kinds.get(k) || 0 })),
    sizes: BANDS.filter((b) => sizes.has(b[0]) || p.size === b[0]).map((b) => ({ key: b[0], name: b[1], n: sizes.get(b[0]) || 0 })),
  };
}

// Largest lists first, then A to Z (stable, so a page boundary never moves between requests).
export const bySize = (a, b) => b.companies - a.companies || (a.slug < b.slug ? -1 : 1);
const bySmall = (a, b) => a.companies - b.companies || (a.slug < b.slug ? -1 : 1);
const byName = (a, b) => (a.title_loc || a.title).localeCompare(b.title_loc || b.title) || (a.slug < b.slug ? -1 : 1);
export const sorter = (sort) => (sort === 'small' ? bySmall : sort === 'az' ? byName : bySize);

export function hubModel(index, p) {
  const all = index.items;
  const filtered = applyFilters(all, p).sort(sorter(p.sort));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(p.page, pages);
  return {
    total: filtered.length, all: all.length, page, pages, pageSize: PAGE_SIZE,
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    facets: buildFacets(all, p),
    countries: [...new Map(all.map((i) => [i.country, i.country_name]))].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name)),
    anyIndexable: all.some((i) => i.indexable),
  };
}

export function countryModel(index, slug) {
  const items = index.items.filter((i) => i.country === slug).sort(bySize);
  if (!items.length) return null;
  const groups = new Map();
  for (const i of items) { const k = i.l2_family || 'Other segments'; const g = groups.get(k) || { name: k, label: i.family_loc || '', items: [], companies: 0 }; g.items.push(i); g.companies += i.companies; groups.set(k, g); }
  return {
    slug, name: items[0].country_name, items, indexableCount: items.filter((i) => i.indexable).length,
    companies: items.reduce((a, i) => a + i.companies, 0),
    groups: [...groups.values()].sort((a, b) => b.items.length - a.items.length || b.companies - a.companies || a.name.localeCompare(b.name)),
  };
}

// ── loading ──
// fetchRange(path, from, to) -> { rows, total }. PostgREST answers at most 1,000 rows a request, so the index is read
// in ranges; the first one tells the total and the rest go out together. Kind lives in the stats JSON, so the service rows
// come from one filtered query of slugs instead of reading the blob for every row.
async function readAll(fetchRange, path) {
  const first = await fetchRange(path, 0, 999);
  const rows = [...first.rows];
  const total = Number(first.total) || rows.length;
  const jobs = [];
  for (let from = 1000; from < total && from < 50000; from += 1000) jobs.push(fetchRange(path, from, from + 999));
  for (const r of await Promise.all(jobs)) rows.push(...r.rows);
  return rows;
}

export async function buildIndex(fetchRange) {
  const base = 'market_maps?status=eq.published&order=slug.asc';
  const [rows, svc] = await Promise.all([
    readAll(fetchRange, `${base}&select=slug,country,segment_key,title,l2_family,n_companies,indexable,built_at,cb:commentary_built_at,ja_src:i18n->ja->>src_built_at,ko_src:i18n->ko->>src_built_at,zh_src:i18n->zh->>src_built_at`),
    readAll(fetchRange, `${base}&select=slug&stats->meta->>kind=eq.service`),
  ]);
  const services = new Set(svc.map((r) => r.slug));
  const items = rows.map((r) => ({
    slug: r.slug, country: r.country, country_name: countryName(r.country), segment_key: r.segment_key, title: r.title || r.segment_key,
    l2_family: r.l2_family || '', kind: services.has(r.slug) ? 'service' : 'goods', companies: Number(r.n_companies) || 0,
    indexable: r.indexable === true, price: listPrice(r.n_companies), built: String(r.built_at || '').slice(0, 10),
    // translated commentary is current (see gate.js i18nCurrent); no text is carried in the index
    ready: { ja: i18nCurrent(r.cb, r.ja_src), ko: i18nCurrent(r.cb, r.ko_src), zh: i18nCurrent(r.cb, r.zh_src) },
  }));
  return { items, at: Date.now() };
}

let cache = null;
let inflight = null;
export function clearIndexCache() { cache = null; inflight = null; }
export async function getIndex(fetchRange) {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  if (!inflight) inflight = buildIndex(fetchRange).then((ix) => { if (ix.items.length) cache = ix; return ix; }).finally(() => { inflight = null; });
  return inflight;
}


// ── translated names (table market_map_names, migration 073) ──
// One light read of the whole table (a few thousand short rows), cached like the index. names[lang] = { segment: Map(segment_key -> name), family: Map(English family -> name) }.
let namesCache = null;
let namesInflight = null;
export function clearNamesCache() { namesCache = null; namesInflight = null; }
export async function buildNames(fetchRange) {
  const rows = await readAll(fetchRange, 'market_map_names?order=kind.asc,key.asc,lang.asc&select=kind,key,lang,name');
  const names = { ja: { segment: new Map(), family: new Map() }, ko: { segment: new Map(), family: new Map() }, zh: { segment: new Map(), family: new Map() } };
  for (const r of rows) { const n = names[r.lang]; if (n && n[r.kind] && r.key && r.name) n[r.kind].set(r.key, String(r.name)); }
  return { names, at: Date.now() };
}
// A missing table or a failed read gives empty names (English titles), never an error; an empty result is not cached for long.
export async function getNames(fetchRange) {
  if (namesCache && Date.now() - namesCache.at < TTL_MS) return namesCache.names;
  if (!namesInflight) namesInflight = buildNames(fetchRange).catch(() => ({ names: buildEmptyNames(), at: Date.now() - TTL_MS + 60000 })).then((x) => { namesCache = x; return x; }).finally(() => { namesInflight = null; });
  return (await namesInflight).names;
}
export function buildEmptyNames() { const e = () => ({ segment: new Map(), family: new Map() }); return { ja: e(), ko: e(), zh: e() }; }

// Items of the index seen in one language: translated title / family / country, and `indexable` = the English gate AND
// the locale commentary is current AND the segment title has a translation (the owner's rule for ja/ko/zh pages).
// English items are returned unchanged. l2_family stays the English text: it is the filter key in the URL.
export function localizeItems(items, names, loc) {
  const n = names && names[loc];
  if (!n) return items;
  return items.map((i) => {
    const t = n.segment.get(i.segment_key) || '';
    return { ...i, title_loc: t, family_loc: n.family.get(i.l2_family) || '', country_name: countryLabel(i.country, i.country_name, loc),
      indexable_en: i.indexable, indexable: i.indexable && !!t && !!(i.ready && i.ready[loc]) };
  });
}
// Which languages a page of a given kind may be indexed in (drives hreflang and robots). `scope` filters items (a country, or all).
export function indexableLocales(items, names, scope = () => true) {
  const out = [];
  if (items.some((i) => scope(i) && i.indexable)) out.push('en');
  for (const loc of ['ja', 'ko', 'zh']) { const n = names && names[loc]; if (n && items.some((i) => scope(i) && i.indexable && i.ready && i.ready[loc] && n.segment.get(i.segment_key))) out.push(loc); }
  return out;
}
