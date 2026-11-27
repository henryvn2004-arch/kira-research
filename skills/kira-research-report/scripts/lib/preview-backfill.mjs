// Pure helpers for backfill-curated-preview.mjs --pending (no I/O, unit-tested in tests/preview-backfill.test.mjs).
export const MAX_UPLOAD_PAGES = 8;   // a curated preview is 4-7 pages + cover; anything above this is a whole report

const pageCount = html => (String(html).match(/<div[^>]*class="[^"]*\bpage\b[^"]*"/g) || []).length;
export const isCurated = html => /data-src-page="/.test(String(html || ''));

// Refuse to upload anything that is not a small, stamped preview.
export function guardUpload(html) {
  const n = pageCount(html);
  if (!isCurated(html)) return { ok: false, reason: 'output is not stamped (data-src-page missing)', pages: n };
  if (n < 1 || n > MAX_UPLOAD_PAGES) return { ok: false, reason: `output has ${n} pages (max ${MAX_UPLOAD_PAGES})`, pages: n };
  return { ok: true, pages: n };
}

// reports: [{id, slug, created_at}], curated: Map<reportId, Set<locale>> of locales already curated,
// locales: Map<reportId, locale[]> published locales. Newest first, at most n reports that still have an uncurated locale.
export function selectPending(reports, locales, curated, n) {
  return [...reports]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map(r => ({ ...r, todo: (locales.get(r.id) || ['en']).filter(l => !(curated.get(r.id) || new Set()).has(l)) }))
    .filter(r => r.todo.length)
    .slice(0, n);
}
