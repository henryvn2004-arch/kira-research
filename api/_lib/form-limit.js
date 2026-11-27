// ============================================================
// KIRA RESEARCH — api/_lib/form-limit.js
// Per-IP / per-email caps for the public forms (leads, waitlist), counted from the table itself
// (no extra state; works across serverless instances). Fails open on a DB error so the form keeps working.
// ============================================================
async function count(path) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, Prefer: 'count=exact', Range: '0-0' }
  });
  const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
  return m ? Number(m[1]) : 0;
}

/** true when this IP or email already used up its share. Defaults: 10 per IP per hour, 3 per email per day. */
export async function formLimited(table, { ip, email, perIpHour = 10, perEmailDay = 3 }) {
  try {
    const hour = new Date(Date.now() - 3600000).toISOString(), day = new Date(Date.now() - 86400000).toISOString();
    if (ip && await count(`${table}?ip_address=eq.${encodeURIComponent(ip)}&created_at=gte.${hour}&select=id`) >= perIpHour) return true;
    if (email && await count(`${table}?email=eq.${encodeURIComponent(email)}&created_at=gte.${day}&select=id`) >= perEmailDay) return true;
  } catch (e) { console.error('[form-limit]', e.message); }
  return false;
}
