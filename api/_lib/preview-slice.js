// ============================================================
// KIRA RESEARCH — api/_lib/preview-slice.js
//
// The free preview of a report is its first PREVIEW_PAGES pages. Files in the
// 'reports-html' bucket are meant to be sliced already (scripts/upload-html.mjs),
// but some were uploaded whole. /api/preview-html runs every response through
// here, so a whole report cannot leave the server whatever the bucket holds.
//
// Cuts at the start of the first page past the limit instead of walking the
// markup, so a malformed page cannot make it fail open.
// ============================================================

export const PREVIEW_PAGES = 5;

export function limitPreviewPages(html, max = PREVIEW_PAGES) {
  const pageOpen = /<(?:div|section)\s+class="page(?:\s[^"]*)?"[^>]*>/g;
  pageOpen.lastIndex = Math.max(html.search(/<body\b/i), 0);
  for (let seen = 0, m; (m = pageOpen.exec(html)); ) {
    if (++seen > max) return html.slice(0, m.index) + '\n</body>\n</html>\n';
  }
  return html;
}
