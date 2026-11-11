#!/usr/bin/env node
// geo-econ-check.mjs — unit check (no database) of api/_lib/geo-econ.js: number formats, templates in four languages,
// number tokens equal across languages (the ja / ko / zh gate), <= 50 words, unique hashes, skipped zero / null values.
//   node scripts/geo-econ-check.mjs
import assert from 'node:assert/strict';
import { buildRows, fmtAmount, fmtPct, fmtChg, syncRows } from '../api/_lib/geo-econ.js';

assert.equal(fmtAmount(2947888799, 'EUR'), 'EUR 2.95 bn');
assert.equal(fmtAmount(13068846, 'EUR'), 'EUR 13.1 m');
assert.equal(fmtAmount(999, 'USD'), 'USD 999');
assert.equal(fmtAmount(1000, 'USD'), 'USD 1 k');
assert.equal(fmtAmount(-6.4e9, 'USD'), 'USD -6.4 bn');
assert.equal(fmtAmount(101e6, ''), '101 m');
assert.equal(fmtPct(2.75), '2.75%');
assert.equal(fmtPct(3.2), '3.2%');
assert.equal(fmtChg(1.5, 1), '+50.0%');
assert.equal(fmtChg(0.9, 1), '-10.0%');

// A tiny database.
const CY = new Date().getUTCFullYear();
const L = (en) => ({ en, ja: `${en}-ja`, ko: `${en}-ko`, zh: `${en}-zh` });
const db = {
  tax_countries: [{ code: 'VN', name: 'Vietnam' }, { code: 'MY', name: 'Malaysia' }],
  data_sources: [{ key: 'eurostat_comext', name: 'Eurostat' }, { key: 'worldbank_wdi', name: 'World Bank' }, { key: 'opendosm', name: 'OpenDOSM' }, { key: 'vn_customs', name: 'Viet Nam Customs' }, { key: 'aseanstats', name: 'ASEANstats' }],
  segment_data_map: [{ key: 'coffee', hs: ['0901', '2101'], groups: ['cpi_yoy', 'visitors'], industry_slugs: ['coffee-tea--coffee'], keywords: ['coffee'], ord: 10 }, { key: 'none', hs: [], groups: [], industry_slugs: [], keywords: [], ord: 99 }],
  hs_codes: [{ code: '0901', label: { en: 'Coffee', ja: 'コーヒー', ko: '커피', zh: '咖啡' } }, { code: '2101', label: { en: 'Coffee extracts', ja: 'コーヒー抽出物', ko: '커피 추출물', zh: '咖啡提取物' } }],
  econ_indicators: [
    { key: 'gdp_usd', source_key: 'worldbank_wdi', country_code: null, label: L('GDP'), unit: 'usd', freq: 'A', params: {} },
    { key: 'my_cpi_yoy', source_key: 'opendosm', country_code: 'MY', label: L('Inflation (monthly)'), unit: 'pct', freq: 'M', params: { group: 'cpi_yoy' } },
  ],
  tax_country_industry: [{ country_code: 'VN', industry_id: 1 }, { country_code: 'MY', industry_id: 1 }, { country_code: 'VN', industry_id: 2 }],
  tax_industries: [{ id: 1, slug: 'coffee-tea--coffee', level: 2, parent_id: 9 }, { id: 2, slug: 'misc--other', level: 2, parent_id: 8 }, { id: 9, slug: 'coffee-tea', level: 1, parent_id: null }, { id: 8, slug: 'misc', level: 1, parent_id: null }],
  econ_series: [
    { indicator_key: 'gdp_usd', country_code: 'VN', period: String(CY - 1), value: 476e9 }, { indicator_key: 'gdp_usd', country_code: 'VN', period: String(CY - 2), value: 430e9 },
    { indicator_key: 'my_cpi_yoy', country_code: 'MY', period: '2026-08', value: 1.4 }, { indicator_key: 'my_cpi_yoy', country_code: 'MY', period: '2026-09', value: 0 },
  ],
  econ_flows: [],
};
const fl = (o) => db.econ_flows.push({ source_key: 'eurostat_comext', reporter: 'EU', freq: 'A', currency: 'EUR', ...o });
fl({ partner: 'VN', product: '0901', flow: 'M', period: String(CY - 1), value: 2947888799 }); fl({ partner: 'VN', product: '0901', flow: 'M', period: String(CY - 2), value: 1947555682 });
fl({ partner: 'VN', product: '0901', flow: 'X', period: String(CY - 1), value: 13068846 }); fl({ partner: 'VN', product: '0901', flow: 'X', period: String(CY - 2), value: 8269239 });
fl({ partner: 'MY', product: '0901', flow: 'M', period: String(CY - 1), value: 500000 }); fl({ partner: 'MY', product: '0901', flow: 'M', period: String(CY - 2), value: 400000 });   // below the floor: skipped
fl({ partner: 'VN', product: '2101', flow: 'M', period: String(CY - 1), value: 0 });                       // zero: skipped
fl({ partner: 'VN', product: '2101', flow: 'M', period: String(CY), value: 5e8 }); fl({ partner: 'VN', product: '2101', flow: 'M', period: String(CY - 1), value: 4e8 }); // current year is not complete
for (let m = 1; m <= 24; m++) { const p = `${2024 + Math.floor((m - 1) / 12)}-${String(((m - 1) % 12) + 1).padStart(2, '0')}`; db.econ_flows.push({ source_key: 'opendosm', reporter: 'MY', partner: 'WLD', product: 'VISITORS', flow: 'M', freq: 'M', period: p, value: 1e6 + m * 1e4, currency: 'persons' }); db.econ_flows.push({ source_key: 'opendosm', reporter: 'MY', partner: 'SG', product: 'VISITORS', flow: 'M', freq: 'M', period: p, value: 1e6 + m * 1e4, currency: 'persons' }); }
for (const [p, v] of [['CN', 5e9], ['KR', 3e9], ['JP', 2e9], ['US', 1e9]]) for (let m = 1; m <= 12; m++) db.econ_flows.push({ source_key: 'vn_customs', reporter: 'VN', partner: p, product: 'TOTAL', flow: 'M', freq: 'M', period: `2026-${String(m).padStart(2, '0')}`, value: v / 12, currency: 'USD' });
for (const [p, v] of [['SG', 6e9], ['HK', 5e9], ['CN', 3e9], ['US', 1e9]]) db.econ_flows.push({ source_key: 'aseanstats', reporter: 'VN', partner: p, product: 'FDI_NET', flow: 'M', freq: 'A', period: String(CY - 1), value: v, currency: 'USD' });

