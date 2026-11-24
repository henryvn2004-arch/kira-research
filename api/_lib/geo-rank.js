// ============================================================
// KIRA RESEARCH — api/_lib/geo-rank.js
// Which answers are KIRA's own figures, and in what order they are shown.
// An AI engine cites a page for a number only when it cannot get the number from the primary source.
// World Bank, customs and central-bank figures are cited at their source; KIRA estimates and field research are
// found nowhere else, so they go first on every hub, report block and in the feed.
//   estimate  primary_source "Kira estimates" (the report's [Kira estimates] tag): our own figure with our method
//   field     transcript answers and "KIRA field ..." sources: practitioner knowledge from our interviews
//   third     a figure from an outside source that the report cites
//   econ      Kira Data series (the same public statistics, printed from the source)
// ============================================================
export const TIER = { estimate: 0, field: 1, third: 2, econ: 3 };

export function ownKind(a) {
  const ps = String((a && a.primary_source) || '');
  if (/^kira['’]?s? estimate/i.test(ps)) return 'estimate';
  if (a && (a.source_kind === 'transcript' || /^kira field/i.test(ps))) return 'field';
  if (a && a.source_kind === 'econ') return 'econ';
  return 'third';
}
export const isEstimate = (a) => ownKind(a) === 'estimate';
export const isOwn = (a) => { const k = ownKind(a); return k === 'estimate' || k === 'field'; };

// Stable: inside a tier the incoming order (newest year first) is kept.
export function rankAnswers(list) {
  return list.map((a, i) => ({ a, i, t: TIER[ownKind(a)] })).sort((x, y) => x.t - y.t || x.i - y.i).map((x) => x.a);
}
