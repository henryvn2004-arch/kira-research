// ============================================================
// KIRA RESEARCH — api/admin-funnel.js
// Funnel for /en/admin/funnel: visitors → looked at research → opened a report page → raised a hand.
// Visitor numbers come from first-party events (site_events via funnel_summary(), migration 037);
// the "signed up" numbers are also counted straight from the tables, as ground truth to compare against
// (events only see people whose browser ran our script and did not block it).
//
//   GET /api/admin-funnel?days=7|30|90  (default 30)
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' });

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Exact row count since a date; null when the table or column is not there.
async function countSince(table, since, extra = '') {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&created_at=gte.${encodeURIComponent(since)}${extra}`, {
      method: 'HEAD', headers: { ...H(), Prefer: 'count=exact' }
    });
    if (!r.ok) return null;
    const n = parseInt((r.headers.get('content-range') || '').split('/')[1], 10);
    return Number.isFinite(n) ? n : null;
  } catch (_) { return null; }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    const days = [7, 30, 90].includes(parseInt(req.query && req.query.days, 10)) ? parseInt(req.query.days, 10) : 30;
    const since = new Date(Date.now() - days * 864e5).toISOString();

    const [fr, requests, waitlist, leads, purchases, firstEvent] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/rpc/funnel_summary`, { method: 'POST', headers: H(), body: JSON.stringify({ p_from: since }) }),
      countSince('topic_requests', since),
      countSince('waitlist', since),
      countSince('leads', since),
      countSince('purchases', since, '&status=eq.completed'),
      fetch(`${SUPABASE_URL}/rest/v1/site_events?select=at&order=at.asc&limit=1`, { headers: H() }).then(r => r.ok ? r.json() : []).catch(() => [])
    ]);
    if (!fr.ok) throw new Error(`funnel_summary ${fr.status}`);
    const funnel = await fr.json();

    res.status(200).json({
      days,
      funnel,
      tracking_since: firstEvent[0] ? firstEvent[0].at : null,       // events only exist from this moment on
      actual: { request_email: requests, waitlist, lead: leads, purchases }
    });
  } catch (err) {
    console.error('[admin-funnel] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
