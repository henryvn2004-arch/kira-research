// ============================================================
// KIRA RESEARCH — api/admin-upload-pdf.js
// Admin PDF upload to Supabase Storage.
//
//   POST /api/admin-upload-pdf
//   Authorization: Bearer <supabase-jwt>   (email must be in ADMIN_EMAILS)
//   Content-Type:  application/json
//   Body: { report_id: "<uuid>", locale: "en|ja|ko", filename: "report.pdf",
//           fileBase64: "<base64 payload, max ~30MB raw>" }
//
//   → 200 { ok: true, path: "<storage-path>", pdf_url: "<storage-path>" }
//
// Why base64 in JSON instead of multipart? Vercel's default Node runtime
// parses JSON natively; multipart would need an extra parser dep. PDFs in
// this catalog are typically 5-15MB so the ~33% base64 overhead is fine.
// If/when reports exceed ~20MB consistently, switch to signed upload URLs
// (Storage POST direct from browser).
//
// Storage layout: bucket 'reports-pdfs' (private), object path
// '<report_id>/<locale>.pdf'. The DB column report_translations.pdf_url
// stores the path (not a signed URL — those expire). The customer-facing
// /api/library-content.js generates a fresh signed URL at delivery time.
// ============================================================

import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const BUCKET = 'reports-pdfs';

// 30 MB cap on decoded payload. Base64 inflates by ~33% so the body itself
// can be up to ~40 MB; bump Vercel's bodyParser limit accordingly.
const MAX_BYTES = 30 * 1024 * 1024;

export const config = { api: { bodyParser: { sizeLimit: '40mb' } } };

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
}

const LOCALES = new Set(['en', 'ja', 'ko']);
const UUID    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'method_not_allowed' }); return; }

  // ── Auth + admin allowlist ───────────────────────────
  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0) { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  // ── Parse body ───────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }
  const { report_id, locale, fileBase64 } = body;

  if (!report_id || !UUID.test(String(report_id))) {
    res.status(400).json({ error: 'invalid_report_id' }); return;
  }
  if (!LOCALES.has(locale)) {
    res.status(400).json({ error: 'invalid_locale' }); return;
  }
  if (!fileBase64 || typeof fileBase64 !== 'string') {
    res.status(400).json({ error: 'missing_file' }); return;
  }

  // ── Decode + sanity-check the PDF ────────────────────
  // Strip a data: URI prefix if present (data:application/pdf;base64,...).
  const cleanedB64 = fileBase64.replace(/^data:[^,]+,/, '');
  let bytes;
  try {
    bytes = Buffer.from(cleanedB64, 'base64');
  } catch (_) {
    res.status(400).json({ error: 'invalid_base64' }); return;
  }
  if (!bytes.length || bytes.length > MAX_BYTES) {
    res.status(413).json({ error: 'file_too_large', maxBytes: MAX_BYTES, gotBytes: bytes.length });
    return;
  }
  // Magic-number check: every PDF starts with "%PDF-".
  if (bytes.slice(0, 5).toString('utf8') !== '%PDF-') {
    res.status(400).json({ error: 'not_a_pdf' }); return;
  }

  const path = `${report_id}/${locale}.pdf`;

  try {
    // ── Upload to Supabase Storage (upsert: overwrite previous version) ──
    const upRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
      {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/pdf',
          'x-upsert':      'true',
          'Cache-Control': 'private, max-age=0'
        },
        body: bytes
      }
    );
    if (!upRes.ok) {
      const txt = await upRes.text();
      console.error('[admin-upload-pdf] storage upload failed:', upRes.status, txt);
      res.status(502).json({ error: 'storage_upload_failed', status: upRes.status, detail: txt.slice(0, 300) });
      return;
    }

    // ── Patch report_translations.pdf_url to the storage path ──
    // No-op if no translation exists yet — admin must create it first. We
    // surface that as 404 so the UI can prompt the user appropriately.
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/report_translations?report_id=eq.${report_id}&locale=eq.${locale}`,
      {
        method: 'PATCH',
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=representation'
        },
        body: JSON.stringify({ pdf_url: path })
      }
    );
    if (!patchRes.ok) {
      const txt = await patchRes.text();
      res.status(502).json({ error: 'patch_failed', detail: txt.slice(0, 300) });
      return;
    }
    const updated = await patchRes.json();
    logAudit({
      actor: user.email, action: 'upload',
      resourceType: 'pdf', resourceId: report_id,
      resourceLabel: `${report_id}/${locale}.pdf`,
      diff: { path, bytes: bytes.length, locale }, req
    });
    if (!Array.isArray(updated) || !updated.length) {
      // Storage holds the file but no translation row to point at it. That's
      // fine — admin can create the row and re-upload (idempotent). Still 200
      // so the UI knows the bytes are safely stored.
      res.status(200).json({
        ok: true, path, pdf_url: path, warning: 'translation_row_missing'
      });
      return;
    }

    res.status(200).json({
      ok:           true,
      path,
      pdf_url:      path,
      bytes:        bytes.length,
      translation:  updated[0]
    });
  } catch (err) {
    console.error('[admin-upload-pdf] error:', err.message);
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
}
