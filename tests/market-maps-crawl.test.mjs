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
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send(b) { resolve({ ...this, body: b }); }, json(b) { resolve({ ...this, body: JSON.stringify(b) }); } };
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
