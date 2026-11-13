// Kira Data adapter: U.S. Census Bureau International Trade API (HS), public domain. Needs a free key (CENSUS_API_KEY).
// Partner-reported trade: what the US imports from (M, general imports) and exports to (X, total exports) each of our
// markets, for the HS codes in segment_data_map, annual (December year-to-date value), US dollars.
// Reply shape (array of rows, first row = headers) is checked on the first run with a key.
import { getJson } from './util.js';

const API = 'https://api.census.gov/data/timeseries/intltrade';
// Census country codes (Schedule C).
const CTY = { VN: '5520', TH: '5490', ID: '5600', MY: '5570', PH: '5650', SG: '5590', TW: '5830', AU: '6021', NZ: '6141',
  KH: '5550', LA: '5530', MM: '5460', BN: '5610', JP: '5880', KR: '5800' };
const YEARS = 6;
const SIDES = [
  { flow: 'M', path: 'imports/hs', comm: 'I_COMMODITY', val: 'GEN_VAL_YR' },
  { flow: 'X', path: 'exports/hs', comm: 'E_COMMODITY', val: 'ALL_VAL_YR' }
];

export async function flows({ env, hs = [] } = {}) {
  if (!env) throw new Error('Census: CENSUS_API_KEY missing');
  const want = new Set(hs);
  const levels = [...new Set(hs.map((c) => `HS${c.length}`))];
  const last = new Date().getUTCFullYear() - 1;
  const out = [];
  for (const [cc, cty] of Object.entries(CTY)) {
    for (const side of SIDES) {
      for (const lvl of levels) {
        for (let y = last - YEARS + 1; y <= last; y++) {
          const qs = new URLSearchParams({ get: `CTY_CODE,${side.comm},${side.val}`, time: `${y}-12`, COMM_LVL: lvl, CTY_CODE: cty, key: env });
          let rows;
          try { rows = await getJson(`${API}/${side.path}?${qs.toString()}`, { tries: 2 }); } catch (_e) { continue; }   // 204/no rows for small partners
          if (!Array.isArray(rows) || !Array.isArray(rows[0])) throw new Error('Census: unexpected reply');
          const h = rows[0], ic = h.indexOf(side.comm), iv = h.indexOf(side.val);
          if (ic < 0 || iv < 0) throw new Error('Census: columns missing');
          for (const r of rows.slice(1)) {
            const v = Number(r[iv]);
            if (!want.has(r[ic]) || !Number.isFinite(v)) continue;
            out.push({ source_key: 'us_census', reporter: 'US', partner: cc, product: r[ic], flow: side.flow, freq: 'A', period: String(y), value: v, currency: 'USD' });
          }
        }
      }
    }
  }
  return out;
}
