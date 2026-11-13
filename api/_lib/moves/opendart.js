// Kira Data (D4) adapter: OpenDART (Korea, free key OPENDART_API_KEY). Lists the last days' major-event and
// exchange filings and keeps those whose title names one of our markets (rules.js, Korean names).
// The investor is Korea and the company is the filer. Reply shape checked on the first run with a key.
import { getJson } from '../econ/util.js';

const API = 'https://opendart.fss.or.kr/api/list.json';
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

export async function items({ env, days = 3 } = {}) {
  if (!env) throw new Error('OpenDART: OPENDART_API_KEY missing');
  const end = new Date(), start = new Date(Date.now() - days * 864e5);
  const out = [];
  for (const ty of ['B', 'I']) {
    for (let page = 1; page <= 10; page++) {
      const qs = new URLSearchParams({ crtfc_key: env, bgn_de: ymd(start), end_de: ymd(end), pblntf_ty: ty, page_no: String(page), page_count: '100' });
      const body = await getJson(`${API}?${qs.toString()}`);
      if (body.status === '013') break;                       // no data
      if (body.status !== '000') throw new Error(`OpenDART ${body.status}: ${body.message}`);
      for (const r of body.list || []) {
        out.push({ source_key: 'opendart', url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}`, title: `${r.corp_name}: ${String(r.report_nm || '').trim()}`,
          domain: 'dart.fss.or.kr', lang: 'ko', event_date: `${r.rcept_dt.slice(0, 4)}-${r.rcept_dt.slice(4, 6)}-${r.rcept_dt.slice(6, 8)}`, tier: 'filing',
          investor: 'KR', company: r.corp_name, classify_text: r.report_nm });
      }
      if (page >= Number(body.total_page || 1)) break;
    }
  }
  return out;
}
