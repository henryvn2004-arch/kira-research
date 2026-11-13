// Kira Data adapter: e-Stat API v3 (Japan), customs trade 普通貿易統計 品別国別表 (needs ESTAT_APP_ID).
// Credit is mandatory (e-Stat terms, Art. 7): data_sources.attribution holds it.
// Tables (statsDataId, from the e-Stat dataset listing, 2026-10-14): HS 9-digit × country, values in thousand yen,
// one table per year range, with the months as a category (code 140 = year total, 170..500 = Jan..Dec in steps of 30).
// The class ids (area / cat01 / cat02 ...) are read from getMetaInfo at run time, so the adapter does not depend on
// which class holds the country or the month. Flows written: reporter JP, partner = our market, flow X (Japan's
// exports) / M (imports); product TOTAL monthly and HS 2-digit annual (summed from HS 9-digit), JPY.
import { getJson } from './util.js';

const API = 'https://api.e-stat.go.jp/rest/3.0/app/json';
// Japan customs country code (with the e-Stat "50" prefix) → our market.
const PARTNER = { '50103': 'KR', '50106': 'TW', '50110': 'VN', '50111': 'TH', '50112': 'SG', '50113': 'MY', '50116': 'BN',
  '50117': 'PH', '50118': 'ID', '50120': 'KH', '50121': 'LA', '50122': 'MM', '50601': 'AU', '50606': 'NZ' };
// The running year and the latest closed 5-year table. Add the next ids when e-Stat publishes them.
const TABLES = [
  { year: 'current', X: '0004049306', M: '0004049326' },
  { year: '2021-2025', X: '0003425293', M: '0003425294' }
];
const MONTH = (code) => { const n = (Number(code) - 140) / 30; return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null; };

async function call(fn, params, appId) {
  const qs = new URLSearchParams({ appId, lang: 'J', ...params }).toString();
  const body = await getJson(`${API}/${fn}?${qs}`);
  const root = body && (body.GET_META_INFO || body.GET_STATS_DATA);
  if (!root || !root.RESULT) throw new Error(`e-Stat ${fn}: unexpected reply`);
  if (Number(root.RESULT.STATUS) > 1) throw new Error(`e-Stat ${fn}: ${root.RESULT.STATUS} ${root.RESULT.ERROR_MSG}`);
  return root;
}

const asList = (x) => (Array.isArray(x) ? x : x ? [x] : []);

// Finds which class holds the countries, which the months/measure, which the HS codes.
async function classes(id, appId) {
  const m = await call('getMetaInfo', { statsDataId: id }, appId);
  const objs = asList(m.METADATA_INF.CLASS_INF.CLASS_OBJ);
  const codesOf = (o) => asList(o.CLASS).map((c) => c['@code']);
  const find = (test) => objs.find((o) => codesOf(o).some(test));
  const country = find((c) => c in PARTNER);
  const month = find((c) => c === '140');
  const hs = find((c) => /^\d{9}$/.test(c));
  if (!country || !month || !hs) throw new Error(`e-Stat ${id}: could not identify country/month/HS classes`);
  return { country: country['@id'], month: month['@id'], hs: hs['@id'] };
}

const paramName = (cls) => 'cd' + cls.charAt(0).toUpperCase() + cls.slice(1);

export async function flows({ env: appId }) {
  const out = [];
  for (const t of TABLES) {
    for (const flow of ['X', 'M']) {
      const id = t[flow];
      const cl = await classes(id, appId);
      for (const [code, partner] of Object.entries(PARTNER)) {
        const monthly = {}; const hs2 = {};
        let start = '';
        for (let page = 0; page < 20; page++) {
          const d = await call('getStatsData', { statsDataId: id, [paramName(cl.country)]: code, limit: '100000', ...(start ? { startPosition: start } : {}) }, appId);
          const sd = d.STATISTICAL_DATA;
          for (const v of asList(sd && sd.DATA_INF && sd.DATA_INF.VALUE)) {
            const val = Number(v.$);
            if (!Number.isFinite(val)) continue;
            const year = String(v['@time'] || '').slice(0, 4);
            const mcode = v['@' + cl.month];
            const yen = val * 1000;
            if (mcode === '140') { const k = year + '|' + String(v['@' + cl.hs]).slice(0, 2); hs2[k] = (hs2[k] || 0) + yen; }
            const mo = MONTH(mcode);
            if (mo) { const k = `${year}-${String(mo).padStart(2, '0')}`; monthly[k] = (monthly[k] || 0) + yen; }
          }
          const next = sd && sd.RESULT_INF && sd.RESULT_INF.NEXT_KEY;
          if (!next) break;
          start = String(next);
        }
        for (const [period, value] of Object.entries(monthly)) out.push({ source_key: 'estat', reporter: 'JP', partner, product: 'TOTAL', flow, freq: 'M', period, value, currency: 'JPY' });
        const thisYear = String(new Date().getUTCFullYear());
        for (const [k, value] of Object.entries(hs2)) {
          const [year, hs] = k.split('|');
          if (year !== thisYear) out.push({ source_key: 'estat', reporter: 'JP', partner, product: hs, flow, freq: 'A', period: year, value, currency: 'JPY' });
        }
      }
    }
  }
  return out;
}
