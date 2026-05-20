// ============================================================
// KIRA RESEARCH — api/admin-leads.js
// Admin endpoint to list + update Custom Research leads.
//
// Auth: client sends `Authorization: Bearer <supabase-jwt>`.
// We verify the JWT against Supabase Auth, pull the user's email,
// and check it against the ADMIN_EMAILS env var (comma-separated).
//
//   GET  /api/admin-leads               → { leads: [...] }
//   PATCH /api/admin-leads?id=<uuid>    body { status, notes? } → { ok }
// ============================================================

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
  const token = m[1];
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${token}`
      }
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

const STATUSES = new Set(['new', 'contacted', 'qualified', 'closed', 'rejected']);

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // 1) Verify JWT and admin whitelist before doing anything else.
  const user = await verifyBearer(req);
  if (!user) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  if (ADMIN_EMAILS.length === 0) {
    // Misconfigured server: refuse rather than expose data.
    res.status(500).json({ error: 'admin_not_configured' });
    return;
  }
  if (!ADMIN_EMAILS.includes(user.email)) {
    res.status(403).json({ error: 'not_admin' });
    return;
  }

  // 2) Dispatch by method.
  try {
    if (req.method === 'GET') {
      // Optional filters via querystring.
      const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
      const status = url.searchParams.get('status');
      const locale = url.searchParams.get('locale');

      const filters = ['order=created_at.desc', 'limit=200'];
      if (status && STATUSES.has(status)) filters.push(`status=eq.${status}`);
      if (locale && ['en','ja','ko'].includes(locale)) filters.push(`locale=eq.${locale}`);

      const leads = await supabase('leads?' + filters.join('&'));
      res.status(200).json({ leads });
      return;
    }

    if (req.method === 'PATCH') {
      const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
      const id  = url.searchParams.get('id');
      if (!id) { res.status(400).json({ error: 'id_required' }); return; }

      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      } catch (_) {
        res.status(400).json({ error: 'invalid_json' });
        return;
      }

      const patch = {};
      if (body.status && STATUSES.has(body.status)) patch.status = body.status;
      if (typeof body.notes === 'string')           patch.notes  = body.notes.slice(0, 2000);
      if (Object.keys(patch).length === 0) {
        res.status(400).json({ error: 'no_fields' });
        return;
      }

      const updated = await supabase(`leads?id=eq.${encodeURIComponent(id)}`, 'PATCH', patch);
      res.status(200).json({ ok: true, lead: Array.isArray(updated) ? updated[0] : updated });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[admin-leads] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
