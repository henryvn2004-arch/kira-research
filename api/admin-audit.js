// ============================================================
// KIRA RESEARCH — api/admin-audit.js
// Read-only viewer for audit_log entries written by the other admin
// handlers via _lib/audit.js.
//
// Auth: Authorization: Bearer <jwt>; email in ADMIN_EMAILS.
//
//   GET /api/admin-audit                                → { entries: [...] }
//       ?actor=henryvn2004@gmail.com   · optional
//       ?resource_type=report|insight|transaction|pdf|aggregator_submission|aggregator_sale  · optional
//       ?action=create|update|delete|upload|refund     · optional
//       ?limit=100                                      · optional, max 500
//
// No write endpoints — audit_log is append-only by design.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
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

const ACTIONS = new Set(['create', 'update', 'delete', 'upload', 'refund', 'other']);
const TYPES   = new Set([
  'report', 'report_translation',
  'insight', 'insight_translation',
  'transaction', 'pdf',
  'aggregator_submission', 'aggregator_sale'
]);

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)       { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const actor  = url.searchParams.get('actor');
  const rType  = url.searchParams.get('resource_type');
  const action = url.searchParams.get('action');
  const limitRaw = parseInt(url.searchParams.get('limit'), 10);
  const limit = isNaN(limitRaw) || limitRaw < 1 ? 100 : Math.min(limitRaw, 500);

  const filters = [];
  if (actor)                       filters.push(`actor_email=eq.${encodeURIComponent(actor.toLowerCase())}`);
  if (rType && TYPES.has(rType))   filters.push(`resource_type=eq.${rType}`);
  if (action && ACTIONS.has(action)) filters.push(`action=eq.${action}`);

  const qs = [
    ...filters,
    'order=created_at.desc',
    `limit=${limit}`,
    'select=id,created_at,actor_email,action,resource_type,resource_id,resource_label,diff,request_path,request_method'
  ].join('&');

  try {
    const entries = await sb(`audit_log?${qs}`);
    res.status(200).json({ entries: Array.isArray(entries) ? entries : [] });
  } catch (err) {
    console.error('[admin-audit] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
