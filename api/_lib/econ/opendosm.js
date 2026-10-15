// Kira Data adapter: Malaysia OpenDOSM / data.gov.my data catalogue (api.data.gov.my, no key, CC BY 4.0).
// Limit about 4 calls a minute per API, so calls are spaced 16 s apart.
//   my_gdp_growth_q  real GDP, % y/y, quarterly       my_cpi_yoy  headline CPI, % y/y, monthly
//   my_ipi_yoy       industrial production, % y/y      my_exports / my_imports  merchandise trade, RM, monthly
//   flows: visitor arrivals by country of residence (product VISITORS, persons, monthly) for our markets
import { getJson, sleep } from './util.js';

const API = 'https://api.data.gov.my/data-catalogue/';
const FROM = '2015-01-01';
let last = 0;
async function dosm(params) {
  const wait = last + 16000 - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  return getJson(`${API}?${new URLSearchParams(params).toString()}`);
}

const month = (d) => String(d).slice(0, 7);
const quarter = (d) => `${String(d).slice(0, 4)}-Q${Math.floor((Number(String(d).slice(5, 7)) - 1) / 3) + 1}`;

const SPECS = {
  my_gdp_growth_q: { q: { id: 'gdp_qtr_real', filter: 'growth_yoy@series' }, field: 'value', period: quarter },
  my_cpi_yoy: { q: { id: 'cpi_headline_inflation', filter: 'overall@division' }, field: 'inflation_yoy', period: month },
  my_ipi_yoy: { q: { id: 'ipi', filter: 'growth_yoy@series' }, field: 'index', period: month },
  my_exports: { q: { id: 'trade_headline', filter: 'abs@series' }, field: 'exports', period: month },
  my_imports: { q: { id: 'trade_headline', filter: 'abs@series' }, field: 'imports', period: month }
};

export async function series(ind) {
  const spec = SPECS[ind.key];
  if (!spec) throw new Error(`OpenDOSM: no adapter for ${ind.key}`);
  const rows = await dosm({ ...spec.q, date_start: `${FROM}@date`, sort: 'date', limit: '5000' });
  if (!Array.isArray(rows)) throw new Error(`OpenDOSM ${spec.q.id}: unexpected reply`);
  return rows.filter((r) => r[spec.field] !== null && Number.isFinite(Number(r[spec.field]))).map((r) => ({
    indicator_key: ind.key, country_code: 'MY', period: spec.period(r.date), value: Number(r[spec.field]), is_forecast: false, source_key: ind.source_key, vintage: null
  }));
}

const ARRIVALS = { JPN: 'JP', KOR: 'KR', CHN: 'CN', TWN: 'TW', SGP: 'SG', IDN: 'ID', THA: 'TH', VNM: 'VN', PHL: 'PH', AUS: 'AU', ALL: 'WLD' };

export async function flows() {
  const out = [];
  for (const [iso3, iso2] of Object.entries(ARRIVALS)) {
    const rows = await dosm({ id: 'arrivals', filter: `${iso3}@country`, date_start: `${FROM}@date`, sort: 'date', limit: '5000' });
    if (!Array.isArray(rows)) throw new Error('OpenDOSM arrivals: unexpected reply');
    for (const r of rows) {
      const v = Number(r.arrivals);
      if (Number.isFinite(v)) out.push({ source_key: 'opendosm', reporter: 'MY', partner: iso2, product: 'VISITORS', flow: 'M', freq: 'M', period: month(r.date), value: v, currency: 'persons' });
    }
  }
  return out;
}
