// ============================================================
// KIRA RESEARCH — api/library-list.js
// Public list endpoint for the library page.
//
//   GET /api/library-list?
//       locale=en
//       &country=vietnam            (lowercase, optional)
//       &industry=fintech           (lowercase, optional)
//       &year=2026                  (optional)
//       &sort=recent|price-asc|price-desc  (default: recent)
//       &limit=24&offset=0
//
// Returns { items: [...], total, facets } where each item carries enough
// data to render a report-card (slug, title, country, industry, year, price,
// preview excerpt). facets are { countries: {code: count, ...}, industries: {...} }
// for the sidebar filter counts.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'count=exact'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Content-Range header: "0-23/128" — pull the total.
  const range = res.headers.get('content-range') || '';
  const total = parseInt(range.split('/')[1], 10) || data.length || 0;
  return { rows: data, total };
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
}

const SUPPORTED = new Set(['en', 'ja', 'ko']);
const SORTS = {
  'recent':     'published_at.desc.nullslast',
  'price-asc':  'price.asc',
  'price-desc': 'price.desc'
};

function clean(s) { return typeof s === 'string' ? s.trim().toLowerCase() : ''; }
function int(s, def, max) {
  const n = parseInt(s, 10);
  if (isNaN(n) || n < 0) return def;
  return Math.min(n, max);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url      = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const locale   = SUPPORTED.has(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';
  const country  = clean(url.searchParams.get('country'));
  const industry = clean(url.searchParams.get('industry'));
  const year     = url.searchParams.get('year');
  const sort     = SORTS[url.searchParams.get('sort')] || SORTS.recent;
  const limit    = int(url.searchParams.get('limit'),  24, 96);
  const offset   = int(url.searchParams.get('offset'),  0, 9600);

  try {
    // ── 1) Base query against living_reports (status=published) ──
    const where = ['status=eq.published'];
    if (country)  where.push(`country=ilike.${encodeURIComponent(country)}`);
    if (industry) where.push(`industry=ilike.${encodeURIComponent(industry)}`);
    if (year && /^\d{4}$/.test(year)) where.push(`year=eq.${year}`);

    const baseQs =
      where.join('&') +
      `&order=${sort}` +
      `&limit=${limit}` +
      `&offset=${offset}` +
      `&select=id,slug,country,industry,year,pages,price`;

    const { rows: reports, total } = await sb(`living_reports?${baseQs}`);

    // ── 2) Fetch matching translations in a single in() query ───
    const ids = reports.map(r => r.id);
    let translations = [];
    if (ids.length) {
      const idList = encodeURIComponent(`(${ids.join(',')})`);
      const tQs =
        `report_id=in.${idList}` +
        `&status=eq.published` +
        `&locale=in.(${locale},en)` +     // request locale + EN fallback
        `&select=report_id,locale,title,preview`;
      const { rows } = await sb(`report_translations?${tQs}`);
      translations = rows;
    }

    // Reduce to one translation per report_id, preferring requested locale.
    const byId = new Map();
    translations.forEach(t => {
      const cur = byId.get(t.report_id);
      // Requested locale wins; otherwise first hit (likely EN) stays.
      if (!cur || (t.locale === locale && cur.locale !== locale)) {
        byId.set(t.report_id, t);
      }
    });

    // ── 3) Stitch results ──────────────────────────────────────
    const items = reports.map(r => {
      const t = byId.get(r.id) || null;
      const lede = t && t.preview && typeof t.preview === 'object' ? t.preview.lede : null;
      return {
        slug:     r.slug,
        country:  r.country,
        industry: r.industry,
        year:     r.year,
        pages:    r.pages,
        price:    r.price,
        title:    (t && t.title) || null,
        excerpt:  (lede ? String(lede).slice(0, 240) : null),
        locale:   t ? t.locale : null,
        hasTranslation: !!t
      };
    });

    // ── 4) Facets (counts for sidebar) ─────────────────────────
    // One query, no filters except status=published, just to know totals.
    const { rows: all } = await sb(
      'living_reports?status=eq.published&select=country,industry,year&limit=2000'
    );
    const facets = { countries: {}, industries: {}, years: {} };
    all.forEach(r => {
      const c = (r.country || '').toLowerCase();
      const i = (r.industry || '').toLowerCase();
      const y = r.year;
      if (c) facets.countries[c]  = (facets.countries[c]  || 0) + 1;
      if (i) facets.industries[i] = (facets.industries[i] || 0) + 1;
      if (y) facets.years[y]      = (facets.years[y]      || 0) + 1;
    });
    facets.totalPublished = all.length;

    res.status(200).json({ items, total, limit, offset, facets, locale });
  } catch (err) {
    console.error('[library-list] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
