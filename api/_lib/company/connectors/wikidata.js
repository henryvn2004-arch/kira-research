// ============================================================
// Wikidata connector — structured knowledge graph enrichment for ALL countries.
//
// Sources: Wikidata MediaWiki API (search + entity fetch)
// No API key required. Wikidata policy: max 1 req/s; identify with User-Agent.
// TTL 180 days — entity data changes rarely.
//
// Strategy:
//   1. Search entity by canonical_name (MediaWiki wbsearchentities)
//   2. For each top candidate, verify P17 (country) matches expected QID
//   3. Extract facts: wikidata_qid, website, founding_year, employees, description
//   4. Resolve industry label if P452 present (one extra fetch)
// ============================================================

import { emptyResult, failedResult } from '../connector.js';
import { WIKIDATA_COUNTRY_QID } from '../config.js';

const WD_API    = 'https://www.wikidata.org/w/api.php';
const WD_ENTITY = 'https://www.wikidata.org/wiki/Special:EntityData';
const UA        = 'KIRA Research company enrichment (kiraresearch.com)';

// ── Wikidata helpers ──────────────────────────────────────────

async function wdFetch(url) {
  const res = await globalThis.fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`WD HTTP ${res.status}`);
  return res.json();
}

async function searchEntities(name) {
  const url = `${WD_API}?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&format=json&limit=5&origin=*`;
  const json = await wdFetch(url);
  return json.search || [];
}

async function fetchEntity(qid) {
  const json = await wdFetch(`${WD_ENTITY}/${qid}.json`);
  return json.entities?.[qid] || null;
}

async function resolveLabel(qid) {
  const url = `${WD_API}?action=wbgetentities&ids=${qid}&props=labels&languages=en&format=json&origin=*`;
  const json = await wdFetch(url);
  return json.entities?.[qid]?.labels?.en?.value || null;
}

function claimValue(claims, prop) {
  const snak = claims?.[prop]?.[0]?.mainsnak;
  if (!snak || snak.snaktype !== 'value') return null;
  return snak.datavalue?.value ?? null;
}

function entityIdClaim(claims, prop) {
  return claimValue(claims, prop)?.id || null;
}

function timeClaim(claims, prop) {
  return claimValue(claims, prop)?.time || null;
}

function quantityClaim(claims, prop) {
  const val = claimValue(claims, prop);
  return val?.amount != null ? parseFloat(val.amount) : null;
}

function stringClaim(claims, prop) {
  const val = claimValue(claims, prop);
  if (typeof val === 'string') return val;
  if (val?.text) return val.text;
  return null;
}

// ── Main connector ────────────────────────────────────────────

/**
 * @param {{ id: string, canonical_name: string, country_code: string }} entity
 */
export async function fetch(entity, _ctx) {
  const country = (entity.country_code || 'VN').toUpperCase();
  const expectedQid = WIKIDATA_COUNTRY_QID[country];
  if (!expectedQid) return failedResult(`unsupported_country_${country}`);

  let candidates;
  try {
    candidates = await searchEntities(entity.canonical_name);
  } catch (err) {
    if (err.name === 'TimeoutError') return failedResult('timeout');
    return failedResult(`search_error: ${err.message}`);
  }
  if (!candidates.length) return emptyResult('no_results');

  // Find candidate whose P17 (country) matches expected QID
  let entityData = null;
  for (const c of candidates.slice(0, 3)) {
    try {
      const ed = await fetchEntity(c.id);
      if (!ed) continue;
      const entityCountry = entityIdClaim(ed.claims, 'P17');
      if (entityCountry === expectedQid) { entityData = ed; break; }
    } catch (_) { continue; }
  }
  if (!entityData) return emptyResult('no_country_match');

  const claims = entityData.claims || {};
  const facts  = [];
  const now    = new Date().toISOString();

  // Wikidata QID — useful for future deep linking
  facts.push({ key: 'wikidata_qid', value: entityData.id, confidence: 1.0, observed_at: now });

  // English description (e.g. "Japanese multinational automotive manufacturer")
  const desc = entityData.descriptions?.en?.value;
  if (desc) facts.push({ key: 'description', value: desc, confidence: 0.9, observed_at: now });

  // Official website (P856)
  const website = stringClaim(claims, 'P856');
  if (website) facts.push({ key: 'website', value: website, confidence: 0.9, observed_at: now });

  // Inception date → founding_year (P571)
  const timeStr = timeClaim(claims, 'P571');
  if (timeStr) {
    const year = parseInt(timeStr.replace(/^[+-]/, '').slice(0, 4), 10);
    if (year > 1800 && year <= new Date().getFullYear()) {
      facts.push({ key: 'founding_year', value: year, confidence: 0.9, observed_at: now });
    }
  }

  // Number of employees (P1082)
  const employees = quantityClaim(claims, 'P1082');
  if (employees && employees > 0) {
    facts.push({ key: 'employees', value: Math.round(Math.abs(employees)), confidence: 0.8, observed_at: now });
  }

  // Industry label (P452) — resolve QID to human-readable label
  const industryQid = entityIdClaim(claims, 'P452');
  if (industryQid) {
    try {
      const industryLabel = await resolveLabel(industryQid);
      if (industryLabel) facts.push({ key: 'industry', value: industryLabel, confidence: 0.8, observed_at: now });
    } catch (_) { /* skip if label fetch fails */ }
  }

  // Total revenue (P2139) — stored as raw number in USD
  const revenue = quantityClaim(claims, 'P2139');
  if (revenue && revenue > 0) {
    facts.push({ key: 'revenue_usd', value: Math.round(Math.abs(revenue)), confidence: 0.75, observed_at: now });
  }

  return {
    facts,
    edges: [],
    raw: { id: entityData.id, label: entityData.labels?.en?.value },
    coverage_status: facts.length > 0 ? 'found' : 'checked_empty',
  };
}
