// ============================================================
// KIRA RESEARCH — api/company-enrich.js
// Company Intelligence: progressive enrichment for a single company.
//
// POST /api/company-enrich
// Body: { slug: "vn-vingroup-0101231488" }
//
// Called fire-and-forget from _view.html after the page renders.
// Checks opencorporates/wikidata coverage — if not yet enriched (or stale),
// runs the pipeline Stage 2 to fetch real data from official sources.
//
// Idempotent: skips connectors that already have fresh coverage entries.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { runPipeline } from './_lib/company/pipeline.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { slug } = req.body || {};
  if (!slug || typeof slug !== 'string' || slug.length > 200) {
    return res.status(400).json({ error: 'missing_slug' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  // Look up entity via company_reports
  const { data: cr } = await supabase
    .from('company_reports')
    .select('entity_id')
    .eq('slug', slug)
    .single();

  if (!cr) return res.status(404).json({ error: 'not_found' });

  // Skip if already enriched recently (opencorporates or wikidata found within TTL)
  const { data: covRows } = await supabase
    .from('coverage')
    .select('source_type, status, checked_at')
    .eq('entity_id', cr.entity_id)
    .in('source_type', ['opencorporates', 'wikidata']);

  if (covRows?.length) {
    const found = covRows.find(c => c.status === 'found');
    if (found) {
      const daysSince = (Date.now() - new Date(found.checked_at).getTime()) / 86400000;
      if (daysSince < 30) {
        return res.status(200).json({ enriched: false, reason: 'already_enriched' });
      }
    }
  }

  // Get entity tax_id + country for pipeline input
  const { data: entity } = await supabase
    .from('entities')
    .select('tax_id, country_code, canonical_name')
    .eq('id', cr.entity_id)
    .single();

  if (!entity) return res.status(404).json({ error: 'entity_not_found' });

  // Run pipeline with force=true to bypass the payload cache check.
  // Stage 2 connectors (ĐKKD, masothue, Tavily) are still idempotent
  // via their individual coverage table entries — they only re-run
  // when coverage is missing or stale.
  const result = await runPipeline(
    { taxId: entity.tax_id, country: entity.country_code, name: entity.canonical_name },
    { supabase },
    { force: true }
  );

  if (result.error) {
    return res.status(200).json({ enriched: false, reason: result.error });
  }

  return res.status(200).json({ enriched: true });
}
