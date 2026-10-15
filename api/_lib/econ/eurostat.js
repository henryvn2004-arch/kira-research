// Kira Data adapter: Eurostat Comext, dataset DS-045409 "EU trade since 1988 by HS2-4-6 and CN8" (no key).
// Eurostat's copyright notice allows reuse, commercial included, with acknowledgement (credit in data_sources).
// Partner-reported ("mirror") trade: what the EU buys from (M) and sells to (X) each of our markets, for the HS codes
// in segment_data_map, annual, euro. Partner 'WLD' = extra-EU total (EXT_EU27_2020), used for "share of EU imports".
// Completed years only: the current year's annual figure is partial.
import { getJson } from './util.js';

const API = 'https://ec.europa.eu/eurostat/api/comext/dissemination/statistics/1.0/data/DS-045409';
const MARKETS = ['VN', 'TH', 'ID', 'MY', 'PH', 'SG', 'TW', 'AU', 'NZ', 'KH', 'LA', 'MM', 'BN', 'JP', 'KR'];
const YEARS = 7;
const BATCH = 8;   // HS codes per request (~10 s each)

// json-stat 2: flat index → one coordinate per dimension.
function cells(body) {
  const ids = body.id, size = body.size;
  const codes = ids.map((d) => {
    const idx = body.dimension[d].category.index;
    const out = [];
    for (const [code, i] of Object.entries(idx)) out[i] = code;
    return out;
  });
  return Object.entries(body.value || {}).map(([flat, value]) => {
    let n = Number(flat);
    const c = {};
    for (let d = ids.length - 1; d >= 0; d--) { c[ids[d]] = codes[d][n % size[d]]; n = Math.floor(n / size[d]); }
    return { ...c, value };
  });
}

export async function flows({ hs = [] } = {}) {
  const last = new Date().getUTCFullYear() - 1;
  const partners = [...MARKETS, 'EXT_EU27_2020'];
  const out = [];
  for (let i = 0; i < hs.length; i += BATCH) {
    const qs = new URLSearchParams({ format: 'JSON', reporter: 'EU27_2020', freq: 'A', indicators: 'VALUE_IN_EUROS', sinceTimePeriod: String(last - YEARS + 1) });
    for (const p of partners) qs.append('partner', p);
    for (const code of hs.slice(i, i + BATCH)) qs.append('product', code);
    qs.append('flow', '1');
    qs.append('flow', '2');
    const body = await getJson(`${API}?${qs.toString()}`);
    if (!body || !body.id) throw new Error('Eurostat: unexpected reply');
    for (const c of cells(body)) {
      if (Number(c.time) > last || !Number.isFinite(c.value)) continue;
      out.push({ source_key: 'eurostat_comext', reporter: 'EU', partner: c.partner === 'EXT_EU27_2020' ? 'WLD' : c.partner, product: c.product,
        flow: c.flow === '1' ? 'M' : 'X', freq: 'A', period: c.time, value: c.value, currency: 'EUR' });
    }
  }
  return out;
}
