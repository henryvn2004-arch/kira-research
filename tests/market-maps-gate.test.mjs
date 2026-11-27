import test from 'node:test';
import assert from 'node:assert/strict';
import { isIndexable } from '../api/_lib/market-map/gate.js';

test('gate: 2 deep stages and >=50 companies passes', () => {
  assert.equal(isIndexable({ companies: 60, stages: [{ n: 30 }, { n: 20 }] }), true);
});
test('gate: one stage under 300 companies stays closed', () => {
  assert.equal(isIndexable({ companies: 299, stages: [{ n: 299 }] }), false);
});
test('gate: one stage with 300+ companies opens (soft gate)', () => {
  assert.equal(isIndexable({ companies: 300, stages: [{ n: 300 }] }), true);
});
test('gate: under 50 companies is always closed', () => {
  assert.equal(isIndexable({ companies: 40, stages: [{ n: 20 }, { n: 20 }] }), false);
  assert.equal(isIndexable(null), false);
});
