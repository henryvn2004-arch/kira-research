// Unit tests for the market-map hub and country hubs: paging params, filters, HTML size, robots, routes, sitemap.
// Everything runs on a mocked fetch (no database). Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://db.example';
process.env.SUPABASE_SERVICE_KEY = 'k-test';

const COUNTRIES = ['vietnam', 'thailand', 'south-korea', 'australia', 'new-zealand', 'hong-kong', 'laos'];
const mkRows = (n) => Array.from({ length: n }, (_, k) => {
  const country = COUNTRIES[k % COUNTRIES.length];
  const companies = 20 + ((k * 37) % 900);
  return { slug: `${country}/segment-${k}`, country, segment_key: `segment-${k}`, title: `Segment number ${k}`, l2_family: `Family ${k % 150}`,
    n_companies: companies, indexable: companies >= 50, built_at: '2026-11-23T00:00:00+00:00', kind: k % 3 === 0 ? 'service' : 'goods' };
});
const ROWS = mkRows(4000);
const j = (body, headers = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } });
let indexingOn = false;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url); calls.push(url);
  if (url.includes('/app_config')) return j(indexingOn ? [{ key: 'marketmaps.indexing_enabled', value: true }] : []);
  if (!url.includes('/market_maps?')) return j([]);
  const u = new URL(url);
  const service = url.includes('kind=eq.service');
  let rows = service ? ROWS.filter((r) => r.kind === 'service') : ROWS;
  if (u.searchParams.get('indexable') === 'eq.true') rows = rows.filter((r) => r.indexable);
  const inList = /slug=in\.\((.*)\)/.exec(decodeURIComponent(u.search));
  if (inList) { const want = inList[1].split(',').map((s) => s.replace(/"/g, '')); return j(rows.filter((r) => want.includes(r.slug)).map((r) => ({ slug: r.slug, phone_pct: '61', email_pct: '40', built: '2026-11-23' }))); }
  const m = /^(\d+)-(\d+)$/.exec((init.headers || {}).Range || '');
  const from = m ? +m[1] : (+u.searchParams.get('offset') || 0), to = m ? +m[2] : from + (+u.searchParams.get('limit') || 1000) - 1;
  const slice = rows.slice(from, to + 1);
  return j(slice, { 'content-range': `${from}-${from + slice.length - 1}/${rows.length}` });
};

const hub = await import('../api/_lib/market-map/hub.js');
const { renderHub, renderCountryHub, renderDocument } = await import('../api/_lib/market-map/render.js');
const { default: handler } = await import('../api/market-maps.js');
const { default: sitemap } = await import('../api/sitemap.js');

function call(h, query, url = '/') {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send(b) { resolve({ ...this, body: b }); }, json(b) { resolve({ ...this, body: JSON.stringify(b) }); } };
    h({ method: 'GET', query, url, headers: { host: 'kiraresearch.com' } }, res);
  });
}
const robots = (html) => /<meta name="robots" content="([^"]+)"/.exec(html)[1];

test('parseParams: bad values are dropped, page is clamped, order of the query string is fixed', () => {
  const p = hub.parseParams({ country: 'Vietnam', industry: ' Retail   banking ', kind: 'weird', size: 'b100', q: 'x'.repeat(200), page: '-3' });
  assert.deepEqual({ ...p, q: p.q.length }, { country: 'vietnam', industry: 'Retail banking', kind: '', size: 'b100', q: 60, page: 1 });
  assert.equal(hub.parseParams({ country: '../etc' }).country, '');
  assert.equal(hub.parseParams({ page: '99999' }).page, 500);
  assert.equal(hub.parseParams({ page: ['2', '3'] }).page, 2);
  assert.equal(hub.queryString(hub.parseParams({ page: '2', country: 'laos', kind: 'services' })), '?country=laos&kind=services&page=2');
  assert.equal(hub.queryString(hub.parseParams({})), '');
});

test('index: reads every row in ranges and marks services from the filtered slug query', async () => {
  hub.clearIndexCache();
  const ix = await hub.getIndex(async (path, from, to) => { const r = await globalThis.fetch(`https://db.example/rest/v1/${path}`, { headers: { Range: `${from}-${to}` } }); return { rows: await r.json(), total: Number(r.headers.get('content-range').split('/')[1]) }; });
  assert.equal(ix.items.length, 4000);
  assert.equal(ix.items.filter((i) => i.kind === 'service').length, ROWS.filter((r) => r.kind === 'service').length);
  assert.equal(ix.items[0].country_name, 'Vietnam');
  assert.equal(ix.items.find((i) => i.country === 'south-korea').country_name, 'South Korea');
});

