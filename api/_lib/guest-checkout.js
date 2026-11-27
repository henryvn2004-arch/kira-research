// ============================================================
// KIRA RESEARCH — api/_lib/guest-checkout.js
// Guest checkout for the three one-off purchases (report, transcript, company list).
//
//  create:  no sign-in needed. The server makes a random nonce, puts it in the PayPal custom_id where a
//           signed-in buyer's user id would go, and hands it to the browser. Only that browser can capture
//           the order (api/_lib/paypal-check.js checks custom_id against the caller).
//  capture: after PayPal says COMPLETED and the amount matches, the buyer identity is the payer's email
//           (PayPal verified). ensureGuestAccount() finds or creates the Supabase user for it (admin API),
//           the purchase is recorded against that user. The browser gets a purchase-scoped access token
//           (api/_lib/guest-access.js), never a login session: the payer email is not verified by PayPal
//           guest card checkout. The receipt email carries the one-time sign-in link (inbox owner only).
//  Access is never granted before a verified capture: nothing here runs until captureOrder() succeeded.
// ============================================================
import { randomUUID } from 'node:crypto';
import { verifyBearer } from './transcripts.js';
import { cleanAttr } from './attribution.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL = process.env.APP_URL || 'https://kiraresearch.com';
const UID_RE = /^[0-9a-f-]{36}$/i;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// Best-effort per-IP limit on new guest orders (each one is a PayPal API call): 15 per 10 minutes.
const hits = new Map();
export function guestOrderLimited(req) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), rec = hits.get(ip);
  if (!rec || now - rec.t > 600000) { hits.set(ip, { t: now, n: 1 }); if (hits.size > 5000) hits.clear(); return false; }
  return ++rec.n > 15;
}

/**
 * Who is calling create?  { user:{id,email} }  signed in, or  { guest:{ nonce } }  new guest order.
 * A bad or expired token is treated as a guest (the payer email decides the account anyway).
 */
export async function createBuyer(req) {
  const user = await verifyBearer(req);
  if (user) return { user, ownerId: user.id };
  const nonce = randomUUID();
  return { guest: { nonce }, ownerId: nonce };
}

/**
 * Who is calling capture?  A guest sends the nonce it got at create time; otherwise the Bearer user.
 * Returns { user }, { guest:{nonce} } or null.
 */
export async function captureBuyer(req, body) {
  const nonce = typeof body.nonce === 'string' && UID_RE.test(body.nonce) ? body.nonce.toLowerCase() : null;
  if (nonce) return { guest: { nonce }, ownerId: nonce };
  const user = await verifyBearer(req);
  return user ? { user, ownerId: user.id } : null;
}

async function admin(path, body) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

/** A safe same-site path to land on after sign-in (no scheme, no //). */
export function safeNext(p) {
  const s = String(p || '');
  return /^\/[A-Za-z0-9/_\-.]{0,200}$/.test(s) && !s.startsWith('//') ? s : '/';
}

/**
 * Find or create the account for a payer email and mint ONE one-time sign-in link for the receipt email.
 * PayPal guest card checkout does not verify the typed email, so nothing here signs the browser in: the link
 * goes only to the inbox of that address. The user is created confirmed but password-less and never admin.
 * → { userId, email, signInUrl } or { error }.
 */
export async function ensureGuestAccount(rawEmail, { next = '/', loc = 'en' } = {}) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: 'payer_email_missing' };
  const created = await admin('users', { email, email_confirm: true });
  if (!created.ok && !(created.status === 422 || created.status === 409)) {
    console.error('[guest] create user failed', created.status);
    return { error: 'account_failed' };
  }
  const a = await admin('generate_link', { type: 'recovery', email });
  const userId = (a.j && (a.j.id || (a.j.user && a.j.user.id))) || (created.ok ? created.j.id : null);
  if (!a.ok || !userId) { console.error('[guest] generate_link failed', a.status); return { error: 'account_failed' }; }
  const q = new URLSearchParams({ next: safeNext(next), lang: ['en', 'ja', 'ko', 'zh'].includes(loc) ? loc : 'en', email });
  if (a.j.hashed_token) { q.set('token_hash', a.j.hashed_token); q.set('type', 'recovery'); }
  return { userId, email, signInUrl: `${APP_URL}/auth.html?${q.toString()}` };
}

/** The payer's email from a PayPal order (verified by PayPal). */
export function payerEmail(payer) {
  return payer && typeof payer.email_address === 'string' ? payer.email_address : '';
}

export { cleanAttr };
