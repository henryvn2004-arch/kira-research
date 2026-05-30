// ============================================================
// KIRA RESEARCH — api/company-list.js
// Company Intelligence: list seeded companies with basic facts.
//
// GET /api/company-list
//   ?country=VN          (default VN)
//   ?industry=Banking    (optional filter)
//   ?q=fpt               (optional name search)
//   ?page=1              (default 1, page size 50)
//
// Returns: { companies: [...], total, page, pages }
// Each company: { slug, name, tax_id, country_code, status_cache,
//                 industry, sector, founding_year, updated_at }
// ============================================================

import { createClient } from '@supabase/supabase-js';

const PAGE_SIZE = 50;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  const { country = 'VN', industry, q, page: pageStr } = req.query;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  try {
    // Base entity query
    let entityQ = supabase
      .from('entities')
      .select('id, canonical_name, tax_id, country_code, status_cache', { count: 'exact' })
      .eq('country_code', country.toUpperCase())
      .eq('type', 'company');

    if (q) {
      entityQ = entityQ.ilike('name_norm', `%${q.toLowerCase().trim()}%`);
    }

    const { data: entities, count, error: entErr } = await entityQ
      .order('canonical_name', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (entErr) throw entErr;
    if (!entities || entities.length === 0) {
      return res.status(200).json({ companies: [], total: 0, page, pages: 0 });
    }

    const entityIds = entities.map(e => e.id);

    // Fetch relevant facts (industry, sector, founding_year) for these entities
    const { data: facts } = await supabase
      .from('facts')
      .select('entity_id, key, value')
      .in('entity_id', entityIds)
      .in('key', ['industry', 'sector', 'founding_year'])
      .order('confidence', { ascending: false });

    // Fetch slugs from company_reports
    const { data: reports } = await supabase
      .from('company_reports')
      .select('entity_id, slug, updated_at')
      .in('entity_id', entityIds);

    // Build lookup maps
    const factsMap = {};
    for (const f of facts || []) {
      if (!factsMap[f.entity_id]) factsMap[f.entity_id] = {};
      // Keep first (highest confidence due to ordering)
      if (!factsMap[f.entity_id][f.key]) {
        factsMap[f.entity_id][f.key] = typeof f.value === 'string'
          ? f.value.replace(/^"|"$/g, '')  // strip JSON string quotes
          : f.value;
      }
    }

    const slugMap = {};
    for (const r of reports || []) {
      slugMap[r.entity_id] = { slug: r.slug, updated_at: r.updated_at };
    }

    // Assemble response
    let companies = entities.map(e => {
      const fm = factsMap[e.id] || {};
      const rm = slugMap[e.id] || {};
      return {
        slug:          rm.slug || null,
        name:          e.canonical_name,
        tax_id:        e.tax_id,
        country_code:  e.country_code,
        status_cache:  e.status_cache,
        industry:      fm.industry   || null,
        sector:        fm.sector     || null,
        founding_year: fm.founding_year != null ? Number(fm.founding_year) : null,
        updated_at:    rm.updated_at || null,
      };
    });

    // Client-side industry filter (easier than joining facts in SQL)
    if (industry) {
      const industryLow = industry.toLowerCase();
      companies = companies.filter(c =>
        c.industry && c.industry.toLowerCase() === industryLow
      );
    }

    const total = industry ? companies.length : (count || 0);
    const pages = Math.ceil(total / PAGE_SIZE);

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).json({ companies, total, page, pages });

  } catch (err) {
    console.error('[company-list] error:', err?.message ?? err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
