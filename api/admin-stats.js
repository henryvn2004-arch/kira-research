// ============================================================
// KIRA RESEARCH — api/admin-stats.js
// Admin landing-page aggregator. Returns counts + recent activity
// across leads / reports / insights / purchases in a single round-trip.
//
// Auth: same as other admin endpoints — Authorization: Bearer <jwt>
// verified against ADMIN_EMAILS whitelist.
//
//   GET /api/admin-stats → {
//     leads:       { total, by_status: { new, contacted, qualified, closed, rejected } },
//     reports:     { total, by_status: { draft, published } },
//     insights:    { total, by_status: { draft, published } },
//     purchases:   { count, revenue_usd },
//     recent_leads:     [ { id, name, company, status, created_at }, ... up to 5 ],
//     recent_purchases: [ { id, report_slug, locale, amount_usd, created_at }, ... up to 5 ]
//   }
//
// Every section gracefully degrades to zero if its table isn't migrated
// yet — so the dashboard renders cleanly on a fresh DB.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// ── Supabase helper with count support ──
// PostgREST: Prefer: count=exact + HEAD request gives total in Content-Range.
async function sb(path, { count = false, method = 'GET' } = {}) {
  const headers = {
    'apikey':        SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json'
  };
  if (count) headers['Prefer'] = 'count=exact';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers });
  if (!res.ok) {
    // Don't throw — let caller fall back to zero. Logs the issue server-side.
    console.warn(`[admin-stats] sb ${path}: ${res.status} ${await res.text().catch(() => '')}`);
    return { rows: [], total: 0 };
  }
  const range = res.headers.get('content-range') || '';
  const total = parseInt(range.split('/')[1], 10) || 0;
  const rows  = method === 'HEAD' ? [] : await res.json().catch(() => []);
  return { rows, total };
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

// ── Count tally helper — buckets rows by a field (e.g. 'status') ──
function tally(rows, field) {
  const out = {};
  for (const r of rows) {
    const k = r[field] || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user)                           { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)       { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    // Run all queries in parallel — they're independent and reduce wall-clock
    // for the dashboard load. Each gracefully degrades on table-missing errors.
    const [
      leadsAll,
      reportsAll,
      insightsAll,
      purchasesAll,
      recentLeads,
      recentPurchases
    ] = await Promise.all([
      sb('leads?select=status&limit=10000'),
      sb('living_reports?select=status&limit=10000'),
      sb('insights?select=status&limit=10000'),
      sb('purchases?select=amount_usd,status&status=eq.completed&limit=10000'),
      sb('leads?select=id,name,company,status,created_at,locale&order=created_at.desc&limit=5'),
      sb('purchases?select=id,report_slug,locale,amount_usd,created_at,status&status=eq.completed&order=created_at.desc&limit=5')
    ]);

    // Aggregate revenue (sum amount_usd of completed purchases).
    const revenue = purchasesAll.rows.reduce((sum, p) => sum + (parseFloat(p.amount_usd) || 0), 0);

    res.status(200).json({
      leads: {
        total: leadsAll.rows.length,
        by_status: tally(leadsAll.rows, 'status')
      },
      reports: {
        total: reportsAll.rows.length,
        by_status: tally(reportsAll.rows, 'status')
      },
      insights: {
        total: insightsAll.rows.length,
        by_status: tally(insightsAll.rows, 'status')
      },
      purchases: {
        count:        purchasesAll.rows.length,
        revenue_usd:  Math.round(revenue * 100) / 100   // 2dp
      },
      recent_leads:     recentLeads.rows,
      recent_purchases: recentPurchases.rows,
      // Pass through the caller's email so the page can render "signed in as X"
      // without an extra round-trip to /auth/v1/user.
      admin_email: user.email
    });
  } catch (err) {
    console.error('[admin-stats] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
