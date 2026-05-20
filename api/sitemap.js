// ============================================================
// KIRA RESEARCH — api/sitemap.js
//
// Dynamic sitemap endpoint backing /sitemap.xml + /sitemap-{locale}.xml.
//
//   GET /api/sitemap                  → sitemap index listing 3 per-locale sitemaps
//   GET /api/sitemap?locale=en        → full urlset for EN (static + reports + insights)
//   GET /api/sitemap?locale=ja        → full urlset for JA
//   GET /api/sitemap?locale=ko        → full urlset for KO
//
// Wired up via vercel.json rewrites:
//   /sitemap.xml         → /api/sitemap
//   /sitemap-en.xml      → /api/sitemap?locale=en
//   /sitemap-ja.xml      → /api/sitemap?locale=ja
//   /sitemap-ko.xml      → /api/sitemap?locale=ko
//
// Each <url> entry in a per-locale sitemap carries <xhtml:link rel="alternate"
// hreflang="..."> annotations pointing to the equivalent URL in the other
// two locales. Google strongly prefers sitemap-based hreflang signals over
// per-page <link> tags, so this is our primary hreflang mechanism.
//
// CDN-cached for 1h (s-maxage=3600) with 24h stale-while-revalidate, so the
// DB only gets hit at most once per hour per locale per edge region.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const ORIGIN     = 'https://kiraresearch.com';
const LOCALES    = ['en', 'ja', 'ko'];
const SUPPORTED  = new Set(LOCALES);
const X_DEFAULT  = 'en';

// Static pages present in every locale. Path is relative to /<locale>.
// changefreq/priority are advisory; we set them once here per page type.
const STATIC_PAGES = [
  { path: '',                    changefreq: 'weekly',  priority: '1.0' },  // homepage
  { path: 'library',             changefreq: 'daily',   priority: '0.9' },
  { path: 'insights/',           changefreq: 'daily',   priority: '0.8' },
  { path: 'about',               changefreq: 'monthly', priority: '0.6' },
  { path: 'methodology',         changefreq: 'monthly', priority: '0.6' },
  { path: 'pricing',             changefreq: 'monthly', priority: '0.6' },
  { path: 'custom-research/',    changefreq: 'monthly', priority: '0.7' }
];

// ── Supabase helper (read-only, anon-safe with service key) ──
async function sb(path) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // Allow sitemap to work even with no DB configured — fall back to static-only.
    return { rows: [] };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json'
      }
    });
    if (!res.ok) return { rows: [] };  // sitemap should never fail — better empty than 500
    return { rows: await res.json() };
  } catch {
    return { rows: [] };
  }
}

// ── XML helpers ──
function xmlEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Build one <url> entry with hreflang alternates pointing to /<otherLocale>/<sameSubpath>.
function urlEntry({ subPath, locale, lastmod, changefreq, priority }) {
  const loc = `${ORIGIN}/${locale}/${subPath}`;
  const alternates = LOCALES
    .map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(`${ORIGIN}/${l}/${subPath}`)}"/>`)
    .join('\n');
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(`${ORIGIN}/${X_DEFAULT}/${subPath}`)}"/>`;
  const lastmodTag = lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : '';
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>${lastmodTag}`,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority ? `    <priority>${priority}</priority>` : null,
    alternates,
    xDefault,
    '  </url>'
  ].filter(Boolean).join('\n');
}

function setXmlHeaders(res) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // 1h CDN cache, 24h stale-while-revalidate. Aggressive enough to dodge cold-starts
  // while still being fresh enough that newly-published reports show up within an hour.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
}

// ── Sitemap index (default, no locale param) ──
function buildIndex() {
  const today = new Date().toISOString().slice(0, 10);
  const entries = LOCALES.map(loc => [
    '  <sitemap>',
    `    <loc>${ORIGIN}/sitemap-${loc}.xml</loc>`,
    `    <lastmod>${today}</lastmod>`,
    '  </sitemap>'
  ].join('\n')).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</sitemapindex>'
  ].join('\n');
}

// ── Per-locale sitemap (full urlset) ──
async function buildLocale(locale) {
  const urls = [];

  // 1) Static pages
  for (const page of STATIC_PAGES) {
    urls.push(urlEntry({
      subPath:    page.path,
      locale,
      changefreq: page.changefreq,
      priority:   page.priority
    }));
  }

  // 2) Reports — join living_reports with report_translations for this locale.
  //    A report is included if its base row is published AND a translation in
  //    the target locale is published. (We don't surface untranslated reports
  //    in a locale's sitemap — they don't have content to serve.)
  const reportQs =
    'status=eq.published' +
    `&select=slug,updated_at,report_translations!inner(locale,status,updated_at)` +
    `&report_translations.locale=eq.${locale}` +
    `&report_translations.status=eq.published` +
    '&limit=5000';
  const { rows: reports } = await sb(`living_reports?${reportQs}`);
  for (const r of reports) {
    // Pick the more recent of base updated_at vs translation updated_at as lastmod.
    const trans = Array.isArray(r.report_translations) && r.report_translations[0];
    const lastmod = (trans && trans.updated_at && trans.updated_at > r.updated_at)
      ? trans.updated_at
      : r.updated_at;
    urls.push(urlEntry({
      subPath:    `reports/${r.slug}`,
      locale,
      lastmod:    lastmod ? lastmod.slice(0, 10) : null,
      changefreq: 'monthly',
      priority:   '0.8'
    }));
  }

  // 3) Insights — same join pattern.
  const insightQs =
    'status=eq.published' +
    `&select=slug,updated_at,insight_translations!inner(locale,status,updated_at)` +
    `&insight_translations.locale=eq.${locale}` +
    `&insight_translations.status=eq.published` +
    '&limit=5000';
  const { rows: insights } = await sb(`insights?${insightQs}`);
  for (const i of insights) {
    const trans = Array.isArray(i.insight_translations) && i.insight_translations[0];
    const lastmod = (trans && trans.updated_at && trans.updated_at > i.updated_at)
      ? trans.updated_at
      : i.updated_at;
    urls.push(urlEntry({
      subPath:    `insights/${i.slug}`,
      locale,
      lastmod:    lastmod ? lastmod.slice(0, 10) : null,
      changefreq: 'monthly',
      priority:   '0.6'
    }));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls.join('\n'),
    '</urlset>'
  ].join('\n');
}

// ── Handler ──
export default async function handler(req, res) {
  // Accept GET and HEAD — Vercel's CDN probes and many crawlers issue HEAD
  // before GETting, and 405 on HEAD breaks both. For HEAD we just need to
  // set the right headers; the framework drops the body automatically.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const url    = new URL(req.url, `https://${req.headers.host || 'kiraresearch.com'}`);
  const locale = url.searchParams.get('locale');

  setXmlHeaders(res);

  try {
    if (!locale) {
      res.status(200).send(buildIndex());
      return;
    }
    if (!SUPPORTED.has(locale)) {
      res.status(404).send('<?xml version="1.0"?><error>unknown_locale</error>');
      return;
    }
    const xml = await buildLocale(locale);
    res.status(200).send(xml);
  } catch (err) {
    console.error('[sitemap] error:', err.message);
    // Sitemap errors should never break the site. Serve an empty urlset so
    // crawlers can at least retry without thinking the sitemap is missing.
    res.status(200).send(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    );
  }
}
