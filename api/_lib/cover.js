// Cover image URLs for a report or insight row (migration 026).
// cover_url points at <slug>.jpg?v=..; the 800x500 crop sits next to it as
// <slug>-wide.jpg with the same version; <slug>-sm.jpg (228x304) is the small
// list thumbnail. With a locale, slide is the rendered cover slide (title and all,
// 800x450) as <slug>-slide-<locale>.jpg and og is the 1200x630 link-preview version
// (<slug>-og-<locale>.jpg), both written by upload-cover-slide.mjs; they may be
// missing, so callers fall back (list: wide, link preview: full). Returns null when
// there is no cover.
export function coverUrls(row, locale) {
  if (!row || !row.cover_url) return null;
  const urls = {
    full:  row.cover_url,
    thumb: row.cover_thumb_url || row.cover_url,
    sm:    (row.cover_thumb_url || '').replace(/-thumb\.jpg(\?|$)/, '-sm.jpg$1') || row.cover_url,
    wide:  row.cover_url.replace(/\.jpg(\?|$)/, '-wide.jpg$1')
  };
  if (locale) {
    urls.slide = row.cover_url.replace(/\.jpg(\?|$)/, `-slide-${locale}.jpg$1`);
    urls.og    = row.cover_url.replace(/\.jpg(\?|$)/, `-og-${locale}.jpg$1`);
  }
  return urls;
}

// Insights: slide is the insight's own cover slide (its title and excerpt on the report cover look,
// 800x450) at covers/insights/<slug>-slide-<locale>.jpg, written by upload-insight-slide.mjs.
// It is NOT derived from cover_url, which for most insights is the linked report's cover.
// The file may be missing, so cards fall back to wide.
export function insightCoverUrls(row, locale) {
  const urls = coverUrls(row);
  if (urls && locale && row.slug) urls.slide = row.cover_url.replace(/\/covers\/.*$/, `/covers/insights/${row.slug}-slide-${locale}.jpg`);
  return urls;
}
