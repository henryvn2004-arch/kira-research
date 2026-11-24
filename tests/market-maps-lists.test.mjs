// Market-map ranked lists: a merged label (two spellings of one country / certification) is a lower bound and is printed as such. Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { titles } from '../api/_lib/market-map/render.js';

const S = (over = {}) => ({
  country: 'Australia', segment: 'Test', meta: { kind: 'goods', axis: 'stage', mekko: null },
  findings: { top_stage: { stage: 'Importer / exporter', pct: 40 }, top_sub: { name: 'x', pct: 10 }, small_pct: 50, large_pct: 10 },
  stages: [], tiers_by_stage: [], brands: [], channels: [], certifications: [], origins: [], ...over,
});

test('origin title states a lower bound for a merged entry and an exact count otherwise', () => {
  assert.match(titles(S({ origins: [{ name: 'Germany', n: 12, lb: true }] })).origins, /Germany is the most-cited sourcing origin \(at least 12 companies\)/);
  assert.match(titles(S({ origins: [{ name: 'Germany', n: 12 }] })).origins, /\(12 companies\)/);
});

test('certification and channel titles follow the same rule', () => {
  assert.match(titles(S({ certifications: [{ name: 'ISO 9001', n: 30, lb: true }] })).certs, /\(at least 30 companies\)/);
  assert.match(titles(S({ channels: [{ name: 'online', n: 9 }] })).channels, /\(9 companies\)/);
});
