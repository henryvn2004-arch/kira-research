// ============================================================
// KIRA RESEARCH — api/admin-waitlist.js
// Admin endpoint for the subscription waitlist (Sprint S5).
//
// Auth: `Authorization: Bearer <supabase-jwt>`, email must be in ADMIN_EMAILS
// (same pattern as api/admin-leads.js).
//
//   GET   /api/admin-waitlist[?status=new&plan=month]
//         → { entries: [...], counts: { total, byPlan: {...}, byStatus: {...} } }
//   PATCH /api/admin-waitlist?id=<uuid>   body { status?, notes? } → { ok, entry }
// ============================================================

import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// ── Supabase REST helper (service-key, bypasses RLS) ───────
async function supabase(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' || method === 'PATCH' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

// ── JWT verify: ask Supabase Auth who the bearer token belongs to.
async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${m[1]}` }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? { id: u.id, email: u.email.toLowerCase() } : null;
  } catch (_) {
    return null;
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const STATUSES = ['new', 'contacted', 'converted', 'spam'];
const PLANS    = ['week', 'month', 'annual', 'not-sure'];
const UUID_RE  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = await verifyBearer(req);
  if (!user)                        { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)    { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);

  try {
    if (req.method === 'GET') {
      const status = url.searchParams.get('status');
      const plan   = url.searchParams.get('plan');

      const filters = ['order=created_at.desc', 'limit=500',
        'select=id,created_at,email,name,company,role,plan,locale,source,status,notes'];
      if (status && STATUSES.includes(status)) filters.push(`status=eq.${status}`);
      if (plan   && PLANS.includes(plan))      filters.push(`plan=eq.${plan}`);

      const [entries, all] = await Promise.all([
        supabase('waitlist?' + filters.join('&')),
        supabase('waitlist?select=plan,status&limit=10000')
      ]);

      const byPlan   = Object.fromEntries(PLANS.map(p => [p, 0]));
      const byStatus = Object.fromEntries(STATUSES.map(s => [s, 0]));
      (all || []).forEach(r => {
        if (r.plan in byPlan)     byPlan[r.plan]++;
        if (r.status in byStatus) byStatus[r.status]++;
      });

      res.status(200).json({
        entries: entries || [],
        counts: { total: (all || []).length, byPlan, byStatus }
      });
      return;
    }

    if (req.method === 'PATCH') {
      const id = url.searchParams.get('id');
      if (!id || !UUID_RE.test(id)) { res.status(400).json({ error: 'id_required' }); return; }

      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      } catch (_) {
        res.status(400).json({ error: 'invalid_json' });
        return;
      }

      const patch = {};
      if (body.status && STATUSES.includes(body.status)) patch.status = body.status;
      if (typeof body.notes === 'string')                patch.notes  = body.notes.slice(0, 2000);
      if (Object.keys(patch).length === 0) { res.status(400).json({ error: 'no_fields' }); return; }

      const updated = await supabase(`waitlist?id=eq.${encodeURIComponent(id)}`, 'PATCH', patch);
      const entry = Array.isArray(updated) ? updated[0] : updated;
      if (!entry) { res.status(404).json({ error: 'not_found' }); return; }

      logAudit({
        actor: user.email, action: 'update', resourceType: 'waitlist',
        resourceId: id, resourceLabel: entry.email, diff: { after: patch }, req
      });

      res.status(200).json({ ok: true, entry });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[admin-waitlist] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
