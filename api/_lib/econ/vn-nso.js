// Kira Data adapter: Vietnam National Statistics Office, PXWeb API (pxweb.nso.gov.vn/api/v1/vi, no key).
// Only three databases answer through the API (industry, enterprises, population and labour), all annual;
// GDP, CPI, retail, FDI and trade exist only in the web interface (planned for D6).
// Terms: nso.gov.vn asks re-users to name the site as the source; no open licence is published.
//   vn_ipi_growth      industrial production index, whole country, % change on the previous year
//   vn_wage_all        average monthly income per enterprise worker, VND
//   vn_wage_foreign    same, 100% foreign-owned enterprises
//   vn_urban_pop       urban population, people
import { meta, pick, query } from './pxweb.js';

const BASE = 'https://pxweb.nso.gov.vn/api/v1/vi/';
const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
const yearOf = (t) => (String(t).match(/(\d{4})/) || [])[1];

const SPECS = {
  vn_ipi_growth: {
    path: 'Công nghiệp/V07.02.px',
    select: (v) => ({ 'Tỉnh, thành phố': pick(v, 'Tỉnh, thành phố', (t) => /CẢ NƯỚC/i.test(t)), 'Năm': pick(v, 'Năm', () => true) }),
    value: (x) => Math.round((x - 100) * 100) / 100
  },
  vn_wage_all: {
    path: 'Doanh nghiệp/V05.33.px',
    select: (v) => ({ 'Loại hình doanh nghiệp': pick(v, 'Loại hình doanh nghiệp', (t) => /^\s*TỔNG SỐ/i.test(t)), 'Năm': pick(v, 'Năm', () => true) }),
    value: (x) => x * 1000
  },
  vn_wage_foreign: {
    path: 'Doanh nghiệp/V05.33.px',
    select: (v) => ({ 'Loại hình doanh nghiệp': pick(v, 'Loại hình doanh nghiệp', (t) => /100%\s*vốn nước ngoài/i.test(t)), 'Năm': pick(v, 'Năm', () => true) }),
    value: (x) => x * 1000
  },
  vn_urban_pop: {
    path: 'Dân số và lao động/V02.03-07.px',
    select: (v) => ({
      'Tỉnh, thành phố': pick(v, 'Tỉnh, thành phố', (t) => /CẢ NƯỚC/i.test(t)),
      'Dân số trung bình': pick(v, 'Dân số trung bình', (t) => /thành thị/i.test(t)),
      'Năm': pick(v, 'Năm', () => true)
    }),
    value: (x) => x * 1000
  }
};

export async function series(ind) {
  const spec = SPECS[ind.key];
  if (!spec) throw new Error(`VN NSO: no adapter for ${ind.key}`);
  const path = enc(spec.path);
  const v = await meta(BASE, path);
  const cells = await query(BASE, path, spec.select(v));
  const out = [];
  for (const c of cells) {
    const y = yearOf(c['Năm']);
    if (!y) continue;
    out.push({ indicator_key: ind.key, country_code: 'VN', period: y, value: spec.value(c.value), is_forecast: false, source_key: ind.source_key,
      vintage: /sơ bộ/i.test(c['Năm']) ? 'preliminary' : null });
  }
  return out;
}
