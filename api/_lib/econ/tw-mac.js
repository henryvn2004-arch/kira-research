// Kira Data adapter: Taiwan's approved outward investment by destination, monthly, US$ million. Published as one
// CSV per month on data.gov.tw (dataset 7476, Mainland Affairs Council, figures from the MOEA Department of
// Investment Review; Open Government Data License, Taiwan v1.0). Each file holds two single months plus year-to-date
// and cumulative columns for the ~12 largest destinations and "other areas"; the newest file is the last distribution.
// A destination appears only in the months it ranks, so summarise() shows it when 12 consecutive months exist.
//   flows: reporter TW, partner ISO2 ('WLD' = sum of all rows), product FDI_APPROVED, flow X, freq M, USD.
import { getJson, sleep } from './util.js';

const DATASET = 'https://data.gov.tw/api/v2/rest/dataset/7476';
const FILES = 26;   // two months per file, some files missing: ~24 months

export const AREA = {
  '美國': 'US', '新加坡': 'SG', '越南': 'VN', '中國大陸': 'CN', '泰國': 'TH', '馬來西亞': 'MY', '日本': 'JP', '德國': 'DE',
  '巴西': 'BR', '薩摩亞': 'WS', '加勒比海英國屬地': 'VG', '英屬澤西島': 'JE', '印尼': 'ID', '菲律賓': 'PH', '澳大利亞': 'AU',
  '澳洲': 'AU', '紐西蘭': 'NZ', '韓國': 'KR', '香港': 'HK', '印度': 'IN', '荷蘭': 'NL', '英國': 'GB', '墨西哥': 'MX',
  '盧森堡': 'LU', '柬埔寨': 'KH', '緬甸': 'MM', '加拿大': 'CA', '法國': 'FR', '捷克': 'CZ', '波蘭': 'PL', '匈牙利': 'HU'
};

// Parses one CSV: the two single-month amount columns, e.g. "核准臺灣對外投資─金額(百萬美元)(2026年7月)".
export function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const head = lines[0].split(',');
  const cols = [];
  head.forEach((h, i) => {
    const m = /金額\(百萬美元\)\((\d{4})年(\d{1,2})月\)/.exec(h);
    if (m) cols.push({ i, period: `${m[1]}-${m[2].padStart(2, '0')}` });
  });
  if (!cols.length) throw new Error('TW MAC: CSV columns changed');
  const out = [];
  for (const c of cols) {
    let total = 0;
    for (const line of lines.slice(1)) {
      const f = line.split(',');
      const v = Number(f[c.i]);
      if (!Number.isFinite(v)) continue;
      total += v;
      const iso = AREA[(f[0] || '').trim()];
      if (iso) out.push({ partner: iso, period: c.period, value: v });
    }
    out.push({ partner: 'WLD', period: c.period, value: total });
  }
  return out.map((r) => ({ source_key: 'tw_mac', reporter: 'TW', partner: r.partner, product: 'FDI_APPROVED', flow: 'X',
    freq: 'M', period: r.period, value: r.value * 1e6, currency: 'USD' }));
}

export async function flows() {
  const meta = await getJson(DATASET);
  const urls = ((meta && meta.result && meta.result.distribution) || []).map((d) => d.resourceDownloadUrl).filter(Boolean);
  if (!urls.length) throw new Error('TW MAC: no files listed');
  const seen = new Map();
  for (const url of urls.slice(-FILES).reverse()) {             // newest first: a later file's month wins
    const r = await fetch(url, { headers: { 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) continue;
    const text = await r.text();
    if (!/核准臺(灣|商)對外投資/.test(text)) continue;   // wording changed from 臺商 to 臺灣 in 2025
    for (const row of parseCsv(text)) {
      const k = row.partner + row.period;
      if (!seen.has(k)) seen.set(k, row);
    }
    await sleep(500);
  }
  return [...seen.values()];
}
