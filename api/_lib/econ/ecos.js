// Kira Data adapter: Bank of Korea ECOS Open API (needs ECOS_API_KEY; the public key "sample" returns at most 10 rows).
//   kr_usdkrw     KRW per US dollar, monthly average (731Y004 / 0000001 / 0000100)
//   kr_base_rate  Bank of Korea base rate, monthly (722Y001 / 0101000)
//   kr_cpi_yoy    consumer prices, % change on the same month a year earlier, computed from the 2020=100 index (901Y009 / 0)
import { getJson } from './util.js';

const SPECS = {
  kr_usdkrw: { stat: '731Y004', items: ['0000001', '0000100'] },
  kr_base_rate: { stat: '722Y001', items: ['0101000'] },
  kr_cpi_yoy: { stat: '901Y009', items: ['0'], yoy: true }
};

const ym = () => { const d = new Date(); return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

export async function series(ind, { env }) {
  const spec = SPECS[ind.key];
  if (!spec) throw new Error(`ECOS: no adapter for ${ind.key}`);
  const url = `https://ecos.bok.or.kr/api/StatisticSearch/${encodeURIComponent(env)}/json/kr/1/1000/${spec.stat}/M/${spec.yoy ? '201401' : '201501'}/${ym()}/${spec.items.join('/')}`;
  const body = await getJson(url);
  if (body && body.RESULT && body.RESULT.CODE !== 'INFO-200') throw new Error(`ECOS ${spec.stat}: ${body.RESULT.CODE} ${body.RESULT.MESSAGE}`);
  const rows = ((body && body.StatisticSearch && body.StatisticSearch.row) || [])
    .map((r) => [`${r.TIME.slice(0, 4)}-${r.TIME.slice(4, 6)}`, Number(r.DATA_VALUE)])
    .filter(([, v]) => Number.isFinite(v));
  const byPeriod = Object.fromEntries(rows);
  const points = spec.yoy
    ? rows.map(([p, v]) => { const prev = byPeriod[`${Number(p.slice(0, 4)) - 1}${p.slice(4)}`]; return prev ? [p, Math.round((v / prev - 1) * 1000) / 10] : null; }).filter(Boolean)
    : rows;
  return points.map(([period, value]) => ({ indicator_key: ind.key, country_code: 'KR', period, value, is_forecast: false, source_key: ind.source_key, vintage: null }));
}
