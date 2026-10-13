// ============================================================
// KIRA RESEARCH — api/_lib/pricing.js
// One place for the single-report price used when a report row has none (S19, 2026-10-12).
// The price actually charged always comes from living_reports.price (set at publish).
// ============================================================

export const REPORT_PRICE_DEFAULT = 49;
export const TRANSCRIPT_PRICE = 29;
export const SUBSCRIPTION_MONTH_PRICE = 149;   // Month plan: whole library online + transcripts + subscription.pdf_per_month PDF downloads per month
export const SUBSCRIPTION_YEAR_PRICE = 1190;   // Annual plan: the same, with subscription.pdf_per_year PDF downloads per year (S7b)
