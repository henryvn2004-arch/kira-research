// Kira Data adapter: Philippine Statistics Authority, OpenSTAT PXWeb API (no key).
// Licence: open data under CC BY per the OpenSTAT Terms of Use and Open Data Product Agreement (pages block
// automated reads; wording taken from their search snippets 2026-10-14). Credit PSA and the source agency.
//   series: ph_gdp_growth_q (real GDP, % y/y, quarterly), ph_cpi_yoy (headline CPI, % y/y, monthly)
//   flows:  merchandise trade by partner (USD, completed years) and approved foreign investment by investor
//           country (product FDI_APPROVED, PHP, quarterly)
import { meta, pick, query } from './pxweb.js';

const BASE = 'https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FIRST = 2015;

// PSA partner codes (trade tables) → ISO2.
const TRADE_PARTNER = { '036': 'AU', '108': 'BN', '116': 'MM', '164': 'CN', '168': 'TW', '364': 'HK', '380': 'ID', '412': 'JP',
  '428': 'KH', '440': 'KR', '448': 'LA', '500': 'MY', '592': 'NZ', '720': 'SG', '780': 'TH', '860': 'US', '892': 'VN' };
// Investor labels (investment table) → ISO2; 'Total AFI' is the total from all investors.
const FDI_INVESTOR = { Australia: 'AU', 'China (PROC)': 'CN', Hongkong: 'HK', Japan: 'JP', 'South Korea': 'KR', Malaysia: 'MY',
  Singapore: 'SG', Taiwan: 'TW', Thailand: 'TH', USA: 'US', 'Total AFI': 'WLD' };

const row = (ind, period, value) => ({ indicator_key: ind.key, country_code: 'PH', period, value, is_forecast: false, source_key: ind.source_key, vintage: null });

async function gdpGrowth(ind) {
  const path = '2B/NA/QT/1SUM/0022B5BEXQ2.px';
  const v = await meta(BASE, path);
  const years = pick(v, 'Year', (t) => Number(t.split('-')[1]) >= FIRST);
  const cells = await query(BASE, path, {
    'Type of Expenditure': pick(v, 'Type of Expenditure', (t) => /gross domestic product/i.test(t)),
    'Type of Valuation': pick(v, 'Type of Valuation', (t) => /constant/i.test(t)),
    Year: years
  });
  // "2025-2026" + "Q2" = growth of 2026 Q2 over 2025 Q2.
  return cells.map((c) => row(ind, `${c.Year.split('-')[1]}-${c.Period}`, c.value));
}

async function cpi(ind) {
  const path = '2M/PI/CPI/2018NEW/0012M4ACP23.px';
  const v = await meta(BASE, path);
  const cells = await query(BASE, path, {
    Geolocation: pick(v, 'Geolocation', ['PHILIPPINES']),
    'Commodity Description': pick(v, 'Commodity Description', (t) => /ALL ITEMS/.test(t)),
    Year: pick(v, 'Year', () => true),
    Period: pick(v, 'Period', (t) => MONTHS.includes(t))
  });
  return cells.map((c) => row(ind, `${c.Year}-${String(MONTHS.indexOf(c.Period) + 1).padStart(2, '0')}`, c.value));
}

const SERIES = { ph_gdp_growth_q: gdpGrowth, ph_cpi_yoy: cpi };

export async function series(ind) {
  const fn = SERIES[ind.key];
  if (!fn) throw new Error(`PSA: no adapter for ${ind.key}`);
  return fn(ind);
}

export async function flows() {
  const out = [];
  // Trade by partner, completed years only (the running year is labelled "2026P" and is year-to-date).
  const tp = '2L/IMT/SUM/0012L4DFTS1.px';
  const tv = await meta(BASE, tp);
  const trade = await query(BASE, tp, {
    Country: pick(tv, 'Country', (_t, code) => code in TRADE_PARTNER),
    Year: pick(tv, 'Year', (t) => /^\d{4}$/.test(t.trim()) && Number(t) >= FIRST),
    Item: pick(tv, 'Item', ['Imports', 'Exports'])
  });
  const codeOf = Object.fromEntries(tv.find((x) => x.code === 'Country').valueTexts.map((t, i) => [t, tv.find((x) => x.code === 'Country').values[i]]));
  for (const c of trade) {
    out.push({ source_key: 'psa_openstat', reporter: 'PH', partner: TRADE_PARTNER[codeOf[c.Country]], product: 'TOTAL',
      flow: c.Item === 'Exports' ? 'X' : 'M', freq: 'A', period: c.Year.trim(), value: c.value, currency: 'USD' });
  }
  // Approved foreign investment by investor country (million PHP → PHP).
  const fp = '2B/FI/0042B5CICI0.px';
  const fv = await meta(BASE, fp);
  const fdi = await query(BASE, fp, {
    Country: pick(fv, 'Country', (t) => t.replace(/^\.+/, '').trim() in FDI_INVESTOR),
    Year: pick(fv, 'Year', (t) => Number(t) >= FIRST),
    Quarter: pick(fv, 'Quarter', () => true)
  });
  for (const c of fdi) {
    out.push({ source_key: 'psa_openstat', reporter: 'PH', partner: FDI_INVESTOR[c.Country.replace(/^\.+/, '').trim()], product: 'FDI_APPROVED',
      flow: 'M', freq: 'Q', period: `${c.Year}-${c.Quarter}`, value: c.value * 1e6, currency: 'PHP' });
  }
  return out;
}