const read = async (path) => {
  const [table, qs = ''] = path.split('?');
  const off = Number((qs.match(/offset=(\d+)/) || [])[1] || 0), lim = Number((qs.match(/limit=(\d+)/) || [])[1] || 1000);
  return (db[table] || []).slice(off, off + lim);
};
const { rows, stats } = await buildRows(read);

const NUM = /\d[\d,.]*\d|\d/g;
const nums = (s) => (String(s).match(NUM) || []).map((t) => t.replace(/,/g, '')).sort().join('|');
if (process.env.DUMP) for (const r of rows) console.log(r.country_code, r.segment_key, r.metric, '\n ', r.question, '\n ', r.answer_short, '\n ', r.i18n.ja.answer_short);
assert.ok(rows.length >= 7, `rows ${rows.length}`);
assert.equal(new Set(rows.map((r) => r.content_hash)).size, rows.length, 'unique hashes');
for (const r of rows) {
  assert.ok(/\?$/.test(r.question) || /？$/.test(r.question), r.question);
  assert.ok(r.answer_short.split(/\s+/).length <= 50, `words: ${r.answer_short}`);
  assert.ok(/KIRA Data/.test(r.answer_short), r.answer_short);
  assert.equal(r.source_kind, 'econ'); assert.equal(r.home, 'kira'); assert.ok(r.source_ref.slug);
  assert.ok(r.year >= 2000 && r.year <= CY, `year ${r.year}`);
  assert.ok(![r.question, r.answer_short, ...['ja', 'ko', 'zh'].flatMap((l) => [r.i18n[l].question, r.i18n[l].answer_short])].some((t) => /undefined|NaN|null|Infinity/.test(t)), r.answer_short);
  for (const loc of ['ja', 'ko', 'zh']) {
    const t = r.i18n[loc];
    assert.ok(t.question && t.answer_short, `${loc} missing`);
    assert.equal(nums(`${r.question} ${r.answer_short}`.replace(/-(ja|ko|zh)\b/g, '')), nums(`${t.question} ${t.answer_short}`.replace(/-(ja|ko|zh)\b/g, '')), `numbers differ ${loc}: ${r.answer_short} / ${t.answer_short}`);
  }
}
const by = (m) => rows.filter((r) => r.metric === m);
// coffee: imports of 0901 (2101 is skipped: zero value, and the only other year is the current one), one export row
assert.equal(by('trade_hs_0901_M').length, 1);
assert.equal(by('trade_hs_0901_X').length, 1);
assert.equal(by('trade_hs_2101_M').length, 0, 'zero / incomplete year skipped');
assert.equal(by('trade_hs_2101_X').length, 0);
assert.ok(!rows.some((r) => r.country_code === 'MY' && r.metric.startsWith('trade_hs')), 'values below the floor are skipped');
assert.equal(by('trade_hs_0901_M')[0].answer_short, `The EU imported EUR 2.95 bn of coffee from Vietnam in ${CY - 1}, +51.4% on ${CY - 2} (Eurostat, via KIRA Data).`);
assert.equal(by('trade_hs_0901_M')[0].value, 2947888799);
assert.equal(by('trade_hs_0901_M')[0].segment_key, 'coffee-tea--coffee');
// a segment with no data profile yields nothing
assert.ok(!rows.some((r) => r.segment_key === 'misc--other'));
assert.equal(stats.skipped_no_profile, 1);
// GDP: latest complete year, +growth only when the year before is stored
assert.equal(by('series_gdp_usd')[0].answer_short, `GDP in Vietnam came to USD 476 bn in ${CY - 1}, +10.7% on ${CY - 2} (World Bank, via KIRA Data).`);
// latest monthly reading: a 0 value is skipped, so August is used? no: the latest stored value is used only when non-zero
assert.ok(!by('series_my_cpi_yoy').length || by('series_my_cpi_yoy')[0].value !== 0);
// top partners: three, ordered by value; FDI investors: three, positive only
assert.match(by('top_partners_M')[0].answer_short, /the largest import sources of Vietnam were China \(USD 5 bn\), South Korea \(USD 3 bn\) and Japan \(USD 2 bn\)/);
assert.match(by('fdi_investors_net')[0].answer_short, /Singapore \(USD 6 bn\), Hong Kong \(USD 5 bn\) and China \(USD 3 bn\)/);
assert.match(by('visitors_12m')[0].i18n.zh.answer_short, /^截至/);

// sync: upsert, then rows that are no longer produced are retired
const calls = [];
const write = async (path, method, body) => { calls.push({ path, method, n: Array.isArray(body) ? body.length : 1, body }); return null; };
const readOld = async (path) => (path.startsWith('kira_answers?source_kind=eq.econ') ? [{ id: 'old-1', content_hash: 'gone' }, { id: 'keep-1', content_hash: rows[0].content_hash }] : read(path));
const res = await syncRows(rows, { read: readOld, write });
assert.deepEqual(res, { upserted: rows.length, retired: 1 });
assert.ok(calls[0].path.endsWith('on_conflict=content_hash') && calls[0].method === 'POST' && calls[0].body[0].status === 'published');
assert.ok(calls.at(-1).path === 'kira_answers?id=in.(old-1)' && calls.at(-1).body.status === 'retired');
console.log(`ok · ${rows.length} rows from the synthetic data`);
