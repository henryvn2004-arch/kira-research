// Kira Data adapter: Vietnam Customs (customs.gov.vn), monthly exports to / imports from each partner country.
// The site's own JSON list of releases (no key) gives the preliminary PDF of each month: "…-5X(VN-SB).pdf" (exports
// by country × main commodity) and "…-5N(VN-SB).pdf" (imports). The PDFs are text: each country block opens with a
// line "<COUNTRY IN CAPITALS> <month value> <year-to-date value>" in US$ ('.' = thousands). Only those country
// lines are read (the commodity lines use Vietnam's own commodity groups, not HS codes). The final figures link to an
// internal address, so the preliminary ones are what is published. No licence is stated on the site.
//   flows: reporter VN, partner ISO2, product TOTAL, flow X | M, freq M, USD.
// Half-month releases ("Kỳ 1" = 1st–15th, "Kỳ 2" = 16th–end of month; files "…-T9K2-1X(VN-SB).pdf" / "…-1N…") list
// commodities only, no countries: `series` reads their "TỔNG TRỊ GIÁ" line (value of the half month, then the year to
// date) into vn_exports_half / vn_imports_half, period 'YYYY-MM-H1' | 'YYYY-MM-H2'. Daily slot, the latest HALVES.
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { getJson, sleep } from './util.js';

const LIST = 'https://www.customs.gov.vn/bridge?url=/customs/api/tkhq/LayDanhSachMoiCongBoServlet&pageSize=600&language=TIENG_VIET';
const MONTHS = 25;   // per run: 12 months and the 12 before them (the year-on-year change)
const HALVES = 6;    // half-month releases read per daily run (a backfill passes more)

// Country names as printed by Vietnam Customs → ISO2.
export const NUOC = {
  'ACMENIA': 'AM', 'ÁCHENTINA': 'AR', 'AI CẬP': 'EG', 'AILEN': 'IE', 'AIXƠLEN': 'IS', 'ẤN ĐỘ': 'IN', 'ANGIÊRI': 'DZ',
  'ĂNGGÔLA': 'AO', 'ANH': 'GB', 'ÁO': 'AT', 'ARẬP XÊÚT': 'SA', 'BA LAN': 'PL', 'BĂNGLAĐÉT': 'BD', 'BÊLARUT': 'BY', 'BỈ': 'BE',
  'BỜ BIỂN NGÀ': 'CI', 'BỒ ĐÀO NHA': 'PT', 'BRAXIN': 'BR', 'BRUNÂY': 'BN', 'BUNGARI': 'BG', 'CADẮCXTAN': 'KZ',
  'CAMPUCHIA': 'KH', 'CANAĐA': 'CA', 'CHI LÊ': 'CL', 'CÔOÉT': 'KW', 'CÔLÔMBIA': 'CO', 'CRÔATIA': 'HR', 'ĐÀI LOAN': 'TW',
  'ĐAN MẠCH': 'DK', 'ĐÔNG TIMO': 'TL', 'ĐỨC': 'DE', 'EXTÔNIA': 'EE', 'GANA': 'GH', 'HÀ LAN': 'NL', 'HÀN QUỐC': 'KR',
  'HOA KỲ': 'US', 'HỒNG KÔNG': 'HK', 'HUNGARI': 'HU', 'HY LẠP': 'GR', 'INĐÔNÊXIA': 'ID', 'IRẮC': 'IQ', 'IRAN': 'IR',
  'ITALIA': 'IT', 'ISRAEN': 'IL', 'KÊNIA': 'KE', 'KIECGIKISTAN': 'KG', 'LÀO': 'LA', 'LATVIA': 'LV', 'LÍTVA': 'LT',
  'LÚCXĂMBUA': 'LU', 'MALAIXIA': 'MY', 'MANTA': 'MT', 'MÊ HI CÔ': 'MX', 'MIANMA': 'MM', 'MÔDĂMBÍC': 'MZ', 'NAUY': 'NO',
  'NAM PHI': 'ZA', 'NIUZILÂN': 'NZ', 'NGA': 'RU', 'NHẬT BẢN': 'JP', 'NIGIÊRIA': 'NG', 'ÔXTRÂYLIA': 'AU', 'PAKIXTAN': 'PK',
  'PANAMA': 'PA', 'PÊRU': 'PE', 'PHẦN LAN': 'FI', 'PHÁP': 'FR', 'PHILIPPIN': 'PH', 'RUMANI': 'RO', 'SÉC': 'CZ',
  'SINGAPO': 'SG', 'SÍP': 'CY', 'XLÔVAKIA': 'SK', 'XLÔVENHIA': 'SI', 'SRILANCA': 'LK', 'TANZANIA': 'TZ',
  'TÂY BAN NHA': 'ES', 'THÁI LAN': 'TH', 'THỔ NHĨ KỲ': 'TR', 'THỤY ĐIỂN': 'SE', 'THỤY SỸ': 'CH', 'TÔGÔ': 'TG',
  'TRUNG QUỐC': 'CN', 'UCRAINA': 'UA', 'XÊNÊGAN': 'SN', 'CÁC TIỂU VƯƠNG QUỐC ẢRẬP THỐNG NHẤT': 'AE',
  'CÁC TIỂU VƯƠNG QUỐC Ả RẬP THỐNG NHẤT': 'AE', 'CAMƠRUN': 'CM', 'GHINÊ': 'GN', 'GABÔNG': 'GA', 'MA RỐC': 'MA',
  'MÔNG CỔ': 'MN', 'URUGOAY': 'UY', 'PARAGOAY': 'PY', 'CATA': 'QA', 'ÔMAN': 'OM', 'GIOÓCĐANI': 'JO', 'LIBĂNG': 'LB',
  'NIUGHINÊ': 'PG', 'MAĐAGAXCA': 'MG', 'BÔLIVIA': 'BO', 'ÊCUAĐO': 'EC', 'GOATÊMALA': 'GT', 'CÔXTA RICA': 'CR',
  'CỘNG HÒA ĐÔMINICA': 'DO', 'MACAO': 'MO', 'BAHRAIN': 'BH', 'BANGLADESH': 'BD', 'ZIMBABUÊ': 'ZW', 'DĂMBIA': 'ZM',
  'UGANĐA': 'UG', 'ÊTIÔPIA': 'ET', 'LIBÊRIA': 'LR', 'XUĐĂNG': 'SD', 'TUYNIDI': 'TN', 'BÊNANH': 'BJ', 'CỐT ĐI VOA': 'CI', 'CỘNG HÒA CÔNG GÔ': 'CG', 'QUATA': 'QA'
};

