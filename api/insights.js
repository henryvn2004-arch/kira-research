// ============================================================
// KIRA RESEARCH — api/insights.js
// GET /api/insights?limit=20            → list articles
// GET /api/insights?slug=article-slug   → single article
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');

  const { slug, industry, country, limit = 20 } = req.query;

  // Single article
  if (slug) {
    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Article not found' });
    return res.json({ article: data });
  }

  // List
  let query = supabase
    .from('insights')
    .select('id, slug, title, content, industry, country, tags, created_at, seo_description')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(Number(limit));

  if (industry) query = query.ilike('industry', `%${industry}%`);
  if (country)  query = query.eq('country', country);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.json({ articles: data || [] });
}
