// ============================================================
// KIRA RESEARCH — api/econ.js
// Public read of Kira Data (migration 057). Only sources marked public in data_sources are served;
// every reply lists the sources it used so the page can print their credit lines.
//   GET /api/econ                  → the 15 markets with a few headline values (data index page)
//   GET /api/econ?country=vietnam  → every public indicator for one market (also accepts ?country=VN), plus
//                                    `flows`: trade, direct investment and visitor links that touch it, summed over
//                                    the last 12 months / 4 quarters / latest year, with the window before it
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const HEADLINE = ['gdp_usd', 'gdp_growth', 'population', 'gdp_per_capita'];

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
// PostgREST returns at most 1000 rows per request; page through longer reads.
async function sbAll(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await sb(`${path}&limit=1000&offset=${offset}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

// Products shown as links on a country page (HS-level rows stay for the segment panels of sprint D3).
const LINK_PRODUCTS = ['TOTAL', 'FDI_NET', 'FDI_APPROVED', 'VISITORS'];
const WINDOW = { M: 12, Q: 4, A: 1 };

// One row per (source, reporter, partner, product, flow): the latest full window and the one before it.
function summarise(rows) {
  const groups = {};
  for (const r of rows) {
    const k = [r.source_key, r.reporter, r.partner, r.product, r.flow, r.freq, r.currency].join('|');
    (groups[k] = groups[k] || []).push(r);
  }
  const out = [];
  for (const list of Object.values(groups)) {
    const f = list[0], n = WINDOW[f.freq] || 1;
    list.sort((a, b) => (a.period < b.period ? 1 : -1));
    if (list.length < n) continue;
    const sum = (a) => a.reduce((t, r) => t + Number(r.value), 0);
    const cur = list.slice(0, n), prev = list.slice(n, 2 * n);
    out.push({
      source_key: f.source_key, reporter: f.reporter, partner: f.partner, product: f.product, flow: f.flow, freq: f.freq,
      currency: f.currency, period: cur[0].period, from: cur[n - 1].period, value: sum(cur),
      prev: prev.length === n ? sum(prev) : null
    });
  }
  return out;
}

const slugOf = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const [countries, sources] = await Promise.all([
      sb('tax_countries?select=code,name,ord&order=ord'),
      sb('data_sources?public=eq.true&select=key,name,url,licence,attribution')
    ]);
    if (!sources.length) return res.status(200).json({ countries: [], sources: [] });
    const srcIn = `in.(${sources.map((s) => s.key).join(',')})`;
    const indicators = await sb(`econ_indicators?active=eq.true&source_key=${srcIn}&select=key,source_key,country_code,label,unit,freq,ord,params&order=ord`);
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

    const q = String(req.query.country || '').trim();
    if (!q) {
      const rows = await sb(`econ_series?indicator_key=in.(${HEADLINE.join(',')})&source_key=${srcIn}&is_forecast=eq.false&period=gte.2015` +
        `&select=indicator_key,country_code,period,value&order=period.desc&limit=5000`);
      const latest = {};
      for (const r of rows) {
        const c = (latest[r.country_code] = latest[r.country_code] || {});
        if (!c[r.indicator_key]) c[r.indicator_key] = { period: r.period, value: r.value };
      }
      return res.status(200).json({
        countries: countries.map((c) => ({ code: c.code, name: c.name, slug: slugOf(c.name), latest: latest[c.code] || {} })),
        indicators: indicators.filter((i) => HEADLINE.includes(i.key)),
        sources
      });
    }

    const country = countries.find((c) => c.code === q.toUpperCase() || slugOf(c.name) === slugOf(q));
    if (!country) return res.status(404).json({ error: 'unknown_country' });

    const since = String(new Date().getUTCFullYear() - 3);
    const [rows, flowRows] = await Promise.all([
      sbAll(`econ_series?country_code=eq.${country.code}&source_key=${srcIn}` +
        `&select=indicator_key,period,value,is_forecast,retrieved_at&order=indicator_key.asc,period.asc`),
      sbAll(`econ_flows?or=(reporter.eq.${country.code},partner.eq.${country.code})&source_key=${srcIn}` +
        `&product=in.(${LINK_PRODUCTS.join(',')})&period=gte.${since}` +
        `&select=source_key,reporter,partner,product,flow,freq,period,value,currency,retrieved_at&order=period.desc`)
    ]);
    const byInd = {};
    let updated = null;
    for (const r of rows) {
      (byInd[r.indicator_key] = byInd[r.indicator_key] || []).push([r.period, r.value, r.is_forecast]);
      if (!updated || r.retrieved_at > updated) updated = r.retrieved_at;
    }
    for (const r of flowRows) if (!updated || r.retrieved_at > updated) updated = r.retrieved_at;
    const flows = summarise(flowRows);
    return res.status(200).json({
      country: { code: country.code, name: country.name, slug: slugOf(country.name) },
      updated_at: updated,
      indicators: indicators.filter((i) => byInd[i.key]).map((i) => ({ ...i, series: byInd[i.key] })),
      flows,
      names: Object.fromEntries(countries.map((c) => [c.code, c.name])),
      sources: sources.filter((s) => indicators.some((i) => i.source_key === s.key && byInd[i.key]) || flows.some((f) => f.source_key === s.key))
    });
  } catch (err) {
    console.error('[econ] error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
