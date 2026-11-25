// ============================================================
// KIRA RESEARCH — api/_lib/market-map/gate.js
// The index gate of a market map: at least 50 companies AND at least 2 stages (goods) or service
// types (services) holding 5 or more companies each. Used by the loader (column `indexable`) and
// again by the route, so a hand-edited row cannot open a thin page to search engines.
// ============================================================
export const MIN_COMPANIES = 50;
export const MIN_STAGE_COMPANIES = 5;
export const MIN_STAGES = 2;

export function isIndexable(stats) {
  if (!stats || typeof stats !== 'object') return false;
  const n = Number(stats.companies) || 0;
  const stages = Array.isArray(stats.stages) ? stats.stages : [];
  const deep = stages.filter((s) => Number(s.n) >= MIN_STAGE_COMPANIES).length;
  return n >= MIN_COMPANIES && deep >= MIN_STAGES;
}

// A translated commentary is CURRENT only when the commentary it was translated from is still the stored one:
// i18n[loc].src_built_at must equal commentary_built_at (compared as instants, so "+00:00" and "Z" spellings agree).
export function i18nCurrent(commentaryBuiltAt, srcBuiltAt) {
  if (!commentaryBuiltAt || !srcBuiltAt) return false;
  const a = Date.parse(commentaryBuiltAt), b = Date.parse(srcBuiltAt);
  return Number.isFinite(a) && a === b;
}
