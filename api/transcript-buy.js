// ============================================================
// KIRA RESEARCH — api/transcript-buy.js
// PayPal checkout for one Kira Experts transcript (all its languages), its price (expert_transcripts.price, api/_lib/pricing.js).
//
//   POST /api/transcript-buy?action=create   body { slug, locale, licence? }   (Bearer optional: guest checkout)
//       → { approveUrl, orderId, amount, currency, licence, nonce? }   (403 checkout_closed while off)
//   POST /api/transcript-buy?action=capture  body { orderId, nonce?, attr? }   Bearer OR the guest nonce from create
//       → { ok, purchase: { id, slug }, guest?: { email (masked), accessToken } }
// Guest checkout: see api/_lib/guest-checkout.js (account from the payer's email after a verified capture).
//
// Selling is switched by config `checkout.transcript_enabled` (/en/admin/config → Checkout, default
// off). The price always comes from the server, never from the client. The PayPal `custom_id` carries
// "slug|locale" so the capture step can rebuild the context. A capture of an order started before the
// switch went off still completes. Same shape as api/library-buy.js.
// ============================================================

import { buildCustomId, captureOrder } from './_lib/paypal-check.js';
import { sendPurchaseReceipt } from './_lib/email.js';
import { recordCheckoutOrder } from './_lib/checkout-orders.js';
import { getConfig } from './_lib/config.js';
import { transcriptPriceOf } from './_lib/pricing.js';
import { SLUG_RE, LOCALES } from './_lib/transcripts.js';
import { licencePrice, normLicence } from './_lib/licence.js';
import { signGuestToken, maskEmail } from './_lib/guest-access.js';
import { createBuyer, captureBuyer, ensureGuestAccount, payerEmail, guestOrderLimited, cleanAttr } from './_lib/guest-checkout.js';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL              = process.env.APP_URL || 'https://kiraresearch.com';

