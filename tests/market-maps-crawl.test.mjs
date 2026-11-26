// Crawl-cost guards for the market maps (~3,000 server-rendered URLs): CDN life of the pages and the robots.txt lines that keep
// crawlers off the non-English copies. Mocked fetch, no database. Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

process.env.SUPABASE_URL = 'https://db.example';
process.env.SUPABASE_SERVICE_KEY = 'k-test';
globalThis.fetch = async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json', 'content-range': '*/0' } });

const { default: handler } = await import('../api/market-maps.js');

function call(h, query) {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send(b) { resolve({ ...this, body: b }); }, json(b) { resolve({ ...this, body: JSON.stringify(b) }); }, end() { resolve({ ...this }); } };
    h({ method: 'GET', query, url: '/', headers: { host: 'kiraresearch.com' } }, res);
  });
}

test('hub page: CDN keeps it 1 hour fresh and serves stale for a day', async () => {
  const r = await call(handler, { type: 'hub', loc: 'en' });
  assert.equal(r.code, 200);
  assert.match(r.headers['Cache-Control'], /s-maxage=3600/);
  assert.match(r.headers['Cache-Control'], /stale-while-revalidate=86400/);
});

test('robots.txt: ja/ko/zh market maps are open to every group (translated pages are indexable since 2026-11-25), admin and api stay closed', () => {
  const groups = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8').split(/\n\s*\n/).filter((g) => /^User-agent:/m.test(g));
  const allowing = groups.filter((g) => /^Allow:\s*\/\s*$/m.test(g));
  assert.ok(allowing.length >= 3, 'expected the *, search-bot and training-bot groups');
  for (const g of allowing) {
    assert.doesNotMatch(g, /^Disallow:\s*\/(en|ja|ko|zh)?\/?market-maps/m);
    for (const loc of ['en', 'ja', 'ko', 'zh']) assert.match(g, new RegExp(`^Disallow:\\s*/${loc}/admin/\\s*$`, 'm'));
  }
});

// A stray query string would be a new CDN key (render + Supabase reads) per value: it is dropped with a redirect to the clean URL.
test('map page: unknown query parameter redirects to the clean URL, tracking parameters stay', async () => {
  const r = await call(handler, { type: 'map', loc: 'en', country: 'vietnam', segment: 'soft-drinks', x: '123' });
  assert.equal(r.code, 308);
  assert.equal(r.headers.Location, '/en/market-maps/vietnam/soft-drinks');
  assert.match(r.headers['Cache-Control'], /s-maxage=3600/);
  const t = await call(handler, { type: 'map', loc: 'ja', country: 'vietnam', segment: 'soft-drinks', x: '1', utm_source: 'mail', gclid: 'abc' });
  assert.equal(t.code, 308);
  assert.equal(t.headers.Location, '/ja/market-maps/vietnam/soft-drinks?utm_source=mail&gclid=abc');
  const ok = await call(handler, { type: 'map', loc: 'en', country: 'vietnam', segment: 'soft-drinks', utm_source: 'mail' });
  assert.notEqual(ok.code, 308);   // tracking only: served, not redirected
});

test('country and hub pages: unknown parameters redirect, filters of the hub are kept', async () => {
  const c = await call(handler, { type: 'country', loc: 'en', country: 'vietnam', cb: '9' });
  assert.equal(c.code, 308);
  assert.equal(c.headers.Location, '/en/market-maps/vietnam');
  const h = await call(handler, { type: 'hub', loc: 'en', country: 'vietnam', cb: '9' });
  assert.equal(h.code, 308);
  assert.match(h.headers.Location, /^\/en\/market-maps\?country=vietnam$/);
  const clean = await call(handler, { type: 'hub', loc: 'en', country: 'vietnam', page: '2' });
  assert.equal(clean.code, 200);
  const bad = await call(handler, { type: 'map', loc: 'en', country: 'vi etnam', segment: 'x', cb: '9' });
  assert.equal(bad.code, 404);   // bad slug: normal 404, no redirect loop
});

test('ssr: a report slug that is neither published nor a topic is a real 404 with noindex', async () => {
  const { default: ssr } = await import('../api/ssr.js');
  const r = await new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send(b) { resolve({ ...this, body: b }); }, json(b) { resolve({ ...this, body: JSON.stringify(b) }); }, end() { resolve(this); } };
    ssr({ method: 'GET', url: '/api/ssr?type=report&loc=en&slug=zz-made-up-slug', headers: { host: 'kiraresearch.com' } }, res);
  });
  assert.equal(r.code, 404);
  assert.equal(r.headers['X-Robots-Tag'], 'noindex');
});
