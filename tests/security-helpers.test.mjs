import test from 'node:test';
import assert from 'node:assert/strict';
import { cronAuthorized } from '../api/_lib/cron-auth.js';
import { buildCustomId, parseCustomId, validateCapture, captureOrder } from '../api/_lib/paypal-check.js';
import { isAdminEmail } from '../api/_lib/admin-auth.js';

const req = (h) => ({ headers: h ? { authorization: h } : {} });

test('cron auth fails closed when no secret is set', () => {
  assert.equal(cronAuthorized(req('Bearer x'), undefined), false);
  assert.equal(cronAuthorized(req(), ''), false);
  assert.equal(cronAuthorized(req('Bearer '), ''), false);
});
test('cron auth accepts only the exact bearer', () => {
  assert.equal(cronAuthorized(req('Bearer s3cret'), 's3cret'), true);
  assert.equal(cronAuthorized(req('Bearer s3cre'), 's3cret'), false);
  assert.equal(cronAuthorized(req('s3cret'), 's3cret'), false);
  assert.equal(cronAuthorized(req(), 's3cret'), false);
});

test('admin check fails closed on an empty list', () => {
  assert.equal(isAdminEmail('a@b.c', []), false);
  assert.equal(isAdminEmail('A@b.c', ['a@b.c']), true);
});

const UID = '123e4567-e89b-12d3-a456-426614174000';
test('custom_id carries kind + item + buyer', () => {
  const id = buildCustomId('report', 'vn-coffee-2026', 'en', UID);
  assert.deepEqual(parseCustomId('report', id), { item: 'vn-coffee-2026', locale: 'en', userId: UID });
  assert.equal(parseCustomId('transcript', id), null);          // wrong product
  assert.equal(parseCustomId('report', 'vn-coffee-2026|en'), null); // legacy / no buyer
});

const unit = (o = {}) => ({ payments: { captures: [{ status: 'COMPLETED', amount: { currency_code: 'USD', value: '49.00' }, ...o }] } });
test('capture must be COMPLETED, USD and the server price', () => {
  assert.equal(validateCapture(unit(), 49).ok, true);
  assert.equal(validateCapture(unit({ status: 'PENDING' }), 49).ok, false);
  assert.equal(validateCapture(unit({ amount: { currency_code: 'EUR', value: '49.00' } }), 49).ok, false);
  assert.equal(validateCapture(unit(), 99).ok, false);
  assert.equal(validateCapture({}, 49).ok, false);
});

function fakeFetch(order) {
  return async (url, opts = {}) => ({
    ok: true, status: 200,
    json: async () => (opts.method === 'POST' ? { ...order, status: 'COMPLETED' } : order),
  });
}
const order = (custom, amount = '49.00') => ({ status: 'APPROVED', purchase_units: [{ custom_id: custom, ...unit({ amount: { currency_code: 'USD', value: amount } }) }] });

test('captureOrder refuses an order started by another account, before capturing', async () => {
  let captured = false;
  const f = async (u, o = {}) => { if (o.method === 'POST') captured = true; return { ok: true, status: 200, json: async () => order(buildCustomId('report', 's-1', 'en', UID)) }; };
  const r = await captureOrder({ token: 't', orderId: 'O1', kind: 'report', userId: '00000000-0000-0000-0000-000000000000', priceFor: async () => ({ expected: 49 }), fetchImpl: f });
  assert.equal(r.error, 'order_not_yours');
  assert.equal(captured, false);
});
test('captureOrder accepts a matching order and rejects a wrong amount', async () => {
  const cid = buildCustomId('report', 's-1', 'en', UID);
  const ok = await captureOrder({ token: 't', orderId: 'O1', kind: 'report', userId: UID, priceFor: async () => ({ expected: 49 }), fetchImpl: fakeFetch(order(cid)) });
  assert.equal(ok.paid, 49);
  const bad = await captureOrder({ token: 't', orderId: 'O1', kind: 'report', userId: UID, priceFor: async () => ({ expected: 49 }), fetchImpl: fakeFetch(order(cid, '29.00')) });
  assert.equal(bad.error, 'payment_mismatch');
});
