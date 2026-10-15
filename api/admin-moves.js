// ============================================================
// KIRA RESEARCH — api/admin-moves.js
// Admin review of company moves (company_events, migration 060; gathered daily by /api/cron-moves).
//   GET   /api/admin-moves?status=draft|published|rejected   → { events, counts }
//   PATCH /api/admin-moves  body { id, status?, investor_country?, host_country?, type?, company? } → { ok }
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================
import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const STATUSES = ['draft', 'published', 'rejected'];
const TYPES = ['acquisition', 'stake', 'investment', 'plant', 'jv', 'subsidiary', 'expansion', 'exit', 'other'];

async function sb(path, method = 'GET', body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json',
      Prefer: method === 'GET' ? 'count=exact' : 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return { data: t ? JSON.parse(t) : null, range: r.headers.get('content-range') };
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
  const user = await verifyBearer(req);
  if (!user) return res.status(401).json({ error: 'unauthenticated' });
  if (ADMIN_EMAILS.length === 0) return res.status(500).json({ error: 'admin_not_configured' });
  if (!ADMIN_EMAILS.includes(user.email)) return res.status(403).json({ error: 'not_admin' });

  try {
    if (req.method === 'GET') {
      const status = STATUSES.includes(String((req.query || {}).status)) ? String(req.query.status) : 'draft';
      const [list, ...counts] = await Promise.all([
        sb(`company_events?status=eq.${status}&select=id,source_key,url,title,domain,event_date,investor_country,host_country,type,company,value_usd,tier,also,created_at&order=event_date.desc,id.desc&limit=300`),
        ...STATUSES.map((s) => sb(`company_events?status=eq.${s}&select=id&limit=1`))
      ]);
      const n = (r) => Number(String(r.range || '').split('/')[1]) || 0;
      return res.status(200).json({ events: list.data, counts: Object.fromEntries(STATUSES.map((s, i) => [s, n(counts[i])])) });
    }
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'method_not_allowed' });
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (_) { return res.status(400).json({ error: 'invalid_json' }); }
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'bad_id' });
    const patch = {};
    if (body.status !== undefined) { if (!STATUSES.includes(body.status)) return res.status(400).json({ error: 'bad_status' }); patch.status = body.status; }
    if (body.type !== undefined) { if (!TYPES.includes(body.type)) return res.status(400).json({ error: 'bad_type' }); patch.type = body.type; }
    for (const k of ['investor_country', 'host_country']) {
      if (body[k] === undefined) continue;
      const v = body[k] ? String(body[k]).toUpperCase() : null;
      if (v !== null && !/^[A-Z]{2}$/.test(v)) return res.status(400).json({ error: `bad_${k}` });
      patch[k] = v;
    }
    if (body.company !== undefined) patch.company = String(body.company || '').trim().slice(0, 200) || null;
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'nothing_to_change' });
    if (patch.status) { patch.reviewed_at = new Date().toISOString(); patch.reviewed_by = user.email; }
    const { data } = await sb(`company_events?id=eq.${id}`, 'PATCH', patch);
    if (!data || !data.length) return res.status(404).json({ error: 'not_found' });
    logAudit({ actor: user.email, action: 'update', resourceType: 'company_event', resourceId: String(id), resourceLabel: data[0].title, diff: { after: patch }, req });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin-moves] error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
