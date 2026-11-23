// Unit tests for the headline rules in api/_lib/moves/rules.js. Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../api/_lib/moves/rules.js';

test('real moves are classified', () => {
  const a = classify('Birla Carbon Inaugurates Rayong Plant in Thailand');
  assert.equal(a.host_country, 'TH'); assert.equal(a.type, 'plant');
  const b = classify('Japanese retailer opens first store in Vietnam');
  assert.equal(b.host_country, 'VN'); assert.equal(b.investor_country, 'JP');
  assert.equal(classify('Samsung breaks ground on new campus in Vietnam').host_country, 'VN');
});

test('North Korea is not a market; power plants are not factories', () => {
  assert.equal(classify('UN watchdog concerned as North Korea expands uranium enrichment'), null);
  assert.equal(classify('Developer plans virtual power plant in Singapore'), null);
  assert.equal(classify('Water treatment plant opens in Vietnam'), null);
  assert.equal(classify('Japan buys stake in South Korea chipmaker').host_country, 'KR');
});
