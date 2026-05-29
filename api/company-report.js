// ============================================================
// KIRA RESEARCH — api/company-report.js
// Company Intelligence: get assembled report by slug.
//
// GET /api/company-report?slug=vn-vingroup-0101231488
//   → { report: { entity_id, tax_id, name, status, facts, coverage, ... } }
//
// Behaviour:
//   • Fresh cache (non-stub, non-expired) → serve immediately
//   • Stub (is_stub=true) → try pipeline inline; on failure serve seed facts from DB
//   • Expired (not stub) → serve stale + async refresh
//   • Not found → 404
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

  try {
    // ── Look up by slug ───────────────────────────────────────
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

    // ── Fresh non-stub hit → serve immediately ────────────────
    if (!isStub && !isExpired) {
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
      return res.status(200).json({ report: cr.payload, updated_at: cr.updated_at });
    }

    // ── Load entity (needed for stub path and async refresh) ──
    const { data: entity } = await supabase
      .from('entities')
      .select('id, type, country_code, tax_id, canonical_name, name_norm, status_cache')
      .eq('id', cr.entity_id)
      .single();

    // ── Stub: try pipeline inline ─────────────────────────────
    if (isStub && entity) {
      let pipelineResult = null;
      try {
        pipelineResult = await runPipeline(
          { taxId: entity.tax_id, country: entity.country_code },
          { supabase }
        );
      } catch (_err) {
        // pipeline threw — fall through to seed-facts fallback
      }

      if (pipelineResult?.report) {
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
        return res.status(200).json({ report: pipelineResult.report, updated_at: new Date().toISOString() });
      }

      // Pipeline failed — assemble from seed facts already in DB
      const { data: seedFacts } = await supabase
        .from('facts')
        .select('key, value, confidence, observed_at')
        .eq('entity_id', cr.entity_id)
        .order('confidence', { ascending: false });

      const factsMap = {};
      for (const f of seedFacts || []) {
        if (!factsMap[f.key]) {
          factsMap[f.key] = { value: f.value, confidence: f.confidence, observed_at: f.observed_at };
        }
      }

      const fallback = {
        ...cr.payload,
        is_stub:      false,
        facts:        factsMap,
        status:       entity.status_cache || 'active',
        generated_at: new Date().toISOString(),
      };
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.status(200).json({ report: fallback, updated_at: cr.updated_at });
    }

    // ── Expired non-stub: serve stale + async refresh ─────────
    if (isExpired && !isStub && entity) {
      runPipeline(
        { taxId: entity.tax_id, country: entity.country_code },
        { supabase }
      ).catch(() => {});

      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=60');
      res.setHeader('X-Cache-Status', 'stale');
      return res.status(200).json({ report: cr.payload, updated_at: cr.updated_at });
    }

    // ── Fallback: serve whatever we have ─────────────────────
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).json({ report: cr.payload, updated_at: cr.updated_at });

  } catch (err) {
    console.error('[company-report] unhandled error:', err?.message ?? err);
    return res.status(500).json({ error: 'internal_error', detail: err?.message });
  }
}
