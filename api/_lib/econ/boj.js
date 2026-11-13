// Kira Data adapter: Bank of Japan Time-Series Data Search API (www.stat-search.boj.or.jp/api/v1, no key, launched
// Feb 2026). Terms (api_notice_en.pdf): show the credit line stored in data_sources.attribution, avoid excessive
// access, and tell the BoJ Research and Statistics Department by email when a service using the API is released.
//   series: jp_usdjpy (USD/JPY monthly average, 17:00 Tokyo), jp_call_rate (uncollateralized overnight call rate, monthly average)
//   flows:  Japan's direct investment by host country, net, monthly (BPM6): outward = flow X (assets),
//           inward = flow M (liabilities); product FDI_NET, JPY. Cambodia, Laos, Myanmar and Brunei have no
//           country series (only inside the ASEAN total, partner "ASEAN").
import { getJson } from './util.js';

const API = 'https://www.stat-search.boj.or.jp/api/v1/getDataCode?format=json&lang=en';
const START = '201501';
const SERIES = { jp_usdjpy: { db: 'FM08', code: 'FXERM07' }, jp_call_rate: { db: 'FM02', code: 'STRACLUCON' } };
const HOSTS = ['VN', 'TH', 'ID', 'MY', 'PH', 'SG', 'KR', 'TW', 'AU', 'NZ', 'AA'];

const ym = (n) => `${String(n).slice(0, 4)}-${String(n).slice(4, 6)}`;
const endDate = () => { const d = new Date(); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

async function fetchCodes(db, codes) {
  const out = [];
  let pos = '';
  for (let guard = 0; guard < 20; guard++) {
    const body = await getJson(`${API}&db=${db}&startDate=${START}&endDate=${endDate()}&code=${codes.join(',')}${pos ? `&startPosition=${pos}` : ''}`,
      { headers: { 'Accept-Encoding': 'gzip' } });
    if (!body || body.STATUS !== 200) throw new Error(`BoJ ${db}: ${body && body.MESSAGE}`);
    out.push(...(body.RESULTSET || []));
    if (!body.NEXTPOSITION) break;
    pos = body.NEXTPOSITION;
  }
  return out;
}

const points = (s) => (s.VALUES.SURVEY_DATES || []).map((d, i) => [d, s.VALUES.VALUES[i]]).filter(([, v]) => v !== null && v !== '' && Number.isFinite(Number(v)));

export async function series(ind) {
  const spec = SERIES[ind.key];
  if (!spec) throw new Error(`BoJ: no adapter for ${ind.key}`);
  const [s] = await fetchCodes(spec.db, [spec.code]);
  if (!s) throw new Error(`BoJ: empty reply for ${spec.code}`);
  return points(s).map(([d, v]) => ({ indicator_key: ind.key, country_code: 'JP', period: ym(d), value: Number(v), is_forecast: false, source_key: ind.source_key, vintage: String(s.LAST_UPDATE || '') || null }));
}

export async function flows() {
  const codes = HOSTS.flatMap((h) => [`BPBP6H${h}`, `BPBP6I${h}`]);
  const res = await fetchCodes('BP01', codes);
  const out = [];
  for (const s of res) {
    const m = /^BPBP6([HI])([A-Z]{2})$/.exec(s.SERIES_CODE);
    if (!m) continue;
    for (const [d, v] of points(s)) {
      out.push({ source_key: 'boj', reporter: 'JP', partner: m[2] === 'AA' ? 'ASEAN' : m[2], product: 'FDI_NET',
        flow: m[1] === 'H' ? 'X' : 'M', freq: 'M', period: ym(d), value: Number(v) * 1e8, currency: 'JPY' });
    }
  }
  return out;
}
