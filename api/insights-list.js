// ============================================================
// KIRA RESEARCH — api/insights-list.js
// Public list endpoint for /<locale>/insights/.
//
//   GET /api/insights-list?
//       locale=en
//       &category=fintech|methodology|vietnam|...   (optional)
//       &limit=24&offset=0
//
// Returns { items: [...], total } — each item has slug, category,
// country, industry, title, excerpt, read_time, published_at.
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

const SUPPORTED = new Set(['en','ja','ko']);

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
  const category = clean(url.searchParams.get('category'));
  const limit    = int(url.searchParams.get('limit'),  24, 96);
  const offset   = int(url.searchParams.get('offset'),  0, 9600);

  try {
    // 1) Base insights (status=published AND published_at has arrived).
    //    The published_at gate lets the admin schedule a future publish-date —
    //    set status='published' + published_at=<future-iso>, and the row stays
    //    hidden until the wall-clock catches up. No cron needed.
    const nowIso = new Date().toISOString();
    const where = [
      'status=eq.published',
      `published_at=lte.${encodeURIComponent(nowIso)}`
    ];
    if (category) {
      // category matches either an explicit category column OR a country/industry tag.
      where.push(
        `or=(category.ilike.${encodeURIComponent(category)},` +
        `country.ilike.${encodeURIComponent(category)},` +
        `industry.ilike.${encodeURIComponent(category)})`
      );
    }
    const baseQs =
      where.join('&') +
      `&order=published_at.desc.nullslast` +
      `&limit=${limit}` +
      `&offset=${offset}` +
      `&select=id,slug,category,country,industry,published_at,featured`;

    const { rows: insights, total } = await sb(`insights?${baseQs}`);

    // 2) Translations in one in() query.
    const ids = insights.map(r => r.id);
    let translations = [];
    if (ids.length) {
      const idList = encodeURIComponent(`(${ids.join(',')})`);
      const tQs =
        `insight_id=in.${idList}` +
        `&status=eq.published` +
        `&locale=in.(${locale},en)` +
        `&select=insight_id,locale,title,excerpt,read_time`;
      const { rows } = await sb(`insight_translations?${tQs}`);
      translations = rows;
    }

    const byId = new Map();
    translations.forEach(t => {
      const cur = byId.get(t.insight_id);
      if (!cur || (t.locale === locale && cur.locale !== locale)) {
        byId.set(t.insight_id, t);
      }
    });

    const items = insights.map(i => {
      const t = byId.get(i.id) || null;
      return {
        slug:         i.slug,
        category:     i.category,
        country:      i.country,
        industry:     i.industry,
        published_at: i.published_at,
        featured:     !!i.featured,
        title:        (t && t.title)    || null,
        excerpt:      (t && t.excerpt)  || null,
        read_time:    (t && t.read_time) || null,
        locale:       t ? t.locale : null,
        hasTranslation: !!t
      };
    });

    res.status(200).json({ items, total, limit, offset, locale });
  } catch (err) {
    console.error('[insights-list] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
