// Offline test for the OpenDART (KR) and EDINET (JP) adapters of Kira Data D4, with fixture replies (no key, no network).
// Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import * as opendart from '../api/_lib/moves/opendart.js';
import * as edinet from '../api/_lib/moves/edinet.js';
import { collect } from '../api/_lib/moves/index.js';

const reply = (obj) => ({ ok: true, status: 200, json: async () => obj });
function stubFetch(fn) { const real = globalThis.fetch; globalThis.fetch = async (url) => fn(String(url)); return () => { globalThis.fetch = real; }; }
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

test('OpenDART adapter maps a filing list and reads no-data as empty', async () => {
  const seen = [];
  const undo = stubFetch((u) => {
    seen.push(u);
    if (u.includes('pblntf_ty=I')) return reply({ status: '013', message: 'no data' });
    return reply({ status: '000', total_page: 1, list: [
      { corp_name: '삼성전자', report_nm: '타법인주식및출자증권취득결정(베트남 법인 지분 인수)', rcept_no: '20261120000123', rcept_dt: today },
      { corp_name: '무관회사', report_nm: '주주총회소집공고', rcept_no: '20261120000124', rcept_dt: today }] });
  });
  try {
    const got = await opendart.items({ env: 'TESTKEY', days: 3 });
    assert.equal(got.length, 2);
    assert.equal(got[0].tier, 'filing'); assert.equal(got[0].investor, 'KR'); assert.equal(got[0].company, '삼성전자');
    assert.match(got[0].url, /dart\.fss\.or\.kr.*rcpNo=20261120000123/);
    assert.ok(seen.every((u) => u.startsWith('https://opendart.fss.or.kr/api/list.json')));
    const out = await collect({ sources: [{ key: 'opendart', env_key: 'OPENDART_API_KEY' }], recent: [], preloaded: got });
    assert.equal(out.events.length, 1, 'only the filing naming a market is kept');
    assert.equal(out.events[0].host_country, 'VN'); assert.equal(out.events[0].status, 'published');
  } finally { undo(); }
});

test('OpenDART adapter surfaces API errors; missing key is an error', async () => {
  await assert.rejects(() => opendart.items({ env: '' }), /OPENDART_API_KEY missing/);
  const undo = stubFetch(() => reply({ status: '010', message: 'unregistered key' }));
  try { await assert.rejects(() => opendart.items({ env: 'BAD', days: 1 }), /OpenDART 010/); } finally { undo(); }
});

test('EDINET adapter maps daily filings and classifies Japanese descriptions', async () => {
  const undo = stubFetch((u) => {
    assert.ok(u.startsWith('https://api.edinet-fsa.go.jp/api/v2/documents.json'));
    return reply({ results: [
      { docID: 'S100ABCD', filerName: 'トヨタ自動車株式会社', docDescription: 'ベトナムにおける合弁会社設立に関する臨時報告書', submitDateTime: '2026-11-20 09:00' },
      { docID: null, filerName: 'x', docDescription: 'y' },
      { docID: 'S100ZZZZ', filerName: '別会社', docDescription: '有価証券報告書' }] });
  });
  try {
    const got = await edinet.items({ env: 'TESTKEY', days: 1 });
    assert.equal(got.length, 2); assert.equal(got[0].investor, 'JP'); assert.equal(got[0].tier, 'filing');
    const out = await collect({ recent: [], preloaded: got });
    assert.equal(out.events.length, 1); assert.equal(out.events[0].host_country, 'VN');
  } finally { undo(); }
  await assert.rejects(() => edinet.items({ env: '' }), /EDINET_API_KEY missing/);
});
