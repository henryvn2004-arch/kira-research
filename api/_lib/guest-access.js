// ============================================================
// KIRA RESEARCH — api/_lib/guest-access.js
// Purchase-scoped access token for guest checkout. The payer's email is NOT verified by PayPal guest card
// checkout, so a guest purchase never yields a login session. Instead capture returns an HMAC-signed token
// {kind, item slug, purchase id, exp} that opens THAT item only, in the browser that paid. The account
// itself is reached only through the link emailed to the payer address (inbox owner).
//
// Token = base64url(payload) + '.' + base64url(HMAC-SHA256(secret, payloadB64)). Secret: env GUEST_ACCESS_SECRET
// (without it no token is issued and nothing is accepted). Sent as header X-Guest-Token.
// guestOwns() also re-reads the purchase row: it must still be 'completed' (a refund revokes access) and match
// the item. It never looks at ADMIN_EMAILS or subscriptions: a guest token is never an admin or subscriber.
// ============================================================
import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_DAYS = 30;
const KINDS = { report: 'purchases', transcript: 'transcript_purchases' };
const b64 = (b) => Buffer.from(b).toString('base64url');

function secret() { const s = process.env.GUEST_ACCESS_SECRET; return s && s.length >= 16 ? s : null; }
function mac(payloadB64, key) { return createHmac('sha256', key).update(payloadB64).digest(); }

/** → token string, or null when the secret is not configured. */
export function signGuestToken({ kind, slug, pid, now = Date.now(), key = secret() }) {
  if (!key || !KINDS[kind] || !slug || !pid) return null;
  const p = b64(JSON.stringify({ k: kind, s: slug, p: pid, e: Math.floor(now / 1000) + TTL_DAYS * 86400 }));
  return p + '.' + b64(mac(p, key));
}

/** → { kind, slug, pid } when signature, expiry, kind and slug all match; else null. */
export function verifyGuestToken(token, kind, slug, { now = Date.now(), key = secret() } = {}) {
  try {
    if (!key || typeof token !== 'string' || token.length > 600) return null;
    const [p, s] = token.split('.');
    if (!p || !s) return null;
    const want = mac(p, key), got = Buffer.from(s, 'base64url');
    if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
    const d = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (d.k !== kind || d.s !== slug || !d.p || !(d.e > Math.floor(now / 1000))) return null;
    return { kind: d.k, slug: d.s, pid: String(d.p) };
  } catch (_e) { return null; }
}

/**
 * The completed purchase row this request's guest token unlocks for (kind, slug), or null.
 * Re-checks the row, so a refunded purchase stops working.
 */
export async function guestOwns(req, kind, slug) {
  const t = verifyGuestToken(String(req.headers['x-guest-token'] || ''), kind, slug);
  if (!t || !/^[0-9a-f-]{36}$/i.test(t.pid)) return null;
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${KINDS[kind]}?id=eq.${t.pid}&slug=eq.${encodeURIComponent(slug)}&status=eq.completed&select=*&limit=1`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] || null;
}

export function maskEmail(email) {
  const [u, d] = String(email || '').split('@');
  if (!u || !d) return '';
  return u.slice(0, 1) + '***@' + d;
}
