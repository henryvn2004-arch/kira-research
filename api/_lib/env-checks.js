// ============================================================
// KIRA RESEARCH — api/_lib/env-checks.js
// The environment variables the site depends on, and what breaks without them.
// Single source for /api/admin-health (full table) and /api/admin-stats
// ("Needs you today" warnings). Presence only; values are never exposed,
// except PAYPAL_MODE, which is a non-secret switch (sandbox / live).
// ============================================================

// level: critical = site or money breaks · important = a feature silently degrades · optional = nice to have
export const ENV_CHECKS = [
  ['SUPABASE_URL',         'critical',  'Everything: database access'],
  ['SUPABASE_SERVICE_KEY', 'critical',  'Everything: database access'],
  ['ADMIN_EMAILS',         'critical',  'Admin login (nobody can open /en/admin without it)'],
  ['PAYPAL_CLIENT_ID',     'critical',  'Checkout'],
  ['PAYPAL_CLIENT_SECRET', 'critical',  'Checkout'],
  ['PAYPAL_MODE',          'critical',  'Checkout: must read "live" in production', true],
  ['RESEND_API_KEY',       'critical',  'Purchase receipts, lead alerts, "report is ready" emails'],
  ['PDF_RENDER_SECRET',    'critical',  'PDF rendering for every report'],
  ['CRON_SECRET',          'important', 'Locks the daily notification cron against outside callers'],
  ['ANTHROPIC_API_KEY',    'important', 'Search: files product searches under an industry; Studio'],
  ['APP_URL',              'important', 'Links inside emails (falls back to kiraresearch.com)'],
  ['TAVILY_API_KEY',       'optional',  'Company enrichment web search'],
  ['SERPER_API_KEY',       'optional',  'Search provider'],
  ['EXA_API_KEY',          'optional',  'Search provider'],
  ['FIRECRAWL_API_KEY',    'optional',  'Page scraping'],
  ['INNGEST_EVENT_KEY',    'optional',  'Background job queue']
];

// Problems worth interrupting the owner for: a missing critical setting, or PayPal not in live mode.
export function envProblems(env = process.env) {
  const out = [];
  const missing = ENV_CHECKS.filter(([name, level]) => level === 'critical' && !env[name]).map(([name]) => name);
  if (missing.length) out.push({ key: 'env-missing', severity: 'high', label: `Missing critical site settings: ${missing.join(', ')}`, count: missing.length });
  if (env.PAYPAL_MODE && env.PAYPAL_MODE !== 'live') out.push({ key: 'paypal-mode', severity: 'high', label: `PayPal is in "${env.PAYPAL_MODE}" mode: real customers cannot pay`, count: 1 });
  return out;
}
