// ============================================================
// KIRA RESEARCH — api/admin-wikidata-seed.js
// Admin-only: bulk-seed entities + company_reports stubs from
// Wikidata SPARQL for any KIRA country, one page (500 rows) per call.
//
// POST /api/admin-wikidata-seed
// Body: { country: "VN", offset: 0 }
// Response: { imported, updated, skipped, total_this_page, next_offset, done }
//
// The admin panel chains calls automatically until done === true.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { normaliseName, makeSlug } from './_lib/company/normalize.js';
import { WIKIDATA_COUNTRY_QID } from './_lib/company/config.js';

export const config = { maxDuration: 60 };

const PAGE_SIZE    = 500;
const SPARQL_URL   = 'https://query.wikidata.org/sparql';
const UA           = 'KIRA Research Wikidata seeder (kiraresearch.com)';

// Country-specific Wikidata properties for tax/registration IDs
const TAX_ID_PROP = {
  VN: 'P2586',  // Mã số doanh nghiệp (Vietnamese enterprise code)
  AU: 'P3548',  // Australian Business Number
  SG: 'P4534',  // Singapore UEN
};

const COMPANY_TYPE_QIDS = [
  'wd:Q783794', 'wd:Q4830453', 'wd:Q891723', 'wd:Q2659904',
  'wd:Q47932634', 'wd:Q6881511', 'wd:Q1616075',
];

function buildSparql(countryQid, taxIdProp, offset) {
  const taxClause = taxIdProp
    ? `  OPTIONAL { ?company wdt:${taxIdProp} ?taxId }`
    : '';
  return `SELECT DISTINCT ?company ?companyLabel ?website ?inception ?taxId ?ticker ?description WHERE {
  VALUES ?ctype { ${COMPANY_TYPE_QIDS.join(' ')} }
  ?company wdt:P31 ?ctype .
  ?company wdt:P17 wd:${countryQid} .
  OPTIONAL { ?company wdt:P856 ?website }
  OPTIONAL { ?company wdt:P571 ?inception }
  OPTIONAL { ?company wdt:P249 ?ticker }
  OPTIONAL { ?company schema:description ?description . FILTER(LANG(?description) = "en") }
${taxClause}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
ORDER BY ?company
LIMIT ${PAGE_SIZE}
OFFSET ${offset}`;
}

