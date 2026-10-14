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


// Download file names (owner, 2026-10-14; docs/naming_convention.md → "File names"):
//   "<report title>_<LOCALE>_<Mon-YYYY>.<ext>", e.g. "Vietnam banking 2026 - trends and outlook_EN_Oct-2026.pdf".
// The title is the English title in every language (plain ASCII in every browser), the month is the publish month.
// Exhibit downloads add a tag after the title ("... - exhibits_EN_Oct-2026.xlsx").
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The parts of the name for one report: English title and the publish date of the language being delivered
// (falls back to the English edition, then to the report's own date).
export async function nameParts(reportId, locale = 'en') {
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  const get = async (path) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: h }); return r.ok ? r.json() : []; };
  try {
    const [tr, base] = await Promise.all([
      get(`report_translations?report_id=eq.${reportId}&locale=in.(en,${locale})&select=locale,title,published_at`),
      get(`living_reports?id=eq.${reportId}&select=slug,published_at&limit=1`)
    ]);
    const en = tr.find((t) => t.locale === 'en'), own = tr.find((t) => t.locale === locale);
    return { title: (en && en.title) || (base[0] && base[0].slug) || 'KIRA report',
             publishedAt: (own && own.published_at) || (en && en.published_at) || (base[0] && base[0].published_at) || null };
  } catch { return { title: 'KIRA report', publishedAt: null }; }
}

export function downloadNameFor({ title, publishedAt }, locale, ext = 'pdf', tag = '') {
  const clean = String(title || 'KIRA report')
    .replace(/\s*[:\u2013\u2014]\s+/g, ' - ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/[^\x20-\x7E]+/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 110);
  const d = publishedAt ? new Date(publishedAt) : null;
  const when = d && !isNaN(d) ? `${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}` : '';
  return `${clean}${tag ? ' - ' + tag : ''}_${String(locale).toUpperCase()}${when ? '_' + when : ''}.${ext}`;
}
