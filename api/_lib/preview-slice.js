// ============================================================
// KIRA RESEARCH — api/_lib/preview-slice.js
//
// Server-side lock on the free preview. Files in the 'reports-html' bucket are
// meant to be curated already (scripts/upload-html.mjs, rule in
// api/_lib/preview-pages.js), but some were uploaded whole. /api/preview-html
// runs every response through enforcePreview(), so a whole report cannot leave
// the server whatever the bucket holds, and a curated file cannot carry a
// decision page, Who's who or the closing page.
//
// limitPreviewPages() is kept as the entry point the API calls.
// ============================================================
import { enforcePreview } from './preview-pages.js';

export const PREVIEW_PAGES = 5;   // fallback size only (see FALLBACK_PAGES in preview-pages.js)

export function limitPreviewPages(html) {
  return enforcePreview(html);
}
