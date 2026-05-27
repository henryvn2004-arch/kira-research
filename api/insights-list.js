// ============================================================
// KIRA RESEARCH — api/insights-list.js
// Public list endpoint for /<locale>/insights/.
//
//   GET /api/insights-list?
//       locale=en
//       &category=fintech|methodology|vietnam|...   (optional)
//       &q=coffee+vietnam                           (optional — server-side
//                                                    keyword search across
//                                                    title, excerpt, slug,
//                                                    country, industry, category)
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

// PostgREST ILIKE wants `*foo*`; escape commas/parens since they're
// part of the or-filter syntax. Cap length to keep the URL sane.
function sanitizeQ(q) {
  if (typeof q !== 'string') return '';
  const trimmed = q.trim().slice(0, 64);
  if (trimmed.length < 2) return '';
  // Strip characters that break PostgREST or-filter parsing.
  return trimmed.replace(/[(),*]/g, ' ').trim();
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url      = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const locale   = SUPPORTED.has(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';
  const category = clean(url.searchParams.get('category'));
  const q        = sanitizeQ(url.searchParams.get('q'));
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

    // 1b) Keyword search (server-side, two-phase):
    //     - Phase A: find insight_translations matching title/excerpt ILIKE
    //     - Phase B: find insights matching slug/country/industry/category ILIKE
    //     Union the IDs and filter the main query with id=in.(...)
    if (q) {
      const qPattern = encodeURIComponent(`*${q}*`);
      // Phase A: title + excerpt across all locales (case-insensitive)
      const transRes = await sb(
        `insight_translations?status=eq.published` +
        `&or=(title.ilike.${qPattern},excerpt.ilike.${qPattern})` +
        `&select=insight_id&limit=500`
      );
      const transIds = new Set((transRes.rows || []).map(r => r.insight_id));

      // Phase B: slug + country + industry + category on the base insights table
      const slugRes = await sb(
        `insights?status=eq.published` +
        `&or=(slug.ilike.${qPattern},country.ilike.${qPattern},industry.ilike.${qPattern},category.ilike.${qPattern})` +
        `&select=id&limit=500`
      );
      (slugRes.rows || []).forEach(r => transIds.add(r.id));

      if (!transIds.size) {
        res.status(200).json({ items: [], total: 0, limit, offset, locale });
        return;
      }
      where.push(`id=in.(${Array.from(transIds).join(',')})`);
    }
    const baseQs =
      where.join('&') +
      `&order=published_at.desc.nullslast` +
      `&limit=${limit}` +
      `&offset=${offset}` +
      `&select=id,slug,category,country,industry,published_at,featured`;

    const { rows: insights, total } = await sb(`insights?${baseQs}`);

    // 2) Translations in one in() query. We also pull body length so we
    //    can drop stub rows (title+excerpt present but body never written)
    //    from the public list. body=not.is.null is the PostgREST filter.
    const ids = insights.map(r => r.id);
    let translations = [];
    if (ids.length) {
      const idList = encodeURIComponent(`(${ids.join(',')})`);
      const tQs =
        `insight_id=in.${idList}` +
        `&status=eq.published` +
        `&body=not.is.null` +
        `&locale=in.(${locale},en)` +
        `&select=insight_id,locale,title,excerpt,read_time,body`;
      const { rows } = await sb(`insight_translations?${tQs}`);
      // Drop empty-string bodies that slipped past the IS NULL filter.
      translations = rows.filter(r => r.body && r.body.length > 0);
    }

    const byId = new Map();
    translations.forEach(t => {
      const cur = byId.get(t.insight_id);
      if (!cur || (t.locale === locale && cur.locale !== locale)) {
        byId.set(t.insight_id, t);
      }
    });

    // Filter out insights whose only published translation has a null/empty
    // body — those would render as "Full article body is being written…" stubs
    // on the detail page, which looks broken from a buyer's POV. Better to
    // hide them entirely until someone writes the body.
    const items = insights
      .map(i => {
        const t = byId.get(i.id) || null;
        if (!t) return null;
        return {
          slug:         i.slug,
          category:     i.category,
          country:      i.country,
          industry:     i.industry,
          published_at: i.published_at,
          featured:     !!i.featured,
          title:        t.title    || null,
          excerpt:      t.excerpt  || null,
          read_time:    t.read_time || null,
          locale:       t.locale,
          hasTranslation: true
        };
      })
      .filter(Boolean);

    // Total reflects post-filter count. If callers rely on the pre-filter
    // total for pagination, they'll see the visible-items count instead —
    // which is the more honest number anyway.
    res.status(200).json({ items, total: items.length, limit, offset, locale });
  } catch (err) {
    console.error('[insights-list] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
