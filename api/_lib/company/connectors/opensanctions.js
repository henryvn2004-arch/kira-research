// ============================================================
// OpenSanctions connector — sanctions + PEP screening for all countries.
//
// Source: https://api.opensanctions.org/search/default
// No API key required for basic use (10 req/min free tier).
// Set OPENSANCTIONS_API_KEY env var for higher limits.
//
// Checks against 100+ databases: OFAC, UN, EU, Interpol, local
// blacklists, and PEP (Politically Exposed Persons) lists.
//
// Facts returned:
//   sanctions_status  "clear" | "found"
//   sanctions_matches  array of match objects (only when found)
//
// TTL: 30 days — watchlists update regularly.
// ============================================================

import { emptyResult, failedResult } from '../connector.js';

const OS_BASE = 'https://api.opensanctions.org';
const UA      = 'KIRA Research due-diligence enrichment (kiraresearch.com)';

// Datasets that indicate serious sanctions (vs. informational PEP lists)
const SANCTIONS_DATASETS = new Set([
  'us_ofac_sdn', 'us_ofac_cons', 'us_bis_denied', 'us_bis_unverified',
  'un_sc_sanctions',
  'eu_fsf', 'eu_cor_restrictive', 'eu_eeas_fsfp',
  'gb_hmt_sanctions', 'ch_seco_sanctions', 'au_dfat_sanctions',
  'sg_mas_sanctions', 'jp_meti_sanctions', 'kr_mofat_sanctions',
  'interpol_red_notices',
]);

function datasetLabel(id) {
  const MAP = {
    us_ofac_sdn:       'OFAC SDN (USA)',
    us_ofac_cons:      'OFAC Consolidated (USA)',
    un_sc_sanctions:   'UN Security Council',
    eu_fsf:            'EU Financial Sanctions',
    eu_cor_restrictive:'EU Restrictive Measures',
    gb_hmt_sanctions:  'HM Treasury (UK)',
    ch_seco_sanctions: 'SECO (Switzerland)',
    au_dfat_sanctions: 'DFAT (Australia)',
    sg_mas_sanctions:  'MAS (Singapore)',
    jp_meti_sanctions: 'METI (Japan)',
    interpol_red_notices: 'Interpol Red Notice',
    everypolitician:   'PEP – Politician',
    wd_pep:            'PEP – Wikidata',
  };
  return MAP[id] || id.replace(/_/g, ' ').toUpperCase();
}

export async function fetch(entity, _ctx) {
  const name    = entity.canonical_name;
  const country = (entity.country_code || '').toLowerCase();

  const params = new URLSearchParams({
    q:      name,
    schema: 'Organization',
    limit:  '5',
  });
  if (country) params.set('countries', country);

  const headers = {
    Accept:      'application/json',
    'User-Agent': UA,
  };
  if (process.env.OPENSANCTIONS_API_KEY) {
    headers['Authorization'] = `ApiKey ${process.env.OPENSANCTIONS_API_KEY}`;
  }

  let json;
  try {
    const res = await globalThis.fetch(`${OS_BASE}/search/default?${params}`, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 429) return failedResult('rate_limited');
    if (!res.ok)            return failedResult(`os_http_${res.status}`);
    json = await res.json();
  } catch (err) {
    if (err.name === 'TimeoutError') return failedResult('timeout');
    return failedResult(`os_fetch_error: ${err.message}`);
  }

  const results = json.results || [];
  if (results.length === 0) return emptyResult('no_results');

  // High-confidence matches only (score >= 0.80)
  const matches = results
    .filter(r => (r.score || 0) >= 0.80)
    .map(r => ({
      id:       r.id,
      name:     r.caption || name,
      datasets: (r.datasets || []).slice(0, 3),
      score:    Math.round((r.score || 0) * 100) / 100,
      url:      `https://www.opensanctions.org/entities/${r.id}/`,
      is_sanctions: (r.datasets || []).some(d => SANCTIONS_DATASETS.has(d)),
      dataset_labels: (r.datasets || []).slice(0, 3).map(datasetLabel),
    }));

  const now   = new Date().toISOString();
  const facts = [];

  if (matches.length === 0) {
    facts.push({ key: 'sanctions_status', value: 'clear', confidence: 1.0, observed_at: now });
  } else {
    facts.push({ key: 'sanctions_status', value: 'found',   confidence: 1.0, observed_at: now });
    facts.push({ key: 'sanctions_matches', value: matches,  confidence: 1.0, observed_at: now });
  }

  return {
    facts,
    edges:          [],
    raw:            { total: json.total?.value, high_conf: matches.length },
    coverage_status: 'found',
  };
}
