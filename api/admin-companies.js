// ============================================================
// KIRA RESEARCH — api/admin-companies.js
// Admin read-only view of company intelligence coverage.
//
// Auth: Authorization: Bearer <supabase-jwt>; email must be in ADMIN_EMAILS.
//
//   GET /api/admin-companies              → { stats, companies }
//   GET /api/admin-companies?country=VN  → filter by country (default all)
//   GET /api/admin-companies?q=vingroup  → name search
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${m[1]}` }
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: (u.email || '').toLowerCase() } : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  // Auth gate
  const user = await verifyBearer(req);
  if (!user) return res.status(401).json({ error: 'unauthenticated' });
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email)) {
    return res.status(403).json({ error: 'not_admin' });
  }

  const url = new URL(req.url, `https://${req.headers.host || 'kiraresearch.com'}`);
  const country = (url.searchParams.get('country') || '').toUpperCase() || null;
  const q       = (url.searchParams.get('q') || '').toLowerCase().trim();

  try {
    // 1) Fetch all entities (companies)
    let entityPath = 'entities?type=eq.company&select=id,canonical_name,tax_id,country_code,status_cache&order=canonical_name.asc&limit=5000';
    if (country) entityPath += `&country_code=eq.${country}`;
    const entities = await sb(entityPath);

    const entityIds = entities.map(e => e.id);
    if (entityIds.length === 0) {
      return res.status(200).json({ stats: { total: 0, enriched: 0, with_narrative: 0 }, companies: [] });
    }

    // 2) Fetch facts (industry, sector) for all entities
    const factsRaw = await sb(
      `facts?entity_id=in.(${entityIds.join(',')})&key=in.(industry,sector,founding_year)&select=entity_id,key,value,confidence&order=confidence.desc`
    );
    const factsMap = {};
    for (const f of factsRaw) {
      if (!factsMap[f.entity_id]) factsMap[f.entity_id] = {};
      if (!factsMap[f.entity_id][f.key]) {
        factsMap[f.entity_id][f.key] = typeof f.value === 'string'
          ? f.value.replace(/^"|"$/g, '')
          : f.value;
      }
    }

    // 3) Fetch coverage for relevant source types
    const coverageRaw = await sb(
      `coverage?entity_id=in.(${entityIds.join(',')})&source_type=in.(opencorporates,wikidata,tavily,llm_narrative)&select=entity_id,source_type,status,checked_at`
    );
    const coverageMap = {};
    for (const c of coverageRaw) {
      if (!coverageMap[c.entity_id]) coverageMap[c.entity_id] = {};
      coverageMap[c.entity_id][c.source_type] = { status: c.status, checked_at: c.checked_at };
    }

    // 4) Fetch slugs + updated_at from company_reports
    const reportsRaw = await sb(
      `company_reports?entity_id=in.(${entityIds.join(',')})&select=entity_id,slug,updated_at`
    );
    const reportMap = {};
    for (const r of reportsRaw) reportMap[r.entity_id] = { slug: r.slug, updated_at: r.updated_at };

    // 5) Assemble + optional name filter
    let companies = entities.map(e => {
      const fm  = factsMap[e.id]    || {};
      const cov = coverageMap[e.id] || {};
      const rm  = reportMap[e.id]   || {};
      return {
        id:           e.id,
        name:         e.canonical_name,
        tax_id:       e.tax_id,
        country_code: e.country_code,
        status_cache: e.status_cache,
        slug:         rm.slug || null,
        updated_at:   rm.updated_at || null,
        industry:     fm.industry     || null,
        sector:       fm.sector       || null,
        founding_year: fm.founding_year != null ? Number(fm.founding_year) : null,
        coverage: {
          opencorporates: cov.opencorporates?.status  || null,
          wikidata:       cov.wikidata?.status        || null,
          tavily:         cov.tavily?.status          || null,
          llm_narrative:  cov.llm_narrative?.status   || null,
        },
      };
    });

    if (q) {
      companies = companies.filter(c => c.name.toLowerCase().includes(q) || (c.tax_id || '').includes(q));
    }

    // 6) Stats
    const enriched       = companies.filter(c => c.coverage.opencorporates === 'found' || c.coverage.wikidata === 'found' || c.coverage.tavily === 'found').length;
    const with_narrative = companies.filter(c => c.coverage.llm_narrative === 'found').length;

    return res.status(200).json({
      stats: {
        total:          companies.length,
        enriched,
        with_narrative,
      },
      companies,
    });

  } catch (err) {
    console.error('[admin-companies] error:', err?.message ?? err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
