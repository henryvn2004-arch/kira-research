// Unit tests for api/_lib/list-source.js with a mocked fetch. Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { buildList, countList, previewList, sign, csvToXlsx, ListSourceError, _io } from '../api/_lib/list-source.js';

process.env.KIRA_PACKS_TOKEN = 'tok-test';
process.env.KIRA_PACKS_SECRET = 'secret-test';
process.env.BIZDIRECT_PACKS_URL = 'https://bd.example';
_io.sleep = async () => {};
const DEF = { country: 'vietnam', group_keys: ['soda'], exclude_group_keys: [], exclude_mode: 'any_excluded', include_generic: false, foreign_home: 'exclude', global_site: 'exclude', roles: [] };
const CSV = Buffer.from('﻿"# Source: x"\r\nname,phone_company,phone_type\r\nAcme,+84901234567,mobile\r\n');
const j = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const file = () => new Response(CSV, { status: 200 });

function mock(handler) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), init }); return handler(String(url), init, calls.length); };
  return calls;
}

test('sign: sha256=HMAC(secret, ts.body)', () => {
  assert.equal(sign('s', '1700000000', '{"a":1}'), 'sha256=' + createHmac('sha256', 's').update('1700000000.{"a":1}').digest('hex'));
});

test('build: bearer + HMAC headers match the exact body, then the file is fetched without the bearer', async () => {
  _io.now = () => 1700000000000;
  const calls = mock((url) => url.endsWith('/build')
    ? j(200, { order_id: 'ORD12345', rows: 1, sha256: 'abc', expires_at: 'x', download_url: 'https://bd.example/api/partner/kira/segments/download/t' })
    : file());
  const r = await buildList({ orderId: 'ORD12345', definition: DEF, nCompanies: 1 });
  const b = calls[0];
  assert.equal(b.url, 'https://bd.example/api/partner/kira/segments/build');
  assert.equal(b.init.headers.Authorization, 'Bearer tok-test');
  assert.equal(b.init.headers['X-Kira-Timestamp'], '1700000000');
  assert.equal(b.init.headers['X-Kira-Signature'], sign('secret-test', '1700000000', b.init.body));
  assert.deepEqual(JSON.parse(b.init.body), { order_id: 'ORD12345', segment: DEF });
  assert.equal(calls[1].init.headers, undefined);
  assert.equal(r.rows, 1);
  assert.ok(r.xlsx && r.format === 'xlsx');
});

test('xlsx keeps +84 phone numbers as text', async () => {
  const XLSX = (await import('node:module')).createRequire(import.meta.url)('xlsx');
  const wb = XLSX.read(csvToXlsx(CSV), { type: 'buffer', raw: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Companies, { header: 1, raw: true, range: 1 });
  assert.equal(rows[1][1], '+84901234567');
});

test('retry on 503 and 429 uses the same order id and body; signature is fresh', async () => {
  let t = 1700000000000; _io.now = () => (t += 1000);
  const calls = mock((url, _i, n) => {
    if (url.endsWith('/build')) return n === 1 ? j(503, { error: { code: 'build_failed' } }) : n === 2 ? j(429, { error: { code: 'quota_exceeded' } }, { 'retry-after': '1' }) : j(200, { rows: 1, download_url: '/api/partner/kira/segments/download/t' });
    return file();
  });
  await buildList({ orderId: 'ORD12345', definition: DEF });
  const builds = calls.filter((c) => c.url.endsWith('/build'));
  assert.equal(builds.length, 3);
  assert.equal(new Set(builds.map((c) => c.init.body)).size, 1);
  assert.equal(new Set(builds.map((c) => c.init.headers['X-Kira-Signature'])).size, 3);
});

test('409 in_progress is retried; 409 order_conflict is not', async () => {
  let n = 0;
  mock((url) => url.endsWith('/build') ? (++n === 1 ? j(409, { error: { code: 'in_progress' } }) : j(200, { rows: 1, download_url: '/d' })) : file());
  await buildList({ orderId: 'ORD12345', definition: DEF });
  assert.equal(n, 2);
  n = 0;
  mock(() => { n++; return j(409, { error: { code: 'order_conflict', message: 'different segment' } }); });
  await assert.rejects(buildList({ orderId: 'ORD12345', definition: DEF }), (e) => e.code === 'order_conflict');
  assert.equal(n, 1);
});

test('401 is not retried and reads as an auth error', async () => {
  let n = 0;
  mock(() => { n++; return j(401, { error: { code: 'unauthorized' } }); });
  await assert.rejects(buildList({ orderId: 'ORD12345', definition: DEF }), (e) => e instanceof ListSourceError && e.code === 'auth');
  assert.equal(n, 1);
});

test('503 on every attempt gives up after 4 tries', async () => {
  let n = 0;
  mock(() => { n++; return j(503, { error: { code: 'build_failed' } }); });
  await assert.rejects(buildList({ orderId: 'ORD12345', definition: DEF }), (e) => e.retryable === true);
  assert.equal(n, 4);
});

test('cap: an explicit cap error, and a silently short file, both become row_cap', async () => {
  mock(() => j(422, { error: { code: 'too_many_rows', message: 'order cap is 5000 rows' } }));
  await assert.rejects(buildList({ orderId: 'ORD12345', definition: DEF }), (e) => e.code === 'row_cap');
  mock((url) => url.endsWith('/build') ? j(200, { rows: 5000, download_url: '/d' }) : file());
  await assert.rejects(buildList({ orderId: 'ORD12345', definition: DEF, nCompanies: 7000 }), (e) => e.code === 'row_cap');
});

test('a download link on another host is refused', async () => {
  mock(() => j(200, { rows: 1, download_url: 'https://evil.example/x' }));
  await assert.rejects(buildList({ orderId: 'ORD12345', definition: DEF }), (e) => e.code === 'bad_link');
});

test('missing env or definition', async () => {
  const keep = process.env.KIRA_PACKS_SECRET;
  delete process.env.KIRA_PACKS_SECRET;
  await assert.rejects(buildList({ orderId: 'ORD12345', definition: DEF }), /list source not configured/);
  process.env.KIRA_PACKS_SECRET = keep;
  await assert.rejects(buildList({ orderId: 'ORD12345', definition: null }), (e) => e.code === 'no_definition');
});

test('count and preview wrap the endpoints', async () => {
  const calls = mock((url) => url.endsWith('/count') ? j(200, { segments: [{ id: 'one', n: 42 }] }) : j(200, { n: 42, rows: [] }));
  assert.equal((await countList(DEF)).n, 42);
  assert.deepEqual(JSON.parse(calls[0].init.body), { segments: [{ id: 'one', ...DEF }] });
  assert.equal((await previewList(DEF)).n, 42);
  assert.equal(calls[0].init.headers['X-Kira-Signature'], undefined);
});
