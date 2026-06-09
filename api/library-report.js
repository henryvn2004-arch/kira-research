// ============================================================
// KIRA RESEARCH — api/library-report.js
// Fetch a single library report (base + per-locale translation).
//
//   GET /api/library-report?slug=vietnam-fintech-2026&locale=en
//
// Joins:
//   living_reports       (base metadata: slug, country, industry, year, price, ...)
//   report_translations  (per-locale title, preview, full_content, toc, status)
//
// Returns the merged shape rendered by /<locale>/reports/_view.html.
// Falls back gracefully when only one of the two rows exists.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json'
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  return res.json();
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Reports change rarely (admin write only). 30-min edge cache with 1-day SWR
  // means cold-load latency from the report-detail page drops materially.
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
}

const SUPPORTED = new Set(['en', 'ja', 'ko']);

function clean(s, max = 2000) {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug   = clean(url.searchParams.get('slug'), 200);
  const locale = SUPPORTED.has(url.searchParams.get('locale'))
    ? url.searchParams.get('locale')
    : 'en';

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: 'bad_slug' });
    return;
  }

  try {
    // 1) Base report
    const baseRows = await sb(
      `living_reports?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`
    );
    const base = Array.isArray(baseRows) ? baseRows[0] : null;
    if (!base) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // 2) Translation for requested locale (status=published)
    const tRows = await sb(
      `report_translations?report_id=eq.${base.id}` +
      `&locale=eq.${locale}` +
      `&status=eq.published&select=*&limit=1`
    );
    let translation = Array.isArray(tRows) ? tRows[0] : null;

    // 3) Locale fallback: if requested locale not published, fall back to en.
    let effectiveLocale = locale;
    let isFallback = false;
    if (!translation && locale !== 'en') {
      const enRows = await sb(
        `report_translations?report_id=eq.${base.id}` +
        `&locale=eq.en&status=eq.published&select=*&limit=1`
      );
      translation = Array.isArray(enRows) ? enRows[0] : null;
      effectiveLocale = 'en';
      isFallback = !!translation;
    }

    // 4) Which other locales are actually published? (for the buy-box switcher)
    const allRows = await sb(
      `report_translations?report_id=eq.${base.id}` +
      `&status=eq.published&select=locale`
    );
    const availableLocales = Array.isArray(allRows)
      ? Array.from(new Set(allRows.map(r => r.locale)))
      : [];

    // 5) Related insights — Sprint 8 (internal linking).
    //    Match strategy, scored highest-to-lowest:
    //      • Insight explicitly lists this report in related_report_slugs[] (+100)
    //      • Same country as the report (+25)
    //      • Same industry as the report (+25)
    //    Filter: status=published AND published_at has arrived. Limit 3.
    //    Costs one extra query (insights) plus one for translations.
    //    Failures degrade gracefully to an empty array — never blocks the
    //    report render.
    let relatedInsights = [];
    try {
      const orParts = [];
      if (base.country)  orParts.push(`country.eq.${base.country}`);
      if (base.industry) orParts.push(`industry.eq.${base.industry}`);
      orParts.push(`related_report_slugs.cs.{${slug}}`);
      const nowIso = new Date().toISOString();
      const candidates = await sb(
        `insights?or=(${orParts.join(',')})` +
        `&status=eq.published` +
        `&published_at=lte.${encodeURIComponent(nowIso)}` +
        `&order=published_at.desc&limit=12` +
        `&select=id,slug,country,industry,published_at,related_report_slugs`
      );

      const scored = (candidates || []).map(i => {
        let s = 0;
        if (Array.isArray(i.related_report_slugs) && i.related_report_slugs.includes(slug)) s += 100;
        if (base.country  && i.country  === base.country)  s += 25;
        if (base.industry && i.industry === base.industry) s += 25;
        return { i, s };
      });
      scored.sort((a, b) =>
        b.s - a.s ||
        new Date(b.i.published_at) - new Date(a.i.published_at)
      );
      const top = scored.slice(0, 3).map(x => x.i);

      if (top.length) {
        const topIds = top.map(x => x.id);
        const titleRows = await sb(
          `insight_translations?insight_id=in.(${topIds.join(',')})` +
          `&status=eq.published&locale=in.(${effectiveLocale},en)` +
          `&select=insight_id,locale,title,excerpt,read_time`
        );
        // Prefer requested locale, fall back to EN per insight.
        const byInsight = new Map();
        (titleRows || []).forEach(t => {
          const cur = byInsight.get(t.insight_id);
          if (!cur || (t.locale === effectiveLocale && cur.locale !== effectiveLocale)) {
            byInsight.set(t.insight_id, t);
          }
        });
        relatedInsights = top.map(i => {
          const t = byInsight.get(i.id);
          if (!t) return null;
          return {
            slug:      i.slug,
            country:   i.country,
            industry:  i.industry,
            title:     t.title,
            excerpt:   t.excerpt,
            read_time: t.read_time,
            locale:    t.locale
          };
        }).filter(Boolean);
      }
    } catch (relErr) {
      console.warn('[library-report] related insights lookup failed:', relErr.message);
      // Swallow — non-critical for the report render.
    }

    // 6) Related reports — cross-sell.
    //    Match strategy, scored highest-to-lowest:
    //      • Same country (+3)
    //      • Same industry (+2)
    //      • Year within 1 of base.year (+1)
    //    Filter: status=published, exclude self. Order by score desc then year desc.
    //    Limit 3. Pull title from report_translations (prefer effectiveLocale, fall
    //    back to EN). Failures degrade to empty array.
    let relatedReports = [];
    try {
      const orParts = [];
      if (base.country)  orParts.push(`country.eq.${encodeURIComponent(base.country)}`);
      if (base.industry) orParts.push(`industry.eq.${encodeURIComponent(base.industry)}`);
      if (!orParts.length) throw new Error('no country/industry on base');

      const candidates = await sb(
        `living_reports?or=(${orParts.join(',')})` +
        `&status=eq.published&id=neq.${base.id}` +
        `&select=id,slug,country,industry,year,price` +
        `&limit=24`
      );

      const scored = (candidates || []).map(r => {
        let s = 0;
        if (base.country  && r.country  === base.country)  s += 3;
        if (base.industry && r.industry === base.industry) s += 2;
        if (base.year && r.year && Math.abs(r.year - base.year) <= 1) s += 1;
        return { r, s };
      }).filter(x => x.s > 0);
      scored.sort((a, b) => b.s - a.s || (b.r.year || 0) - (a.r.year || 0));
      const top = scored.slice(0, 3).map(x => x.r);

      if (top.length) {
        const topIds = top.map(x => x.id);
        const titleRows = await sb(
          `report_translations?report_id=in.(${topIds.join(',')})` +
          `&status=eq.published&locale=in.(${effectiveLocale},en)` +
          `&select=report_id,locale,title,eyebrow`
        );
        const byReport = new Map();
        (titleRows || []).forEach(t => {
          const cur = byReport.get(t.report_id);
          if (!cur || (t.locale === effectiveLocale && cur.locale !== effectiveLocale)) {
            byReport.set(t.report_id, t);
          }
        });
        relatedReports = top.map(r => {
          const t = byReport.get(r.id);
          if (!t) return null;
          return {
            slug:     r.slug,
            country:  r.country,
            industry: r.industry,
            year:     r.year,
            price:    r.price || 39,
            title:    t.title,
            eyebrow:  t.eyebrow,
            locale:   t.locale
          };
        }).filter(Boolean);
      }
    } catch (relErr) {
      console.warn('[library-report] related reports lookup failed:', relErr.message);
    }

    res.status(200).json({
      slug:           base.slug,
      country:        base.country || '',
      industry:       base.industry || '',
      year:           base.year || null,
      price:          base.price || 39,
      pages:          base.pages || null,
      published_at:   translation?.published_at || base.published_at || null,
      last_refresh:   translation?.updated_at   || base.updated_at   || null,

      locale:         effectiveLocale,
      isFallback,
      availableLocales,

      // Translation content (may be null if no rows)
      title:          translation?.title    || null,
      eyebrow:        translation?.eyebrow  || null,
      abstract:       translation?.abstract || null,  // public 200-300 word summary, indexed by Google
      preview:        translation?.preview  || null,
      toc:            translation?.toc      || [],
      toc_json:       translation?.toc_json       || null, // [{section, page_ref}]
      preview_tables: translation?.preview_tables || null, // [{title, source, html}]
      glossary_json:  translation?.glossary_json  || null, // [{term, definition}]
      full_content:   null,
      aggregators:    base.aggregators || [],

      relatedInsights, // [{slug,title,excerpt,read_time,country,industry,locale}, ...] up to 3
      relatedReports   // [{slug,title,eyebrow,country,industry,year,price,locale}, ...] up to 3
    });
  } catch (err) {
    console.error('[library-report] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
