// ============================================================
// KIRA RESEARCH — api/company-report.js
// Company Intelligence: get assembled report by slug.
//
// GET /api/company-report?slug=vn-vingroup-0101231488
//   → { report: { entity_id, tax_id, name, status, facts, coverage, ... } }
//
// Behaviour:
//   • Fresh cache hit        → serve immediately
//   • Stub (is_stub=true)    → run pipeline inline (~5-10s), return fresh data
//   • Expired (not stub)     → serve stale + async refresh in background
//   • Not found              → 404
//
// Auth: public. Cache: s-maxage=1800 when fresh, 60 when stale.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { runPipeline }  from './_lib/company/pipeline.js';

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

  // ── Look up by slug ─────────────────────────────────────────
  const { data: cr, error: crErr } = await supabase
    .from('company_reports')
    .select('entity_id, payload, pipeline_version, expires_at, updated_at')
    .eq('slug', slug)
    .single();

  if (crErr || !cr) {
    return res.status(404).json({ error: 'not_found' });
  }

  const isExpired = cr.expires_at && new Date(cr.expires_at) < new Date();
  const isStub    = !!cr.payload?.is_stub;

  // ── Stub: run pipeline inline to hydrate with real facts ────
  if (isStub) {
    const { data: entity } = await supabase
      .from('entities')
      .select('id, type, country_code, tax_id, canonical_name, name_norm, status_cache')
      .eq('id', cr.entity_id)
      .single();

    if (entity) {
      const result = await runPipeline(
        { taxId: entity.tax_id, country: entity.country_code },
        { supabase }
      );

      if (result.report) {
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
        return res.status(200).json({ report: result.report, updated_at: new Date().toISOString() });
      }
    }
    // Pipeline failed: fall through and serve the stub
  }

  // ── Expired (but not stub): serve stale, refresh fires async ─
  if (isExpired && !isStub) {
    // Fire-and-forget — do NOT await; Vercel will keep alive via response stream
    supabase
      .from('entities')
      .select('id, type, country_code, tax_id, canonical_name, name_norm, status_cache')
      .eq('id', cr.entity_id)
      .single()
      .then(({ data: entity }) => {
        if (entity) {
          runPipeline(
            { taxId: entity.tax_id, country: entity.country_code },
            { supabase }
          ).catch(() => {});
        }
      });

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');
    res.setHeader('X-Cache-Status', 'stale');
    return res.status(200).json({ report: cr.payload, updated_at: cr.updated_at });
  }

  // ── Fresh ────────────────────────────────────────────────────
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  return res.status(200).json({ report: cr.payload, updated_at: cr.updated_at });
}
