import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLists, getBizdirectLists, listsBlockHtml, _clearCache } from '../api/_lib/bizdirect-lists.js';
import { matchMarketMap } from '../api/_lib/market-map-match.js';

const good = { lists: [
  { url: 'https://bizdirectasia.com/vietnam/coffee-roasters', title: 'Coffee roasters in Vietnam', role: 'manufacturer', n: 120 },
  { url: 'https://bizdirectasia.com/vietnam/coffee-distributors', title: 'Coffee distributors', role: 'distributor', n: 300 },
  { url: 'https://evil.example.com/x', title: 'Bad host', n: 999 },
  { url: 'https://bizdirectasia.com/a', title: '', n: 5 },
] };
test('parseLists: sorts by n, drops foreign hosts and empty titles', () => {
  const r = parseLists(good);
  assert.deepEqual(r.map((x) => x.n), [300, 120]);
  assert.deepEqual(parseLists(null), []);
  assert.deepEqual(parseLists({ lists: 'x' }), []);
});
test('getBizdirectLists: API errors, timeouts and bad slugs give []', async () => {
  _clearCache();
  assert.deepEqual(await getBizdirectLists('vietnam', 'coffee', { fetchImpl: async () => ({ ok: false }) }), []);
  _clearCache();
  assert.deepEqual(await getBizdirectLists('vietnam', 'coffee', { fetchImpl: async () => { throw new Error('boom'); } }), []);
  _clearCache();
  assert.deepEqual(await getBizdirectLists('vietnam', 'coffee', { fetchImpl: (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => rej(new Error('aborted')))) }), []);
  assert.deepEqual(await getBizdirectLists('Viet Nam!', 'coffee', { fetchImpl: async () => { throw new Error('must not be called'); } }), []);
});
test('getBizdirectLists: caches an answer', async () => {
  _clearCache();
  let calls = 0;
  const f = async () => { calls++; return { ok: true, json: async () => good }; };
  await getBizdirectLists('vietnam', 'coffee', { fetchImpl: f });
  const r = await getBizdirectLists('vietnam', 'coffee', { fetchImpl: f });
  assert.equal(calls, 1);
  assert.equal(r.length, 2);
});
test('listsBlockHtml: 4 languages, escapes, empty = ""', () => {
  const rows = parseLists(good);
  for (const l of ['en', 'ja', 'ko', 'zh']) assert.match(listsBlockHtml(rows, l), /bizdirectasia\.com\/vietnam\/coffee-distributors/);
  assert.match(listsBlockHtml(rows, 'en'), /See the full lists on BizDirect Asia/);
  assert.equal(listsBlockHtml([], 'en'), '');
  assert.doesNotMatch(listsBlockHtml(rows, 'en'), /utm_|nofollow/);
  assert.doesNotMatch(listsBlockHtml(rows, 'en'), /\bAI\b|platform|Claude/);
});

const maps = [
  { country: 'vietnam', segment_key: 'coffee', title: 'Coffee' },
  { country: 'vietnam', segment_key: 'tea', title: 'Tea' },
  { country: 'vietnam', segment_key: 'it-services-other', title: 'Other IT services' },
  { country: 'south-korea', segment_key: 'hotels-resorts', title: 'Hotels and resorts' },
  { country: 'thailand', segment_key: 'rice', title: 'Rice' },
];
test('matchMarketMap: same country, all map words present', () => {
  assert.deepEqual(matchMarketMap({ country: 'Vietnam', segment: 'coffee chains', keywords: [], industry: 'food service' }, maps), { country: 'vietnam', segment_key: 'coffee' });
  assert.deepEqual(matchMarketMap({ country: 'South Korea', segment: 'hotels and resorts', industry: 'tourism' }, maps), { country: 'south-korea', segment_key: 'hotels-resorts' });
});
test('matchMarketMap: wrong country, industry-only hit, healthcare IT and ties give null', () => {
  assert.equal(matchMarketMap({ country: 'Thailand', segment: 'coffee' }, maps), null);
  assert.equal(matchMarketMap({ country: 'Vietnam', segment: 'cafes', industry: 'coffee' }, maps), null);
  assert.equal(matchMarketMap({ country: 'Vietnam', segment: 'healthcare it' }, maps), null);
  assert.equal(matchMarketMap({ country: 'Vietnam', segment: 'coffee and tea' }, maps), null);
  assert.equal(matchMarketMap({ country: '', segment: 'coffee' }, maps), null);
});
