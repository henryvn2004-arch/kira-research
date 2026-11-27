import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { licencePrice, licencePrices, noNine, normLicence } from '../api/_lib/licence.js';
import { buildCustomId, parseCustomId } from '../api/_lib/paypal-check.js';
import { safeNext } from '../api/_lib/guest-checkout.js';

test('licence prices: whole dollars, never ending in 9', () => {
  assert.equal(licencePrice(44, 'single'), 44);
  assert.equal(licencePrice(44, 'team'), 79 - 1);   // 79.2 -> 79 -> 78
  assert.equal(licencePrice(44, 'company'), 114);   // 114.4
  for (let b = 14; b <= 78; b++) for (const l of ['single', 'team', 'company']) {
    const p = licencePrice(b, l);
    assert.ok(Number.isInteger(p));
    if (l !== 'single') assert.notEqual(p % 10, 9);
  }
  assert.equal(noNine(59), 58);
  assert.equal(normLicence('bogus'), 'single');
  assert.deepEqual(Object.keys(licencePrices(30)), ['single', 'team', 'company']);
});

test('browser mirror matches the server rule', () => {
  const ctx = { window: {}, document: {}, location: { pathname: '/en/' } };
  vm.runInNewContext(readFileSync('public/js/checkout.js', 'utf8'), ctx);
  for (let b = 14; b <= 78; b++) for (const l of ['single', 'team', 'company']) {
    assert.equal(ctx.window.kiraCheckout.licencePrice(b, l), licencePrice(b, l));
  }
});

test('custom_id carries licence and guest nonce', () => {
  const nonce = '123e4567-e89b-12d3-a456-426614174000';
  assert.equal(buildCustomId('report', 'a-b', 'en', nonce), `report:a-b|en|${nonce}`);
  const id = buildCustomId('report', 'a-b', 'en', nonce, 'team');
  assert.deepEqual(parseCustomId('report', id), { item: 'a-b', locale: 'en', userId: nonce, licence: 'team' });
  assert.equal(parseCustomId('report', `report:a-b|en|${nonce}`).licence, 'single');
  assert.equal(parseCustomId('report', `report:a-b|en|${nonce}|evil`).licence, 'single');
});

test('safeNext only allows same-site paths', () => {
  assert.equal(safeNext('/en/reports/x'), '/en/reports/x');
  assert.equal(safeNext('//evil.com'), '/');
  assert.equal(safeNext('https://evil.com'), '/');
});
