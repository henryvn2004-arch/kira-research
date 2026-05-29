// ============================================================
// KIRA RESEARCH — api/company-report.js
// Company Intelligence: get assembled report by slug.
//
// GET /api/company-report?slug=ten-cong-ty-0123456789
//   → { report: { entity_id, mst, name, status, facts, graph, narrative, coverage, ... } }
//
// 404 if slug not found or report expired and pipeline not yet re-run.
//
// Auth: public. Cache: s-maxage=1800 (30 min — refreshed by pipeline).
// ============================================================

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { slug } = req.query;
  if (!slug) {
    return res.status(400).json({ error: 'missing_slug' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from('company_reports')
    .select('payload, pipeline_version, expires_at, updated_at')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'not_found' });
  }

  // Expired but still serving — mark stale in response header for debugging
  const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
  if (isExpired) {
    res.setHeader('X-Cache-Status', 'stale');
  }

  res.setHeader('Cache-Control', isExpired
    ? 'public, s-maxage=60, stale-while-revalidate=60'
    : 'public, s-maxage=1800, stale-while-revalidate=3600'
  );

  return res.status(200).json({
    report:      data.payload,
    updated_at:  data.updated_at,
  });
}
