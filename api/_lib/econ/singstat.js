// Kira Data adapter: Singapore Department of Statistics, SingStat Table Builder API (no key). SingStat terms put
// its datasets under the Singapore Open Data Licence v1.0 (commercial use allowed with the credit in data_sources).
//   sg_gdp_growth_q  real GDP (chained 2015 dollars), % y/y, quarterly     M015631 row 2
//   sg_cpi_yoy       CPI all items, % y/y, monthly                          M213781 row 1
//   flows: merchandise exports/imports by market (M451521 / M451491, S$ million → SGD) and visitor arrivals by
//          place of residence (M550001, persons), monthly. Rows are matched by their label, not by row number.
import { getJson } from './util.js';

const API = 'https://tablebuilder.singstat.gov.sg/api/table/tabledata/';
const FROM = 2015;
const MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function period(key) {
  const m = /^(\d{4}) (\w{3})$/.exec(key);
  if (m && MON[m[2]]) return `${m[1]}-${String(MON[m[2]]).padStart(2, '0')}`;
  const q = /^(\d{4}) ([1-4])Q$/.exec(key);
  if (q) return `${q[1]}-Q${q[2]}`;
  return null;
}

async function table(id, row, timeFilter) {
  const qs = new URLSearchParams({ ...(row ? { seriesNoORrowNo: row } : {}), ...(timeFilter ? { timeFilter } : {}) }).toString();
  const body = await getJson(`${API}${id}${qs ? `?${qs}` : ''}`);
  const rows = body && body.Data && body.Data.row;
  if (!Array.isArray(rows)) throw new Error(`SingStat ${id}: unexpected reply`);
  return rows;
}

const points = (r) => (r.columns || []).map((c) => [period(c.key), Number(c.value)])
  .filter(([p, v]) => p && Number(p.slice(0, 4)) >= FROM && Number.isFinite(v));

const SPECS = { sg_gdp_growth_q: ['M015631', '2'], sg_cpi_yoy: ['M213781', '1'] };

export async function series(ind) {
  const spec = SPECS[ind.key];
  if (!spec) throw new Error(`SingStat: no adapter for ${ind.key}`);
  const [r] = await table(spec[0], spec[1]);
  if (!r) throw new Error(`SingStat ${spec[0]}: row ${spec[1]} missing`);
  return points(r).map(([p, v]) => ({ indicator_key: ind.key, country_code: 'SG', period: p, value: v, is_forecast: false, source_key: ind.source_key, vintage: null }));
}

// Row label (lower case, trimmed) → partner ISO2.
const PARTNER = {
  'total all markets': 'WLD', 'total international visitor arrivals by place of residence': 'WLD', japan: 'JP', 'republic of korea': 'KR', 'south korea': 'KR', malaysia: 'MY',
  taiwan: 'TW', 'viet nam': 'VN', vietnam: 'VN', thailand: 'TH', indonesia: 'ID', philippines: 'PH', australia: 'AU',
  'new zealand': 'NZ', cambodia: 'KH', myanmar: 'MM', 'brunei darussalam': 'BN', brunei: 'BN', laos: 'LA',
  "lao people's democratic republic": 'LA', 'mainland china': 'CN', china: 'CN', 'hong kong': 'HK', 'hong kong sar': 'HK',
  'united states': 'US', 'united states of america': 'US'
};

export async function flows() {
  const out = [];
  for (const [id, product, flow, scale, currency] of [
    ['M451521', 'TOTAL', 'X', 1e6, 'SGD'],
    ['M451491', 'TOTAL', 'M', 1e6, 'SGD'],
    ['M550001', 'VISITORS', 'M', 1, 'persons']
  ]) {
    // A whole-table request is capped (18 of 160 rows came back), so list the rows with one recent month first,
    // then fetch each wanted row's full history.
    const d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 3, 1));
    const probe = `${d.getUTCFullYear()} ${Object.keys(MON)[d.getUTCMonth()]}`;
    const seen = new Set();
    for (const r of await table(id, null, probe)) {
      const partner = PARTNER[String(r.rowText || '').trim().toLowerCase()];
      if (!partner || seen.has(partner)) continue;
      seen.add(partner);
      const [full] = await table(id, r.seriesNo);
      if (!full) continue;
      for (const [p, v] of points(full)) out.push({ source_key: 'singstat', reporter: 'SG', partner, product, flow, freq: 'M', period: p, value: v * scale, currency });
    }
  }
  return out;
}
