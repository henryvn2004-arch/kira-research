// ============================================================
// KIRA RESEARCH — api/company-search.js
// Company Intelligence: search / resolve endpoint.
//
// GET /api/company-search?tax_id=0123456789&country=VN   (default country=VN)
//   → { entity: { id, country_code, tax_id, canonical_name, status_cache } }
//
// GET /api/company-search?name=Intimex+Group&country=VN
//   → { entity: ... }           single match
//   → { candidates: [...] }     multiple matches — caller must show selector
//
// Legacy: ?mst= still accepted as alias for ?tax_id= with country=VN
//
// Errors → { error: 'missing_input'|'not_found'|'no_candidates'|'search_failed' }
//
// Auth: public (no JWT). Rate limiting via Vercel edge (future).
// Cache: s-maxage=60 (short — entities can be enriched any time)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { runPipeline } from './_lib/company/pipeline.js';
import { SUPPORTED_COUNTRIES, DEFAULT_COUNTRY } from './_lib/company/config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // ?mst= is a legacy alias for ?tax_id= (VN only)
  const taxId  = req.query.tax_id || req.query.mst || null;
  const name   = req.query.name   || null;
  const country = (req.query.country || DEFAULT_COUNTRY).toUpperCase();

  if (!taxId && !name) {
    return res.status(400).json({ error: 'missing_input', hint: 'Provide ?tax_id= (or legacy ?mst=) or ?name=. Optional: &country=VN' });
  }

  if (!SUPPORTED_COUNTRIES.includes(country)) {
    return res.status(400).json({ error: 'unsupported_country', supported: SUPPORTED_COUNTRIES });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  const result = await runPipeline({ taxId, name, country }, { supabase });

  if (result.error) {
    const status = result.error === 'missing_input' || result.error === 'unsupported_country' ? 400
                 : result.error === 'not_found' || result.error === 'no_candidates' ? 404
                 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  if (result.candidates) {
    return res.status(200).json({ candidates: result.candidates });
  }

  return res.status(200).json({ entity: result.report });
}