async function getPayPalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('PayPal auth failed: ' + res.status);
  return (await res.json()).access_token;
}

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' || method === 'PATCH' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'method_not_allowed' }); return; }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }
  const action = (req.query || {}).action;

  try {
    // ── CREATE ──────────────────────────────────────────
    if (action === 'create') {
      const slug = body.slug;
      const locale = LOCALES.has(body.locale) ? body.locale : 'en';
      if (typeof slug !== 'string' || !SLUG_RE.test(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }
      if (!(await getConfig('checkout.transcript_enabled'))) { res.status(403).json({ error: 'checkout_closed' }); return; }
      const licence = normLicence(body.licence);
      // EU/UK withdrawal acknowledgement: the buy box makes the tick required; the server refuses an order without it.
      if (body.consent !== true) { res.status(400).json({ error: 'consent_required' }); return; }
      const buyer = await createBuyer(req);   // signed-in buyer, or a guest nonce: the order is bound to it (custom_id)
      if (buyer.guest && guestOrderLimited(req)) { res.status(429).json({ error: 'too_many_orders' }); return; }

      const rows = await sb(`expert_transcripts?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,slug,price&limit=1`);
      if (!rows[0]) { res.status(404).json({ error: 'transcript_not_found' }); return; }

      const amount = licencePrice(transcriptPriceOf(rows[0]), licence).toFixed(2);
      const token = await getPayPalToken();
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value: amount },
            description: `KIRA RESEARCH — expert transcript ${slug}`,
            custom_id: buildCustomId('transcript', slug, locale, buyer.ownerId, licence, true)
          }],
          application_context: {
            brand_name: 'KIRA RESEARCH', landing_page: 'BILLING', user_action: 'PAY_NOW',
            return_url: `${APP_URL}/${locale}/experts/transcripts/${slug}?paypal=success`,
            cancel_url: `${APP_URL}/${locale}/experts/transcripts/${slug}?paypal=cancel`
          }
        })
      });
      if (!orderRes.ok) throw new Error('paypal_create_failed_' + orderRes.status);
      const order = await orderRes.json();
      const approveUrl = (order.links || []).find(l => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('no_approve_url');
      await recordCheckoutOrder({ buyer, orderId: order.id, kind: 'transcript', slug, locale, amount });
      res.status(200).json({ approveUrl, orderId: order.id, amount: Number(amount), currency: 'USD', slug, locale, licence, ...(buyer.guest ? { nonce: buyer.guest.nonce } : {}) });
      return;
    }

    // ── CAPTURE ─────────────────────────────────────────
    if (action === 'capture') {
      const buyer = await captureBuyer(req, body);   // Bearer user, or the guest nonce from create
      if (!buyer) { res.status(401).json({ error: 'unauthenticated' }); return; }
      const orderId = body.orderId;
      if (!orderId || typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{5,64}$/.test(orderId)) { res.status(400).json({ error: 'bad_order_id' }); return; }

      // A signed-in buyer's order already recorded: same buyer gets it back, anyone else is refused.
      if (buyer.user) {
        const prior = await sb(`transcript_purchases?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=id,user_id,slug&limit=1`);
        if (prior[0]) {
          if (prior[0].user_id !== buyer.user.id) { res.status(409).json({ error: 'order_already_used' }); return; }
          res.status(200).json({ ok: true, purchase: { id: prior[0].id, slug: prior[0].slug } });
          return;
        }
      }

      const token = await getPayPalToken();
      const cap = await captureOrder({
        token, orderId, kind: 'transcript', userId: buyer.ownerId,
        priceFor: async ({ item, licence }) => {
          if (!SLUG_RE.test(item)) return null;
          const rows = await sb(`expert_transcripts?slug=eq.${encodeURIComponent(item)}&select=id,slug,price&limit=1`);
          return rows[0] ? { ...rows[0], expected: licencePrice(transcriptPriceOf(rows[0]), licence) } : null;
        }
      });
      if (cap.error) { res.status(cap.status).json({ error: cap.error }); return; }
      const slug = cap.parsed.item;
      const locale = LOCALES.has(cap.parsed.locale) ? cap.parsed.locale : 'en';
      const licence = cap.parsed.licence;
      const transcript = cap.item;
      const paid = cap.paid;

      // Guest: account from the payer's email, only now that the payment is verified.
      let userId, userEmail, guestEmail = null, signInUrl = null;
      if (buyer.guest) {
        const acct = await ensureGuestAccount(payerEmail(cap.payer), { next: `/${locale}/experts/transcripts/${slug}`, loc: locale });
        if (acct.error) { console.error('[transcript-buy] PAID but no account, order', orderId, acct.error); res.status(500).json({ error: acct.error }); return; }
        userId = acct.userId; userEmail = acct.email; signInUrl = acct.signInUrl;
        guestEmail = acct.email;
      } else { userId = buyer.user.id; userEmail = buyer.user.email; }

      const row = {
        user_id: userId, transcript_id: transcript.id, slug, amount: paid, currency: 'USD',
        paypal_order_id: orderId, status: 'completed', captured_at: new Date().toISOString(),
        licence, guest: !!buyer.guest, attribution: cleanAttr(body.attr), withdrawal_waiver: !!cap.parsed.waiver, locale
      };
      let purchase;
      try {
        const ins = await sb('transcript_purchases', 'POST', row);
        purchase = Array.isArray(ins) ? ins[0] : ins;
        // First time this order is recorded: send the receipt (best effort, never blocks the answer).
        (async () => {
          let title = null;
          try {
            const t = await sb(`expert_transcript_translations?transcript_id=eq.${transcript.id}&locale=eq.${locale}&select=title&limit=1`);
            title = t[0] ? t[0].title : null;
          } catch (e) { console.warn('[transcript-buy] title fetch for receipt failed', e.message); }
          return sendPurchaseReceipt({ buyerEmail: userEmail, slug, locale, amount: row.amount, currency: 'USD', reportTitle: title, kind: 'transcript', licence, signInUrl });
        })().catch(e => console.error('[transcript-buy] receipt threw:', e.message));
      } catch (err) {
        // The same order captured twice, or this reader already owns it: answer with the existing row.
        const same = await sb(`transcript_purchases?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`);
        if (same[0]) purchase = same[0];
        else {
          const existing = await sb(`transcript_purchases?user_id=eq.${userId}&transcript_id=eq.${transcript.id}&status=eq.completed&select=*&limit=1`);
          purchase = existing[0];
          if (!purchase) throw err;
          // Paid twice for the same transcript with two different orders: tell the owner to refund one.
          console.error('[transcript-buy] DOUBLE PURCHASE, refund order', orderId, 'user', userId, 'slug', slug);
        }
      }
      res.status(200).json({ ok: true, purchase: { id: purchase.id, slug: purchase.slug }, licence: purchase.licence || licence, amount: Number(purchase.amount), order: { id: purchase.id, amount: Number(purchase.amount) || 0, currency: 'USD' }, ...(guestEmail ? { guest: { email: maskEmail(guestEmail), accessToken: signGuestToken({ kind: 'transcript', slug, pid: purchase.id }) } } : {}) });
      return;
    }

    res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('[transcript-buy] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
