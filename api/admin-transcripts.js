// ============================================================
// KIRA RESEARCH — api/admin-transcripts.js
// Admin control of the Kira Experts transcript library (migration 044, purchases: 051).
// Transcripts arrive from the generator in draft or published; this is where the owner
// sees which languages each one has and takes one off the site (or puts it back).
//
//   GET   /api/admin-transcripts                       → { transcripts, counts }
//   PATCH /api/admin-transcripts  body { slug, status: 'draft'|'published'|'retired' } → { ok }
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
      const [rows, trs, buys] = await Promise.all([
        sb('expert_transcripts?select=id,slug,interview_type,country_code,market,industry,status,published_at,updated_at&order=updated_at.desc&limit=1000'),
        sb('expert_transcript_translations?select=transcript_id,locale,status,title&limit=5000'),
        sb('transcript_purchases?select=transcript_id&status=eq.completed&limit=10000').catch(() => [])
      ]);
      const sold = new Map();
      for (const b of buys) sold.set(b.transcript_id, (sold.get(b.transcript_id) || 0) + 1);
      const transcripts = rows.map(r => {
        const mine = trs.filter(t => t.transcript_id === r.id);
        const en = mine.find(t => t.locale === 'en');
        return {
          slug: r.slug, title: (en || mine[0] || {}).title || r.slug, interview_type: r.interview_type,
          market: r.market, industry: r.industry, status: r.status, published_at: r.published_at, updated_at: r.updated_at,
          locales: Object.fromEntries(['en', 'ja', 'ko', 'zh'].map(l => [l, (mine.find(t => t.locale === l) || {}).status || null])),
          purchases: sold.get(r.id) || 0
        };
      });
      const counts = { total: rows.length, published: 0, draft: 0, retired: 0, purchases: buys.length };
      for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
      res.status(200).json({ transcripts, counts });
      return;
    }

    if (req.method !== 'PATCH') { res.status(405).json({ error: 'method_not_allowed' }); return; }
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }

    const slug = String(body.slug || '').toLowerCase(), status = body.status;
    if (!/^[a-z0-9][a-z0-9-]+$/.test(slug) || !['draft', 'published', 'retired'].includes(status)) {
      res.status(400).json({ error: 'bad_request' }); return;
    }
    const cur = await sb(`expert_transcripts?slug=eq.${encodeURIComponent(slug)}&select=published_at&limit=1`);
    if (!cur || !cur.length) { res.status(404).json({ error: 'not_found' }); return; }
    const now = new Date().toISOString();
    const patch = { status, updated_at: now };
    // the date readers see is the first time it went live; putting it back keeps that date
    if (status === 'published' && !cur[0].published_at) patch.published_at = now;
    await sb(`expert_transcripts?slug=eq.${encodeURIComponent(slug)}`, 'PATCH', patch);
    logAudit({ actor: user.email, action: 'update', resourceType: 'transcript', resourceId: slug, resourceLabel: `status → ${status}`, req });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin-transcripts] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
