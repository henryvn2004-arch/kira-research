// ============================================================
// KIRA RESEARCH — api/insight.js
// Public single-article endpoint.
//
//   GET /api/insight?slug=vietnam-sme-lending-shift&locale=en
//
// Returns merged insight + insight_translation row, falling back to EN
// if the requested locale isn't published. Also returns the slugs of
// related reports so the article page can link them.
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
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
}

const SUPPORTED = new Set(['en','ja','ko']);

function clean(s, max = 200) {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug   = clean(url.searchParams.get('slug'));
  const locale = SUPPORTED.has(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: 'bad_slug' });
    return;
  }

  try {
    // 1) Base insight
    const baseRows = await sb(
      `insights?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*&limit=1`
    );
    const base = Array.isArray(baseRows) ? baseRows[0] : null;
    if (!base) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // 2) Translation for requested locale
    const tRows = await sb(
      `insight_translations?insight_id=eq.${base.id}` +
      `&locale=eq.${locale}` +
      `&status=eq.published&select=*&limit=1`
    );
    let translation = Array.isArray(tRows) ? tRows[0] : null;

    let effectiveLocale = locale;
    let isFallback = false;
    if (!translation && locale !== 'en') {
      const enRows = await sb(
        `insight_translations?insight_id=eq.${base.id}` +
        `&locale=eq.en&status=eq.published&select=*&limit=1`
      );
      translation = Array.isArray(enRows) ? enRows[0] : null;
      effectiveLocale = 'en';
      isFallback = !!translation;
    }

    if (!translation) {
      res.status(404).json({ error: 'translation_missing' });
      return;
    }

    // 3) Available locales for the article (for hreflang)
    const allRows = await sb(
      `insight_translations?insight_id=eq.${base.id}` +
      `&status=eq.published&select=locale`
    );
    const availableLocales = Array.isArray(allRows)
      ? Array.from(new Set(allRows.map(r => r.locale)))
      : [];

    // 4) Related-report titles in the requested locale (for the bottom CTA)
    let relatedReports = [];
    if (Array.isArray(base.related_report_slugs) && base.related_report_slugs.length) {
      const slugList = encodeURIComponent('(' + base.related_report_slugs.join(',') + ')');
      const reportRows = await sb(
        `living_reports?slug=in.${slugList}&status=eq.published&select=id,slug,country,industry,year,price`
      );
      const reportIds = (reportRows || []).map(r => r.id);
      let titleByReport = new Map();
      if (reportIds.length) {
        const idList = encodeURIComponent('(' + reportIds.join(',') + ')');
        const titleRows = await sb(
          `report_translations?report_id=in.${idList}` +
          `&status=eq.published&locale=in.(${effectiveLocale},en)&select=report_id,locale,title,preview`
        );
        (titleRows || []).forEach(t => {
          const cur = titleByReport.get(t.report_id);
          if (!cur || (t.locale === effectiveLocale && cur.locale !== effectiveLocale)) {
            titleByReport.set(t.report_id, t);
          }
        });
      }
      relatedReports = (reportRows || []).map(r => {
        const t = titleByReport.get(r.id);
        const lede = t && t.preview && typeof t.preview === 'object' ? t.preview.lede : null;
        return {
          slug:     r.slug,
          country:  r.country,
          industry: r.industry,
          year:     r.year,
          price:    r.price,
          title:    (t && t.title) || null,
          excerpt:  lede ? String(lede).slice(0, 180) : null
        };
      });
    }

    res.status(200).json({
      slug:           base.slug,
      category:       base.category,
      country:        base.country,
      industry:       base.industry,
      published_at:   base.published_at,
      featured:       !!base.featured,

      locale:         effectiveLocale,
      isFallback,
      availableLocales,

      title:          translation.title,
      excerpt:        translation.excerpt,
      lede:           translation.lede,
      body:           translation.body,     // markdown-ish HTML stored in DB
      read_time:      translation.read_time,

      relatedReports
    });
  } catch (err) {
    console.error('[insight] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
