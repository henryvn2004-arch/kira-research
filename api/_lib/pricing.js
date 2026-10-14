// ============================================================
// KIRA RESEARCH — api/_lib/pricing.js
// One place for the single-report price used when a report row has none (S19, 2026-10-12).
// The price actually charged always comes from living_reports.price (set at publish).
// ============================================================

export const REPORT_PRICE_DEFAULT = 49;
// Single reports are priced by length (owner, 2026-10-14): one flat $49 for a 12-page and a 45-page report looked odd.
export const REPORT_PRICE_MIN = 39;
export const REPORT_PRICE_MAX = 49;
export const REPORT_PRICE_RANGE = `${REPORT_PRICE_MIN}–${REPORT_PRICE_MAX}`;
// The rule (set at publish by skills/kira-research-report/scripts/build-publish-sql.mjs): under 20 pages $39, 20–29 pages $45, 30+ pages $49.
export const TRANSCRIPT_PRICE = 29;
export const SUBSCRIPTION_MONTH_PRICE = 149;   // Month plan: whole library online + transcripts + subscription.pdf_per_month PDF downloads per month
export const SUBSCRIPTION_YEAR_PRICE = 1190;   // Annual plan: the same, with subscription.pdf_per_year PDF downloads per year (S7b)
