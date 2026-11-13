// ============================================================
// KIRA RESEARCH — api/company-report.js
// Company Intelligence: get assembled report by slug.
//
// GET /api/company-report?slug=vn-vingroup-0101231488
//   → { report: { entity_id, tax_id, name, status, facts, coverage, ... } }
//
// Serves directly from company_reports cache (no on-demand scraping).
// Pipeline enrichment runs as a background batch — not on page load.
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

  try {
    const { data: cr, error } = await supabase
      .from('company_reports')
      .select('entity_id, payload, pipeline_version, expires_at, updated_at')
      .eq('slug', slug)
      .single();

    if (error || !cr) {
      return res.status(404).json({ error: 'not_found' });
    }

    // No payload yet — build thin report from entity data so the page renders
    if (!cr.payload) {
      const { data: entity } = await supabase
        .from('entities')
        .select('canonical_name, tax_id, country_code, status_cache')
        .eq('id', cr.entity_id)
        .single();

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        report: {
          slug,
          name:         entity?.canonical_name || slug,
          tax_id:       entity?.tax_id         || null,
          country_code: entity?.country_code   || 'VN',
          status:       entity?.status_cache   || 'unknown',
          facts:        {},
          coverage:     {},
          narrative:    null,
          generated_at: null,
        },
        needs_enrichment: true,
        updated_at: cr.updated_at,
      });
    }

    const isExpired = cr.expires_at && new Date(cr.expires_at) < new Date();

    res.setHeader('Cache-Control', isExpired
      ? 'public, s-maxage=60, stale-while-revalidate=300'
      : 'public, s-maxage=1800, stale-while-revalidate=3600'
    );
    if (isExpired) res.setHeader('X-Cache-Status', 'stale');

    return res.status(200).json({ report: cr.payload, updated_at: cr.updated_at });

  } catch (err) {
    console.error('[company-report] error:', err?.message ?? err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
