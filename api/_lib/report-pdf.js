// ============================================================
// KIRA RESEARCH — api/_lib/report-pdf.js
// Shared by api/library-content.js (a buyer's PDF link) and api/library-pdf.js (a subscriber's counted
// download): turn a stored pdf_url into a short-lived signed link, and name the file the buyer saves.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const PDF_BUCKET           = 'reports-pdfs';
const PDF_SIGNED_TTL_SEC   = 3600;  // 1-hour signed URLs — long enough to download, short enough that leaks are short-lived.

// pdf_url can be:
//   • a full http(s) URL — used for aggregator-hosted PDFs, returned as-is.
//   • a storage path (e.g. "<uuid>/en.pdf") — resolved to a fresh signed URL.
//   • null/empty — returned as null so the UI shows "PDF is being prepared".
//
// downloadName (optional, 2026-05-25): when set, append "?download=<name>" to
// the signed URL. Supabase Storage then serves the file with
// Content-Disposition: attachment; filename=<name> — so the buyer's browser
// saves it as e.g. "Vietnam fintech 2026_EN.pdf" instead of the storage path's
// last segment ("en.pdf"). Aggregator-hosted URLs pass through unchanged.
export async function resolvePdfUrl(pdfUrl, downloadName) {
  if (!pdfUrl) return null;
  if (/^https?:\/\//i.test(pdfUrl)) return pdfUrl;

  try {
    const r = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/${PDF_BUCKET}/${pdfUrl}`,
      {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({ expiresIn: PDF_SIGNED_TTL_SEC })
      }
    );
    if (!r.ok) {
      console.error('[report-pdf] sign url failed:', r.status, await r.text());
      return null;
    }
    const { signedURL } = await r.json();
    if (!signedURL) return null;
    // signedURL is a relative path like "/object/sign/...?token=..." — prepend host.
    let url = `${SUPABASE_URL}/storage/v1${signedURL}`;
    if (downloadName) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}download=${encodeURIComponent(downloadName)}`;
    }
    return url;
  } catch (err) {
    console.error('[report-pdf] sign url error:', err.message);
    return null;
  }
}


// Download filename convention (docs/naming_convention.md): "KIRA_<code>_<Country-segment-year>_<LOCALE>.pdf".
// Reports without a code or segment fall back to the industry.
export function downloadNameFor(base, locale) {
  const stem = [base.country, base.segment || (base.industry || '').toLowerCase(), base.year].join(' ')
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  return `KIRA_${base.code ? base.code + '_' : ''}${stem}_${String(locale).toUpperCase()}.pdf`;
}