const num = (s) => Number(String(s).replace(/\./g, ''));

// The release list answers 503 now and then like the file server: retry with pauses. One fetch per run.
let listed = null;
function releases() {
  if (!listed) {
    listed = (async () => {
      for (let i = 0; ; i++) {
        try { return await getJson(LIST); } catch (err) { if (i >= 4) throw err; await sleep(3000 * (i + 1)); }
      }
    })();
    listed.catch(() => { listed = null; });
    setTimeout(() => { listed = null; }, 10 * 60 * 1000).unref?.();
  }
  return listed;
}

// Country lines of one PDF's text → [{ partner, value }] (month values).
export function parseText(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = /^([^\d]+?) ([\d.]+)(?: {1,3}([\d.]+))? *$/.exec(line);
    if (!m) continue;
    const name = m[1].normalize('NFC').trim();
    if (name !== name.toUpperCase()) continue;              // commodity lines are mixed case
    const iso = NUOC[name];
    if (!iso) continue;
    out.push({ partner: iso, value: m[3] ? num(m[2]) : 0 });   // one number = year to date only: nothing in the month
  }
  return out;
}

// The file server answers about every other request with "503 upstream": retry until a PDF arrives.
async function getPdf(url) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' }, signal: AbortSignal.timeout(60000) });
      const buf = Buffer.from(await r.arrayBuffer());
      if (r.ok && buf.subarray(0, 5).toString() === '%PDF-') return buf;
    } catch { /* retry */ }
    await sleep(1500 * (i + 1));
  }
  return null;
}

export async function flows() {
  const list = await releases();
  const files = ((list && list.data) || [])
    .map((r) => ({ url: r.fileSoBo, m: /(\d{4})-t(\d{1,2})-5([xn])\(vn-sb\)\.pdf$/i.exec(r.fileSoBo || '') }))
    .filter((f) => f.m)
    .map((f) => ({ url: f.url, period: `${f.m[1]}-${f.m[2].padStart(2, '0')}`, flow: f.m[3].toUpperCase() === 'X' ? 'X' : 'M' }))
    .sort((a, b) => (a.period < b.period ? 1 : -1));
  const periods = [...new Set(files.map((f) => f.period))].slice(0, MONTHS);
  if (!periods.length) throw new Error('VN customs: no monthly partner files listed');
  const out = [];
  const done = new Set();
  for (const f of files) {
    if (!periods.includes(f.period) || done.has(f.period + f.flow)) continue;
    done.add(f.period + f.flow);
    const buf = await getPdf(f.url);
    if (!buf) continue;
    let text;
    try { ({ text } = await pdf(buf)); } catch { continue; }
    for (const row of parseText(text)) {
      out.push({ source_key: 'vn_customs', reporter: 'VN', partner: row.partner, product: 'TOTAL', flow: f.flow, freq: 'M',
        period: f.period, value: row.value, currency: 'USD' });
    }
    await sleep(500);
  }
  if (!out.length) throw new Error('VN customs: no country lines read');
  return out;
}

// Total line of a half-month PDF → value of the half month (US$). The line reads
// "<year to date> <half month>USDTỔNG TRỊ GIÁ" ('.' = thousands).
export function parseHalfTotal(text) {
  const m = /([\d.]+) +([\d.]+) *USD *TỔNG TRỊ GIÁ/.exec(text.normalize('NFC'));
  return m ? num(m[2]) : null;
}

export async function series(ind, { halves = HALVES } = {}) {
  const flow = { vn_exports_half: 'X', vn_imports_half: 'N' }[ind.key];
  if (!flow) throw new Error(`VN customs: no adapter for ${ind.key}`);
  const list = await releases();
  const files = ((list && list.data) || [])
    .map((r) => ({ url: r.fileSoBo, m: /(\d{4})-t(\d{1,2})k([12])-1([xn])\(vn-sb\)\.pdf$/i.exec(r.fileSoBo || '') }))
    .filter((f) => f.m && f.m[4].toUpperCase() === flow)
    .map((f) => ({ url: f.url, period: `${f.m[1]}-${f.m[2].padStart(2, '0')}-H${f.m[3]}` }))
    .sort((a, b) => (a.period < b.period ? 1 : -1));
  const out = [];
  const done = new Set();
  for (const f of files) {
    if (done.has(f.period)) continue;
    if (done.size >= halves) break;
    done.add(f.period);
    const buf = await getPdf(f.url);
    if (!buf) continue;
    let text;
    try { ({ text } = await pdf(buf)); } catch { continue; }
    const v = parseHalfTotal(text);
    if (v) out.push({ indicator_key: ind.key, country_code: 'VN', period: f.period, value: v, is_forecast: false, source_key: ind.source_key, vintage: null });
    await sleep(500);
  }
  if (!out.length) throw new Error(`VN customs: no half-month totals read for ${ind.key}`);
  return out;
}
