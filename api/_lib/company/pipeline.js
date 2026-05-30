// ============================================================
// Company Intelligence — pipeline orchestrator
//
// runPipeline(input, ctx) → { report } | { candidates } | { error }
//
// Universal pipeline (all 10 KIRA countries):
//   1. Resolve entity (tax_id → direct; name → candidates list)
//   2. OpenCorporates — official registration data (all countries)
//      Wikidata       — structured knowledge graph enrichment
//      Tavily         — web search for description + website
//   3. LLM synthesis — Claude Haiku analyst narrative
//   4. Assemble + cache report
// ============================================================

import { PIPELINE_VERSION, GRAPH_MAX_DEPTH, GRAPH_MAX_NODES, GRAPH_MIN_CONF, SOURCE_TTL_DAYS, DEFAULT_COUNTRY } from './config.js';
import * as opencorporates  from './connectors/opencorporates.js';
import * as wikidata         from './connectors/wikidata.js';
import * as tavily_web       from './connectors/tavily_web.js';
import * as opensanctions    from './connectors/opensanctions.js';
import { makeSlug } from './normalize.js';

// ── Public entry point ─────────────────────────────────────────

/**
 * @param {{ taxId?: string, name?: string, country?: string }} input
 * @param {{ supabase: import('@supabase/supabase-js').SupabaseClient }} ctx
 * @returns {Promise<{
 *   report?:     object,
 *   candidates?: Array<{ id: string, country_code: string, canonical_name: string, tax_id?: string, status_cache?: string }>,
 *   error?:      string
 * }>}
 */
export async function runPipeline(input, ctx, { force = false } = {}) {
  if (!input.taxId && !input.name) return { error: 'missing_input' };

  const country = (input.country || DEFAULT_COUNTRY).toUpperCase();

  // Stage 1: resolve entity
  const resolved = await resolveEntity({ ...input, country }, ctx);
  if (resolved.candidates) return { candidates: resolved.candidates };
  if (resolved.error)      return { error: resolved.error };

  const { entity } = resolved;

  // Cache check — fresh hit → return immediately (skipped when force=true)
  if (!force) {
    const cached = await getCachedReport(entity.id, ctx);
    if (cached) return { report: cached };
  }

  // Short-circuit: dissolved/cancelled companies skip scraping
  const isActive = !entity.status_cache || entity.status_cache === 'active';
  if (!isActive) {
    const thin = assembleThinReport(entity, {});
    await upsertReport(entity, thin, ctx);
    return { report: thin };
  }

  // Stage 2: official sources
  const factsMap = await stage2OfficialSources(entity, ctx);

  // Stage 5: LLM synthesis — generate analyst narrative from collected facts
  const narrative = await stage5LlmSynthesis(entity, factsMap, ctx);

  // Stage 6: assemble + cache
  const report = await assembleAndCache(entity, factsMap, ctx, narrative);
  return { report };
}

// ── Graph expansion (used by Sprint 4) ────────────────────────

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

// ── Stage 2: universal enrichment sources ─────────────────────

async function stage2OfficialSources(entity, ctx) {
  const { supabase } = ctx;

  // OpenCorporates — official registration data (all countries, requires tax_id)
  if (entity.tax_id) {
    const ocCov = await getCoverage(entity.id, 'opencorporates', supabase);
    const needsOC = !ocCov || ocCov.status === 'not_checked' || ocCov.status === 'failed'
      || isCoverageStale(ocCov, 'opencorporates');
    if (needsOC) await runConnector(entity, 'opencorporates', opencorporates, ctx);
  }

  // Wikidata — structured knowledge graph enrichment (all countries)
  const wdCov = await getCoverage(entity.id, 'wikidata', supabase);
  const needsWD = !wdCov || wdCov.status === 'not_checked' || wdCov.status === 'failed'
    || isCoverageStale(wdCov, 'wikidata');
  if (needsWD) await runConnector(entity, 'wikidata', wikidata, ctx);

  // Tavily — overview + risk news (all countries, requires API key)
  // Re-runs if stale OR if risk_news_count fact is missing (new field, pipeline v2→v3 upgrade)
  if (process.env.TAVILY_API_KEY) {
    const tavilyCov  = await getCoverage(entity.id, 'tavily', supabase);
    const missingRisk = !(await factExists(entity.id, 'risk_news_count', supabase));
    const needsTavily = !tavilyCov || tavilyCov.status === 'not_checked'
      || isCoverageStale(tavilyCov, 'tavily') || missingRisk;
    if (needsTavily) await runConnector(entity, 'tavily', tavily_web, ctx);
  }

  // OpenSanctions — sanctions + PEP screening (all countries, name-based)
  const osCov  = await getCoverage(entity.id, 'opensanctions', supabase);
  const needsOS = !osCov || osCov.status === 'not_checked' || osCov.status === 'failed'
    || isCoverageStale(osCov, 'opensanctions');
  if (needsOS) await runConnector(entity, 'opensanctions', opensanctions, ctx);

  // Reload all facts after connectors run
  return loadFacts(entity.id, supabase);
}

