// ============================================================
// KIRA RESEARCH — api/_lib/cron-auth.js
// Fail-closed secret check for cron / notify endpoints.
// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. With no CRON_SECRET set, every call is rejected.
// ============================================================
import { timingSafeEqual } from 'node:crypto';

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

/** true when the request carries the right bearer; false when absent/wrong or when `secret` is unset. */
export function cronAuthorized(req, secret = process.env.CRON_SECRET) {
  if (!secret) return false;
  const h = (req.headers && req.headers['authorization']) || '';
  return safeEqual(h, `Bearer ${secret}`);
}
