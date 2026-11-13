// ============================================================
// KIRA RESEARCH — api/econ-export.js
// Kira Data (D7, paid layer): the full history behind one market's data page as an Excel file.
//   GET /api/econ-export?country=<slug|ISO2>        Authorization: Bearer <supabase-jwt>
//   → .xlsx with sheets Indicators (every public series, every period, forecasts flagged), Links (trade,
//     direct investment and visitor flows touching the market, incl. trade by HS code) and Sources (credit lines).
// 401 not signed in · 402 not a subscriber (Month / Annual; the admin team passes) · 404 unknown market.
// Only sources marked public in data_sources are exported.
// ============================================================

import XLSX from 'xlsx';
import { verifyBearer, isEntitled } from './_lib/transcripts.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
async function sbAll(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await sb(`${path}&limit=1000&offset=${offset}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}
const slugOf = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const FLOW = { X: 'exports / outward', M: 'imports / inward' };
const PRODUCT = { TOTAL: 'Merchandise trade, total', FDI_NET: 'Direct investment, net', FDI_APPROVED: 'Approved investment',
  FDI_REALISED: 'Realised investment', FDI_REG_YTD: 'Registered investment, year to date', VISITORS: 'Visitor arrivals' };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const user = await verifyBearer(req);
  if (!user) return res.status(401).json({ error: 'unauthenticated' });
  if (!(await isEntitled(user))) return res.status(402).json({ error: 'subscription_required' });

  try {
    const q = String((req.query && req.query.country) || '').trim();
    const countries = await sb('tax_countries?select=code,name');
    const country = countries.find((c) => c.code === q.toUpperCase() || slugOf(c.name) === slugOf(q));
    if (!country) return res.status(404).json({ error: 'unknown_country' });
    const sources = await sb('data_sources?public=eq.true&select=key,name,url,licence,attribution');
    const srcIn = `in.(${sources.map((s) => s.key).join(',')})`;
    const C = country.code;

    const [indicators, series, flows, hs] = await Promise.all([
      sb(`econ_indicators?source_key=${srcIn}&select=key,label,unit,freq,params`),
      sbAll(`econ_series?country_code=eq.${C}&source_key=${srcIn}&select=indicator_key,period,value,is_forecast,source_key&order=indicator_key.asc,period.asc`),
      sbAll(`econ_flows?or=(reporter.eq.${C},partner.eq.${C})&source_key=${srcIn}` +
        `&select=source_key,reporter,partner,product,flow,freq,period,value,currency&order=source_key,reporter,partner,product,flow,freq,period`),
      sb('hs_codes?select=code,label')
    ]);
    const ind = Object.fromEntries(indicators.map((i) => [i.key, i]));
    const hsLabel = Object.fromEntries(hs.map((h) => [h.code, (h.label && h.label.en) || h.code]));
    const srcName = Object.fromEntries(sources.map((s) => [s.key, s.name]));
    const nameOf = Object.fromEntries(countries.map((c) => [c.code, c.name]));

    const used = new Set([...series, ...flows].map((r) => r.source_key));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(series.map((r) => {
      const i = ind[r.indicator_key] || {};
      return { Indicator: (i.label && i.label.en) || r.indicator_key, Unit: i.unit || '', Currency: (i.params && i.params.currency) || '',
        Frequency: i.freq || '', Period: r.period, Value: r.value, Forecast: r.is_forecast ? 'yes' : '', Source: srcName[r.source_key] || r.source_key };
    })), 'Indicators');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(flows.map((r) => ({
      Reporter: nameOf[r.reporter] || r.reporter, Partner: r.partner === 'WLD' ? 'World' : nameOf[r.partner] || r.partner,
      Product: PRODUCT[r.product] || `HS ${r.product} ${hsLabel[r.product] || ''}`.trim(), Flow: FLOW[r.flow] || r.flow,
      Frequency: r.freq, Period: r.period, Value: r.value, Currency: r.currency, Source: srcName[r.source_key] || r.source_key
    }))), 'Links');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sources.filter((s) => used.has(s.key)).map((s) => ({ Source: s.name, Licence: s.licence, Credit: s.attribution, Link: s.url }))), 'Sources');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', compression: true });
    const month = new Date().toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(' ', '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="KIRA_${country.name.replace(/[^A-Za-z0-9]+/g, '-')}_market-data_${month}.xlsx"`);
    return res.status(200).send(buf);
  } catch (err) {
    console.error('[econ-export] error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
