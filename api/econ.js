// ============================================================
// KIRA RESEARCH — api/econ.js
// Public read of Kira Data (migration 057). Only sources marked public in data_sources are served;
// every reply lists the sources it used so the page can print their credit lines.
//   GET /api/econ                  → the 15 markets with a few headline values (data index page)
//   GET /api/econ?country=vietnam  → every public indicator for one market (also accepts ?country=VN), plus
//                                    `flows`: trade, direct investment and visitor links that touch it, summed over
//                                    the last 12 months / 4 quarters / latest year, with the window before it
//   `indexable` (D7): the page passes the data check of the sitemap (api/_lib/econ/coverage.js)
// ============================================================

import { loadBase, loadCountry, sb, slugOf } from './_lib/econ/load.js';

const HEADLINE = ['gdp_usd', 'gdp_growth', 'population', 'gdp_per_capita'];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const base = await loadBase();
    const { countries, sources, indicators, srcIn } = base;
    if (!sources.length) return res.status(200).json({ countries: [], sources: [] });
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
        sources,
        indexable: true
      });
    }

    const out = await loadCountry(base, q);
    if (!out) return res.status(404).json({ error: 'unknown_country' });
    return res.status(200).json(out);
  } catch (err) {
    console.error('[econ] error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
