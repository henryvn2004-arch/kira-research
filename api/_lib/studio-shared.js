// ============================================================
// KIRA RESEARCH — api/_lib/studio-shared.js
// Shared helpers for the studio.* API routes.
//
// Centralises Supabase REST helpers + bearer-auth verification so
// studio-jobs.js / studio-upload.js / studio-report.js stay focused
// on routing concerns. Mirrors the pattern in api/library-content.js
// and api/admin-reports.js — service-key reads/writes bypass RLS.
//
// NOTE: this file lives under api/_lib/ — Vercel hides underscore-
// prefixed dirs from public routing, so this is import-only.
// ============================================================

export const SUPABASE_URL         = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const STUDIO_INPUTS_BUCKET  = 'studio-inputs';
export const STUDIO_REPORTS_BUCKET = 'studio-reports';
export const SIGNED_URL_TTL_SEC    = 3600;

// ---------------------------------------------------------------
// PostgREST helper. Returns JSON or null on 204.
// Throws an Error containing the response body on non-2xx.
// ---------------------------------------------------------------
export async function sb(path, method = 'GET', body = null, preferRepresentation = true) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        (method === 'POST' || method === 'PATCH')
        ? (preferRepresentation ? 'return=representation' : 'return=minimal')
        : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${txt}`);
  }
  return res.status === 204 ? null : res.json();
}

// ---------------------------------------------------------------
// Sign a storage object path for short-lived public access.
// Returns absolute URL or null on failure.
// ---------------------------------------------------------------
export async function signStorageUrl(bucket, path, ttlSec = SIGNED_URL_TTL_SEC, downloadName = null) {
  if (!path) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify({ expiresIn: ttlSec })
      }
    );
    if (!r.ok) {
      console.error('[studio-shared] sign url failed:', r.status, await r.text());
      return null;
    }
    const { signedURL } = await r.json();
    if (!signedURL) return null;
    let url = `${SUPABASE_URL}/storage/v1${signedURL}`;
    if (downloadName) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}download=${encodeURIComponent(downloadName)}`;
    }
    return url;
  } catch (err) {
    console.error('[studio-shared] sign url error:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------
// Download an object from a private bucket using service-role key.
// Returns a Node Buffer or null on failure. Used by the upload-only
// Studio worker (Phase N.20) to read user-uploaded sources from
// studio-inputs before extracting text.
// ---------------------------------------------------------------
export async function downloadFromBucket(bucket, path) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
      {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    if (!r.ok) {
      console.error(`[studio-shared] download ${bucket}/${path} failed:`, r.status);
      return null;
    }
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    console.error(`[studio-shared] download ${bucket}/${path} error:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------
// Upload a Buffer / Uint8Array to a bucket. Overwrites by default.
// Returns true on success, false on failure (logged).
// ---------------------------------------------------------------
export async function uploadToBucket(bucket, path, body, contentType, upsert = true) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          'apikey':         SUPABASE_SERVICE_KEY,
          'Authorization':  `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type':   contentType,
          'x-upsert':       upsert ? 'true' : 'false',
          'cache-control':  'private, max-age=0'
        },
        body
      }
    );
    if (!r.ok) {
      console.error(`[studio-shared] upload ${bucket}/${path} failed:`, r.status, await r.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[studio-shared] upload ${bucket}/${path} error:`, err.message);
    return false;
  }
}

// ---------------------------------------------------------------
// Verify Supabase Auth bearer token. Returns { id, email } or null.
// ---------------------------------------------------------------
export async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${m[1]}` }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? { id: u.id, email: (u.email || '').toLowerCase() } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------
// CORS — studio.* and main domain both need it. Permissive on
// origin because Supabase Auth tokens are owner-scoped anyway.
// ---------------------------------------------------------------
export function cors(res, methods = 'GET,POST,PATCH,DELETE,OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
}

// ---------------------------------------------------------------
// Progress writer used by the worker. Best-effort: never throws.
// ---------------------------------------------------------------
export async function updateJobProgress(jobId, patch) {
  try {
    await sb(`studio_jobs?id=eq.${jobId}`, 'PATCH', patch, false);
  } catch (err) {
    console.error('[studio-shared] updateJobProgress failed:', err.message);
  }
}

// ---------------------------------------------------------------
// Append a single event to studio_jobs.activity_log. Used by the
// worker to stream Claude-chat-style live progress to the polling
// browser. Event shape: { ts, type, stage, msg, detail? }
//   type:  'stage' | 'info' | 'search' | 'done' | 'error'
//   stage: 'parse'|'plan'|'search'|'content'|'render'|'complete'
//
// Calls the SQL helper (migration 011) which appends atomically
// via the `||` operator — safe under parallel writers like the
// Stage 5 section workers (SECTION_CONCURRENCY=3).
//
// Best-effort: never throws. Activity logging is decorative; a
// dropped event must NEVER fail the gen.
// ---------------------------------------------------------------
export async function logActivity(jobId, event) {
  if (!jobId || !event) return;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/append_studio_activity`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ p_job_id: jobId, p_event: event })
    });
    if (!r.ok) {
      console.error('[studio-shared] logActivity rpc failed:', r.status, await r.text().catch(()=> ''));
    }
  } catch (err) {
    console.error('[studio-shared] logActivity error:', err.message);
  }
}

// ---------------------------------------------------------------
// Slug-ify a free-text topic for filenames + bucket paths.
// ---------------------------------------------------------------
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'studio-report';
}
