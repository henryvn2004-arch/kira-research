// ============================================================
// KIRA RESEARCH — api/admin-config.js
// Owner-editable settings (see api/_lib/config.js for the registry).
//
//   GET   /api/admin-config                       → { settings: [...] }
//   PATCH /api/admin-config  body { key, value }  → { ok }     (validated against the registry)
//   PATCH /api/admin-config  body { key, reset:true } → { ok } (back to the code default)
//
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS. Every change is audit-logged.
// ============================================================
import { CONFIG, coerceConfig, listConfig, invalidateConfig } from './_lib/config.js';
import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

async function verifyBearer(req) {
  const m = (req.headers['authorization'] || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${m[1]}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? { id: u.id, email: u.email.toLowerCase() } : null;
  } catch (_) { return null; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function rest(path, method, body, prefer) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    if (req.method === 'GET') {
      invalidateConfig();                       // the admin always sees the stored truth
      res.status(200).json({ settings: await listConfig() });
      return;
    }
    if (req.method !== 'PATCH') { res.status(405).json({ error: 'method_not_allowed' }); return; }

    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }
    const key = String(body.key || '');
    if (!CONFIG[key]) { res.status(400).json({ error: 'unknown_key' }); return; }

    const before = (await listConfig()).find(s => s.key === key);
    if (body.reset) {
      await rest(`app_config?key=eq.${encodeURIComponent(key)}`, 'DELETE');
      invalidateConfig();
      logAudit({ actor: user.email, action: 'update', resourceType: 'config', resourceId: key, resourceLabel: `${key}: reset to default (${CONFIG[key].default})`, diff: { before: before && before.value, after: CONFIG[key].default }, req });
      res.status(200).json({ ok: true });
      return;
    }
    const c = coerceConfig(key, body.value);
    if (!c.ok) { res.status(400).json({ error: c.error }); return; }
    await rest('app_config?on_conflict=key', 'POST',
      { key, value: c.value, updated_at: new Date().toISOString(), updated_by: user.email }, 'resolution=merge-duplicates,return=minimal');
    invalidateConfig();
    logAudit({ actor: user.email, action: 'update', resourceType: 'config', resourceId: key, resourceLabel: `${key}: ${before && before.value} → ${c.value}`, diff: { before: before && before.value, after: c.value }, req });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin-config] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
