// ============================================================
// KIRA RESEARCH — api/econ-dash.js
// Public. Kira Data dashboard (/<locale>/data/ and /<locale>/data/<country>): everything the charts need, in one
// cached reply. Only sources marked public in data_sources are served.
//   GET /api/econ-dash → {
//     countries[{code,name,slug}],
//     compare { CODE: { indicator_key: [[year, value], ...] } }   annual World Bank set since 2010 (no forecasts)
//     units   { indicator_key: {label, unit} }
//     invest  [{ src, host, investor, product, freq, currency, out, points[[period, value]] }]
//             direct investment by investor, from the host's statistics or (out = true) the investor's;
//             per source and reporting market the 12 largest partners plus the total;
//             annual since 10 years, quarterly since 6 years, monthly the last 36 months
//     trade   [{ src, reporter, partner, flow, currency, points }]  monthly merchandise trade, the last 25 months,
//             the 8 largest partners per reporter and direction plus the world total
//     fx      [{ code, last[date, value], m1[date, value], y1[date, value] }]  local currency per US$ (ECB daily):
//             the latest rate, about a month and about a year before
//     sources[], updated_at }
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const COMPARE = ['gdp_usd', 'gdp_growth', 'gdp_per_capita', 'inflation', 'fdi_inflow', 'exports_usd', 'population'];
const FDI = ['FDI_NET', 'FDI_APPROVED', 'FDI_REALISED', 'FDI_REG_YTD'];
const TOP_PARTNERS = 8, TOP_INVESTORS = 12;
// Four significant digits are plenty for a chart and keep the reply small.
const round = (v) => Number(Number(v).toPrecision(4));

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
const ym = (d) => d.toISOString().slice(0, 7);

