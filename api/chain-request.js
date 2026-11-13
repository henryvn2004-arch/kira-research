// ============================================================
// KIRA RESEARCH — api/chain-request.js
// Public POST. A reader searched Kira Chain for a product that has no chain yet.
// We keep the query (and the email, if they left one) as demand signal for which
// chain to build next. Nothing is charged.
//
// POST /api/chain-request  { query, email?, hp }
// → { ok: true }
//
// A repeat of the same (email, query) is a silent success.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s, max) => (typeof s === 'string' ? s : '').trim().slice(0, max);

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

  // Honeypot: bots fill it, humans don't. Pretend success.
  if (body.hp && String(body.hp).trim() !== '') return res.status(200).json({ ok: true });

  const query = clean(body.query, 80).replace(/\s+/g, ' ');
  const email = clean(body.email, 200).toLowerCase();
  if (query.length < 2) return res.status(400).json({ error: 'query_required' });
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'email_invalid' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/chain_requests`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ query, email: email || null, ip_address: ip })
    });
    if (r.status !== 409 && !r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    return res.status(200).json({ ok: true });                // 409 = already requested
  } catch (err) {
    console.error('[chain-request] write failed:', err.message);
    return res.status(500).json({ error: 'insert_failed' });
  }
}
