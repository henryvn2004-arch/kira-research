// Kira Data adapter: Bank Negara Malaysia OpenAPI (api.bnm.gov.my, no key). Terms of Use for BNM Datasets allow
// commercial use with the credit "Source: Bank Negara Malaysia", a link to the terms and the statement in
// data_sources.attribution.
//   my_usdmyr  RM per US dollar, monthly average of the 12:00 middle rate (the default 11:30 session has no middle rate)
//   my_opr     overnight policy rate, level at the end of each month
import { getJson } from './util.js';

const API = 'https://api.bnm.gov.my/public/';
const H = { headers: { Accept: 'application/vnd.BNM.API.v1+json' } };
const MONTHS_BACK = 36;
const OPR_FROM = 2015;

async function usdmyr(ind) {
  const out = [];
  const now = new Date();
  for (let i = MONTHS_BACK; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
    let body;
    try { body = await getJson(`${API}exchange-rate/USD/year/${y}/month/${m}?session=1200`, H); } catch (_e) { continue; }
    const rates = ((body && body.data && body.data.rate) || []).map((r) => Number(r.middle_rate)).filter(Number.isFinite);
    if (!rates.length) continue;
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    out.push({ indicator_key: ind.key, country_code: 'MY', period: `${y}-${String(m).padStart(2, '0')}`, value: Math.round(avg * 10000) / 10000, is_forecast: false, source_key: ind.source_key, vintage: null });
  }
  return out;
}

async function opr(ind) {
  const decisions = [];
  const now = new Date();
  for (let y = OPR_FROM; y <= now.getUTCFullYear(); y++) {
    const body = await getJson(`${API}opr/year/${y}`, H);
    const d = body && body.data;
    for (const r of Array.isArray(d) ? d : d ? [d] : []) if (r.date && Number.isFinite(Number(r.new_opr_level))) decisions.push([r.date, Number(r.new_opr_level)]);
  }
  decisions.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!decisions.length) throw new Error('BNM: no OPR decisions');
  // Level in force at the end of each month, from the first decision on.
  const out = [];
  let i = 0, level = null;
  for (let d = new Date(Date.UTC(Number(decisions[0][0].slice(0, 4)), Number(decisions[0][0].slice(5, 7)) - 1, 1)); d <= now; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const p = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    while (i < decisions.length && decisions[i][0].slice(0, 7) <= p) level = decisions[i++][1];
    if (level !== null) out.push({ indicator_key: ind.key, country_code: 'MY', period: p, value: level, is_forecast: false, source_key: ind.source_key, vintage: null });
  }
  return out;
}

const SPECS = { my_usdmyr: usdmyr, my_opr: opr };

export async function series(ind) {
  const fn = SPECS[ind.key];
  if (!fn) throw new Error(`BNM: no adapter for ${ind.key}`);
  return fn(ind);
}
