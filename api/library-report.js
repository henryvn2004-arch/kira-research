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
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
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
      eyebrow:        translation?.eyebrow  || null,  // e.g. "VIETNAM · FINTECH · MARKET ANALYSIS"
      preview:        translation?.preview  || null,  // first-section HTML/text
      toc:            translation?.toc      || [],    // [{num,name,pages,locked}]
      full_content:   null,                            // never served on this endpoint;
                                                       // post-purchase only via /api/get-purchased-report
      aggregators:    base.aggregators || []
    });
  } catch (err) {
    console.error('[library-report] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
