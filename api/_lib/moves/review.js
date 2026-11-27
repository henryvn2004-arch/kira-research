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

// Aggregator redirects (never a publisher's own article) and the BizDirect press bridge rules (owner 2026-11-27).
export const BRIDGE_SOURCE = 'bizdirect_press';
const hostOf = (u) => { try { return new URL(String(u)).hostname.toLowerCase().replace(/^www\./, ''); } catch (_e) { return ''; } };
export function isAggregatorUrl(u) { const h = hostOf(u); return h === 'google.com' || h.endsWith('.google.com') || h === 'feedproxy.google.com'; }
// "English" title: few letters outside ASCII AND common English words present (Vietnamese / Indonesian use Latin letters, so script checks alone pass them).
const EN_WORDS = new Set(['the', 'of', 'in', 'to', 'and', 'for', 'a', 'an', 'is', 'on', 'with', 'at', 'by', 'from', 'as', 'its', 'new', 'plans', 'will', 'opens',
  'open', 'into', 'launches', 'acquires', 'invests', 'expands', 'says', 'has', 'have', 'are', 'be', 'that', 'this', 'after', 'over', 'up', 'us', 'it', 'or',
  'their', 'more', 'first', 'million', 'billion', 'plant', 'factory', 'investment', 'market']);
export function isEnglishTitle(t) {
  const words = String(t || '').toLowerCase().match(/\p{L}+/gu) || [];
  const letters = String(t || '').match(/\p{L}/gu) || [];
  if (!letters.length || words.length < 3) return false;
  if (letters.filter((c) => c.charCodeAt(0) > 127).length / letters.length > 0.1) return false;
  const hits = words.filter((w) => EN_WORDS.has(w)).length;
  return hits >= 2 && hits / words.length >= 0.15;
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
  if (isAggregatorUrl(row.url) || /(^|\.)google\./i.test(String(row.domain || ''))) return { ok: false, error: 'aggregator_url' };
  if (row.domain) {
    const dom = String(row.domain).toLowerCase().replace(/^www\./, ''), h = hostOf(row.url);
    if (h && h !== dom && !h.endsWith('.' + dom)) return { ok: false, error: 'url_domain_mismatch' };
  }
  if (row.source_key === BRIDGE_SOURCE) {
    if (!isEnglishTitle(row.title)) return { ok: false, error: 'title_not_english' };
    const hq = up(row.raw && row.raw.hq_country);
    if (!hq) return { ok: false, error: 'hq_country_missing' };
    if (investor !== hq) return { ok: false, error: 'investor_mismatch_hq' };
  }
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
