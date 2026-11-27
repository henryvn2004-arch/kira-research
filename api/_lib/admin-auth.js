// ============================================================
// KIRA RESEARCH — api/_lib/admin-auth.js
// Fail-closed admin gate. Bearer is verified by Supabase (/auth/v1/user), then the email must be in ADMIN_EMAILS.
// An empty/missing ADMIN_EMAILS means nobody is admin (never "everybody").
// ============================================================
export async function bearerUser(req) {
  const m = String((req.headers && req.headers['authorization']) || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${m[1]}` }
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: (u.email || '').toLowerCase() } : null;
}

export function adminEmails() {
  return (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email, list = adminEmails()) {
  return list.length > 0 && list.includes(String(email || '').toLowerCase());
}

/** → { user } when admin, else { status, error }. */
export async function requireAdmin(req) {
  const list = adminEmails();
  if (!list.length) return { status: 500, error: 'admin_not_configured' };
  const user = await bearerUser(req);
  if (!user) return { status: 401, error: 'unauthenticated' };
  if (!isAdminEmail(user.email, list)) return { status: 403, error: 'not_admin' };
  return { user };
}
