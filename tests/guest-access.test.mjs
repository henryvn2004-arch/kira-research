import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signGuestToken, verifyGuestToken, maskEmail, guestOwns } from '../api/_lib/guest-access.js';

const key = 'k'.repeat(32);
const pid = '123e4567-e89b-12d3-a456-426614174000';

test('sign and verify', () => {
  const t = signGuestToken({ kind: 'report', slug: 'vn-coffee', pid, key });
  assert.deepEqual(verifyGuestToken(t, 'report', 'vn-coffee', { key }), { kind: 'report', slug: 'vn-coffee', pid });
});
test('item, kind and key mismatches are refused', () => {
  const t = signGuestToken({ kind: 'report', slug: 'vn-coffee', pid, key });
  assert.equal(verifyGuestToken(t, 'report', 'other-report', { key }), null);
  assert.equal(verifyGuestToken(t, 'transcript', 'vn-coffee', { key }), null);
  assert.equal(verifyGuestToken(t, 'report', 'vn-coffee', { key: 'z'.repeat(32) }), null);
});
test('expired, tampered and secret-less tokens are refused', () => {
  const t = signGuestToken({ kind: 'report', slug: 'a-b', pid, key, now: Date.now() - 31 * 86400000 });
  assert.equal(verifyGuestToken(t, 'report', 'a-b', { key }), null);
  const good = signGuestToken({ kind: 'report', slug: 'a-b', pid, key });
  const [p, s] = good.split('.');
  const forged = Buffer.from(JSON.stringify({ k: 'report', s: 'a-b', p: pid, e: 9999999999 })).toString('base64url') + '.' + s;
  assert.equal(verifyGuestToken(forged, 'report', 'a-b', { key }), null);
  assert.equal(verifyGuestToken(p + '.' + s.slice(0, -2) + 'AA', 'report', 'a-b', { key }), null);
  assert.equal(signGuestToken({ kind: 'report', slug: 'a-b', pid, key: null }), null);
  assert.equal(verifyGuestToken(good, 'report', 'a-b', { key: null }), null);
});
test('guestOwns without a valid header never touches the database', async () => {
  assert.equal(await guestOwns({ headers: {} }, 'report', 'a-b'), null);
  assert.equal(await guestOwns({ headers: { 'x-guest-token': 'junk' } }, 'report', 'a-b'), null);
});
test('maskEmail', () => { assert.equal(maskEmail('victim@x.com'), 'v***@x.com'); });