// Rows → one series per key, points sorted by period.
function series(rows, keyOf, head) {
  const out = {};
  for (const r of rows) {
    const k = keyOf(r);
    (out[k] = out[k] || { ...head(r), points: [] }).points.push([r.period, round(r.value)]);
  }
  for (const s of Object.values(out)) s.points.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return Object.values(out);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const [countries, sources] = await Promise.all([
      sb('tax_countries?select=code,name,ord&order=ord'),
      sb('data_sources?public=eq.true&select=key,name,url,licence,attribution')
    ]);
    const srcIn = `in.(${sources.map((s) => s.key).join(',')})`;
    const now = new Date(), year = now.getUTCFullYear();
    const m36 = ym(new Date(Date.UTC(year, now.getUTCMonth() - 36, 1)));
    const m25 = ym(new Date(Date.UTC(year, now.getUTCMonth() - 25, 1)));
    const flowCols = '&select=source_key,reporter,partner,product,flow,freq,period,value,currency,retrieved_at';
    const flowOrder = '&order=source_key,reporter,partner,product,flow,freq,period';

    const [indicators, rows, fdiA, fdiQ, fdiM, trade, fxRows] = await Promise.all([
      sb(`econ_indicators?key=in.(${COMPARE.join(',')})&source_key=${srcIn}&select=key,label,unit`),
      sbAll(`econ_series?indicator_key=in.(${COMPARE.join(',')})&source_key=${srcIn}&is_forecast=eq.false&period=gte.2010` +
        `&select=indicator_key,country_code,period,value,retrieved_at&order=indicator_key,country_code,period`),
      sbAll(`econ_flows?source_key=${srcIn}&product=in.(${FDI.join(',')})&freq=eq.A&period=gte.${year - 10}${flowCols}${flowOrder}`),
      sbAll(`econ_flows?source_key=${srcIn}&product=in.(${FDI.join(',')})&freq=eq.Q&period=gte.${year - 6}${flowCols}${flowOrder}`),
      sbAll(`econ_flows?source_key=${srcIn}&product=in.(${FDI.join(',')})&freq=eq.M&period=gte.${m36}${flowCols}${flowOrder}`),
      sbAll(`econ_flows?source_key=${srcIn}&product=eq.TOTAL&freq=eq.M&period=gte.${m25}${flowCols}${flowOrder}`),
      sbAll(`econ_series?indicator_key=eq.fx_usd_daily&source_key=${srcIn}&period=gte.${new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10)}` +
        `&select=country_code,period,value,retrieved_at&order=country_code,period`)
    ]);

    let updated = null;
    const seen = (r) => { if (r.retrieved_at && (!updated || r.retrieved_at > updated)) updated = r.retrieved_at; };
    const compare = {};
    for (const r of rows) {
      seen(r);
      const c = (compare[r.country_code] = compare[r.country_code] || {});
      (c[r.indicator_key] = c[r.indicator_key] || []).push([r.period, round(r.value)]);
    }

    // Direct investment: host = the market receiving it, investor = where it comes from.
    const fdi = [...fdiA, ...fdiQ, ...fdiM];
    fdi.forEach(seen);
    const investAll = series(fdi,
      (r) => [r.source_key, r.reporter, r.partner, r.product, r.flow, r.freq].join('|'),
      (r) => ({ src: r.source_key, host: r.flow === 'M' ? r.reporter : r.partner, investor: r.flow === 'M' ? r.partner : r.reporter,
        product: r.product, freq: r.freq, currency: r.currency, out: r.flow === 'X' }));
    // Per source and market, the investors with the largest recent amounts (BKPM lists ~45) and the total.
    const recentSum = (s) => s.points.slice(-({ A: 3, Q: 4, M: 12 }[s.freq] || 1)).reduce((t, p) => t + Math.abs(p[1]), 0);
    const pick = {};
    for (const s of investAll) {
      const k = [s.src, s.out ? s.investor : s.host, s.product, s.out].join('|');   // the Bank of Japan reports both directions
      (pick[k] = pick[k] || []).push(s);
    }
    const invest = Object.values(pick).flatMap((list) => [
      ...list.filter((s) => (s.out ? s.host : s.investor) === 'WLD'),
      ...list.filter((s) => (s.out ? s.host : s.investor) !== 'WLD').sort((a, b) => recentSum(b) - recentSum(a)).slice(0, TOP_INVESTORS)
    ]);

    // Monthly trade: keep the largest partners of each reporter and direction (by the last 12 months) and the world.
    trade.forEach(seen);
    const all = series(trade, (r) => [r.source_key, r.reporter, r.partner, r.flow].join('|'),
      (r) => ({ src: r.source_key, reporter: r.reporter, partner: r.partner, flow: r.flow, currency: r.currency }));
    const groups = {};
    for (const s of all) (groups[[s.src, s.reporter, s.flow].join('|')] = groups[[s.src, s.reporter, s.flow].join('|')] || []).push(s);
    const last12 = (s) => s.points.slice(-12).reduce((t, p) => t + p[1], 0);
    const tradeOut = Object.values(groups).flatMap((list) => [
      ...list.filter((s) => s.partner === 'WLD'),
      ...list.filter((s) => s.partner !== 'WLD').sort((a, b) => last12(b) - last12(a)).slice(0, TOP_PARTNERS)
    ]);

    // Exchange rates: the latest day, and the last day on or before one month and one year earlier.
    fxRows.forEach(seen);
    const fxBy = {};
    for (const r of fxRows) (fxBy[r.country_code] = fxBy[r.country_code] || []).push([r.period, Number(r.value)]);
    const back = (pts, days) => { const lim = new Date(Date.parse(pts[pts.length - 1][0]) - days * 864e5).toISOString().slice(0, 10); return pts.filter((p) => p[0] <= lim).pop() || null; };
    const fx = Object.entries(fxBy).map(([code, pts]) => ({ code, last: pts[pts.length - 1], m1: back(pts, 30), y1: back(pts, 365) }));

    const used = new Set([...(fx.length ? ['ecb'] : []), ...rows.map(() => 'worldbank_wdi'), ...invest.map((s) => s.src), ...tradeOut.map((s) => s.src)]);
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=604800');
    return res.status(200).json({
      countries: countries.map((c) => ({ code: c.code, name: c.name, slug: slugOf(c.name) })),
      compare,
      units: Object.fromEntries(indicators.map((i) => [i.key, { label: i.label, unit: i.unit }])),
      invest,
      trade: tradeOut,
      fx,
      sources: sources.filter((s) => used.has(s.key)),
      updated_at: updated
    });
  } catch (err) {
    console.error('[econ-dash] error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