// ── Connector runner ───────────────────────────────────────────

async function runConnector(entity, sourceType, connector, ctx) {
  const { supabase } = ctx;

  let result;
  try {
    result = await connector.fetch(entity, ctx);
  } catch (err) {
    result = { facts: [], edges: [], raw: null, coverage_status: 'failed', error: err.message };
  }

  // Insert source record
  const { data: srcRow } = await supabase
    .from('sources')
    .insert({ source_type: sourceType, reliability: sourceType === 'dkkd' ? 'high' : 'medium' })
    .select('id')
    .single();

  const srcId = srcRow?.id ?? null;

  // Insert raw document if any
  if (srcId && result.raw) {
    const hash = simpleHash(JSON.stringify(result.raw));
    const ttl = SOURCE_TTL_DAYS[sourceType] ?? 30;
    await supabase.from('raw_documents').insert({
      source_id:    srcId,
      content:      result.raw,
      content_hash: hash,
      expires_at:   new Date(Date.now() + ttl * 86400 * 1000).toISOString(),
    });
  }

  // Upsert facts
  for (const f of result.facts || []) {
    await supabase.from('facts').upsert(
      {
        entity_id:   entity.id,
        key:         f.key,
        value:       typeof f.value === 'string' ? JSON.stringify(f.value) : f.value,
        source_id:   srcId,
        confidence:  f.confidence,
        observed_at: f.observed_at ?? new Date().toISOString(),
      },
      { onConflict: 'entity_id,key' }
    );
  }

  // Update entity status_cache if connector returned a canonical status
  if (result.status_canonical) {
    await supabase
      .from('entities')
      .update({ status_cache: result.status_canonical, last_enriched_at: new Date().toISOString() })
      .eq('id', entity.id);
  }

  // Upsert coverage
  await supabase.from('coverage').upsert(
    { entity_id: entity.id, source_type: sourceType, status: result.coverage_status, checked_at: new Date().toISOString() },
    { onConflict: 'entity_id,source_type' }
  );
}

// ── Stage 6: assemble + cache ──────────────────────────────────

// ── Stage 5: LLM synthesis ─────────────────────────────────────

async function stage5LlmSynthesis(entity, factsMap, ctx) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // Skip if narrative already generated recently
  const narCoverage = await getCoverage(entity.id, 'llm_narrative', ctx.supabase);
  if (narCoverage?.status === 'found' && !isCoverageStale(narCoverage, 'llm_narrative')) {
    // Retrieve existing narrative from stored report payload
    const { data: cr } = await ctx.supabase
      .from('company_reports')
      .select('payload')
      .eq('entity_id', entity.id)
      .single();
    return cr?.payload?.narrative || null;
  }

  // Build facts summary for the prompt
  const factLines = Object.entries(factsMap)
    .filter(([, v]) => v?.value != null)
    .map(([k, v]) => {
      const val = typeof v.value === 'string'
        ? v.value.replace(/^"|"$/g, '')  // strip JSON string quotes
        : v.value;
      return `${k}: ${val}`;
    })
    .join('\n');

  if (!factLines) return null;

  const country = entity.country_code || 'VN';
  const countryName = { VN: 'Vietnam', JP: 'Japan', KR: 'South Korea', AU: 'Australia',
    SG: 'Singapore', MY: 'Malaysia', ID: 'Indonesia', TH: 'Thailand',
    PH: 'Philippines', NZ: 'New Zealand' }[country] || country;

  const prompt = `You are a senior analyst at KIRA Research, a specialist research house covering Asia-Pacific emerging markets.

Write a concise 180–220 word company profile for ${entity.canonical_name} (${countryName}).

Use these verified facts:
${factLines}

Requirements:
- Professional, third-person analyst voice
- Structure: (1) overview & sector position, (2) scale & operational context, (3) strategic relevance
- Do not invent facts not provided. If a fact is missing, omit that point
- Do not mention KIRA Research, AI, or any research platform
- No headers or bullet points — flowing prose only

Output only the narrative text.`;

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages:   [{ role: 'user', content: prompt }],
    });

    const narrative = msg.content[0]?.text?.trim() || null;

    // Record coverage
    await ctx.supabase.from('coverage').upsert(
      { entity_id: entity.id, source_type: 'llm_narrative',
        status: narrative ? 'found' : 'checked_empty', checked_at: new Date().toISOString() },
      { onConflict: 'entity_id,source_type' }
    );

    return narrative;
  } catch {
    return null;
  }
}

