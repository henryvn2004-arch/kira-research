// ============================================================
// KIRA RESEARCH — api/market-data.js
// Public. Kira Data (D3): the "Market data" panel of a report page or a coming-soon page.
//   GET /api/market-data?report=<report slug>   or   ?topic=<topic slug>
//   → 200 { country, profile, macro[], fdi, visitors, trade[], sources[], names }
//   → 404 { error: 'not_found' }   unknown slug, or a market KIRA does not cover
//
// The segment's data profile comes from segment_data_map (api/_lib/market-map.js): its HS codes pick the
// partner-reported trade blocks, its indicator groups pick the national series shown next to the macro tiles.
//   macro     [{ key, label, unit, currency, freq, period, value, spark: [values] }]  latest actual value per series
//   fdi       Japan's net direct investment in the market, last 12 months and the 12 before (BoJ), or null
//   visitors  arrivals in the market, last 12 months: { period, value, prev, top: [{ partner, value }] }, or null
//   trade     [{ code, label, rows: [{ source_key, reporter, flow, currency, chapter, series: [[year, value]],
//               share: [[year, pct]] }] }]   share = the market's part of the reporter's imports from outside
//               the EU (Eurostat) or from the world, when the reporter's total is stored
// Only sources marked public in data_sources are read; every reply lists them for the credit lines.
// ============================================================

import { resolveProfile } from './_lib/market-map.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MACRO = ['gdp_growth', 'inflation', 'gdp_per_capita'];
const CHAPTER_SOURCES = ['estat', 'kr_customs'];   // report HS2 chapters only
const TRADE_YEARS = 6;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
const slugOf = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sum = (a) => a.reduce((t, r) => t + Number(r.value), 0);

