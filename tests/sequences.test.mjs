// Selection rules of the email sequences (api/_lib/sequences.js) and the i18n/layout shells. No network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dueTopicSteps, dueBuyerSteps, dueAbandoned, pickRelated, digestFor, ownedSet, optoutUrl, verifyEmailSig, signEmail, slugify, HOUR, DAY } from '../api/_lib/sequences.js';
import { tr, STRING_KEYS, STRINGS, LOCALES, reasonLine, normLocale } from '../api/_lib/email-i18n.js';
import { renderMail } from '../api/_lib/email-layout.js';

const NOW = Date.parse('2026-12-01T12:00:00Z');
const ago = (ms) => new Date(NOW - ms).toISOString();

test('A: +3 days reminder, +10 days related, nothing before or long after', () => {
  const req = (id, ms, email = `${id}@x.com`) => ({ request_id: id, email, report_slug: 'vn-coffee', notified_at: ago(ms) });
  const requests = [req('early', 2 * DAY), req('r3', 3 * DAY + HOUR), req('r10', 10 * DAY + HOUR), req('r5', 5 * DAY), req('old', 20 * DAY)];
  const got = dueTopicSteps({ requests, buyers: [], now: NOW }).map((x) => `${x.request.request_id}:${x.kind}`);
  assert.deepEqual(got.sort(), ['r10:A10', 'r3:A3', 'r5:A3']);
});

test('A: buyers, opt-outs and already-sent steps are excluded', () => {
  const requests = [
    { request_id: 'a', email: 'Bought@X.com', report_slug: 'vn-coffee', notified_at: ago(4 * DAY) },
    { request_id: 'b', email: 'out@x.com', report_slug: 'vn-coffee', notified_at: ago(4 * DAY) },
    { request_id: 'c', email: 'sent@x.com', report_slug: 'vn-coffee', notified_at: ago(4 * DAY) },
    { request_id: 'd', email: 'other@x.com', report_slug: 'vn-coffee', notified_at: ago(4 * DAY) }
  ];
  const buyers = [{ email: 'bought@x.com', slug: 'vn-coffee' }, { email: 'other@x.com', slug: 'another-report' }];
  const got = dueTopicSteps({ requests, buyers, optouts: new Set(['out@x.com']), logged: new Set(['A3|c']), now: NOW });
  assert.deepEqual(got.map((x) => x.request.request_id), ['d']);          // bought a different report: still gets the reminder
});

test('A: a request already past +10 days gets only the +10 email', () => {
  const got = dueTopicSteps({ requests: [{ request_id: 'z', email: 'z@x.com', report_slug: 's', notified_at: ago(11 * DAY) }], buyers: [], logged: new Set(['A3|z']), now: NOW });
  assert.deepEqual(got.map((x) => x.kind), ['A10']);
});

test('D: one follow-up per person, only 3-9 days after, never twice, respects opt-out', () => {
  const p = (key, email, ms) => ({ purchase_key: key, email, captured_at: ago(ms), slug: key });
  const buyers = [p('r:1', 'a@x.com', 4 * DAY), p('t:2', 'a@x.com', 5 * DAY), p('r:3', 'b@x.com', 1 * DAY), p('r:4', 'c@x.com', 4 * DAY),
    p('r:5', 'd@x.com', 4 * DAY), p('r:6', 'e@x.com', 12 * DAY), p('r:7', 'f@x.com', 4 * DAY)];
  const got = dueBuyerSteps({ buyers, optouts: new Set(['c@x.com']), logged: new Set(['D3|r:5']), loggedEmails: new Set(['f@x.com']), now: NOW });
  assert.deepEqual(got.map((x) => x.purchase.purchase_key), ['t:2']);       // a@x.com once (earliest purchase), others excluded
});

test('ABN: +1 h then +24 h, one email per order, paid or owned orders are skipped', () => {
  const o = (id, ms, extra = {}) => ({ paypal_order_id: id, email: `${id}@x.com`, slug: `s-${id}`, created_at: ago(ms), ...extra });
  const orders = [o('young', 30 * 60e3), o('h1', 90 * 60e3), o('h24', 25 * HOUR), o('old', 80 * HOUR), o('paid', 2 * HOUR), o('owned', 2 * HOUR), o('sent', 2 * HOUR), o('out', 2 * HOUR)];
  const got = dueAbandoned({ orders, paidOrders: new Set(['paid']), buyers: [{ email: 'owned@x.com', slug: 's-owned' }],
    optouts: new Set(['out@x.com']), logged: new Set(['ABN1|sent']), now: NOW }).map((x) => `${x.order.paypal_order_id}:${x.kind}`);
  assert.deepEqual(got.sort(), ['h1:ABN1', 'h24:ABN24']);
});

test('ABN: an order whose +1 h email was sent gets the +24 h one, not a second +1 h', () => {
  const orders = [{ paypal_order_id: 'x', email: 'x@x.com', slug: 's', created_at: ago(25 * HOUR) }];
  assert.equal(dueAbandoned({ orders, logged: new Set(['ABN1|x']), now: NOW })[0].kind, 'ABN24');
  assert.equal(dueAbandoned({ orders, logged: new Set(['ABN1|x', 'ABN24|x']), now: NOW }).length, 0);
});

