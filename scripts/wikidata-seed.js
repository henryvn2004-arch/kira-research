#!/usr/bin/env node
// ============================================================
// scripts/wikidata-seed.js
// Bulk-seeds entities + company_reports stubs from Wikidata SPARQL.
// Covers all 10 KIRA countries. Match by tax_id where Wikidata has
// a country-specific property, then fall back to normalised name.
//
// Usage:
//   node scripts/wikidata-seed.js --country=VN [--dry-run] [--limit=2000]
//
// Env (export before running, or pass via --env-file .env on Node >=20.6):
//   SUPABASE_URL          your project URL
//   SUPABASE_SERVICE_KEY  service-role key (bypasses RLS)
//
// Example:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/wikidata-seed.js --country=VN --dry-run
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { normaliseName, makeSlug } from '../api/_lib/company/normalize.js';
import { WIKIDATA_COUNTRY_QID } from '../api/_lib/company/config.js';

// ── CLI args ──────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => {
      const eq = a.indexOf('=');
      return eq === -1 ? [a.slice(2), true] : [a.slice(2, eq), a.slice(eq + 1)];
    })
);

const COUNTRY   = (args.country || 'VN').toUpperCase();
const DRY_RUN   = args['dry-run'] === true || args['dry-run'] === 'true';
const LIMIT     = Math.min(parseInt(args.limit || '2000', 10), 10000);
const PAGE_SIZE = 500;

// ── Wikidata tax-ID property per country ─────────────────────
// Countries without a dedicated Wikidata property fall back to name matching.
const TAX_ID_PROP = {
  VN: 'P2586',  // Mã số doanh nghiệp (Vietnamese enterprise code)
  AU: 'P3548',  // Australian Business Number
  SG: 'P4534',  // Singapore UEN
};

// Direct company-type QIDs (faster than property path wdt:P31/wdt:P279*)
const COMPANY_TYPE_QIDS = [
  'wd:Q783794',   // business enterprise
  'wd:Q4830453',  // public company
  'wd:Q891723',   // private company
  'wd:Q2659904',  // state-owned enterprise
  'wd:Q47932634', // joint stock company
  'wd:Q6881511',  // enterprise
  'wd:Q1616075',  // limited liability company
];

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'KIRA Research Wikidata seeder/1.0 (kiraresearch.com)';

// ── SPARQL ────────────────────────────────────────────────────

function buildQuery(countryQid, taxIdProp, offset) {
  const taxClause = taxIdProp
    ? `  OPTIONAL { ?company wdt:${taxIdProp} ?taxId }`
    : '';
  return `
SELECT DISTINCT ?company ?companyLabel ?website ?inception ?taxId ?ticker ?description WHERE {
  VALUES ?ctype { ${COMPANY_TYPE_QIDS.join(' ')} }
  ?company wdt:P31 ?ctype .
  ?company wdt:P17 wd:${countryQid} .
  OPTIONAL { ?company wdt:P856 ?website }
  OPTIONAL { ?company wdt:P571 ?inception }
  OPTIONAL { ?company wdt:P249 ?ticker }
  OPTIONAL {
    ?company schema:description ?description .
    FILTER(LANG(?description) = "en")
  }
${taxClause}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
}
ORDER BY ?company
LIMIT ${PAGE_SIZE}
OFFSET ${offset}`;
}

