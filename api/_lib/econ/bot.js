// Kira Data adapter: Bank of Thailand API gateway (gateway.api.bot.or.th, needs BOT_API_TOKEN sent raw in the
// Authorization header). Routes checked 2026-10-14 (they answer 401 without a token); query parameters and the
// reply shape follow the previous API generation and are confirmed on the first run with a real token.
//   th_usdthb      THB per US dollar, monthly average (mid rate)
//   th_policy_rate Bank of Thailand policy rate
import { getJson } from './util.js';

const GW = 'https://gateway.api.bot.or.th';
const ym = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const ymd = (d) => d.toISOString().slice(0, 10);

// The gateway nests results as result.data.data_detail[] (older generation); fall back to any array of objects found.
function detail(body) {
  const d = body && body.result && body.result.data;
  if (d && Array.isArray(d.data_detail)) return d.data_detail;
  if (d && Array.isArray(d)) return d;
  for (const v of Object.values((body && body.result) || body || {})) if (Array.isArray(v)) return v;
  throw new Error('BoT: unexpected reply shape');
}

async function usdthb(ind, token) {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), 1)); // the gateway keeps about a year for most series
  const body = await getJson(`${GW}/Stat-ExchangeRate/v2/MONTHLY_AVG_EXG_RATE/?start_period=${ym(start)}&end_period=${ym(end)}&currency=USD`, { headers: { Authorization: token } });
  return detail(body).filter((r) => r.mid_rate !== undefined && r.mid_rate !== '').map((r) => ({
    indicator_key: ind.key, country_code: 'TH', period: String(r.period).slice(0, 7), value: Number(r.mid_rate), is_forecast: false, source_key: ind.source_key, vintage: null
  })).filter((r) => Number.isFinite(r.value));
}

async function policyRate(ind, token) {
  const end = new Date();
  const start = new Date(Date.UTC(end.getUTCFullYear() - 10, 0, 1));
  const body = await getJson(`${GW}/PolicyRate/v3/policy_rate/?start_period=${ymd(start)}&end_period=${ymd(end)}`, { headers: { Authorization: token } });
  // Daily or change-date rows → keep the last value of each month.
  const byMonth = {};
  for (const r of detail(body)) {
    const p = String(r.period || r.date || '').slice(0, 7);
    const v = Number(r.policy_rate ?? r.rate ?? r.value);
    if (/^\d{4}-\d{2}$/.test(p) && Number.isFinite(v)) byMonth[p] = v;
  }
  return Object.entries(byMonth).map(([period, value]) => ({ indicator_key: ind.key, country_code: 'TH', period, value, is_forecast: false, source_key: ind.source_key, vintage: null }));
}

const SPECS = { th_usdthb: usdthb, th_policy_rate: policyRate };

export async function series(ind, { env }) {
  const fn = SPECS[ind.key];
  if (!fn) throw new Error(`BoT: no adapter for ${ind.key}`);
  return fn(ind, env);
}
