// ============================================================
// KIRA RESEARCH — api/preview-html.js
//
// Proxies the sliced preview HTML for a report from the private
// 'reports-html' Supabase Storage bucket back to the browser, so the
// /<locale>/reports/<slug> page can <iframe src> it with proper
// styling.
//
//   GET /api/preview-html?slug=vietnam-fintech-2026&locale=en
//
// Why a proxy and not a direct bucket URL:
//   Supabase Storage stamps public-bucket files with `Content-Type:
//   text/plain` and `Content-Security-Policy: default-src 'none'; sandbox`.
//   Those break the report styling (fonts blocked, scripts blocked).
//   The bucket is therefore PRIVATE and this endpoint serves the bytes
//   with `text/html` + no restrictive CSP.
//
// Falls back to the EN preview if the requested locale isn't published
// for that report (matches /api/library-report's behaviour).
//
// Caches at the CDN edge for 1h (preview content doesn't change after
// the report's published).
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'reports-html';
const SUPPORTED = new Set(['en', 'ja', 'ko']);

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  return res.json();
}

async function fetchObject(reportId, locale) {
  const r = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${reportId}/${locale}.html`,
    {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  return r;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug   = (url.searchParams.get('slug') || '').trim().slice(0, 200);
  const locale = SUPPORTED.has(url.searchParams.get('locale'))
    ? url.searchParams.get('locale')
    : 'en';

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: 'bad_slug' });
    return;
  }

  try {
    // Look up the report id by slug. Reject if not published.
    const rows = await sb(
      `living_reports?slug=eq.${encodeURIComponent(slug)}` +
      `&status=eq.published&select=id&limit=1`
    );
    const base = Array.isArray(rows) ? rows[0] : null;
    if (!base) {
      res.status(404).send('not_found');
      return;
    }

    // Try the requested locale first, then EN as a fallback. Stream the
    // first one that exists.
    let obj = await fetchObject(base.id, locale);
    if (!obj.ok && locale !== 'en') {
      obj = await fetchObject(base.id, 'en');
    }
    if (!obj.ok) {
      res.status(404).send('preview_not_available');
      return;
    }

    const buf = Buffer.from(await obj.arrayBuffer());
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Allow same-origin embedding (the parent /<locale>/reports/<slug>
    // is on the same host).
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.status(200).send(buf);
  } catch (err) {
    console.error('[preview-html] error:', err.message);
    res.status(500).send('server_error');
  }
}
