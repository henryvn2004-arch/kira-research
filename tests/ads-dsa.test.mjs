import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedItems, buildPageFeed, buildDsaCsv, DSA_NEGATIVES, BIZDIRECT_NEGATIVES, NOT_NEGATIVE, negativesText, dsaDescriptions, labelsFor } from '../api/_lib/ads-dsa.js';

const maps = [
  { slug: 'japan/coffee-chains', country: 'Japan', n_companies: 120, indexable: true, commentary: { a: 1 } },
  { slug: 'vietnam/pharma', country: 'Viet Nam', n_companies: 900, indexable: true, commentary: { a: 1 } },
  { slug: 'japan/thin', country: 'Japan', n_companies: 30, indexable: true, commentary: { a: 1 } },
  { slug: 'japan/noindex', country: 'Japan', n_companies: 200, indexable: false, commentary: { a: 1 } },
  { slug: 'japan/nocomment', country: 'Japan', n_companies: 200, indexable: true, commentary: null }
];
const reports = [
  { slug: 'a-2026', country: 'Vietnam', price: 49, status: 'published', hasEn: true },
  { slug: 'draft', country: 'Vietnam', price: 49, status: 'draft', hasEn: true },
  { slug: 'noen', country: 'Vietnam', price: 49, status: 'published', hasEn: false }
];
const transcripts = [
  { slug: 't1', market: 'Thailand', status: 'published', hasEn: true },
  { slug: 't2', market: 'Thailand', status: 'draft', hasEn: true }
];

test('feed has only indexable EN pages, right paths, labels and prices', () => {
  const items = feedItems({ maps, reports, transcripts });
  assert.deepEqual(items.map((i) => i.url), [
    'https://kiraresearch.com/en/market-maps/japan/coffee-chains',
    'https://kiraresearch.com/en/market-maps/vietnam/pharma',
    'https://kiraresearch.com/en/reports/a-2026',
    'https://kiraresearch.com/en/experts/transcripts/t1'
  ]);
  assert.deepEqual(labelsFor(items[0]), ['kind_map', 'country_japan', 'price_28']);
  assert.deepEqual(labelsFor(items[1]), ['kind_map', 'country_viet-nam', 'price_38']);
  assert.deepEqual(labelsFor(items[2]), ['kind_report', 'country_vietnam', 'price_49']);
  assert.deepEqual(labelsFor(items[3]), ['kind_transcript', 'country_thailand', 'price_14']);
  for (const i of items) assert.ok(!/noindex|thin|draft|nocomment|admin|coming-soon|\/(ja|ko|zh)\//.test(i.url));
});

test('page feed CSV format and counts', () => {
  const f = buildPageFeed({ maps, reports, transcripts });
  const lines = f.csv.trim().split('\n');
  assert.equal(lines[0], 'Page URL,Custom label');
  assert.equal(lines[1], 'https://kiraresearch.com/en/market-maps/japan/coffee-chains,kind_map;country_japan;price_28');
  assert.deepEqual(f.counts, { map: 2, report: 1, transcript: 1 });
  assert.equal(f.total, 4);
});

test('negatives: BizDirect cross-negatives in, plain "list" out', () => {
  for (const k of ['distributors', 'distributors list', 'list of companies', 'company list', 'directory', 'supplier list', 'manufacturers list',
    'importers list', 'contact', 'contacts', 'email', 'phone', 'b2b database', 'jobs', 'salary', 'free download', 'pdf free', 'wiki', 'near me', 'distributor', 'suppliers'])
    assert.ok(DSA_NEGATIVES.includes(k), k);
  for (const k of NOT_NEGATIVE) assert.ok(!DSA_NEGATIVES.includes(k), `"${k}" must not be negative`);
  assert.equal(new Set(DSA_NEGATIVES).size, DSA_NEGATIVES.length);
  assert.ok(BIZDIRECT_NEGATIVES.length >= 15);
  const txt = negativesText();
  assert.match(txt, /"distributors list"/);
  assert.match(txt, /plain word "list" is NOT negative/);
});

test('DSA campaign: paused, $10, 6 locations (no UK), page-feed targets, copy rules', () => {
  const { csv, descriptions } = buildDsaCsv({ reportPrice: 39, transcriptPrice: 29 });
  const lines = csv.trim().split('\n');
  assert.ok(lines[1].includes('Paused') && lines[1].includes(',10,Daily,'));
  assert.ok(lines[1].includes('{lpurl}') && lines[1].includes('Page feed'));
  for (const l of ['Japan', 'South Korea', 'Singapore', 'Taiwan', 'Australia', 'United States']) assert.ok(csv.includes(l), l);
  assert.ok(!/United Kingdom|Ireland|Germany|France/.test(csv));
  for (const k of ['kind_map', 'kind_report', 'kind_transcript']) assert.ok(csv.includes(`Custom label equals ${k}`));
  assert.ok(!/Enabled/.test(csv));
  for (const d of Object.values(descriptions).flat()) {
    assert.ok(d.length <= 90, `${d.length}: ${d}`);
    assert.ok(!/\bAI\b|platform|claude|mckinsey|mordor|frost|euromonitor|ipsos|synovate/i.test(d), d);
  }
  assert.ok(descriptions.map[0].includes('$18'));
});

test('no report/transcript price in copy while those checkouts are off', () => {
  const d = dsaDescriptions({});
  assert.ok(!/\$/.test(d.report.join(' ') + d.transcript.join(' ')));
});

test('kiraPurchase: fires once per order, with value and no email', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../public/js/track.js', import.meta.url), 'utf8');
  const store = {}, calls = [];
  const win = { gtag: (...a) => calls.push(a), location: { hostname: 'kiraresearch.com', pathname: '/en/x', search: '' }, addEventListener() {} };
  const g = { window: win, navigator: {}, document: { referrer: '', addEventListener() {}, readyState: 'loading' }, location: win.location,
    sessionStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };
  new Function(...Object.keys(g), src)(...Object.values(g));
  const o = { id: 'ord-1', value: 49, currency: 'USD', slug: 'a-2026', name: 'A', kind: 'report' };
  win.kiraPurchase(o); win.kiraPurchase(o);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].slice(0, 2), ['event', 'purchase']);
  assert.equal(calls[0][2].transaction_id, 'ord-1');
  assert.equal(calls[0][2].value, 49);
  assert.ok(!JSON.stringify(calls[0]).includes('@'));
});
