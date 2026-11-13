// Kira Data adapter: Indonesia Ministry of Investment / BKPM open data portal (data.bkpm.go.id, CC BY 4.0).
// One dataset per quarter, "Data Realisasi Investasi Triwulan <I-IV> Tahun <year>": a zip holding a CSV (';', decimal
// commas) with one row per period × PMA/PMDN × country × sector × district. Foreign (PMA) rows are summed by country.
// Datasets are found through the portal's search page (older slugs carry a random suffix); each detail page gives the
// zip URL in its JSON-LD (distribution.contentUrl). The PDF reports on bkpm.go.id sit behind a personal-data form: not used.
//   flows: reporter ID, partner = investor country (ISO2; 'WLD' = all foreign), product FDI_REALISED, flow M, freq Q, USD.
// By default only the newest 2 quarters are read (each zip is ~6 MB of CSV); { all: true } reads every quarter listed.
import XLSX from 'xlsx';
import { sleep } from './util.js';

const BASE = 'https://data.bkpm.go.id';
const UA = { 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' };
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4 };

// Indonesian country names in the CSV → ISO2. Countries not listed only count in the 'WLD' total.
export const NEGARA = {
  'Singapura': 'SG', 'R.R. Tiongkok': 'CN', 'Hongkong, RRT': 'HK', 'Jepang': 'JP', 'Korea Selatan': 'KR', 'Malaysia': 'MY',
  'Belanda': 'NL', 'Amerika Serikat': 'US', 'Australia': 'AU', 'Inggris': 'GB', 'Perancis': 'FR', 'India': 'IN',
  'Kepulauan Virgin Inggris': 'VG', 'Jerman': 'DE', 'Taiwan': 'TW', 'Swiss': 'CH', 'Spanyol': 'ES', 'Thailand': 'TH',
  'Italia': 'IT', 'Belgia': 'BE', 'Kanada': 'CA', 'Turki': 'TR', 'Vietnam': 'VN', 'Uni Emirat Arab': 'AE', 'Selandia Baru': 'NZ',
  'Swedia': 'SE', 'Kepulauan Cayman': 'KY', 'Denmark': 'DK', 'Saudi Arabia': 'SA', 'Philipina': 'PH', 'Austria': 'AT',
  'Luxembourg': 'LU', 'Mauritius': 'MU', 'Brunei Darussalam': 'BN', 'Myanmar': 'MM', 'Kamboja': 'KH', 'Makao': 'MO',
  'Rusia': 'RU', 'Qatar': 'QA', 'Kuwait': 'KW', 'Bermuda': 'BM', 'Irlandia': 'IE', 'Norwegia': 'NO', 'Finlandia': 'FI'
};

// Files from 2026 use ';' with decimal commas; older ones use ',' with decimal points and quoted fields.
const num = (s, sep) => Number(sep === ';' ? String(s || '').replace(/\./g, '').replace(',', '.') : String(s || ''));
function split(line, sep) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === sep && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function get(url, as) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`BKPM ${r.status} ${url}`);
      return as === 'buffer' ? Buffer.from(await r.arrayBuffer()) : await r.text();
    } catch (err) {
      last = err;
      await sleep(2000 * (i + 1));
    }
  }
  throw last;
}

// Quarterly datasets listed by the portal: [{ slug, period: '2026-Q2' }], newest first.
export async function listQuarters() {
  const found = new Map();
  for (let page = 1; page <= 12; page++) {
    const html = await get(`${BASE}/dataset?q=triwulan&page=${page}`);
    const re = /dataset-detail\/(data-realisasi-investasi-triwulan-(i{1,3}|iv)-tahun-(\d{4})(?:-[A-Za-z0-9]+)?)/g;
    let m, any = false;
    while ((m = re.exec(html))) {
      any = true;
      const period = `${m[3]}-Q${ROMAN[m[2]]}`;
      if (!found.has(period)) found.set(period, m[1]);
    }
    if (!any && page > 6) break;
  }
  return [...found].map(([period, slug]) => ({ period, slug })).sort((a, b) => (a.period < b.period ? 1 : -1));
}

// Sums the PMA rows of one quarter's CSV by country (US$ thousand → US$).
export function parseCsv(text, period) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const head = split(lines[0], sep).map((h) => h.trim());
  const col = (n) => head.indexOf(n);
  const [cPer, cStat, cNeg, cUsd] = [col('periode'), col('status_penanaman_modal'), col('negara'), col('investasi_us_ribu')];
  if ([cPer, cStat, cNeg, cUsd].some((c) => c < 0)) throw new Error('BKPM: CSV columns changed');
  const sums = {};
  for (let i = 1; i < lines.length; i++) {
    const f = split(lines[i], sep);
    if (f[cStat] !== 'PMA') continue;
    const m = /(\d{4})\s*-\s*Triwulan\s*(\d)/i.exec(f[cPer] || '');
    if (!m || `${m[1]}-Q${m[2]}` !== period) continue;
    const v = num(f[cUsd], sep) * 1000;
    if (!Number.isFinite(v)) continue;
    const iso = NEGARA[(f[cNeg] || '').trim()];
    sums.WLD = (sums.WLD || 0) + v;
    if (iso) sums[iso] = (sums[iso] || 0) + v;
  }
  return Object.entries(sums).map(([partner, value]) => ({ source_key: 'bkpm', reporter: 'ID', partner, product: 'FDI_REALISED',
    flow: 'M', freq: 'Q', period, value, currency: 'USD' }));
}

async function quarter({ slug, period }) {
  const html = await get(`${BASE}/dataset-detail/${slug}`);
  const m = /"contentUrl"\s*:\s*"([^"]+)"/.exec(html);
  if (!m) throw new Error(`BKPM ${period}: no download link`);
  const zip = XLSX.CFB.read(await get(m[1].replace(/\\\//g, '/'), 'buffer'), { type: 'buffer' });
  const entry = zip.FileIndex.find((f) => /\.csv$/i.test(f.name));
  if (!entry) throw new Error(`BKPM ${period}: no CSV in the zip`);
  return parseCsv(Buffer.from(entry.content).toString('utf8'), period);
}

export async function flows({ all = false } = {}) {
  const list = await listQuarters();
  if (!list.length) throw new Error('BKPM: no quarterly datasets found');
  const out = [];
  for (const q of all ? list : list.slice(0, 2)) {
    out.push(...(await quarter(q)));
    await sleep(1000);
  }
  return out;
}
