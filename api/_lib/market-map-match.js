// ============================================================
// KIRA RESEARCH — api/_lib/market-map-match.js
// Pure matcher: a report or transcript -> the one market map (country slug + segment_key) it is about, or null.
// Same country first; then the words of the item (segment, keywords, industry / title) against the words of each map's segment key + title.
// A map matches only when (a) all its distinctive words are in the item and (b) it is the single best: a tie or a close second = null.
// "No link" beats "wrong link" (owner rule), so anything unclear returns null.
// ============================================================
const STOP = new Set(['and', 'of', 'the', 'for', 'in', 'a', 'an', 'to', 'other', 'services', 'service', 'market', 'industry', 'sector', 'products', 'product', 'general']);
export const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stem = (w) => (w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
export const words = (s) => new Set(String(s || '').toLowerCase().replace(/&/g, ' ').split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem));

// maps: [{ country, segment_key, title, l2_family }]; item: { country (name or slug), segment, keywords[], industry, title }
export function matchMarketMap(item, maps) {
  const cs = slugify(item.country);
  if (!cs) return null;
  const strong = words([item.segment, ...(item.keywords || [])].join(' '));
  const weak = words([item.industry, item.title].join(' '));
  const all = new Set([...strong, ...weak]);
  const scored = [];
  for (const m of maps) {
    if (m.country !== cs) continue;
    const mw = words(`${String(m.segment_key).replace(/-/g, ' ')} ${m.title}`);
    if (!mw.size) continue;
    const hit = [...mw].filter((w) => all.has(w));
    if (hit.length !== mw.size) continue;                       // every distinctive word of the map must be in the item
    const inStrong = [...mw].filter((w) => strong.has(w)).length;
    if (!inStrong) continue;                                    // and at least one in the segment / keywords, not only the industry
    scored.push({ m, score: mw.size * 2 + inStrong });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  if (scored.length > 1 && scored[1].score >= scored[0].score) return null;   // tie = ambiguous
  return { country: scored[0].m.country, segment_key: scored[0].m.segment_key };
}

// Top n maps of the item's own country, ranked by the number of words they share with the item (ties: shorter title first).
// Input for the Routine session, which picks exactly one or none. Maps with no shared word are left out.
export function suggestCandidates(item, maps, n = 25) {
  const cs = slugify(item.country);
  const iw = words([item.segment, ...(item.keywords || []), item.industry, item.title].join(' '));
  return maps.filter((m) => m.country === cs).map((m) => {
    const mw = words(`${String(m.segment_key).replace(/-/g, ' ')} ${m.title}`);
    return { segment_key: m.segment_key, title: m.title, shared: [...mw].filter((w) => iw.has(w)).length, len: mw.size };
  }).filter((x) => x.shared > 0).sort((a, b) => b.shared - a.shared || a.len - b.len).slice(0, n).map(({ segment_key, title, shared }) => ({ segment_key, title, shared }));
}

// Check a chosen segment before it is written: it must exist, be in the item's own country and be indexable. 'none' is always fine.
// Returns { ok: true, key: {country, segment_key} | null } or { ok: false, error }.
export function validateChoice(item, maps, segment) {
  if (segment === 'none') return { ok: true, key: null };
  const cs = slugify(item.country);
  const m = maps.find((x) => x.segment_key === segment && x.country === cs);
  if (!m) return { ok: false, error: maps.some((x) => x.segment_key === segment) ? 'wrong_country' : 'unknown_segment' };
  if (m.indexable !== true) return { ok: false, error: 'not_indexable' };
  return { ok: true, key: { country: m.country, segment_key: m.segment_key } };
}
