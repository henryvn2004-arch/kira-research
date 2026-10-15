// Kira Data adapter: World Bank WDI (api.worldbank.org/v2), no key, CC BY 4.0. No Taiwan.
import { getJson, ISO3, FROM_ISO3, FIRST_YEAR } from './util.js';

// World Bank: one call per indicator for all countries.
export async function fetchWorldBank(ind) {
  const countries = Object.values(ISO3).filter((c) => c !== 'TWN').join(';');
  const year = new Date().getUTCFullYear();
  const url = `https://api.worldbank.org/v2/country/${countries}/indicator/${encodeURIComponent(ind.source_code)}` +
    `?format=json&date=${FIRST_YEAR}:${year}&per_page=5000`;
  const body = await getJson(url);
  if (!Array.isArray(body) || !Array.isArray(body[1])) {
    if (Array.isArray(body) && body[0] && body[0].total === 0) return [];
    throw new Error(`World Bank: unexpected reply for ${ind.source_code}`);
  }
  const rows = [];
  for (const o of body[1]) {
    const cc = FROM_ISO3[o.countryiso3code];
    if (!cc || o.value === null || o.value === undefined || !/^\d{4}$/.test(o.date)) continue;
    rows.push({ indicator_key: ind.key, country_code: cc, period: o.date, value: Number(o.value), is_forecast: false, source_key: ind.source_key, vintage: null });
  }
  return rows;
}
