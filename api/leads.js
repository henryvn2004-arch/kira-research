// ============================================================
// KIRA RESEARCH — api/leads.js
// Custom Research lead capture endpoint.
//
// POST /api/leads with JSON body:
//   { name, email, company, role, tier, deadline, brief, locale, source, hp }
// → { ok: true, id }
//
// Honeypot field `hp` should be empty; bots filling it get a fake success.
// Inserts into Supabase `leads` table (schema described in claude.md).
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Supabase REST helper ───────────────────────────────────
async function supabase(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Validation ─────────────────────────────────────────────
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALES    = new Set(['en', 'ja', 'ko']);
const TIERS      = new Set(['briefing', 'custom', 'retainer', 'not-sure']);
const DEADLINES  = new Set(['2w', 'month', 'quarter', 'flex']);

function pick(val, allowed, fallback) {
  return allowed.has(val) ? val : fallback;
}

function clean(s, max = 500) {
  return (typeof s === 'string' ? s : '').trim().slice(0, max);
}

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'method_not_allowed' }); return; }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }

  // Honeypot — bots fill this; humans don't. Pretend success.
  if (body.hp && String(body.hp).trim() !== '') {
    res.status(200).json({ ok: true, id: null });
    return;
  }

  const name    = clean(body.name, 120);
  const email   = clean(body.email, 200);
  const company = clean(body.company, 200);
  const role    = clean(body.role, 200);
  const brief   = clean(body.brief, 4000);
  const tier    = pick(clean(body.tier, 20),     TIERS,     'not-sure');
  const deadline = pick(clean(body.deadline, 20), DEADLINES, 'flex');
  const locale  = pick(clean(body.locale, 8),    LOCALES,   'en');
  const source  = clean(body.source, 60) || 'custom-research';

  if (!name)              { res.status(400).json({ error: 'name_required' });  return; }
  if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'email_invalid' }); return; }
  if (brief.length < 10)  { res.status(400).json({ error: 'brief_too_short' }); return; }

  // Best-effort meta (Vercel sets these).
  const ipRaw = req.headers['x-forwarded-for'] || '';
  const ip    = String(ipRaw).split(',')[0].trim() || null;
  const ua    = clean(req.headers['user-agent'] || '', 500);
  const referer = clean(req.headers['referer'] || '', 500);

  const row = {
    name,
    email,
    company: company || null,
    role:    role    || null,
    tier,
    deadline,
    brief,
    locale,
    source,
    ip_address: ip,
    user_agent: ua,
    referer:    referer || null,
    status:     'new'
  };

  try {
    const inserted = await supabase('leads', 'POST', row);
    const id = Array.isArray(inserted) && inserted[0] ? inserted[0].id : null;
    res.status(200).json({ ok: true, id });
  } catch (err) {
    // Never leak Supabase error detail to the client — log server-side, return generic.
    console.error('[leads] insert failed:', err.message);
    res.status(500).json({ error: 'insert_failed' });
  }
}
