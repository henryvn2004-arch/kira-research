// ============================================================
// KIRA RESEARCH — api/admin-topics.js
// Owner review of the Topic Planner's output (Phase S, Sprint S3).
//
// Auth: Authorization: Bearer <supabase-jwt>; email must be in ADMIN_EMAILS.
//
//   GET  /api/admin-topics[?status=proposed|approved|rejected|queued|all][&country=VN]
//        → { stats, topics, splits, countries }   (topics carry `requests`: readers waiting on it)
//   PATCH /api/admin-topics   body:
//        { kind: 'topic', id, action: 'approve'|'reject'|'reopen', title?, questions?, note? }
//        { kind: 'split', id, action: 'approve'|'reject'|'reopen' }
//
// A topic moves proposed → approved (owner) → queued (the batch runner pulls
// approved topics into data/report_queue.csv). A split is a level-2 industry
// suggestion (tax_country_industry row with status 'proposed') that becomes
// 'active' once approved. Queued topics are final and cannot be edited here.
// ============================================================

import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const TOPIC_STATUSES = ['proposed', 'approved', 'rejected', 'queued'];
const COUNTRY_RE = /^[A-Z]{2}$/;

async function sb(path, method = 'GET', body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'PATCH' ? 'return=representation' : ''
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
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

const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));

function cleanQuestions(q) {
  if (!Array.isArray(q)) return null;
  const out = q.map(x => String(x || '').trim()).filter(Boolean).slice(0, 8);
  return out.length ? out : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'PATCH') return res.status(405).json({ error: 'method_not_allowed' });

  const user = await verifyBearer(req);
  if (!user)                              return res.status(401).json({ error: 'unauthenticated' });
  if (ADMIN_EMAILS.length === 0)          return res.status(500).json({ error: 'admin_not_configured' });
  if (!ADMIN_EMAILS.includes(user.email)) return res.status(403).json({ error: 'not_admin' });

  try {
    // ── Decisions ──────────────────────────────────────────
    if (req.method === 'PATCH') {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
      catch (_) { return res.status(400).json({ error: 'bad_json' }); }

      const { kind, id, action } = body;
      if (!isUuid(id)) return res.status(400).json({ error: 'bad_id' });
      if (!['approve', 'reject', 'reopen'].includes(action)) return res.status(400).json({ error: 'bad_action' });

      if (kind === 'split') {
        const next = action === 'approve' ? 'active' : action === 'reject' ? 'rejected' : 'proposed';
        const rows = await sb(`tax_country_industry?id=eq.${id}&status=in.(proposed,rejected,active)`, 'PATCH', { status: next });
        if (!rows || !rows.length) return res.status(404).json({ error: 'not_found' });
        logAudit({ actor: user.email, action: 'update', resourceType: 'tax_split', resourceId: id, resourceLabel: next, diff: { after: { status: next } }, req });
        return res.status(200).json({ ok: true, split: rows[0] });
      }

      if (kind === 'topic') {
        const cur = await sb(`topics?id=eq.${id}&select=id,status,title,questions`);
        if (!cur.length) return res.status(404).json({ error: 'not_found' });
        if (cur[0].status === 'queued') return res.status(409).json({ error: 'already_queued' });

        const patch = {};
        if (typeof body.title === 'string' && body.title.trim()) patch.title = body.title.trim().slice(0, 240);
        const qs = cleanQuestions(body.questions);
        if (qs) patch.questions = qs;
        if (typeof body.note === 'string') patch.note = body.note.trim().slice(0, 1000) || null;
        patch.status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'proposed';
        patch.decided_at = action === 'reopen' ? null : new Date().toISOString();

        const rows = await sb(`topics?id=eq.${id}&status=neq.queued`, 'PATCH', patch);
        if (!rows || !rows.length) return res.status(409).json({ error: 'already_queued' });
        logAudit({ actor: user.email, action: 'update', resourceType: 'topic', resourceId: id, resourceLabel: rows[0].slug,
                   diff: { before: cur[0], after: patch }, req });
        return res.status(200).json({ ok: true, topic: rows[0] });
      }

      return res.status(400).json({ error: 'bad_kind' });
    }

    // ── List ───────────────────────────────────────────────
    const q = req.query || {};
    const status  = q.status && TOPIC_STATUSES.includes(q.status) ? q.status : (q.status === 'all' ? null : 'proposed');
    const country = q.country && COUNTRY_RE.test(String(q.country).toUpperCase()) ? String(q.country).toUpperCase() : null;

    let tPath = 'topics?select=id,slug,country_code,industry_id,competency_key,kind,year,title,buyer_question,questions,rationale,signals,status,note,created_at,decided_at'
              + '&order=created_at.desc&limit=500';
    if (status)  tPath += `&status=eq.${status}`;
    if (country) tPath += `&country_code=eq.${country}`;

    let sPath = 'tax_country_industry?status=eq.proposed&select=id,country_code,industry_id,priority,heat,origins,evidence,signals&order=country_code.asc&limit=300';
    if (country) sPath += `&country_code=eq.${country}`;

    const [topicRows, splitRows, counts, countries, industries, competencies, reqRows] = await Promise.all([
      sb(tPath),
      sb(sPath),
      sb('topics?select=status&limit=5000'),
      sb('tax_countries?select=code,name,tier&order=ord.asc'),
      sb('tax_industries?select=id,slug,name,level,parent_id&limit=1000'),
      sb('tax_competencies?select=key,label,stage&order=ord.asc'),
      sb('topic_requests?select=topic_id&topic_id=not.is.null&limit=10000')   // reader demand (migration 027)
    ]);

    const demand = new Map();
    for (const r of reqRows) demand.set(r.topic_id, (demand.get(r.topic_id) || 0) + 1);

    const indById = new Map(industries.map(i => [i.id, i]));
    const compByKey = new Map(competencies.map(c => [c.key, c]));
    const withIndustry = (r) => {
      const ind = indById.get(r.industry_id) || null;
      const parent = ind && ind.parent_id ? indById.get(ind.parent_id) : null;
      return { ...r, industry: ind ? { slug: ind.slug, name: ind.name, level: ind.level, parent: parent ? { name: parent.name, slug: parent.slug } : null } : null };
    };
    const topics = topicRows
      .map(r => ({ ...withIndustry(r), competency: r.competency_key ? (compByKey.get(r.competency_key) || null) : null, requests: demand.get(r.id) || 0 }))
      .sort((a, b) => b.requests - a.requests);   // most-requested first; ties keep newest-first
    const splits = splitRows.map(withIndustry);

    const stats = { proposed: 0, approved: 0, rejected: 0, queued: 0, splits_proposed: splits.length };
    for (const r of counts) if (stats[r.status] !== undefined) stats[r.status]++;

    return res.status(200).json({ stats, topics, splits, countries });
  } catch (err) {
    console.error('[admin-topics]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
