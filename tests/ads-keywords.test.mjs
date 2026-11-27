import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCampaignCsv, adFor, keywordsFor } from '../api/_lib/ads-campaign.js';
import { DEFAULT_LOCATIONS, DSA_NEGATIVES } from '../api/_lib/ads-dsa.js';

const topics = [
  { slug: 'vietnam-coffee-chains-market-overview', publishedSlug: 'vietnam-coffee-chains-2026', price: 47, country: 'Vietnam', segment: 'coffee chains', analysis: 'market overview', buyer_question: 'Where should a Japanese chain open first in Vietnam?' },
  { slug: 'thailand-pharma-competitive-landscape', publishedSlug: null, price: 0, country: 'Thailand', segment: 'pharmaceutical distribution', analysis: 'competitive landscape', buyer_question: '' }
];
const opts = { campaign: 'KIRA Reports - Pilot', budget: 20, maxCpc: '1.00', languages: 'English', priceOn: true, etaDays: 3, locations: DEFAULT_LOCATIONS, negatives: DSA_NEGATIVES };

test('keyword campaign: paused, default locations (no UK/EU), shared negatives', () => {
  const { csv, groups } = buildCampaignCsv(topics, opts);
  assert.equal(groups, 2);
  for (const l of ['Japan', 'South Korea', 'Singapore', 'Taiwan', 'Australia', 'United States']) assert.ok(csv.includes(l), l);
  assert.ok(!/United Kingdom|Ireland|Germany|France/.test(csv));
  assert.ok(!/Enabled/.test(csv));
  assert.match(csv, /"distributors list"|distributors list,Negative Phrase/);
  assert.ok(csv.includes('Negative Phrase'));
  const head = csv.split('\n')[0].split(',');
  assert.ok(head.includes('Location'));
});

test('price headline = the report own price, only for a published report', () => {
  const a = adFor(topics[0], { priceOn: true, published: true, etaDays: 3 });
  assert.ok(a.headlines.includes('Full report: $47'));
  const b = adFor(topics[1], { priceOn: true, published: false, etaDays: 3 });
  assert.ok(!b.headlines.some((h) => h.includes('$')));
  const c = adFor(topics[0], { priceOn: false, published: true, etaDays: 3 });
  assert.ok(!c.headlines.some((h) => h.includes('$')));
});

test('copy rules: headlines <= 30, descriptions <= 90, no banned words, no hard-coded old prices', () => {
  for (const t of topics) {
    const a = adFor(t, { priceOn: true, published: !!t.publishedSlug, etaDays: 3 });
    for (const h of a.headlines) assert.ok(h.length <= 30, h);
    for (const d of a.descriptions) assert.ok(d.length <= 90, d);
    const all = [...a.headlines, ...a.descriptions].join(' ');
    assert.ok(!/\bAI\b|platform|claude|mckinsey|mordor|frost|euromonitor|ipsos|synovate/i.test(all), all);
    assert.ok(!/\$(29|39|49)\b/.test(all) || t.price === 49, all);
  }
  assert.ok(keywordsFor(topics[0]).length >= 2);
});
