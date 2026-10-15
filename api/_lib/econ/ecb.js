// Kira Data adapter: ECB euro foreign exchange reference rates (data-api.ecb.europa.eu, no key; ECB statistics may
// be reused free of charge with the source acknowledged). Published every TARGET working day around 16:00 CET.
//   fx_usd_daily  local currency per US dollar = (currency per euro) ÷ (US dollars per euro), same day.
// Covers 9 of the 15 markets; the ECB has no rate for VND, TWD, KHR, LAK, MMK or BND.
const API = 'https://data-api.ecb.europa.eu/service/data/EXR/D.';
export const CCY = { JPY: 'JP', KRW: 'KR', IDR: 'ID', THB: 'TH', MYR: 'MY', PHP: 'PH', SGD: 'SG', AUD: 'AU', NZD: 'NZ' };
const DAYS_BACK = 400;   // a little over a year: the dashboard compares with a year before

// CSV (format=csvdata) → { CCY: { date: value } }.
export function parseCsv(text) {
  const lines = text.trim().split('\n');
  const head = lines.shift().split(',');
  const iC = head.indexOf('CURRENCY'), iT = head.indexOf('TIME_PERIOD'), iV = head.indexOf('OBS_VALUE');
  const out = {};
  for (const line of lines) {
    const f = line.split(',');
    const v = Number(f[iV]);
    if (!f[iC] || !/^\d{4}-\d{2}-\d{2}$/.test(f[iT]) || !Number.isFinite(v) || v <= 0) continue;
    (out[f[iC]] = out[f[iC]] || {})[f[iT]] = v;
  }
  return out;
}

export async function series(ind) {
  if (ind.key !== 'fx_usd_daily') throw new Error(`ECB: no adapter for ${ind.key}`);
  const start = new Date(Date.now() - DAYS_BACK * 864e5).toISOString().slice(0, 10);
  const url = `${API}USD+${Object.keys(CCY).join('+')}.EUR.SP00.A?startPeriod=${start}&format=csvdata`;
  const r = await fetch(url, { headers: { Accept: 'text/csv' }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`ECB ${r.status}`);
  const rates = parseCsv(await r.text());
  const usd = rates.USD || {};
  const out = [];
  for (const [ccy, cc] of Object.entries(CCY)) {
    for (const [day, v] of Object.entries(rates[ccy] || {})) {
      if (!usd[day]) continue;
      out.push({ indicator_key: ind.key, country_code: cc, period: day, value: Number((v / usd[day]).toPrecision(6)), is_forecast: false, source_key: ind.source_key, vintage: null });
    }
  }
  if (!out.length) throw new Error('ECB: no rates read');
  return out;
}
