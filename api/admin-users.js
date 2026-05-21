// ============================================================
// KIRA RESEARCH — api/admin-users.js
// Admin endpoint: list users who have purchased reports, with
// aggregate spend + count + first/last purchase + locales bought.
//
// Auth: Authorization: Bearer <jwt> + email in ADMIN_EMAILS.
//
//   GET /api/admin-users → { users: [
//     { id, email, created_at, total_spend, currency, purchase_count,
//       first_purchase_at, last_purchase_at, locales_bought: ['en', ...] }
//   ] }
//
// Read-only Year 1. No write actions (no impersonate, no ban, no delete).
// Pulls from `purchases` first, then enriches with auth.users emails so
// users-with-no-purchases don't pollute the view.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

async function supabase(path) {
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

async function fetchUserMap() {
  const out = new Map();
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=50`,
      {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    if (!r.ok) {
      console.warn('[admin-users] auth/admin/users failed', r.status);
      break;
    }
    const data = await r.json().catch(() => ({}));
    const users = data.users || [];
    for (const u of users) {
      out.set(u.id, { email: u.email || null, created_at: u.created_at || null });
    }
    if (users.length < 50) break;
  }
  return out;
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${m[1]}`
      }
    });
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

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const me = await verifyBearer(req);
  if (!me)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)        { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(me.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    // Pull every completed/refunded purchase. Both states count toward the
    // user's lifetime activity (refunded shows what was attempted).
    const purchases = await supabase(
      `purchases?select=user_id,amount,currency,locale,status,created_at` +
      `&user_id=not.is.null&order=created_at.asc&limit=10000`
    );

    // Aggregate per user_id.
    const agg = new Map(); // id → { total_spend, currency, count, first, last, locales }
    for (const p of purchases) {
      // Don't count refunded toward total_spend, but still include in count
      // + locale history so admin sees the full picture.
      const counts_toward_spend = p.status === 'completed';

      let row = agg.get(p.user_id);
      if (!row) {
        row = {
          user_id:          p.user_id,
          total_spend:      0,
          currency:         p.currency || 'USD',
          purchase_count:   0,
          completed_count:  0,
          refunded_count:   0,
          first_purchase_at: p.created_at,
          last_purchase_at:  p.created_at,
          locales:          new Set()
        };
        agg.set(p.user_id, row);
      }
      if (counts_toward_spend) {
        row.total_spend += parseFloat(p.amount) || 0;
        row.completed_count++;
      } else if (p.status === 'refunded') {
        row.refunded_count++;
      }
      row.purchase_count++;
      if (p.created_at < row.first_purchase_at) row.first_purchase_at = p.created_at;
      if (p.created_at > row.last_purchase_at)  row.last_purchase_at  = p.created_at;
      if (p.locale) row.locales.add(p.locale);
    }

    // Enrich with email + auth created_at.
    const userMap = await fetchUserMap();

    const users = [...agg.values()].map(row => {
      const u = userMap.get(row.user_id) || {};
      return {
        id:                 row.user_id,
        email:              u.email || null,
        created_at:         u.created_at || null,
        total_spend:        Math.round(row.total_spend * 100) / 100,
        currency:           row.currency,
        purchase_count:     row.purchase_count,
        completed_count:    row.completed_count,
        refunded_count:     row.refunded_count,
        first_purchase_at:  row.first_purchase_at,
        last_purchase_at:   row.last_purchase_at,
        locales_bought:     [...row.locales].sort()
      };
    });

    // Sort by last activity, most recent first — admin scans the top.
    users.sort((a, b) => (b.last_purchase_at || '').localeCompare(a.last_purchase_at || ''));

    res.status(200).json({ users });
  } catch (err) {
    console.error('[admin-users] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
