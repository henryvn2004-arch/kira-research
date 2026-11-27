// ============================================================
// KIRA RESEARCH — api/admin-prices.js
// Owner control of the price "rarity" multiplier (1.0–1.3) of reports and transcripts (migration 079).
//
//   GET   /api/admin-prices?kind=report|transcript          → { items: [{ key, title, status, rarity, price }] }
//   PATCH /api/admin-prices  body { kind, key, rarity }     → { ok, old_price, new_price, rarity }
//         key = living_reports.id (report) or expert_transcripts.slug (transcript)
//   POST  /api/admin-prices  body { action: 'recompute_all' } → { ok, reports, transcripts }
//
// Price = the SQL twins kira_report_price / kira_transcript_price, run through recompute_*_prices() (service key).
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================
import { logAudit } from './_lib/audit.js';
import { parseRarity } from './_lib/rarity.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

async function sb(path, method = 'GET', body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: method === 'GET' ? '' : 'return=representation' },
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]+$/;

const KINDS = {
  report: {
    table: 'living_reports', rpc: 'recompute_report_prices',
    sel: 'id,slug,status,rarity,price', keyCol: 'id', okKey: (k) => UUID.test(k),
    item: (r) => ({ key: r.id, title: r.slug, status: r.status, rarity: Number(r.rarity), price: r.price == null ? null : Number(r.price) })
  },
  transcript: {
    table: 'expert_transcripts', rpc: 'recompute_transcript_prices',
    sel: 'id,slug,status,rarity,price', keyCol: 'slug', okKey: (k) => SLUG.test(k),
    item: (r) => ({ key: r.slug, title: r.slug, status: r.status, rarity: Number(r.rarity), price: r.price == null ? null : Number(r.price) })
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
      const K = KINDS[url.searchParams.get('kind')];
      if (!K) { res.status(400).json({ error: 'bad_kind' }); return; }
      const rows = await sb(`${K.table}?select=${K.sel}&order=slug.asc&limit=2000`);
      res.status(200).json({ items: rows.map(K.item) });
      return;
    }

    if (req.method !== 'PATCH' && req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }

    if (req.method === 'POST') {
      if (body.action !== 'recompute_all') { res.status(400).json({ error: 'bad_action' }); return; }
      const reports = await sb('rpc/recompute_report_prices', 'POST', {});
      const transcripts = await sb('rpc/recompute_transcript_prices', 'POST', {});
      logAudit({ actor: user.email, action: 'update', resourceType: 'price', resourceId: 'all', resourceLabel: `recompute all: ${reports} reports, ${transcripts} transcripts`, req });
      res.status(200).json({ ok: true, reports: Number(reports) || 0, transcripts: Number(transcripts) || 0 });
      return;
    }

    const K = KINDS[body.kind];
    if (!K) { res.status(400).json({ error: 'bad_kind' }); return; }
    const key = String(body.key || '').toLowerCase();
    if (!K.okKey(key)) { res.status(400).json({ error: 'bad_key' }); return; }
    const r = parseRarity(body.rarity);
    if (!r.ok) { res.status(400).json({ error: r.error }); return; }

    const cur = await sb(`${K.table}?${K.keyCol}=eq.${encodeURIComponent(key)}&select=${K.sel}&limit=1`);
    if (!cur || !cur.length) { res.status(404).json({ error: 'not_found' }); return; }
    const oldPrice = cur[0].price == null ? null : Number(cur[0].price);
    await sb(`${K.table}?${K.keyCol}=eq.${encodeURIComponent(key)}`, 'PATCH', { rarity: r.value });
    // Same SQL formula as publish time. Recomputes every row whose price differs from its formula
    // (so a report that just passed its 6/12-month mark is brought up to date as well).
    await sb(`rpc/${K.rpc}`, 'POST', {});
    const after = await sb(`${K.table}?${K.keyCol}=eq.${encodeURIComponent(key)}&select=${K.sel}&limit=1`);
    const newPrice = after && after[0] && after[0].price != null ? Number(after[0].price) : null;
    logAudit({ actor: user.email, action: 'update', resourceType: body.kind, resourceId: key, resourceLabel: `rarity ${cur[0].rarity} → ${r.value}; price ${oldPrice} → ${newPrice}`, req });
    res.status(200).json({ ok: true, rarity: r.value, old_price: oldPrice, new_price: newPrice });
  } catch (err) {
    console.error('[admin-prices] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
