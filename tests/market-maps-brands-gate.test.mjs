// Brands exhibit gate: shown only when >= 30% of the segment's companies have brands from site-verified brand-product pairs
// (coverage.brands.share_linked). Unknown share (stats built before stats_version 6) hides it. Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { show } from '../api/_lib/market-map/render.js';

const S = (cb, over = {}) => ({
  brands: [{ brand: 'Acme', companies: 6 }, { brand: 'Beta', companies: 3 }],
  coverage: { brands: { n_filled: 40, share_filled: 0.4, ...cb } }, thresholds: {}, ...over,
});

test('brands shown at or above 0.3 linked share', () => {
  assert.equal(show(S({ share_linked: 0.3 }), 'brands'), true);
  assert.equal(show(S({ share_linked: 0.72 }), 'brands'), true);
});

test('brands hidden below 0.3, when unknown, or when the field is missing', () => {
  assert.equal(show(S({ share_linked: 0.061 }), 'brands'), false);
  assert.equal(show(S({ share_linked: null }), 'brands'), false);
  assert.equal(show(S({}), 'brands'), false);
  assert.equal(show({ brands: S({}).brands }, 'brands'), false);
});

test('existing rules still apply and the threshold can come from the file', () => {
  assert.equal(show(S({ share_linked: 0.9, n_filled: 3 }), 'brands'), false);
  assert.equal(show(S({ share_linked: 0.9 }, { brands: [{ brand: 'A', companies: 1 }] }), 'brands'), false);
  assert.equal(show(S({ share_linked: 0.5 }, { thresholds: { brands_linked_min: 0.6 } }), 'brands'), false);
});