test('paging: 50 rows a page, largest first, no overlap, last page clamps', async () => {
  const { items } = await hub.getIndex();
  const seen = new Set();
  const m1 = hub.hubModel({ items }, hub.parseParams({}));
  assert.equal(m1.items.length, 50);
  assert.equal(m1.pages, 80);
  assert.ok(m1.items[0].companies >= m1.items[49].companies);
  m1.items.forEach((i) => seen.add(i.slug));
  const m2 = hub.hubModel({ items }, hub.parseParams({ page: '2' }));
  assert.ok(m2.items.every((i) => !seen.has(i.slug)));
  assert.ok(m1.items[49].companies >= m2.items[0].companies);
  assert.equal(hub.hubModel({ items }, hub.parseParams({ page: '500' })).page, 80);
});

test('filters: country, industry, kind, size and q combine; facet counts match what a click shows', async () => {
  const { items } = await hub.getIndex();
  const p = hub.parseParams({ country: 'vietnam', kind: 'services', size: 'b300' });
  const m = hub.hubModel({ items }, p);
  assert.ok(m.total > 0);
  const rows = hub.applyFilters(items, p);
  assert.ok(rows.every((i) => i.country === 'vietnam' && i.kind === 'service' && i.companies >= 300 && i.companies <= 500));
  const kindFacet = m.facets.kinds.find((k) => k.key === 'goods');
  assert.equal(kindFacet.n, hub.applyFilters(items, { ...p, kind: 'goods' }).length);
  const mq = hub.hubModel({ items }, hub.parseParams({ q: 'laos family 7' }));
  assert.ok(mq.total > 0 && mq.total < items.length);
  assert.ok(mq.items.every((i) => i.country === 'laos' && /7/.test(`${i.title} ${i.l2_family} ${i.segment_key}`)));
  assert.equal(hub.hubModel({ items }, hub.parseParams({ q: 'zzzzz' })).total, 0);
});