async function sparqlFetch(query) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query.trim())}&format=json`;
  const res = await fetch(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(35000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SPARQL ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.results?.bindings || [];
}

function val(binding) {
  return binding?.value ?? null;
}

function parseYear(timeStr) {
  if (!timeStr) return null;
  const m = String(timeStr).match(/[+-]?(\d{4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y > 1800 && y <= new Date().getFullYear() ? y : null;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const countryQid = WIKIDATA_COUNTRY_QID[COUNTRY];
  if (!countryQid) {
    console.error(`✗ Unsupported country: ${COUNTRY}`);
    console.error(`  Supported: ${Object.keys(WIKIDATA_COUNTRY_QID).join(', ')}`);
    process.exit(1);
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('✗ Missing env: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    process.exit(1);
  }

  const taxIdProp = TAX_ID_PROP[COUNTRY] || null;

  console.log('\n── Wikidata bulk seeder ───────────────────────────────');
  console.log(`   Country:      ${COUNTRY} (QID: ${countryQid})`);
  console.log(`   Tax-ID prop:  ${taxIdProp || 'none — name-match fallback'}`);
  console.log(`   Limit:        ${LIMIT}`);
  console.log(`   Mode:         ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log('───────────────────────────────────────────────────────\n');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  // Load existing DB entities for fast dedup
  process.stdout.write('Loading existing entities from DB… ');
  const { data: existing, error: dbErr } = await supabase
    .from('entities')
    .select('id, tax_id, name_norm')
    .eq('country_code', COUNTRY);
  if (dbErr) { console.error(`\n✗ DB error: ${dbErr.message}`); process.exit(1); }
  console.log(`${existing?.length ?? 0} found`);

  const byTaxId = new Map((existing || []).filter(e => e.tax_id).map(e => [e.tax_id, e]));
  const byNorm  = new Map((existing || []).map(e => [e.name_norm, e]));

  // Fetch pages from Wikidata SPARQL
  const allRows = [];
  let offset = 0;
  console.log('Fetching from Wikidata SPARQL:');
  while (allRows.length < LIMIT) {
    process.stdout.write(`  offset=${offset}… `);
    let rows;
    try {
      rows = await sparqlFetch(buildQuery(countryQid, taxIdProp, offset));
    } catch (err) {
      console.log(`✗ ${err.message}`);
      if (offset === 0) process.exit(1);
      break;
    }
    console.log(`${rows.length} rows`);
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    await new Promise(r => setTimeout(r, 1200)); // Wikidata rate limit: ~1 req/s
  }

  // Deduplicate by Wikidata entity URI
  const seenQid = new Set();
  const unique  = [];
  for (const row of allRows) {
    const qid = row.company?.value?.split('/').pop();
    if (qid && !seenQid.has(qid)) { seenQid.add(qid); unique.push(row); }
  }
  console.log(`\nUnique companies from SPARQL: ${unique.length}`);

  // Process
  const stats = { new: 0, updated: 0, skipped: 0, errors: 0 };
  const todo  = unique.slice(0, LIMIT);

  console.log(`Processing ${todo.length} companies…\n`);

  for (const row of todo) {
    const wdQid  = row.company?.value?.split('/').pop();
    const name   = val(row.companyLabel);
    if (!name || /^Q\d+$/.test(name)) { stats.skipped++; continue; } // no label

    const website   = val(row.website);
    const taxId     = val(row.taxId);
    const ticker    = val(row.ticker);
    const descr     = val(row.description);
    const foundYear = parseYear(val(row.inception));
    const nameNorm  = normaliseName(name, COUNTRY);

    // Resolve to existing entity
    let existing = null;
    if (taxId && byTaxId.has(taxId))   existing = byTaxId.get(taxId);
    else if (byNorm.has(nameNorm))      existing = byNorm.get(nameNorm);

    if (DRY_RUN) {
      const tag = existing ? 'match' : 'new  ';
      console.log(`  [${tag}] ${name}${taxId ? ` (${taxId})` : ''}`);
      stats[existing ? 'updated' : 'new']++;
      continue;
    }

    try {
      let entityId;

      if (existing) {
        // Update tax_id if we learned it from Wikidata
        if (taxId && !existing.tax_id) {
          await supabase.from('entities').update({ tax_id: taxId }).eq('id', existing.id);
          byTaxId.set(taxId, existing);
        }
        entityId = existing.id;
        stats.updated++;
      } else {
        // Require at least one data point beyond the name
        if (!taxId && !website && !foundYear) { stats.skipped++; continue; }

        const { data: newEnt, error: insErr } = await supabase
          .from('entities')
          .insert({
            canonical_name:   name,
            name_norm:        nameNorm,
            country_code:     COUNTRY,
            tax_id:           taxId || null,
            type:             'company',
            status_cache:     'active',
            last_enriched_at: null,
          })
          .select('id')
          .single();

        if (insErr) {
          if (insErr.code === '23505') { stats.skipped++; continue; } // dup key
          console.error(`  ✗ insert ${name}: ${insErr.message}`);
          stats.errors++;
          continue;
        }

        entityId = newEnt.id;
        byNorm.set(nameNorm, { id: entityId, tax_id: taxId, name_norm: nameNorm });
        if (taxId) byTaxId.set(taxId, { id: entityId, tax_id: taxId, name_norm: nameNorm });
        stats.new++;
      }

      // Upsert company_reports stub (pipeline_version=0 → triggers enrichment on page visit)
      const slugId = taxId || `wd${wdQid}`;
      const slug   = makeSlug(name, slugId, COUNTRY);
      await supabase.from('company_reports').upsert(
        { entity_id: entityId, slug, payload: null, pipeline_version: 0,
          updated_at: new Date().toISOString() },
        { onConflict: 'entity_id' }
      );

      // Seed initial facts from SPARQL data — avoids an extra Wikidata API call on first visit
      const now   = new Date().toISOString();
      const seeds = [
        wdQid    && { key: 'wikidata_qid',  value: JSON.stringify(wdQid),    confidence: 1.0 },
        website  && { key: 'website',       value: JSON.stringify(website),  confidence: 0.9 },
        foundYear&& { key: 'founding_year', value: foundYear,                confidence: 0.9 },
        ticker   && { key: 'stock_ticker',  value: JSON.stringify(ticker),   confidence: 0.9 },
        descr    && { key: 'description',   value: JSON.stringify(descr),    confidence: 0.9 },
      ].filter(Boolean);

      for (const f of seeds) {
        await supabase.from('facts').upsert(
          { entity_id: entityId, key: f.key, value: f.value,
            confidence: f.confidence, observed_at: now },
          { onConflict: 'entity_id,key' }
        );
      }

    } catch (err) {
      console.error(`  ✗ error ${name}: ${err.message}`);
      stats.errors++;
    }
  }

  console.log('\n── Results ─────────────────────────────────────────────');
  console.log(`   New entities:     ${stats.new}`);
  console.log(`   Updated (tax_id): ${stats.updated}`);
  console.log(`   Skipped:          ${stats.skipped}`);
  console.log(`   Errors:           ${stats.errors}`);
  if (DRY_RUN) console.log('\n   (dry run — nothing written to DB)');
  console.log('────────────────────────────────────────────────────────\n');
}

main().catch(err => { console.error(err); process.exit(1); });
