// ============================================================
// Company Intelligence — pipeline orchestrator
//
// runPipeline(input, ctx) → { report } | { candidates } | { error }
//
// 6-stage pipeline:
//   1. Resolve entity (tax_id → direct; name → candidates list)
//   2. Fetch official sources (country-specific: dkkd/tax for VN, ACRA for SG, etc.)
//   3. Footprint discovery (gmb, website, shopee) — expensive
//   4. Graph expansion (recursive CTE up to depth 2)
//   5. LLM synthesis (only when unstructured text exists)
//   6. Quality gate + assemble report + cache
//
// Stages 3-6 are implemented in subsequent sprints.
// Sprint 0 scaffold: stages 1 + cache check + stub the rest.
// ============================================================

import { PIPELINE_VERSION, GRAPH_MAX_DEPTH, GRAPH_MAX_NODES, GRAPH_MIN_CONF, DEFAULT_COUNTRY } from './config.js';

/**
 * @param {{ taxId?: string, name?: string, country?: string }} input
 * @param {{ supabase: import('@supabase/supabase-js').SupabaseClient }} ctx
 * @returns {Promise<{
 *   report?:     object,
 *   candidates?: Array<{ id: string, country_code: string, canonical_name: string, tax_id?: string, status_cache?: string }>,
 *   error?:      string
 * }>}
 */
export async function runPipeline(input, ctx) {
  if (!input.taxId && !input.name) return { error: 'missing_input' };

  const country = (input.country || DEFAULT_COUNTRY).toUpperCase();

  // Stage 1: resolve entity
  const resolved = await resolveEntity({ ...input, country }, ctx);
  if (resolved.candidates) return { candidates: resolved.candidates };
  if (resolved.error)      return { error: resolved.error };

  const { entity } = resolved;

  // Cache check — hit → return immediately (~$0)
  const cached = await getCachedReport(entity.id, ctx);
  if (cached) return { report: cached };

  // Short-circuit: dissolved/cancelled companies get a thin report without scraping
  const isActive = !entity.status_cache || entity.status_cache === 'active';
  if (!isActive) {
    return { report: assembleThinReport(entity) };
  }

  // Stage 2: official sources — implemented in Sprint 2
  // Stage 3: footprint discovery — implemented in Sprint 4
  // Stage 4: graph expansion — implemented in Sprint 8
  // Stage 5: LLM synthesis — implemented in Sprint 5
  // Stage 6: quality gate + cache — implemented in Sprint 3

  return { error: 'pipeline_not_implemented' };
}

// ── Graph expansion helper (used by Sprint 8 but defined here) ─────────────

/**
 * BFS from seed entity, depth ≤ 2, max 30 nodes.
 * Returns rows from the recursive CTE.
 *
 * @param {string} seedId
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<Array<{ entity_id: string, type: string, path_conf: number, depth: number }>>}
 */
export async function expandGraph(seedId, supabase) {
  const { data, error } = await supabase.rpc('company_graph_bfs', {
    p_seed:      seedId,
    p_max_depth: GRAPH_MAX_DEPTH,
    p_max_nodes: GRAPH_MAX_NODES,
    p_min_conf:  GRAPH_MIN_CONF,
  });
  if (error) throw error;
  return data || [];
}

// ── Private helpers ─────────────────────────────────────────────────────────

async function resolveEntity(input, ctx) {
  const { supabase } = ctx;
  const country = input.country || DEFAULT_COUNTRY;

  if (input.taxId) {
    const { data, error } = await supabase
      .from('entities')
      .select('id, type, country_code, tax_id, canonical_name, name_norm, status_cache')
      .eq('country_code', country)
      .eq('tax_id', input.taxId)
      .single();
    if (error || !data) return { error: 'not_found' };
    return { entity: data };
  }

  // Name search via pg_trgm similarity, scoped to country
  const norm = input.name.toLowerCase().trim();
  const { data, error } = await supabase
    .from('entities')
    .select('id, type, country_code, tax_id, canonical_name, status_cache')
    .eq('country_code', country)
    .ilike('name_norm', `%${norm}%`)
    .limit(10);

  if (error) return { error: 'search_failed' };
  if (!data || data.length === 0) return { error: 'no_candidates' };
  if (data.length === 1) return { entity: data[0] };
  return { candidates: data };
}

async function getCachedReport(entityId, ctx) {
  const { data } = await ctx.supabase
    .from('company_reports')
    .select('payload, pipeline_version, expires_at')
    .eq('entity_id', entityId)
    .single();

  if (!data) return null;
  if (data.pipeline_version !== PIPELINE_VERSION) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return data.payload;
}

function assembleThinReport(entity) {
  return {
    entity_id:    entity.id,
    country_code: entity.country_code,
    tax_id:       entity.tax_id,
    name:         entity.canonical_name,
    status:       entity.status_cache || 'unknown',
    is_thin:      true,
    coverage:     {},
    facts:        {},
    graph:        [],
    narrative:    null,
    generated_at: new Date().toISOString(),
    pipeline_ver: PIPELINE_VERSION,
  };
}
