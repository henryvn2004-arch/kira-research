// Cover image URLs for a report or insight row (migration 026).
// cover_url points at <slug>.jpg?v=..; the 800x500 crop sits next to it as
// <slug>-wide.jpg with the same version; <slug>-sm.jpg (228x304) is the small
// list thumbnail. Returns null when there is no cover.
export function coverUrls(row) {
  if (!row || !row.cover_url) return null;
  return {
    full:  row.cover_url,
    thumb: row.cover_thumb_url || row.cover_url,
    sm:    (row.cover_thumb_url || '').replace(/-thumb\.jpg(\?|$)/, '-sm.jpg$1') || row.cover_url,
    wide:  row.cover_url.replace(/\.jpg(\?|$)/, '-wide.jpg$1')
  };
}
