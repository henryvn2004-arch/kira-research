// ============================================================
// KIRA RESEARCH — api/_lib/pricing.js
// One place for every price rule (owner decisions 2026-11-27, stage 0).
// Items are sold one by one; the price follows the effort in the item:
//   report      = (18 + 0.8*pages + 0.5*exhibits) * rarity * freshness, clamp 31..78
//   transcript  = (9 + 0.35*printed_pages) * rarity, clamp 14..28
//   company list = 6 + 11*log10(companies), clamp 18..38
// All prices are whole US dollars and never end in 9 (a 9 becomes an 8).
// The price actually charged for a report is living_reports.price and for a transcript
// expert_transcripts.price (both set from these rules at publish / by migration 079);
// company-list prices are computed on every read with listPrice().
// The SQL twin of these rules is in supabase/migrations/079_effort_prices.sql: change both together.
// ============================================================

// Whole dollars, never ending in 9.
export function noNine(n) {
  const p = Math.round(n);
  return p % 10 === 9 ? p - 1 : p;
}
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
// Remove float noise so a value like 40.4999999 rounds as 40.5 would.
const rnd = (x) => Math.round(Math.round(x * 1e6) / 1e6);

export const REPORT_PRICE_MIN = 31;
export const REPORT_PRICE_MAX = 78;
export const REPORT_PRICE_DEFAULT = 45;            // used only when a report row has no price at all
export const RARITY_MIN = 1.0;
export const RARITY_MAX = 1.3;

// Chart count when the report has no exhibit data: about 0.55 per page.
export const estimateExhibits = (pages) => Math.round(Number(pages || 0) * 0.55);

// publishedAt: Date | ISO string | null (null → fresh). now is injectable for tests.
export function freshness(publishedAt, now = new Date()) {
  if (!publishedAt) return 1.0;
  const t = new Date(publishedAt).getTime();
  if (!Number.isFinite(t)) return 1.0;
  const months = (new Date(now).getTime() - t) / (30.4375 * 86400000);
  return months < 6 ? 1.0 : months < 12 ? 0.9 : 0.8;
}

export function reportPrice({ pages, exhibits = null, rarity = 1.0, publishedAt = null, now = new Date() }) {
  const p = Number(pages) > 0 ? Number(pages) : 0;
  const e = exhibits == null || !(Number(exhibits) >= 0) ? estimateExhibits(p) : Number(exhibits);
  const r = clamp(Number(rarity) || 1.0, RARITY_MIN, RARITY_MAX);
  const raw = (18 + 0.8 * p + 0.5 * e) * r * freshness(publishedAt, now);
  return noNine(clamp(rnd(raw), REPORT_PRICE_MIN, REPORT_PRICE_MAX));
}

export const TRANSCRIPT_PRICE_MIN = 14;
export const TRANSCRIPT_PRICE_MAX = 28;
export const TRANSCRIPT_PRICE_DEFAULT = 14;        // used only when a transcript row has no price
export const TRANSCRIPT_PRICE_RANGE = `${TRANSCRIPT_PRICE_MIN}–${TRANSCRIPT_PRICE_MAX}`;
// Printed pages: from a word count (450 words a page) or from a "≈ 25 min read" label (238 words a minute).
export const pagesFromWords = (words) => Number(words) / 450;
export const pagesFromReadMinutes = (min) => (Number(min) * 238) / 450;
export function transcriptPrice({ printedPages, rarity = 1.0 }) {
  const r = clamp(Number(rarity) || 1.0, RARITY_MIN, RARITY_MAX);
  const raw = (9 + 0.35 * (Number(printedPages) || 0)) * r;
  return noNine(clamp(rnd(raw), TRANSCRIPT_PRICE_MIN, TRANSCRIPT_PRICE_MAX));
}
// Row of expert_transcripts (price set by migration 079); a row without one gets the floor.
export const transcriptPriceOf = (row) => (row && Number(row.price) > 0 ? Number(row.price) : TRANSCRIPT_PRICE_DEFAULT);

// Market-map company lists (Excel). Computed from the map's company count on every read.
export const LIST_PRICE_MIN = 18;
export const LIST_PRICE_MAX = 38;
export const LIST_SMALL_MAX = 500;                 // the lists hub uses this edge for its size bands
export function listPrice(n) {
  const c = Math.max(1, Number(n) || 1);
  return noNine(clamp(rnd(6 + 11 * Math.log10(c)), LIST_PRICE_MIN, LIST_PRICE_MAX));
}

// Licence tiers at checkout (owner 2026-11-27): single person = base, team (up to 10 people of one company) x1.8,
// company-wide x2.6. Whole dollars, never ending in 9.
export const LICENCE_MULTIPLIER = { single: 1, team: 1.8, company: 2.6 };
export function licencePrice(base, tier = 'single') {
  const m = LICENCE_MULTIPLIER[tier];
  if (!m) throw new Error('bad_licence_tier');
  return tier === 'single' ? Number(base) : noNine(rnd(Number(base) * m));
}

// "from $X" ranges for pages that show a price before an item is chosen (computed from data by the caller).
export const fromPrice = (prices) => {
  const v = (prices || []).map(Number).filter((x) => x > 0);
  return v.length ? Math.min(...v) : null;
};

// Subscriptions are no longer on sale (owner 2026-11-27); the numbers stay for existing subscribers' billing.
export const SUBSCRIPTION_MONTH_PRICE = 149;
export const SUBSCRIPTION_YEAR_PRICE = 1190;