// Where the report or topic sits: country code, industry slugs, texts for keyword matching.
async function locate(q, countries) {
  const byName = (n) => countries.find((c) => slugOf(c.name) === slugOf(n) || c.code === String(n || '').toUpperCase());
  let country = null, industryId = null;
  const texts = [];
  if (q.report) {
    const [r] = await sb(`living_reports?slug=eq.${encodeURIComponent(q.report)}&status=eq.published&select=id,country,industry,segment&limit=1`);
    if (!r) return null;
    country = byName(r.country);
    const [t] = await sb(`topics?report_id=eq.${r.id}&select=industry_id,title&limit=1`);
    texts.push(r.segment, t ? t.title : null, r.industry);
    if (t) industryId = t.industry_id;
  } else {
    const [t] = await sb(`topics?slug=eq.${encodeURIComponent(q.topic)}&status=neq.rejected&select=country_code,industry_id,title&limit=1`);
    if (!t) return null;
    country = byName(t.country_code);
    industryId = t.industry_id;
    texts.push(t.title);
  }
  let slug = null, parentSlug = null;
  if (industryId) {
    const [ind] = await sb(`tax_industries?id=eq.${industryId}&select=slug,parent_id`);
    if (ind) {
      slug = ind.slug;
      if (ind.parent_id) { const [p] = await sb(`tax_industries?id=eq.${ind.parent_id}&select=slug`); parentSlug = p ? p.slug : null; }
    }
  }
  return country ? { country, slug, parentSlug, texts } : null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const q = {};
  for (const k of ['report', 'topic']) {
    const v = String((req.query || {})[k] || '').trim().toLowerCase();
    if (v && /^[a-z0-9][a-z0-9-]{2,160}$/.test(v)) q[k] = v;
  }
  if (!q.report && !q.topic) return res.status(404).json({ error: 'not_found' });

  try {
    const [countries, sources, map] = await Promise.all([
      sb('tax_countries?select=code,name'),
      sb('data_sources?public=eq.true&select=key,name,url,licence,attribution'),
      sb('segment_data_map?select=key,hs,groups,industry_slugs,keywords,ord')
    ]);
    const at = await locate(q, countries);
    if (!at) return res.status(404).json({ error: 'not_found' });
    const C = at.country.code;
    const profile = resolveProfile(map, at) || { key: null, hs: [], groups: [] };
    const pub = new Set(sources.map((s) => s.key));
    const srcIn = `in.(${[...pub].join(',')})`;
    const used = new Set();

    // ---- macro tiles: three World Bank headline series + the profile's national series ----
    const indicators = await sb(`econ_indicators?active=eq.true&source_key=${srcIn}&select=key,source_key,country_code,label,unit,freq,ord,params&order=ord`);
    const pick = indicators.filter((i) => (!i.country_code && MACRO.includes(i.key)) ||
      (i.country_code === C && profile.groups.includes((i.params || {}).group)));
    const series = pick.length ? await sb(`econ_series?country_code=eq.${C}&indicator_key=in.(${pick.map((i) => i.key).join(',')})` +
      `&is_forecast=eq.false&select=indicator_key,period,value&order=period.desc&limit=1000`) : [];
    const macro = pick.map((i) => {
      const pts = series.filter((s) => s.indicator_key === i.key);
      if (!pts.length) return null;
      used.add(i.source_key);
      return { key: i.key, label: i.label, unit: i.unit, currency: (i.params || {}).currency || null, freq: i.freq,
        period: pts[0].period, value: pts[0].value, spark: pts.slice(0, i.freq === 'A' ? 8 : 24).reverse().map((p) => p.value) };
    }).filter(Boolean);

    // ---- Japan's direct investment in the market (BoJ, monthly) ----
    let fdi = null;
    if (pub.has('boj') && C !== 'JP') {
      const rows = await sb(`econ_flows?source_key=eq.boj&reporter=eq.JP&partner=eq.${C}&product=eq.FDI_NET&flow=eq.X&freq=eq.M&select=period,value&order=period.desc&limit=24`);
      if (rows.length >= 12) {
        fdi = { from: rows[11].period, period: rows[0].period, value: sum(rows.slice(0, 12)), prev: rows.length === 24 ? sum(rows.slice(12)) : null, currency: 'JPY' };
        used.add('boj');
      }
    }

    // ---- visitor arrivals (OpenDOSM, SingStat: monthly by country of residence) ----
    let visitors = null;
    if (profile.groups.includes('visitors')) {
      const rows = await sb(`econ_flows?reporter=eq.${C}&product=eq.VISITORS&flow=eq.M&freq=eq.M&source_key=${srcIn}&select=source_key,partner,period,value&order=period.desc&limit=2000`);
      const tot = rows.filter((r) => r.partner === 'WLD');
      if (tot.length >= 12) {
        const months = tot.slice(0, 12).map((r) => r.period);
        const top = {};
        for (const r of rows) if (r.partner !== 'WLD' && months.includes(r.period)) top[r.partner] = (top[r.partner] || 0) + Number(r.value);
        visitors = { from: months[11], period: months[0], value: sum(tot.slice(0, 12)), prev: tot.length >= 24 ? sum(tot.slice(12, 24)) : null,
          top: Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([partner, value]) => ({ partner, value })) };
        used.add(tot[0].source_key);
      }
    }

    // ---- partner-reported trade for the profile's HS codes ----
    const trade = [];
    if (profile.hs.length) {
      const chapters = [...new Set(profile.hs.filter((c) => c.length > 2).map((c) => c.slice(0, 2)))];
      const products = [...new Set([...profile.hs, ...chapters])];
      const since = String(new Date().getUTCFullYear() - TRADE_YEARS);
      const [rows, labels] = await Promise.all([
        sb(`econ_flows?product=in.(${products.join(',')})&partner=in.(${C},WLD)&freq=eq.A&period=gte.${since}&source_key=${srcIn}` +
          `&select=source_key,reporter,partner,product,flow,period,value,currency&order=period.asc&limit=5000`),
        sb(`hs_codes?code=in.(${products.join(',')})&select=code,label`)
      ]);
      const labelOf = Object.fromEntries(labels.map((l) => [l.code, l.label]));
      const group = (list) => {
        const g = {};
        for (const r of list) (g[[r.source_key, r.reporter, r.flow, r.currency].join('|')] = g[[r.source_key, r.reporter, r.flow, r.currency].join('|')] || []).push(r);
        return g;
      };
      for (const code of profile.hs) {
        const own = rows.filter((r) => r.partner === C && r.product === code);
        const ch = CHAPTER_SOURCES.map((s) => rows.filter((r) => r.partner === C && r.source_key === s && r.product === code.slice(0, 2)))
          .filter((l) => l.length && !own.some((r) => r.source_key === l[0].source_key)).flat();
        const out = [];
        for (const [k, list] of Object.entries(group([...own, ...ch]))) {
          const [source_key, reporter, flow, currency] = k.split('|');
          const product = list[0].product;
          const world = rows.filter((r) => r.partner === 'WLD' && r.source_key === source_key && r.reporter === reporter && r.flow === flow && r.product === product);
          const share = list.map((r) => { const w = world.find((x) => x.period === r.period); return w && w.value > 0 ? [r.period, (r.value / w.value) * 100] : null; }).filter(Boolean);
          out.push({ source_key, reporter, flow, currency, chapter: product !== code ? product : null,
            series: list.map((r) => [r.period, r.value]), share });
          used.add(source_key);
        }
        if (out.length) trade.push({ code, label: labelOf[code] || null, chapter_label: out.some((r) => r.chapter) ? labelOf[code.slice(0, 2)] || null : null,
          rows: out.sort((a, b) => (b.series.at(-1)[1] - a.series.at(-1)[1])) });
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({
      country: { code: C, name: at.country.name, slug: slugOf(at.country.name) },
      profile: profile.key, macro, fdi, visitors, trade,
      names: Object.fromEntries(countries.map((c) => [c.code, c.name])),
      sources: sources.filter((s) => used.has(s.key))
    });
  } catch (err) {
    console.error('[market-data] error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
