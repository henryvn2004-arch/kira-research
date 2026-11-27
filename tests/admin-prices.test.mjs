import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRarity } from '../api/_lib/rarity.js';

test('parseRarity accepts 1.0–1.3 and rounds to 2 decimals', () => {
  assert.deepEqual(parseRarity(1), { ok: true, value: 1 });
  assert.deepEqual(parseRarity('1.3'), { ok: true, value: 1.3 });
  assert.deepEqual(parseRarity(1.05), { ok: true, value: 1.05 });
  assert.equal(parseRarity(1.1234).value, 1.12);
});
test('parseRarity rejects out of range, empty and non-numeric', () => {
  for (const v of [0.99, 1.31, 2, -1]) assert.equal(parseRarity(v).error, 'rarity_out_of_range');
  for (const v of [null, undefined, '', true]) assert.equal(parseRarity(v).error, 'rarity_required');
  for (const v of ['abc', NaN, Infinity]) assert.equal(parseRarity(v).ok, false);
});
