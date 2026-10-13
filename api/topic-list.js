// ============================================================
// KIRA RESEARCH — api/topic-list.js
// Public. The "Coming soon" tab of the library: topics in the production queue that have no
// published report yet.
//
//   GET /api/topic-list?country=vietnam&industry=coffee&q=chains&limit=20&offset=0
//     country, industry   lowercase names as in the facets (optional)
//     q                   text in the title (optional)
//   → { items: [{ slug, title, hook, country, industry, year, planned }], total, facets }
//     facets = { countries: { vietnam: 12, ... }, industries: { coffee: 3, ... }, total }
//     planned = true when the topic has planned contents (topics.signals.planned).
// Only status "queued" topics are listed: those are the reviewed ones (S13/S15). Readers' own
// proposals and rejected topics never show here.
// ============================================================

import { plannedOf } from './_lib/planned.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, Prefer: 'count=exact' }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  const total = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
  return { rows, total: Number.isFinite(total) ? total : rows.length };
}

const clean = s => (typeof s === 'string' ? s.trim().toLowerCase().slice(0, 80) : '');
const int = (s, def, max) => { const n = parseInt(s, 10); return isNaN(n) || n < 0 ? def : Math.min(n, max); };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const country  = clean(url.searchParams.get('country'));
  const industry = clean(url.searchParams.get('industry'));
  const q        = (url.searchParams.get('q') || '').trim().slice(0, 60).replace(/[^\p{L}\p{N} &-]/gu, ' ').trim();
  const limit    = int(url.searchParams.get('limit'), 20, 48);
  const offset   = int(url.searchParams.get('offset'), 0, 4000);

  try {
    const where = ['status=eq.queued', 'report_id=is.null'];
    if (country)  where.push(`tax_countries.name=ilike.${encodeURIComponent(country)}`);
    if (industry) where.push(`tax_industries.name=ilike.${encodeURIComponent(industry)}`);
    if (q)        where.push(`title=ilike.${encodeURIComponent(`*${q}*`)}`);

    const { rows, total } = await sb(
      `topics?${where.join('&')}&order=priority_score.desc.nullslast,slug.asc&limit=${limit}&offset=${offset}` +
      '&select=slug,title,year,signals,tax_countries!inner(name),tax_industries!inner(name)'
    );
    const items = rows.map(t => ({
      slug: t.slug, title: t.title, year: t.year,
      hook: t.signals && typeof t.signals.hook === 'string' ? t.signals.hook.slice(0, 160) : null,
      country: t.tax_countries ? t.tax_countries.name : null,
      industry: t.tax_industries ? t.tax_industries.name : null,
      planned: !!plannedOf(t.signals)
    }));

    // Sidebar counts over all listed topics. PostgREST returns at most 1000 rows per request,
    // so read the list in pages of 1000 (about 1,900 topics today).
    const all = [];
    for (let off = 0; off < 6000; off += 1000) {
      const { rows: part } = await sb(
        `topics?status=eq.queued&report_id=is.null&order=slug.asc&limit=1000&offset=${off}&select=tax_countries(name),tax_industries(name)`
      );
      all.push(...part);
      if (part.length < 1000) break;
    }
    const facets = { countries: {}, industries: {}, total: all.length };
    all.forEach(r => {
      const c = r.tax_countries && r.tax_countries.name ? r.tax_countries.name.toLowerCase() : '';
      const i = r.tax_industries && r.tax_industries.name ? r.tax_industries.name.toLowerCase() : '';
      if (c) facets.countries[c] = (facets.countries[c] || 0) + 1;
      if (i) facets.industries[i] = (facets.industries[i] || 0) + 1;
    });

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return res.status(200).json({ items, total, limit, offset, facets });
  } catch (err) {
    console.error('[topic-list]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
