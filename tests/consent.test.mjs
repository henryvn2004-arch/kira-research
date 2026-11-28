// Unit tests: Consent Mode v2 logic (region, GPC/DNT, saved choice), audience params, consent-region API, audMeta.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { audMeta } from '../api/_lib/ssr.js';
import region from '../api/consent-region.js';
// consent.js is a browser script: run it in a sandbox with no window, so only the pure logic is exported.
const box = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(new URL('../public/js/consent.js', import.meta.url), 'utf8'), box);
const C = { ...box.module.exports, stateFor: (...a) => JSON.parse(JSON.stringify(box.module.exports.stateFor(...a))), parseAudience: (x) => JSON.parse(JSON.stringify(box.module.exports.parseAudience(x))), readChoice: (s) => JSON.parse(JSON.stringify(box.module.exports.readChoice(s))) };  // plain objects: no cross-realm prototypes

test('needsConsent: EEA + UK + CH only', () => {
  for (const cc of ['DE', 'fr', 'GB', 'CH', 'IS', 'NO']) assert.ok(C.needsConsent(cc), cc);
  for (const cc of ['US', 'VN', 'JP', 'SG', '', null]) assert.ok(!C.needsConsent(cc), String(cc));
});
test('stateFor: no choice → denied in consent regions, granted elsewhere', () => {
  assert.deepEqual(C.stateFor(null, false, true), { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
  assert.deepEqual(C.stateFor(null, false, false), { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });
});
test('stateFor: saved choice wins over region; GPC/DNT always denies ad_*', () => {
  assert.equal(C.stateFor({ ad: true, an: true }, false, true).ad_personalization, 'granted');
  const s = C.stateFor({ ad: false, an: true }, false, false);
  assert.equal(s.ad_storage, 'denied'); assert.equal(s.analytics_storage, 'granted');
  const g = C.stateFor({ ad: true, an: true }, true, true);
  assert.equal(g.ad_user_data, 'denied'); assert.equal(g.analytics_storage, 'granted');
  assert.equal(C.stateFor(null, true, false).ad_storage, 'denied');
});
test('gpcOn: GPC, DNT variants', () => {
  assert.ok(C.gpcOn({ globalPrivacyControl: true })); assert.ok(C.gpcOn({ doNotTrack: '1' }));
  assert.ok(C.gpcOn({}, { doNotTrack: '1' })); assert.ok(!C.gpcOn({ doNotTrack: '0' })); assert.ok(!C.gpcOn());
});
test('choice storage: save, read, bad value, blocked storage', () => {
  const m = new Map(); const st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(C.readChoice(st), null);
  C.saveChoice(st, { ad: false, an: true });
  assert.deepEqual(C.readChoice(st), { ad: false, an: true });
  m.set(C.KEY, '{"ad":"yes"}'); assert.equal(C.readChoice(st), null);
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.equal(C.readChoice(bad), null); assert.doesNotThrow(() => C.saveChoice(bad, { ad: true, an: true }));
});
test('parseAudience: whitelist keys, safe values, needs page_type', () => {
  assert.deepEqual(C.parseAudience('page_type=report&country=vietnam&segment=coffee-chains&analysis=market-overview&email=a%40b.c'),
    { page_type: 'report', country: 'vietnam', segment: 'coffee-chains', analysis: 'market-overview' });
  assert.equal(C.parseAudience('country=vietnam'), null);
  assert.deepEqual(C.parseAudience('page_type=report&country=%3Cscript%3E'), { page_type: 'report' });
});
test('audMeta: slugged params, empty values dropped', () => {
  const h = audMeta({ page_type: 'market_map', country: 'Viet Nam', segment: null, analysis: '' });
  assert.match(h, /name="kira-audience"/); assert.match(h, /page_type=market_map&amp;country=viet-nam/); assert.doesNotMatch(h, /segment/);
  assert.equal(audMeta({}), '');
});
test('consent-region API: country from header, private cache', () => {
  const run = (hdr, method = 'GET') => { const r = { h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.c = c; return this; }, json(b) { this.b = b; } }; region({ method, headers: hdr }, r); return r; };
  assert.deepEqual(run({ 'x-vercel-ip-country': 'de' }).b, { country: 'DE' });
  assert.deepEqual(run({}).b, { country: null });
  assert.match(run({}).h['Cache-Control'], /private/);
  assert.equal(run({}, 'POST').c, 405);
});
