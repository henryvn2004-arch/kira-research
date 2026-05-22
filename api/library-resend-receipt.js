// ============================================================
// KIRA RESEARCH — api/library-resend-receipt.js
// Re-send a purchase receipt email to the buyer's address on file.
//
//   POST /api/library-resend-receipt
//   Authorization: Bearer <supabase-jwt>
//   Body: { slug, locale }
//   → { ok: true }
//
// 401 if unauthenticated · 403 if user doesn't own this (slug, locale)
// purchase · 502 if Resend send failed · 404 if report metadata missing.
//
// The recipient is ALWAYS the JWT's user.email — never trusts a
// client-supplied address. Useful for buyers who want to forward the
// receipt to an accounting team, or who lost the original email.
// ============================================================

import { sendPurchaseReceipt } from './_lib/email.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${m[1]}` }
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: (u.email || '').toLowerCase() } : null;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
}

const LOCALES = new Set(['en', 'ja', 'ko']);
function isSlug(s) { return typeof s === 'string' && /^[a-z0-9][a-z0-9-]+$/.test(s); }

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user)        { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (!user.email)  { res.status(400).json({ error: 'no_user_email' });    return; }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    res.status(400).json({ error: 'invalid_json' }); return;
  }
  const slug   = body.slug;
  const locale = LOCALES.has(body.locale) ? body.locale : 'en';
  if (!isSlug(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }

  try {
    // 1) Verify purchase belongs to this user (defence in depth — without
    //    this anyone could spam receipts to themselves for any slug).
    const purchases = await sb(
      `purchases?user_id=eq.${user.id}` +
      `&slug=eq.${encodeURIComponent(slug)}` +
      `&locale=eq.${locale}` +
      `&status=eq.completed` +
      `&select=id,slug,locale,amount,currency,report_id&limit=1`
    );
    const purchase = Array.isArray(purchases) ? purchases[0] : null;
    if (!purchase) { res.status(403).json({ error: 'not_purchased' }); return; }

    // 2) Fetch the report title for the receipt body. Best-effort —
    //    sendPurchaseReceipt falls back to slug if title is null.
    let reportTitle = null;
    try {
      const t = await sb(
        `report_translations?report_id=eq.${purchase.report_id}` +
        `&locale=eq.${locale}&select=title&limit=1`
      );
      reportTitle = Array.isArray(t) && t[0] ? t[0].title : null;
    } catch {
      // swallow — title is cosmetic
    }

    // 3) Send. sendPurchaseReceipt absorbs its own errors and returns false
    //    on failure, so we surface that as a 502 to the client.
    const sent = await sendPurchaseReceipt({
      buyerEmail:  user.email,
      slug:        purchase.slug,
      locale:      purchase.locale,
      amount:      purchase.amount,
      currency:    purchase.currency,
      reportTitle
    });
    if (!sent) {
      res.status(502).json({ error: 'send_failed' });
      return;
    }
    res.status(200).json({ ok: true, sentTo: user.email });
  } catch (err) {
    console.error('[library-resend-receipt] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
