// ============================================================
// Company Intelligence — pipeline orchestrator
//
// runPipeline(input, ctx) → { report } | { candidates } | { error }
//
// 6-stage pipeline:
//   1. Resolve entity (MST → direct; name → candidates list)
//   2. Fetch official sources (dkkd, tax) — deterministic, cheap
//   3. Footprint discovery (gmb, website, shopee) — expensive
//   4. Graph expansion (recursive CTE up to depth 2)
//   5. LLM synthesis (only when unstructured text exists)
//   6. Quality gate + assemble report + cache
//
// Stages 3-6 are implemented in subsequent sprints.
// Sprint 0 scaffold: stages 1 + cache check + stub the rest.
// ============================================================

import { PIPELINE_VERSION, GRAPH_MAX_DEPTH, GRAPH_MAX_NODES, GRAPH_MIN_CONF } from './config.js';

/**
 * @param {{ mst?: string, name?: string }} input
 * @param {{ supabase: import('@supabase/supabase-js').SupabaseClient }} ctx
 * @returns {Promise<{
 *   report?:     object,
 *   candidates?: Array<{ id: string, canonical_name: string, mst?: string, status_cache?: string }>,
 *   error?:      string
 * }>}
 */
export async function runPipeline(input, ctx) {
  if (!input.mst && !input.name) return { error: 'missing_input' };

  // Stage 1: resolve entity
  const resolved = await resolveEntity(input, ctx);
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

  if (input.mst) {
    const { data, error } = await supabase
      .from('entities')
      .select('id, type, mst, canonical_name, name_norm, status_cache')
      .eq('mst', input.mst)
      .single();
    if (error || !data) return { error: 'mst_not_found' };
    return { entity: data };
  }

  // Name search via pg_trgm similarity
  const norm = input.name.toLowerCase().trim();
  const { data, error } = await supabase
    .from('entities')
    .select('id, type, mst, canonical_name, status_cache')
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
    mst:          entity.mst,
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
