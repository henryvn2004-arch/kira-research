// ============================================================
// KIRA RESEARCH — api/company-search.js
// Company Intelligence: search / resolve endpoint.
//
// GET /api/company-search?mst=0123456789
//   → { entity: { id, mst, canonical_name, status_cache } }
//
// GET /api/company-search?name=Cong+ty+ABC
//   → { entity: ... }           single match
//   → { candidates: [...] }     multiple matches — caller must show selector
//
// Errors → { error: 'missing_input'|'mst_not_found'|'no_candidates'|'search_failed' }
//
// Auth: public (no JWT). Rate limiting via Vercel edge (future).
// Cache: s-maxage=60 (short — entities can be enriched any time)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { runPipeline } from './_lib/company/pipeline.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { mst, name } = req.query;
  if (!mst && !name) {
    return res.status(400).json({ error: 'missing_input', hint: 'Provide ?mst= or ?name=' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  const result = await runPipeline({ mst, name }, { supabase });

  if (result.error) {
    const status = result.error === 'missing_input' ? 400
                 : result.error === 'mst_not_found' || result.error === 'no_candidates' ? 404
                 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (result.candidates) {
    return res.status(200).json({ candidates: result.candidates });
  }

  return res.status(200).json({ entity: result.report });
}
