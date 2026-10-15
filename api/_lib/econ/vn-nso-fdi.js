// Kira Data adapter: Vietnam's registered FDI by investor country, from the monthly statistics workbook of the
// National Statistics Office (nso.gov.vn, "02.-Bieu-thang-<m>.<yyyy>.xlsx", sheet "23.FDI"). The workbook is found
// through the site's WordPress media API (file names vary month to month). Values are year-to-date (from 1 January to
// the month in the sheet title), US$ million, registered capital: new + adjusted (capital contributions and share
// purchases are left out: only some months print them) for the
// top ~20 partners plus the national total. The Foreign Investment Agency's own monthly report is no longer online.
//   flows: reporter VN, partner ISO2 ('WLD' = all), product FDI_REG_YTD (year to date: summarise() compares the
//          latest month with the same month a year before), flow M, freq M, period = end month, USD.
import XLSX from 'xlsx';
import { sleep } from './util.js';

const MEDIA = 'https://www.nso.gov.vn/wp-json/wp/v2/media?search=Bieu&mime_type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&per_page=100&_fields=id,date,source_url';
const UA = { 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' };
const MONTHS = 15;     // workbooks read per run: enough for the same month a year before

// Partner names as printed in the sheet → ISO2.
export const DOI_TAC = {
  'xin-ga-po': 'SG', 'hàn quốc': 'KR', 'đặc khu hành chính hồng kông (tq)': 'HK', 'hồng kông (tq)': 'HK', 'trung quốc': 'CN',
  'nhật bản': 'JP', 'đài loan': 'TW', 'đài loan (tq)': 'TW', 'ma-lai-xi-a': 'MY', 'in-đô-nê-xi-a': 'ID', 'thái lan': 'TH',
  'hoa kỳ': 'US', 'hà lan': 'NL', 'lúc-xăm-bua': 'LU', 'đan mạch': 'DK', 'quần đảo vigin thuộc anh': 'VG',
  'quần đảo virgin thuộc anh': 'VG', 'xa-moa': 'WS', 'đức': 'DE', 'vương quốc anh': 'GB', 'thổ nhĩ kỳ': 'TR',
  'liên bang nga': 'RU', 'bỉ': 'BE', 'pháp': 'FR', 'ô-xtrây-li-a': 'AU', 'ốt-xtrây-li-a': 'AU', 'ca-na-đa': 'CA',
  'thụy sỹ': 'CH', 'thụy sĩ': 'CH', 'ấn độ': 'IN', 'phi-li-pin': 'PH', 'quần đảo cay-man': 'KY', 'xây-sen': 'SC',
  'niu di-lân': 'NZ', 'bru-nây': 'BN', 'ca-dắc-xtan': 'KZ', 'các tiểu vương quốc ả rập thống nhất': 'AE', 'i-ta-li-a': 'IT',
  'tây ban nha': 'ES', 'thụy điển': 'SE', 'ca-mơ-run': 'CM', 'xu-ri-nam': 'SR'
};
const norm = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

async function get(url, as) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`NSO ${r.status} ${url}`);
      return as === 'buffer' ? Buffer.from(await r.arrayBuffer()) : await r.json();
    } catch (err) {
      last = err;
      await sleep(2000 * (i + 1));
    }
  }
  throw last;
}

// Monthly workbooks (Vietnamese edition), newest upload first.
export async function listWorkbooks() {
  const out = [];
  for (let page = 1; page <= 3; page++) {
    let list;
    try { list = await get(`${MEDIA}&page=${page}`); } catch (err) { if (page > 1) break; throw err; }
    if (!Array.isArray(list) || !list.length) break;
    for (const m of list) {
      const name = decodeURIComponent(m.source_url.split('/').pop());
      if (!/Bieu-?(thang-|T)?\d{1,2}[._]\d{4}/i.test(name.replace(/^0?2[.-]+/, '')) || /EN|ENG|CPI|TH-|tong-quan/i.test(name)) continue;
      out.push({ date: m.date, url: m.source_url, name });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// Reads the FDI sheet: end month from its title, then the partner rows.
export function parseWorkbook(buf) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const name = wb.SheetNames.find((s) => /^\s*23\.\s*FDI/i.test(s)) || wb.SheetNames.find((s) => /FDI/i.test(s));
  if (!name) return null;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
  const title = String(rows[0] && rows[0][0] || '');
  if (!/đầu tư nước ngoài/i.test(title)) return null;                         // English edition: skip
  const m = [...title.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)].pop();   // "từ 01/01- 30/9/2026" → 30/9/2026
  if (!m) return null;
  const period = `${m[3]}-${String(m[2]).padStart(2, '0')}`;
  // Columns by header text (layouts change: some months add a "Tổng số" column incl. capital contributions).
  const head = [];
  for (const r of rows.slice(1, 8)) r.forEach((c, i) => { head[i] = (head[i] || '') + ' ' + norm(c); });
  const cNew = head.findIndex((h) => /cấp mới/.test(h || '')), cAdj = head.findIndex((h) => /điều chỉnh/.test(h || ''));
  if (cNew < 0 || cAdj < 0) return null;
  const val = (r) => { const n = Number(r[cNew]), a = Number(r[cAdj]); return Number.isFinite(n) ? n + (Number.isFinite(a) ? a : 0) : NaN; };
  const out = [];
  let inPartners = false;
  rows.forEach((r, i) => {
    // The national total sits on the "Tổng số" row, or (some months) on the line after it.
    if (norm(r[0]) !== 'tổng số') return;
    const t = val(r) || val(rows[i + 1] || []);
    if (t > 0) out.push({ partner: 'WLD', value: t });
  });
  for (const r of rows) {
    const a = norm(r[0]), b = norm(r[1]), total = val(r);
    if (a.startsWith('phân theo')) { inPartners = /nước|vùng lãnh thổ/.test(a); continue; }
    if (!inPartners || !b || !Number.isFinite(total)) continue;
    const iso = DOI_TAC[b];
    if (iso) out.push({ partner: iso, value: total });
  }
  return { period, rows: out };
}

export async function flows() {
  const list = await listWorkbooks();
  if (!list.length) throw new Error('NSO: no monthly workbook found');
  const seen = new Set();
  const out = [];
  let read = 0;
  for (const w of list) {
    if (read >= MONTHS + 6) break;
    read++;
    let parsed;
    try { parsed = parseWorkbook(await get(w.url, 'buffer')); } catch { continue; }
    if (!parsed || seen.has(parsed.period) || !parsed.rows.length) continue;  // newest upload of a month wins
    seen.add(parsed.period);
    for (const r of parsed.rows) {
      out.push({ source_key: 'vn_nso', reporter: 'VN', partner: r.partner, product: 'FDI_REG_YTD', flow: 'M', freq: 'M',
        period: parsed.period, value: r.value * 1e6, currency: 'USD' });
    }
    if (seen.size >= MONTHS) break;
    await sleep(500);
  }
  if (!out.length) throw new Error('NSO: FDI sheet not found in the workbooks');
  return out;
}
