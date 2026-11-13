// ============================================================
// KIRA RESEARCH — api/admin-chains.js
// Admin control of Kira Chain (table chains, chain_requests; migration 037).
// Chains built automatically by build-chain.mjs publish themselves; this is where the
// owner takes one down (or puts it back).
//
//   GET   /api/admin-chains                         → { chains, requests }
//   PATCH /api/admin-chains  body { country, slug, status: 'draft'|'published' } → { ok }
//
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================
import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

async function sb(path, method = 'GET', body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json', Prefer: method === 'GET' ? '' : 'return=representation'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    if (req.method === 'GET') {
      const [chains, reqs] = await Promise.all([
        sb('chains?select=country_code,slug,name,summary,status,stats,updated_at&order=updated_at.desc&limit=500'),
        sb('chain_requests?select=query,email,created_at&order=created_at.desc&limit=2000').catch(() => [])
      ]);
      // demand: the same search counted once per (lower-cased) query, with how many left an email
      const by = new Map();
      for (const r of reqs) {
        const k = String(r.query || '').trim().toLowerCase();
        if (!k) continue;
        const v = by.get(k) || { query: r.query.trim(), count: 0, emails: 0, last: r.created_at };
        v.count++; if (r.email) v.emails++;
        by.set(k, v);
      }
      const requests = [...by.values()].sort((a, b) => b.count - a.count || Date.parse(b.last) - Date.parse(a.last)).slice(0, 30);
      res.status(200).json({ chains, requests, total_requests: reqs.length });
      return;
    }

    if (req.method !== 'PATCH') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }

    const country = String(body.country || '').toUpperCase(), slug = String(body.slug || '').toLowerCase(), status = body.status;
    if (!/^[A-Z]{2}$/.test(country) || !/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug) || !['draft', 'published'].includes(status)) {
      res.status(400).json({ error: 'bad_request' }); return;
    }
    const upd = await sb(`chains?country_code=eq.${country}&slug=eq.${encodeURIComponent(slug)}`, 'PATCH', { status, updated_at: new Date().toISOString() });
    if (!upd || !upd.length) { res.status(404).json({ error: 'not_found' }); return; }
    logAudit({ actor: user.email, action: 'update', resourceType: 'chain', resourceId: `${country}/${slug}`, resourceLabel: `status → ${status}`, req });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin-chains] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
