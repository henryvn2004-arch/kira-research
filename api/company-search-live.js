// ============================================================
// KIRA RESEARCH — api/company-search-live.js
// Live company name typeahead: DB first, OpenCorporates fallback.
//
// GET /api/company-search-live?q=bizdirect&country=VN
// Returns up to 5 suggestions.
// DB hits include slug (direct redirect). OC hits need /api/company-stub.
// ============================================================

import { createClient } from '@supabase/supabase-js';

// OpenCorporates jurisdiction codes per KIRA country
const OC_JURISDICTION = {
  VN: 'vn', JP: 'jp', KR: 'kr', AU: 'au',
  SG: 'sg', MY: 'my', ID: 'id', TH: 'th', PH: 'ph', NZ: 'nz',
};

// Escape SQL LIKE wildcards in user input so they're treated as literals
function escapeLike(s) {
  return s.replace(/[%_\\]/g, '\\$&');
}

// Minimal normalise for the search query (no diacritic strip needed — name_norm already done)
function normQuery(s) {
  return s.trim().toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const { q, country = 'VN' } = req.query;
  const raw = (q || '').trim();
  if (raw.length < 2 || raw.length > 100) {
    return res.status(400).json({ error: 'query_invalid' });
  }

  const countryUC = (country || 'VN').toUpperCase();
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  // 1) Search local DB — match canonical_name OR name_norm (handles diacritics)
  const safeQ     = escapeLike(raw);
  const safeNormQ = escapeLike(normQuery(raw));

  const { data: dbRows } = await supabase
    .from('entities')
    .select('id, canonical_name, tax_id, country_code, company_reports(slug)')
    .eq('type', 'company')
    .eq('country_code', countryUC)
    .or(`canonical_name.ilike.%${safeQ}%,name_norm.ilike.%${safeNormQ}%`)
    .limit(5);

  const dbHits = (dbRows || []).map(e => ({
    name: e.canonical_name,
    tax_id: e.tax_id || '',
    country: e.country_code,
    slug: e.company_reports?.slug || null,
    source: 'db',
  }));

  // 2) If fewer than 3 DB hits, call OpenCorporates for additional suggestions
  let ocHits = [];
  if (dbHits.length < 3) {
    const jCode = OC_JURISDICTION[countryUC];
    if (jCode) {
      try {
        const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(raw)}&jurisdiction_code=${jCode}&per_page=5`;
        const ocRes = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(4000),
        });
        if (ocRes.ok) {
          const data = await ocRes.json();
          const companies = data?.results?.companies || [];
          ocHits = companies
            .filter(c => c?.company?.name)
            .map(c => ({
              name: c.company.name,
              tax_id: c.company.company_number || '',
              country: countryUC,
              slug: null,
              source: 'opencorporates',
            }));
        }
      } catch (_) { /* network error or timeout — silently skip OC */ }
    }
  }

  // 3) Merge: DB first, then OC (skip OC entries whose tax_id already in DB)
  const dbTaxIds = new Set(dbHits.map(h => h.tax_id).filter(Boolean));
  const merged = [
    ...dbHits,
    ...ocHits.filter(h => !h.tax_id || !dbTaxIds.has(h.tax_id)),
  ].slice(0, 5);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ suggestions: merged });
}
