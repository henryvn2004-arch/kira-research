// ============================================================
// VN ĐKKD connector — fetches from VietQR business lookup API
//
// Source: https://api.vietqr.io/v2/business/{mst}
// No API key needed. Rate limit: ~10 req/s.
//
// Returns facts: legal_status, address, registered_name
// Does NOT return: charter_capital, founding_date
//   (those come from the masothue scraper — future sprint).
// ============================================================

import { emptyResult, failedResult } from '../connector.js';

const VIETQR_BASE = 'https://api.vietqr.io/v2/business';

// Map Vietnamese status strings to our canonical values
const STATUS_MAP = {
  'đang hoạt động':         'active',
  'hoạt động':              'active',
  'đang hoạt động (nộp thuế)': 'active',
  'tạm ngừng hoạt động':    'suspended',
  'đã đóng cửa':            'dissolved',
  'giải thể':               'dissolved',
  'phá sản':                'dissolved',
};

function mapStatus(raw) {
  if (!raw) return null;
  return STATUS_MAP[raw.toLowerCase().trim()] ?? null;
}

/**
 * @param {{ id: string, tax_id: string, canonical_name: string }} entity
 * @param {{ supabase: import('@supabase/supabase-js').SupabaseClient }} _ctx
 * @returns {Promise<import('../connector.js').ConnectorResult>}
 */
export async function fetch(entity, _ctx) {
  if (!entity.tax_id) {
    return failedResult('no_tax_id');
  }

  let data;
  try {
    const res = await globalThis.fetch(`${VIETQR_BASE}/${entity.tax_id}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      return emptyResult('mst_not_found');
    }
    if (!res.ok) {
      return failedResult(`api_http_${res.status}`);
    }

    const json = await res.json();
    // VietQR returns { code: "00", desc: "Thành công", data: { ... } }
    if (json.code !== '00' || !json.data) {
      return emptyResult('empty_response');
    }
    data = json.data;
  } catch (err) {
    if (err.name === 'TimeoutError') return failedResult('timeout');
    return failedResult(`fetch_error: ${err.message}`);
  }

  const facts = [];
  const now = new Date().toISOString();

  // Registered name — only save if it differs from canonical_name
  if (data.name && data.name.trim() !== entity.canonical_name) {
    facts.push({
      key: 'registered_name',
      value: data.name.trim(),
      confidence: 1.0,
      observed_at: now,
    });
  }

  // Address
  if (data.address) {
    facts.push({
      key: 'address',
      value: data.address.trim(),
      confidence: 1.0,
      observed_at: now,
    });
  }

  // Legal status (raw string — pipeline maps to status_cache separately)
  const rawStatus = data.status || null;
  if (rawStatus) {
    facts.push({
      key: 'legal_status',
      value: rawStatus,
      confidence: 1.0,
      observed_at: now,
    });
  }

  // Short/international name if present
  if (data.shortName) {
    facts.push({
      key: 'short_name',
      value: data.shortName,
      confidence: 1.0,
      observed_at: now,
    });
  }
  if (data.international) {
    facts.push({
      key: 'international_name',
      value: data.international,
      confidence: 1.0,
      observed_at: now,
    });
  }

  return {
    facts,
    edges: [],
    raw: data,
    coverage_status: facts.length > 0 ? 'found' : 'checked_empty',
    status_canonical: mapStatus(rawStatus),
  };
}