// ── Stage 6: assemble + cache ──────────────────────────────────

async function assembleAndCache(entity, factsMap, ctx, narrative = null) {
  // Load coverage summary
  const { data: coverageRows } = await ctx.supabase
    .from('coverage')
    .select('source_type, status')
    .eq('entity_id', entity.id);

  const coverage = {};
  for (const row of coverageRows || []) {
    coverage[row.source_type] = row.status;
  }

  // Determine slug (from existing company_reports row or generate)
  const { data: existing } = await ctx.supabase
    .from('company_reports')
    .select('slug')
    .eq('entity_id', entity.id)
    .single();

  const slug = existing?.slug ?? makeSlug(entity.canonical_name, entity.tax_id, entity.country_code);

  const report = {
    entity_id:    entity.id,
    country_code: entity.country_code,
    tax_id:       entity.tax_id,
    name:         entity.canonical_name,
    slug,
    status:       entity.status_cache || 'active',
    coverage,
    facts:        factsMap,
    graph:        [],
    narrative,
    generated_at: new Date().toISOString(),
    pipeline_ver: PIPELINE_VERSION,
  };

  await upsertReport(entity, report, ctx);
  return report;
}

async function upsertReport(entity, report, ctx) {
  const slug = report.slug ?? makeSlug(entity.canonical_name, entity.tax_id, entity.country_code);

  const ttlDays = 30;
  await ctx.supabase.from('company_reports').upsert(
    {
      entity_id:        entity.id,
      slug,
      payload:          report,
      pipeline_version: PIPELINE_VERSION,
      expires_at:       new Date(Date.now() + ttlDays * 86400 * 1000).toISOString(),
      updated_at:       new Date().toISOString(),
    },
    { onConflict: 'entity_id' }
  );
}

// ── Helpers ────────────────────────────────────────────────────

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
  if (!data.expires_at || new Date(data.expires_at) < new Date()) return null;
  // Don't serve is_stub payloads from cache — those are just placeholders
  if (data.payload?.is_stub) return null;
  return data.payload;
}

async function loadFacts(entityId, supabase) {
  const { data } = await supabase
    .from('facts')
    .select('key, value, confidence, observed_at')
    .eq('entity_id', entityId)
    .order('confidence', { ascending: false });

  const map = {};
  for (const row of data || []) {
    // Highest-confidence fact wins per key (rows ordered desc)
    if (!map[row.key]) {
      map[row.key] = {
        value:       row.value,
        confidence:  row.confidence,
        observed_at: row.observed_at,
      };
    }
  }
  return map;
}

async function getCoverage(entityId, sourceType, supabase) {
  const { data } = await supabase
    .from('coverage')
    .select('status, checked_at')
    .eq('entity_id', entityId)
    .eq('source_type', sourceType)
    .single();
  return data;
}

async function factExists(entityId, key, supabase) {
  const { data } = await supabase
    .from('facts')
    .select('key')
    .eq('entity_id', entityId)
    .eq('key', key)
    .limit(1)
    .maybeSingle();
  return !!data;
}

function isCoverageStale(coverage, sourceType) {
  if (!coverage?.checked_at) return true;
  const ttl = (SOURCE_TTL_DAYS[sourceType] ?? 30) * 86400 * 1000;
  return Date.now() - new Date(coverage.checked_at).getTime() > ttl;
}

function assembleThinReport(entity, factsMap) {
  return {
    entity_id:    entity.id,
    country_code: entity.country_code,
    tax_id:       entity.tax_id,
    name:         entity.canonical_name,
    status:       entity.status_cache || 'unknown',
    is_thin:      true,
    coverage:     {},
    facts:        factsMap,
    graph:        [],
    narrative:    null,
    generated_at: new Date().toISOString(),
    pipeline_ver: PIPELINE_VERSION,
  };
}

// Lightweight non-crypto hash for change detection (not security-sensitive)
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}