test('related: same country+industry first, mixed kinds, never owned or the base item', () => {
  const catalog = [
    { kind: 'report', slug: 'vn-coffee-2', country: 'Vietnam', industry: 'Coffee', published_at: '2026-10-01' },
    { kind: 'report', slug: 'vn-coffee-1', country: 'Vietnam', industry: 'Coffee', published_at: '2026-09-01' },
    { kind: 'transcript', slug: 'vn-t', country: 'vietnam', industry: 'Food', published_at: '2026-08-01' },
    { kind: 'report', slug: 'th-coffee', country: 'Thailand', industry: 'Coffee', published_at: '2026-11-01' },
    { kind: 'report', slug: 'jp-steel', country: 'Japan', industry: 'Steel', published_at: '2026-11-02' },
    { kind: 'list', slug: 'vietnam/coffee', country: 'vietnam', industry: 'coffee', published_at: '2026-07-01' }
  ];
  const owned = ownedSet([{ email: 'a@x.com', slug: 'vn-coffee-2' }]);
  const got = pickRelated({ country: 'Vietnam', industry: 'Coffee', baseSlug: 'vn-coffee-1', owned, email: 'A@x.com', catalog });
  assert.equal(got.length, 2);
  assert.ok(!got.some((x) => x.slug === 'vn-coffee-1' || x.slug === 'vn-coffee-2' || x.slug === 'jp-steel'));
  assert.notEqual(got[0].kind, got[1].kind);
  assert.equal(got[0].slug, 'vietnam/coffee');                              // best tier, different kinds preferred
});

test('digest: weekly, only items newer than the last digest, matching country (+ industry), max 5', () => {
  const alert = { country: 'south-korea', industry: null, confirmed_at: ago(10 * DAY), last_digest_at: null };
  const mk = (slug, days, country = 'South Korea', industry = 'x') => ({ kind: 'report', slug, country, industry, published_at: ago(days * DAY) });
  const items = [mk('a', 1), mk('b', 2), mk('c', 3), mk('d', 4), mk('e', 5), mk('f', 6), mk('old', 11), mk('other', 1, 'Japan')];
  const got = digestFor({ alert, items, now: NOW });
  assert.deepEqual(got.map((x) => x.slug), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(digestFor({ alert: { ...alert, last_digest_at: ago(3 * DAY) }, items, now: NOW }), []);   // not yet a week
  assert.deepEqual(digestFor({ alert: { ...alert, industry: 'coffee' }, items, now: NOW }), []);             // industry filter
  assert.equal(digestFor({ alert: { ...alert, industry: 'tea' }, items: [{ ...mk('m', 1), industry: 'x', industry_alt: 'Tea' }], now: NOW }).length, 1);
});

test('opt-out link is signed per address', () => {
  const k = 'unit-test-secret-0123456789';
  const url = optoutUrl('https://k.test', 'A@X.com', k);
  const u = new URL(url);
  assert.equal(u.searchParams.get('e'), 'a@x.com');
  assert.ok(verifyEmailSig('a@x.com', u.searchParams.get('s'), k));
  assert.ok(!verifyEmailSig('b@x.com', u.searchParams.get('s'), k));
  assert.ok(!verifyEmailSig('a@x.com', 'x'.repeat(32), k));
  assert.equal(signEmail('a@x.com', null), null);
});

test('slugify', () => {
  assert.equal(slugify('South Korea'), 'south-korea');
  assert.equal(slugify('Food & Beverage'), 'food-and-beverage');
});

test('every email string exists in EN, JA, KO and ZH, with the same placeholders', () => {
  const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
  for (const k of STRING_KEYS) {
    for (const l of LOCALES) {
      assert.ok(STRINGS[k][l] && STRINGS[k][l].length > 0, `${k} missing ${l}`);
      assert.equal(ph(STRINGS[k][l]), ph(STRINGS[k].en), `${k} placeholders differ in ${l}`);
    }
  }
});

test('copy rules: no "AI" lead, no competitor names, no refund-for-any-reason promise', () => {
  const bad = /\b(AI|Mordor|Frost|Euromonitor|Synovate|Ipsos|Claude|McKinsey)\b|not what the page promised|money.back/i;
  for (const k of STRING_KEYS) for (const l of LOCALES) assert.ok(!bad.test(STRINGS[k][l]), `${k}/${l}`);
});

test('tr falls back to English and fills placeholders; reason line', () => {
  assert.equal(normLocale('fr'), 'en');
  assert.equal(tr('xx', 'ab1.cta'), 'Back to my order');
  assert.match(tr('ja', 'pub.cta', { price: '$44' }), /\$44/);
  assert.equal(reasonLine('en', 'report', { pages: 44, exhibits: 26 }), '44 pages · 26 charts · EN/JA/KO/ZH');
  assert.equal(reasonLine('ja', 'report', { pages: 44 }), '44ページ · EN/JA/KO/ZH');
});

test('layout escapes input and adds the unsubscribe link in html and text', () => {
  const { html, text } = renderMail({ loc: 'ko', unsubUrl: 'https://k.test/u?x=1&y=2', why: 'why', blocks: [{ h: '<b>x</b>' }, { cta: { url: 'https://k.test/a', label: 'Go' } }] });
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;') && !html.includes('<b>x</b>'));
  assert.ok(html.includes('lang="ko"') && html.includes('https://k.test/u?x=1&amp;y=2'));
  assert.ok(text.includes('https://k.test/u?x=1&y=2') && text.includes('Go: https://k.test/a'));
});
