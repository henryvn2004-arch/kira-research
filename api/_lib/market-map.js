// Kira Data (D3): finds the segment_data_map row (migration 059) for a report or a topic.
// Order: the topic's level-2 industry slug, then its level-1 parent, then a keyword in the given texts, most
// specific text first (segment, title, then the broad industry name). Within one text the longest keyword wins,
// then the lower `ord`.

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function resolveProfile(map, { slug = null, parentSlug = null, texts = [] } = {}) {
  for (const s of [slug, parentSlug]) {
    if (!s) continue;
    const hit = map.filter((m) => (m.industry_slugs || []).includes(s)).sort((a, b) => a.ord - b.ord)[0];
    if (hit) return hit;
  }
  for (const t of texts) {
    const text = String(t || '').toLowerCase();
    if (!text) continue;
    let best = null;
    for (const m of map) {
      for (const kw of m.keywords || []) {
        if (!new RegExp(`(^|[^a-z0-9])${esc(kw)}(s|es)?($|[^a-z0-9])`).test(text)) continue;
        if (!best || kw.length > best.len || (kw.length === best.len && m.ord < best.row.ord)) best = { row: m, len: kw.length };
      }
    }
    if (best) return best.row;
  }
  return null;
}
