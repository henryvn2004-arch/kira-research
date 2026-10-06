// ============================================================
// KIRA RESEARCH — api/topic-request.js
// Public POST. "Email me when it is published" for a coming-soon topic, or a
// request for a keyword that matches no topic. Nothing is charged.
//
// POST /api/topic-request  { email, topic?, keyword?, locale?, hp }
//   topic    slug of a topic (coming-soon page)
//   keyword  free text, used when there is no topic (library search with no hit)
// → { ok: true }
//
// One row per (email, topic) or (email, keyword); a repeat is a silent success.
// Each request is demand signal: /en/admin/topics shows the count and
// sync-approved-topics.mjs moves requested topics up the production queue.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALES  = new Set(['en', 'ja', 'ko', 'zh']);
const clean = (s, max) => (typeof s === 'string' ? s : '').trim().slice(0, max);

async function sb(path, method = 'GET', body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
               'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (r.status === 409) return 409;
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }
  if (!body || typeof body !== 'object') body = {};

  // Honeypot — bots fill it, humans don't. Pretend success.
  if (body.hp && String(body.hp).trim() !== '') return res.status(200).json({ ok: true });

  const email   = clean(body.email, 200).toLowerCase();
  const slug    = clean(body.topic, 170).toLowerCase();
  const keyword = clean(body.keyword, 80).replace(/\s+/g, ' ');
  const locale  = LOCALES.has(clean(body.locale, 8).toLowerCase()) ? clean(body.locale, 8).toLowerCase() : 'en';

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'email_invalid' });
  if (!slug && keyword.length < 3) return res.status(400).json({ error: 'topic_or_keyword_required' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;

  try {
    const row = { email, locale, ip_address: ip };
    if (slug) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/topics?slug=eq.${encodeURIComponent(slug)}&status=neq.rejected&select=id&limit=1`, {
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      const found = r.ok ? await r.json() : [];
      if (!found.length) return res.status(404).json({ error: 'topic_not_found' });
      row.topic_id = found[0].id;
      if (keyword) row.keyword = keyword;
    } else {
      row.keyword = keyword;
    }
    await sb('topic_requests', 'POST', row);   // 409 = already requested → still success
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[topic-request] write failed:', err.message);
    return res.status(500).json({ error: 'insert_failed' });
  }
}
