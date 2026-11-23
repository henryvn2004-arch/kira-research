// Kira Data (D4): code guards for the Routine's review of draft company moves (scripts/review-moves.mjs).
// The Routine session decides (publish / reject + reason); these checks decide whether a "publish" may go through.
// Pure functions, no I/O, so tests/review-moves.test.mjs can run them.

import { HOSTS, COUNTRY_CODES } from './rules.js';

export const TYPES = ['acquisition', 'stake', 'investment', 'plant', 'jv', 'subsidiary', 'expansion', 'exit', 'other'];
export const DUP_DAYS = 60;

// A company name as the dedupe key: lower case, no punctuation, no legal suffix.
export function companyKey(name) {
  return String(name || '').toLowerCase()
    .replace(/\b(co\.?,? ?ltd\.?|ltd\.?|limited|inc\.?|corp\.?|corporation|pte\.?|pvt\.?|plc|llc|gmbh|group|holdings?|company|jsc|sdn\.? ?bhd\.?|tbk|bhd)\b/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function isHttpUrl(u) {
  try { const x = new URL(String(u)); return x.protocol === 'http:' || x.protocol === 'https:'; } catch (_e) { return false; }
}

const days = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;

/**
 * Decide one draft.
 *   row        the draft as stored (id, url, title, company, investor_country, host_country, type, event_date, raw)
 *   decision   { id, decision: 'publish' | 'reject', reason, company?, investor_country?, host_country?, type? }
 *   published  published company_events (id, company, host_country, type, event_date) to check repeats against
 * → { ok: true, patch } | { ok: false, error }
 * A reject only needs a reason. A publish must pass every guard; the decision may fill company / countries / type.
 */
export function checkDecision(row, decision, published = [], now = new Date()) {
  if (!row || row.status !== 'draft') return { ok: false, error: 'not_a_draft' };
  const d = decision || {};
  const verdict = d.decision === 'publish' || d.decision === 'reject' ? d.decision : null;
  if (!verdict) return { ok: false, error: 'bad_decision' };
  const reason = String(d.reason || '').trim().slice(0, 400);
  if (!reason) return { ok: false, error: 'reason_required' };
  const at = now.toISOString();
  const review = { decision: verdict, reason, at };
  const base = { reviewed_at: at, reviewed_by: 'routine', raw: { ...(row.raw || {}), review } };
  if (verdict === 'reject') return { ok: true, patch: { ...base, status: 'rejected' } };

  const up = (v) => (v ? String(v).trim().toUpperCase() : null);
  const company = String(d.company !== undefined ? d.company : (row.company || '')).trim().slice(0, 200);
  const investor = up(d.investor_country !== undefined ? d.investor_country : row.investor_country);
  const host = up(d.host_country !== undefined ? d.host_country : row.host_country);
  const type = d.type !== undefined ? d.type : row.type;

  if (!isHttpUrl(row.url)) return { ok: false, error: 'bad_url' };
  if (company.length < 2 || !/[\p{L}\p{N}]/u.test(company)) return { ok: false, error: 'company_required' };
  if (!host || !HOSTS.includes(host)) return { ok: false, error: 'host_not_a_market' };
  if (!investor || !COUNTRY_CODES.includes(investor)) return { ok: false, error: 'investor_unknown' };
  if (investor === host) return { ok: false, error: 'domestic_company' };
  if (!TYPES.includes(type)) return { ok: false, error: 'bad_type' };

  const key = companyKey(company);
  const twin = published.find((p) => p.id !== row.id && p.host_country === host && p.type === type && companyKey(p.company) === key
    && days(p.event_date, row.event_date) <= DUP_DAYS);
  if (twin) return { ok: true, duplicate_of: twin.id, patch: { ...base, status: 'rejected', raw: { ...base.raw, review: { ...review, reason: `duplicate of #${twin.id}: ${reason}`.slice(0, 400) } } } };

  return { ok: true, patch: { ...base, status: 'published', company, investor_country: investor, host_country: host, type } };
}
