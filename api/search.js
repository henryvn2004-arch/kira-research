// ============================================================
// KIRA RESEARCH — api/search.js
// GET /api/search?type=library&limit=50         → list reports
// GET /api/search?type=living&id=slug-or-uuid   → single report
// GET /api/search?q=keyword&industry=X&country=Y → filtered search
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

  const { type, id, q, industry, country, limit = 50 } = req.query;

  // ── Single report by id or slug ───────────────────────
  if (type === 'living' && id) {
    const isUUID = /^[0-9a-f-]{36}$/.test(id);
    const query  = supabase
      .from('living_reports')
      .select('id, slug, title, industry, sub_industry, country, report_type, preview_content, full_content, price, last_refreshed, tags, seo_description, status')
      .eq('status', 'active');

    const { data, error } = isUUID
      ? await query.eq('id', id).single()
      : await query.eq('slug', id).single();

    if (error || !data) return res.status(404).json({ error: 'Report not found' });
    return res.json({ report: data });
  }

  // ── List / search library ─────────────────────────────
  let query = supabase
    .from('living_reports')
    .select('id, slug, title, industry, country, report_type, preview_content, price, last_refreshed, tags, status')
    .eq('status', 'active')
    .order('last_refreshed', { ascending: false })
    .limit(Number(limit));

  if (industry) query = query.ilike('industry', `%${industry}%`);
  if (country)  query = query.eq('country', country);
  if (q)        query = query.or(`title.ilike.%${q}%,industry.ilike.%${q}%,country.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ reports: data || [], count: data?.length || 0 });
}
