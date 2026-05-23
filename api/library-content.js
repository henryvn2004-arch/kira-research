// ============================================================
// KIRA RESEARCH — api/library-content.js
// JWT-gated full content delivery.
//
//   GET /api/library-content?slug=X&locale=Y
//   Authorization: Bearer <supabase-jwt>
//   → { full_content, pdf_url, title, eyebrow, toc, locale, ... }
//
// 401 if unauthenticated · 402 if not purchased · 404 if report missing.
// Tracks each successful delivery in `downloads` so we can show access
// counts to owners.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const PDF_BUCKET           = 'reports-pdfs';
const PDF_SIGNED_TTL_SEC   = 3600;  // 1-hour signed URLs — long enough to download, short enough that leaks are short-lived.

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' ? 'return=minimal' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// pdf_url can be:
//   • a full http(s) URL — used for aggregator-hosted PDFs, returned as-is.
//   • a storage path (e.g. "<uuid>/en.pdf") — resolved to a fresh signed URL.
//   • null/empty — returned as null so the UI shows "PDF is being prepared".
async function resolvePdfUrl(pdfUrl) {
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
      console.error('[library-content] sign url failed:', r.status, await r.text());
      return null;
    }
    const { signedURL } = await r.json();
    // signedURL is a relative path like "/object/sign/...?token=..." — prepend host.
    return signedURL ? `${SUPABASE_URL}/storage/v1${signedURL}` : null;
  } catch (err) {
    console.error('[library-content] sign url error:', err.message);
    return null;
  }
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${m[1]}` }
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: (u.email || '').toLowerCase() } : null;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
}

const LOCALES = new Set(['en','ja','ko']);

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  // 1) Auth.
  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  // 2) Inputs.
  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug   = url.searchParams.get('slug');
  const locale = LOCALES.has(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';
  if (!slug || !/^[a-z0-9][a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: 'bad_slug' });
    return;
  }

  try {
    // 3) Find the base report.
    //
    // Phase M.3: we do NOT filter by status here. Buyers who already paid
    // should keep accessing their purchased content even if the report is
    // later retired by an admin (delete-and-regen workflow, content takedown,
    // etc.). The `purchases` check below is the actual access gate. New
    // purchases ARE blocked at /api/library-buy by the published-status
    // filter, and /api/library-list/library-report also hide retired rows,
    // so retired reports become invisible to new buyers but still readable
    // by existing ones.
    const baseRows = await sb(
      `living_reports?slug=eq.${encodeURIComponent(slug)}` +
      `&select=id,slug,country,industry,year,pages,price,status&limit=1`
    );
    const base = Array.isArray(baseRows) ? baseRows[0] : null;
    if (!base) { res.status(404).json({ error: 'report_not_found' }); return; }

    // 4) Verify purchase. We accept "owned in any locale" — re-buying just for
    //    a language switch would be hostile UX given the same research.
    const purchases = await sb(
      `purchases?user_id=eq.${user.id}` +
      `&slug=eq.${encodeURIComponent(slug)}` +
      `&status=eq.completed&select=locale,created_at&limit=1`
    );
    if (!Array.isArray(purchases) || !purchases.length) {
      res.status(402).json({ error: 'not_purchased' });
      return;
    }

    // 5) Load translation for the requested locale (with EN fallback).
    const tRows = await sb(
      `report_translations?report_id=eq.${base.id}` +
      `&locale=eq.${locale}&status=eq.published&select=*&limit=1`
    );
    let translation = Array.isArray(tRows) ? tRows[0] : null;
    let effectiveLocale = locale;
    let isFallback = false;
    if (!translation && locale !== 'en') {
      const enRows = await sb(
        `report_translations?report_id=eq.${base.id}` +
        `&locale=eq.en&status=eq.published&select=*&limit=1`
      );
      translation = Array.isArray(enRows) ? enRows[0] : null;
      effectiveLocale = 'en';
      isFallback = !!translation;
    }
    if (!translation) {
      res.status(404).json({ error: 'translation_missing' });
      return;
    }

    // 6) Best-effort download tracking. Failures here must not block delivery.
    try {
      await sb('downloads', 'POST', {
        user_id:        user.id,
        report_id:      base.id,
        locale:         effectiveLocale,
        slug:           base.slug,
        delivered_at:   new Date().toISOString(),
        ua:             (req.headers['user-agent'] || '').slice(0, 500)
      });
    } catch {
      // Swallow — downloads table is optional infrastructure.
    }

    // Generate a short-lived signed URL when pdf_url is a storage path.
    // External URLs pass through. Best-effort: null on failure so the UI
    // shows the "PDF is being prepared" pending state instead of breaking.
    const signedPdfUrl = await resolvePdfUrl(translation.pdf_url);

    res.status(200).json({
      slug:           base.slug,
      country:        base.country,
      industry:       base.industry,
      year:           base.year,
      pages:          base.pages,
      price:          base.price,

      locale:         effectiveLocale,
      isFallback,

      title:          translation.title,
      eyebrow:        translation.eyebrow,
      preview:        translation.preview,
      toc:            translation.toc,
      full_content:   translation.full_content,
      pdf_url:        signedPdfUrl,

      ownedLocale:    purchases[0].locale,
      purchasedAt:    purchases[0].created_at
    });
  } catch (err) {
    console.error('[library-content] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