function parseYear(v) {
  const m = String(v || '').match(/[+-]?(\d{4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y > 1800 && y <= new Date().getFullYear() ? y : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'unauthorized' });
  const allowed = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  if (!allowed.includes(user.email.toLowerCase())) return res.status(403).json({ error: 'forbidden' });

  const { country = 'VN', offset = 0 } = req.body || {};
  const COUNTRY    = country.toUpperCase();
  const countryQid = WIKIDATA_COUNTRY_QID[COUNTRY];
  if (!countryQid) return res.status(400).json({ error: 'unsupported_country' });

  const taxIdProp = TAX_ID_PROP[COUNTRY] || null;
  const pageOffset = parseInt(offset, 10) || 0;

  // ── 1. Fetch SPARQL page ────────────────────────────────────
  let sparqlRows;
  try {
    const sparqlRes = await fetch(
      `${SPARQL_URL}?query=${encodeURIComponent(buildSparql(countryQid, taxIdProp, pageOffset))}&format=json`,
      { headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA },
        signal: AbortSignal.timeout(25000) }
    );
    if (!sparqlRes.ok) throw new Error(`HTTP ${sparqlRes.status}`);
    sparqlRows = (await sparqlRes.json()).results?.bindings || [];
  } catch (err) {
    return res.status(200).json({ error: `sparql_failed: ${err.message}`, done: false, imported: 0 });
  }

  const done       = sparqlRows.length < PAGE_SIZE;
  const nextOffset = pageOffset + sparqlRows.length;

  // ── 2. Deduplicate + validate rows ─────────────────────────
  const seenQid = new Set();
  const valid   = [];
  for (const row of sparqlRows) {
    const qid  = row.company?.value?.split('/').pop();
    const name = row.companyLabel?.value;
    if (!qid || seenQid.has(qid) || !name || /^Q\d+$/.test(name)) continue;
    seenQid.add(qid);
    const taxId    = row.taxId?.value    || null;
    const website  = row.website?.value  || null;
    const foundYear= parseYear(row.inception?.value);
    // Skip rows with no data beyond name
    if (!taxId && !website && !foundYear) continue;
    valid.push({ qid, name, taxId, website, foundYear,
      ticker: row.ticker?.value || null,
      description: row.description?.value || null });
  }

  // ── 3. Load existing entities for fast dedup ───────────────
  const { data: existing } = await supabase
    .from('entities').select('id, tax_id, name_norm').eq('country_code', COUNTRY);
  const byTaxId = new Map((existing || []).filter(e => e.tax_id).map(e => [e.tax_id, e]));
  const byNorm  = new Map((existing || []).map(e => [e.name_norm, e]));

  // ── 4. Classify rows ───────────────────────────────────────
  const toEnrich   = [];  // { entityId, ...meta } — existing + newly inserted
  const insertRows = [];  // new entity records to batch-insert
  const insertMeta = [];  // parallel meta array
  const insertedNorms = new Set();
  let updated = 0, skipped = 0;

  for (const row of valid) {
    const nameNorm = normaliseName(row.name, COUNTRY);
    const match    = (row.taxId && byTaxId.get(row.taxId)) || byNorm.get(nameNorm);

    if (match) {
      if (row.taxId && !match.tax_id) {
        await supabase.from('entities').update({ tax_id: row.taxId }).eq('id', match.id);
        byTaxId.set(row.taxId, match);
      }
      toEnrich.push({ entityId: match.id, taxId: row.taxId || match.tax_id,
        name: row.name, ...row });
      updated++;
    } else {
      if (insertedNorms.has(nameNorm)) { skipped++; continue; }
      insertedNorms.add(nameNorm);
      insertRows.push({ canonical_name: row.name, name_norm: nameNorm,
        country_code: COUNTRY, tax_id: row.taxId || null,
        type: 'company', status_cache: 'active', last_enriched_at: null });
      insertMeta.push(row);
    }
  }

  // ── 5. Batch insert new entities ───────────────────────────
  let imported = 0;
  if (insertRows.length > 0) {
    const { data: inserted, error: insErr } = await supabase
      .from('entities').insert(insertRows).select('id, tax_id, name_norm');
    if (!insErr && inserted) {
      for (let i = 0; i < inserted.length; i++) {
        const ent  = inserted[i];
        const meta = insertMeta[i];
        toEnrich.push({ entityId: ent.id, taxId: ent.tax_id,
          name: insertRows[i].canonical_name, ...meta });
        byNorm.set(ent.name_norm, ent);
        if (ent.tax_id) byTaxId.set(ent.tax_id, ent);
        imported++;
      }
    }
  }

  // ── 6. Batch upsert company_reports stubs ─────────────────
  if (toEnrich.length > 0) {
    const stubs = toEnrich.map(e => ({
      entity_id:        e.entityId,
      slug:             makeSlug(e.name, e.taxId || `wd${e.qid}`, COUNTRY),
      payload:          null,
      pipeline_version: 0,
      updated_at:       new Date().toISOString(),
    }));
    await supabase.from('company_reports').upsert(stubs, { onConflict: 'entity_id' });
  }

  // ── 7. Batch upsert initial facts from SPARQL data ─────────
  const now   = new Date().toISOString();
  const facts = [];
  for (const e of toEnrich) {
    if (e.qid)         facts.push({ entity_id: e.entityId, key: 'wikidata_qid',  value: JSON.stringify(e.qid),         confidence: 1.0, observed_at: now });
    if (e.website)     facts.push({ entity_id: e.entityId, key: 'website',       value: JSON.stringify(e.website),     confidence: 0.9, observed_at: now });
    if (e.foundYear)   facts.push({ entity_id: e.entityId, key: 'founding_year', value: e.foundYear,                   confidence: 0.9, observed_at: now });
    if (e.ticker)      facts.push({ entity_id: e.entityId, key: 'stock_ticker',  value: JSON.stringify(e.ticker),      confidence: 0.9, observed_at: now });
    if (e.description) facts.push({ entity_id: e.entityId, key: 'description',   value: JSON.stringify(e.description), confidence: 0.9, observed_at: now });
  }
  if (facts.length > 0) {
    await supabase.from('facts').upsert(facts, { onConflict: 'entity_id,key' });
  }

  return res.status(200).json({
    total_this_page: valid.length,
    imported, updated, skipped, errors: 0,
    next_offset: nextOffset,
    done,
  });
}
