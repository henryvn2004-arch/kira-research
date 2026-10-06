// ============================================================
// KIRA RESEARCH — api/waitlist.js
// Subscription-library waitlist sign-up (Sprint S5). Nothing is charged.
//
// POST /api/waitlist with JSON body:
//   { email, name?, company?, role?, plan?, locale?, source?, hp }
// → { ok: true }
//
//   plan    report | month | annual | not-sure (default not-sure; legacy 'week' still accepted)
//   locale  en | ja | ko | zh                  (default en)
//
// Honeypot field `hp` should be empty; bots filling it get a fake success.
// One row per email (case-insensitive, migration 025). A repeat sign-up is
// treated as success and updates the plan (+ any newly supplied fields).
// Response never says whether the email was already on the list.
// ============================================================

import { sendWaitlistNotification } from './_lib/email.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Supabase REST helper ───────────────────────────────────
// Returns { status, data } instead of throwing on 409 so the caller can
// branch on the unique-email conflict.
async function supabase(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 409) return { status: 409, data: null };
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  return { status: res.status, data: null };
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── Validation ─────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALES  = new Set(['en', 'ja', 'ko', 'zh']);
const PLANS    = new Set(['report', 'week', 'month', 'annual', 'not-sure']);

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
  } catch {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }
  if (!body || typeof body !== 'object') body = {};

  // Honeypot — bots fill this; humans don't. Pretend success.
  if (body.hp && String(body.hp).trim() !== '') {
    res.status(200).json({ ok: true });
    return;
  }

  const email   = clean(body.email, 200).toLowerCase();
  const name    = clean(body.name, 120);
  const company = clean(body.company, 200);
  const role    = clean(body.role, 200);
  const plan    = pick(clean(body.plan, 20).toLowerCase(),  PLANS,   'not-sure');
  const locale  = pick(clean(body.locale, 8).toLowerCase(), LOCALES, 'en');
  const source  = clean(body.source, 60).replace(/[^a-z0-9_-]/gi, '') || 'pricing';

  if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'email_invalid' }); return; }

  // Best-effort meta (Vercel sets these).
  const ipRaw   = req.headers['x-forwarded-for'] || '';
  const ip      = String(ipRaw).split(',')[0].trim() || null;
  const ua      = clean(req.headers['user-agent'] || '', 500);
  const referer = clean(req.headers['referer'] || '', 500);

  const row = {
    email,
    name:    name    || null,
    company: company || null,
    role:    role    || null,
    plan,
    locale,
    source,
    ip_address: ip,
    user_agent: ua || null,
    referer:    referer || null,
    status:     'new'
  };

  try {
    const ins = await supabase('waitlist', 'POST', row);
    let repeat = false;

    if (ins.status === 409) {
      // Already on the list — update the plan and fill in any new details.
      // Never touch status/notes (admin-owned) on a repeat sign-up.
      repeat = true;
      const patch = { plan, locale };
      if (name)    patch.name    = name;
      if (company) patch.company = company;
      if (role)    patch.role    = role;
      await supabase(`waitlist?email=eq.${encodeURIComponent(email)}`, 'PATCH', patch);
    }

    // Fire-and-forget admin notification — never block or fail the response.
    sendWaitlistNotification({ ...row, repeat }).catch(e =>
      console.error('[waitlist] notify threw despite absorber:', e.message)
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    // Never leak Supabase error detail to the client.
    console.error('[waitlist] write failed:', err.message);
    res.status(500).json({ error: 'insert_failed' });
  }
}
