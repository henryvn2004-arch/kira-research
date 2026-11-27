// ============================================================
// KIRA RESEARCH — api/_lib/checkout-orders.js
// Remember a PayPal order the moment a SIGNED-IN buyer starts it, so the abandoned-checkout reminders
// (api/cron-sequences.js) know who to write to. A guest is NOT recorded: guest checkout has no email until the
// payment is captured (the payer's email comes from PayPal then), so there is nobody to remind.
// Best-effort: a failure here must never break checkout. Rows are matched against the purchase tables by
// paypal_order_id before anything is sent, so a bought order is never reminded.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const LOCALES = new Set(['en', 'ja', 'ko', 'zh']);

/** buyer = result of createBuyer(); only { user: { id, email } } is stored. Never throws. */
export async function recordCheckoutOrder({ buyer, orderId, kind, slug, locale = 'en', amount = null, currency = 'USD' }) {
  try {
    const user = buyer && buyer.user;
    if (!user || !user.email || !orderId || !slug) return false;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/checkout_orders`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify({ paypal_order_id: orderId, kind, slug, locale: LOCALES.has(locale) ? locale : 'en', user_id: user.id,
        email: String(user.email).toLowerCase(), amount: Number(amount) || null, currency })
    });
    return r.ok;
  } catch (err) { console.warn('[checkout-orders] not recorded:', err.message); return false; }
}