test('hub HTML: under 80 KB with 4,000 rows, prev/next are real links, tiles and chips link out', async () => {
  const { items } = await hub.getIndex();
  const p = hub.parseParams({ page: '3' });
  const m = hub.hubModel({ items }, p);
  const html = renderHub(m, p, { loc: 'en', robots: 'noindex,follow' });
  assert.ok(Buffer.byteLength(html) < 80 * 1024, `hub is ${Buffer.byteLength(html)} bytes`);
  assert.match(html, /<a rel="prev" href="\/en\/market-maps\?page=2">/);
  assert.match(html, /<a rel="next" href="\/en\/market-maps\?page=4">/);
  assert.match(html, /<a class="tile" href="\/en\/market-maps\/vietnam">/);
  assert.match(html, /<a class="ichip" href="\/en\/market-maps\?industry=/);
  assert.equal((html.match(/<tr><td><a href="\/en\/market-maps\//g) || []).length, 50);
  assert.ok(html.includes('id="mm-table"') && html.includes('id="mm-q"') && html.includes('class="fgrp"'));
  assert.ok(!/\bAI\b|Claude/.test(html.replace(/<style>[\s\S]*?<\/style>/, '')));
  const first = renderHub(hub.hubModel({ items }, hub.parseParams({})), hub.parseParams({}), { loc: 'en' });
  assert.ok(first.includes('<span class="off">← Previous</span>'));
  assert.ok(!first.includes('rel="prev"'));
});

test('hub with nothing published: localised empty state', () => {
  const m = hub.hubModel({ items: [] }, hub.parseParams({}));
  assert.match(renderHub(m, hub.parseParams({}), { loc: 'ja' }), /企業リストを準備中です/);
});

test('country hub: every map of the country is a plain link, grouped by family, with breadcrumb JSON-LD', async () => {
  const { items } = await hub.getIndex();
  const c = hub.countryModel({ items }, 'vietnam');
  const html = renderCountryHub(c, {});
  const n = items.filter((i) => i.country === 'vietnam').length;
  assert.equal((html.match(/<li><a href="\/en\/market-maps\/vietnam\//g) || []).length, n);
  assert.match(html, /<h2>Family \d+ <i>\d+ lists?<\/i><\/h2>/);
  const ld = JSON.parse(/id="ld-breadcrumb">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.deepEqual(ld.itemListElement.map((x) => x.name), ['Kira Research', 'Market Map', 'Vietnam']);
  assert.equal(hub.countryModel({ items }, 'nowhere'), null);
});

test('route: hub, list JSON, country hub and 404 while indexing is off (all noindex)', async () => {
  indexingOn = false;
  const h = await call(handler, { type: 'hub', loc: 'en' });
  assert.equal(h.code, 200);
  assert.equal(robots(h.body), 'noindex,follow');
  assert.equal(h.headers['X-Robots-Tag'], 'noindex, follow');
  assert.ok(Buffer.byteLength(h.body) < 80 * 1024);
  assert.match(h.body, /61%/);   // phone share of the page rows comes from the second read
  const l = await call(handler, { type: 'list', country: 'laos', kind: 'services', page: '2' });
  const body = JSON.parse(l.body);
  assert.equal(body.page, 2); assert.equal(body.page_size, 50); assert.ok(body.total > 50);
  assert.ok(body.items.length === 50 && body.items.every((i) => i.country === 'laos' && i.kind === 'service'));
  const c = await call(handler, { type: 'country', loc: 'en', country: 'vietnam' });
  assert.equal(c.code, 200); assert.equal(robots(c.body), 'noindex,follow');
  assert.equal((await call(handler, { type: 'country', loc: 'en', country: 'nowhere' })).code, 404);
  assert.equal((await call(handler, { type: 'country', loc: 'en', country: '../x' })).code, 404);
});

test('route robots: switch on -> hub page 1 and country hubs index; filtered, later pages and non-English stay noindex', async () => {
  indexingOn = true;
  const cfg = await import('../api/_lib/config.js'); cfg.invalidateConfig();
  const h = await call(handler, { type: 'hub', loc: 'en' });
  assert.equal(robots(h.body), 'index,follow'); assert.equal(h.headers['X-Robots-Tag'], undefined);
  assert.equal(robots((await call(handler, { type: 'hub', loc: 'en', page: '2' })).body), 'noindex,follow');
  assert.equal(robots((await call(handler, { type: 'hub', loc: 'en', country: 'laos' })).body), 'noindex,follow');
  assert.equal(robots((await call(handler, { type: 'hub', loc: 'ja' })).body), 'noindex,follow');
  assert.equal(robots((await call(handler, { type: 'country', loc: 'en', country: 'vietnam' })).body), 'index,follow');
  assert.equal(robots((await call(handler, { type: 'country', loc: 'ko', country: 'vietnam' })).body), 'noindex,follow');
});

test('sitemap: its own file with hub, country hubs and indexable maps; index lists it only while the switch is on', async () => {
  const cfg = await import('../api/_lib/config.js');
  indexingOn = true; cfg.invalidateConfig();
  const mm = await call(sitemap, { }, '/api/sitemap?type=market-maps');
  const locs = [...mm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  const idx = ROWS.filter((r) => r.indexable);
  assert.equal(locs.length, 1 + COUNTRIES.length + idx.length);
  const locSet = new Set(locs);   // exact URL match (a Set, not substring search)
  assert.ok(locSet.has('https://kiraresearch.com/en/market-maps'));
  assert.ok(locSet.has('https://kiraresearch.com/en/market-maps/south-korea'));
  assert.ok(locSet.has(`https://kiraresearch.com/en/market-maps/${idx[0].slug}`));
  assert.ok(!locs.some((l) => ROWS.filter((r) => !r.indexable).some((r) => l.endsWith(r.slug))));
  const index = await call(sitemap, {}, '/api/sitemap');
  assert.match(index.body, /sitemap-market-maps\.xml/);
  indexingOn = false; cfg.invalidateConfig();
  assert.doesNotMatch((await call(sitemap, {}, '/api/sitemap')).body, /sitemap-market-maps/);
  assert.equal((await call(sitemap, {}, '/api/sitemap?type=market-maps')).body.includes('<loc>'), false);
});
