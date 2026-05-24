// ============================================================
// KIRA RESEARCH — api/studio-upload.js
// Studio file upload — user uploads input docs (UC3 data-grounded).
//
//   POST /api/studio-upload
//   Authorization: Bearer <supabase-jwt>
//   Content-Type:  application/octet-stream
//   X-File-Name:   <client filename>
//   X-File-Type:   <mime type>
//   Body: raw file bytes
//   → { path: "<user_id>/<uuid>-<filename>", size, mime }
//
// Path layout: studio-inputs / <user_id>/<uuid>-<safe_name>
// User can only write to their own user_id prefix (enforced server-side
// because the service-key bypasses RLS). The studio-jobs POST handler
// additionally validates that all submitted file paths start with the
// caller's user_id.
//
// Size cap: 25 MB per file (storage bucket allowed_mime + file_size_limit).
// ============================================================

import {
  STUDIO_INPUTS_BUCKET,
  verifyBearer, cors, uploadToBucket
} from './_lib/studio-shared.js';

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain'
]);

// Vercel Node functions accept raw body when bodyParser config is disabled.
export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) {
      throw new Error('file_too_large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function safeName(s) {
  return String(s || 'upload')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120) || 'upload';
}

function uuid() {
  // RFC4122 v4 — crypto.randomUUID is in Node 20+.
  return globalThis.crypto && globalThis.crypto.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default async function handler(req, res) {
  cors(res, 'POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  const fileName = req.headers['x-file-name'];
  const fileType = req.headers['x-file-type'];
  if (!fileName || !fileType) {
    res.status(400).json({ error: 'missing_file_headers' });
    return;
  }
  if (!ALLOWED_MIMES.has(String(fileType))) {
    res.status(415).json({ error: 'unsupported_mime', mime: fileType });
    return;
  }

  let bytes;
  try {
    bytes = await readRawBody(req);
  } catch (err) {
    if (err.message === 'file_too_large') {
      res.status(413).json({ error: 'file_too_large', max_bytes: MAX_BYTES });
      return;
    }
    res.status(400).json({ error: 'bad_body', detail: err.message });
    return;
  }
  if (!bytes.length) {
    res.status(400).json({ error: 'empty_file' });
    return;
  }

  const safe = safeName(fileName);
  const path = `${user.id}/${uuid()}-${safe}`;
  const ok = await uploadToBucket(STUDIO_INPUTS_BUCKET, path, bytes, fileType, false);
  if (!ok) {
    res.status(500).json({ error: 'upload_failed' });
    return;
  }

  res.status(200).json({
    path,
    size: bytes.length,
    mime: fileType,
    name: safe
  });
}
