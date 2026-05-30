// ============================================================
// OpenCorporates connector — official registration data for ALL KIRA countries.
//
// Source: https://api.opencorporates.com/v0.4/companies/{jurisdiction}/{number}
// No API key required for basic lookups (~50 req/day free tier).
// Covers: VN, JP, KR, AU, SG, MY, ID, TH, PH, NZ
//
// Returns facts: registered_name, legal_status, address,
//                founding_year, sector, opencorporates_url
// ============================================================

import { emptyResult, failedResult } from '../connector.js';
import { OC_JURISDICTION } from '../config.js';

const OC_BASE = 'https://api.opencorporates.com/v0.4';

const STATUS_MAP = {
  'active':       'active',
  'dissolved':    'dissolved',
  'inactive':     'dissolved',
  'registered':   'active',
  'liquidation':  'dissolved',
  'suspended':    'suspended',
  'in liquidation': 'dissolved',
};

function mapStatus(raw) {
  if (!raw) return null;
  return STATUS_MAP[raw.toLowerCase().trim()] ?? null;
}

/**
 * @param {{ id: string, tax_id: string, canonical_name: string, country_code: string }} entity
 */
export async function fetch(entity, _ctx) {
  if (!entity.tax_id) return failedResult('no_tax_id');

  const country = (entity.country_code || 'VN').toUpperCase();
  const jCode = OC_JURISDICTION[country];
  if (!jCode) return failedResult(`unsupported_country_${country}`);

  let data;
  try {
    const res = await globalThis.fetch(
      `${OC_BASE}/companies/${jCode}/${encodeURIComponent(entity.tax_id)}`,
      {
        headers: { Accept: 'application/json', 'User-Agent': 'KIRA Research (kiraresearch.com)' },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (res.status === 404) return emptyResult('company_not_found');
    if (res.status === 429) return failedResult('rate_limited');
    if (!res.ok) return failedResult(`api_http_${res.status}`);
    const json = await res.json();
    const company = json?.results?.company;
    if (!company) return emptyResult('no_company_data');
    data = company;
  } catch (err) {
    if (err.name === 'TimeoutError') return failedResult('timeout');
    return failedResult(`fetch_error: ${err.message}`);
  }

  const facts = [];
  const now = new Date().toISOString();

  if (data.name && data.name.trim() !== entity.canonical_name) {
    facts.push({ key: 'registered_name', value: data.name.trim(), confidence: 0.95, observed_at: now });
  }

  const status = mapStatus(data.current_status);
  if (status) {
    facts.push({ key: 'legal_status', value: status, confidence: 0.95, observed_at: now });
  }

  const addr = data.registered_address?.in_full || data.registered_address_in_full;
  if (addr) {
    facts.push({ key: 'address', value: addr, confidence: 0.9, observed_at: now });
  }

  if (data.incorporation_date) {
    const year = parseInt(data.incorporation_date.slice(0, 4), 10);
    if (year > 1800 && year <= new Date().getFullYear()) {
      facts.push({ key: 'founding_year', value: year, confidence: 0.95, observed_at: now });
    }
  }

  if (data.industry_codes?.length > 0) {
    const desc = data.industry_codes[0]?.industry_code?.description;
    if (desc) facts.push({ key: 'sector', value: desc, confidence: 0.7, observed_at: now });
  }

  if (data.opencorporates_url) {
    facts.push({ key: 'opencorporates_url', value: data.opencorporates_url, confidence: 1.0, observed_at: now });
  }

  return {
    facts,
    edges: [],
    raw: data,
    coverage_status: facts.length > 0 ? 'found' : 'checked_empty',
  };
}
