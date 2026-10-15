// Kira Data adapter: Korea Customs Service trade by item and country, data.go.kr dataset 15100475
// (needs DATA_GO_KR_KEY; licence "no restriction on permitted use"). XML reply; one call per country and year
// (the API allows at most a 12-month range). Flows written: reporter KR, partner = our market, X/M, USD:
// product TOTAL monthly and HS 2-digit annual for closed years.
const API = 'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList';
const PARTNERS = ['VN', 'TH', 'ID', 'MY', 'PH', 'SG', 'KH', 'LA', 'MM', 'BN', 'TW', 'AU', 'NZ', 'JP'];
const YEARS_BACK = 2;

const tag = (xml, name) => { const m = new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml); return m ? m[1].trim() : ''; };

async function getXml(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' } });
      const text = await r.text();
      if (!r.ok) throw new Error(`${r.status} ${tag(text, 'errMsg') || tag(text, 'returnAuthMsg') || text.slice(0, 120)}`);
      return text;
    } catch (err) {
      if (i === 2) throw err;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
}

export async function flows({ env: key }) {
  const out = [];
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  for (const cc of PARTNERS) {
    for (let y = thisYear - YEARS_BACK; y <= thisYear; y++) {
      const end = y === thisYear ? `${y}${String(now.getUTCMonth() + 1).padStart(2, '0')}` : `${y}12`;
      const xml = await getXml(`${API}?serviceKey=${encodeURIComponent(key)}&strtYymm=${y}01&endYymm=${end}&cntyCd=${cc}`);
      const code = tag(xml, 'resultCode');
      if (code && code !== '00') throw new Error(`KR customs ${cc} ${y}: ${code} ${tag(xml, 'resultMsg')}`);
      const items = xml.split('<item>').slice(1).map((s) => s.split('</item>')[0]);
      const monthly = { X: {}, M: {} }; const hs2 = { X: {}, M: {} };
      // A row whose hsCd is not a number is a summary row: use it for the monthly total and skip it for HS sums.
      const totals = items.filter((it) => !/^\d+$/.test(tag(it, 'hsCd')));
      for (const it of items) {
        const ym = tag(it, 'year').replace('.', '-');
        if (!/^\d{4}-\d{2}$/.test(ym)) continue;
        const hs = tag(it, 'hsCd');
        const isTotal = !/^\d+$/.test(hs);
        for (const [flow, field] of [['X', 'expDlr'], ['M', 'impDlr']]) {
          const v = Number(tag(it, field));
          if (!Number.isFinite(v)) continue;
          if (isTotal || !totals.length) monthly[flow][ym] = (monthly[flow][ym] || 0) + v;
          if (!isTotal && y < thisYear) hs2[flow][hs.slice(0, 2)] = (hs2[flow][hs.slice(0, 2)] || 0) + v;
        }
      }
      for (const flow of ['X', 'M']) {
        for (const [period, value] of Object.entries(monthly[flow])) out.push({ source_key: 'kr_customs', reporter: 'KR', partner: cc, product: 'TOTAL', flow, freq: 'M', period, value, currency: 'USD' });
        for (const [hs, value] of Object.entries(hs2[flow])) out.push({ source_key: 'kr_customs', reporter: 'KR', partner: cc, product: hs, flow, freq: 'A', period: String(y), value, currency: 'USD' });
      }
    }
  }
  return out;
}
