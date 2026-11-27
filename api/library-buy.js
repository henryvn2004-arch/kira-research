// ============================================================
// KIRA RESEARCH — api/library-buy.js
// PayPal checkout for library reports (one report × one locale).
//
//   POST /api/library-buy?action=create   body { slug, locale, licence? }   Authorization: Bearer (optional)
//       → { approveUrl, orderId, amount, currency, licence, nonce? }   (nonce only for a guest buyer)
//
//   POST /api/library-buy?action=capture  body { orderId, nonce?, attr? }
//       Authorization: Bearer <supabase-jwt>  OR  nonce from create (guest checkout)
//       → { ok, purchase: { id, slug, locale }, guest?: { email (masked), accessToken } }
//
// No account is needed to buy (stage 0, 2026-11-27): a guest pays with PayPal, and after a verified capture
// the account is found or created from the payer's email (api/_lib/guest-checkout.js).
// The PayPal `custom_id` carries "report:slug|locale|userId-or-nonce[|licence]" so the capture step can
// rebuild context without trusting the client (see api/_lib/paypal-check.js).
// ============================================================

import { sendPurchaseReceipt } from './_lib/email.js';
import { recordCheckoutOrder } from './_lib/checkout-orders.js';
import { getConfig } from './_lib/config.js';
import { REPORT_PRICE_DEFAULT } from './_lib/pricing.js';
import { buildCustomId, captureOrder } from './_lib/paypal-check.js';
import { licencePrice, normLicence } from './_lib/licence.js';
import { signGuestToken, maskEmail } from './_lib/guest-access.js';
import { createBuyer, captureBuyer, ensureGuestAccount, payerEmail, guestOrderLimited, cleanAttr } from './_lib/guest-checkout.js';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL              = process.env.APP_URL || 'https://kiraresearch.com';

// ── PayPal auth ──────────────────────────────────────────
async function getPayPalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET
      ).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('PayPal auth failed: ' + res.status);
  const data = await res.json();
  return data.access_token;
}

// ── Supabase REST ────────────────────────────────────────
async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' || method === 'PATCH' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase ${res.status}: ${txt}`);
  }
  return res.status === 204 ? null : res.json();
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const LOCALES = new Set(['en', 'ja', 'ko', 'zh']);

function isSlug(s) { return typeof s === 'string' && /^[a-z0-9][a-z0-9-]+$/.test(s); }

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const action = req.query.action;
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }

  try {
    // ── CREATE ──────────────────────────────────────────
    if (action === 'create') {
      const slug   = body.slug;
      const locale = LOCALES.has(body.locale) ? body.locale : 'en';
      if (!isSlug(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }
      if (!(await getConfig('checkout.single_report_enabled'))) { res.status(403).json({ error: 'checkout_closed' }); return; }
      const licence = normLicence(body.licence);
      // Signed-in buyer, or a guest: the order is bound to the user id / the guest nonce (custom_id; capture must match).
      const buyer = await createBuyer(req);
      if (buyer.guest && guestOrderLimited(req)) { res.status(429).json({ error: 'too_many_orders' }); return; }

      // Look up the report — price + status come from DB, never from client.
      const rows = await sb(
        `living_reports?slug=eq.${encodeURIComponent(slug)}` +
        `&status=eq.published&select=id,slug,price,currency&limit=1`
      );
      const report = Array.isArray(rows) ? rows[0] : null;
      if (!report) { res.status(404).json({ error: 'report_not_found' }); return; }

      const amount   = licencePrice(report.price || REPORT_PRICE_DEFAULT, licence).toFixed(2);
      const currency = report.currency || 'USD';

      const token = await getPayPalToken();
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: currency, value: amount },
            description: `KIRA RESEARCH — ${slug} (${locale})`,
            // We re-derive item + locale + buyer from this field at capture time.
            custom_id: buildCustomId('report', slug, locale, buyer.ownerId, licence)
          }],
          application_context: {
            brand_name:   'KIRA RESEARCH',
            landing_page: 'BILLING',
            user_action:  'PAY_NOW',
            return_url: `${APP_URL}/${locale}/reports/${slug}?paypal=success`,
            cancel_url: `${APP_URL}/${locale}/reports/${slug}?paypal=cancel`
          }
        })
      });
      if (!orderRes.ok) throw new Error('paypal_create_failed_' + orderRes.status);
      const order = await orderRes.json();
      const approveUrl = (order.links || []).find(l => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('no_approve_url');

      await recordCheckoutOrder({ buyer, orderId: order.id, kind: 'report', slug, locale, amount, currency });   // signed-in only: abandoned-checkout reminders

      res.status(200).json({
        approveUrl,
        orderId: order.id,
        amount: Number(amount),
        currency,
        slug,
        locale,
        licence,
        ...(buyer.guest ? { nonce: buyer.guest.nonce } : {})
      });
      return;
    }

    // ── CAPTURE ─────────────────────────────────────────
    if (action === 'capture') {
      // The caller is the signed-in buyer, or the guest holding the nonce from create; either way the
      // order's custom_id must match (checked by captureOrder before any money moves).
      const buyer = await captureBuyer(req, body);
      if (!buyer) { res.status(401).json({ error: 'unauthenticated' }); return; }

      const orderId = body.orderId;
      if (!orderId || typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{5,64}$/.test(orderId)) {
        res.status(400).json({ error: 'bad_order_id' }); return;
      }

      // A signed-in buyer's order already recorded: same buyer gets it back, anyone else is refused.
      // (A guest goes through captureOrder first, which proves the nonce; see below.)
      if (buyer.user) {
        const prior = await sb(`purchases?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`);
        if (prior && prior[0]) {
          if (prior[0].user_id !== buyer.user.id) { res.status(409).json({ error: 'order_already_used' }); return; }
          res.status(200).json({ ok: true, purchase: { id: prior[0].id, slug: prior[0].slug, locale: prior[0].locale }, licence: prior[0].licence });
          return;
        }
      }

      const token = await getPayPalToken();
      const cap = await captureOrder({
        token, orderId, kind: 'report', userId: buyer.ownerId,
        priceFor: async ({ item, licence }) => {
          if (!isSlug(item)) return null;
          const rows = await sb(`living_reports?slug=eq.${encodeURIComponent(item)}&select=id,price,currency&limit=1`);
          const r = Array.isArray(rows) ? rows[0] : null;
          return r ? { ...r, expected: Number(licencePrice(r.price || REPORT_PRICE_DEFAULT, licence).toFixed(2)) } : null;
        }
      });
      if (cap.error) { res.status(cap.status).json({ error: cap.error }); return; }
      const slug   = cap.parsed.item;
      const locale = LOCALES.has(cap.parsed.locale) ? cap.parsed.locale : 'en';
      const licence = cap.parsed.licence;
      const report = cap.item;
      const paidAmount = cap.paid;

      // Guest: the account comes from the payer's email (PayPal verified it), only now that the payment is verified.
      let userId, userEmail, guestEmail = null, signInUrl = null;
      if (buyer.guest) {
        const acct = await ensureGuestAccount(payerEmail(cap.payer), { next: `/${locale}/reports/${slug}`, loc: locale });
        if (acct.error) {
          console.error('[library-buy] PAID but no account, order', orderId, acct.error);
          res.status(500).json({ error: acct.error }); return;
        }
        userId = acct.userId; userEmail = acct.email; signInUrl = acct.signInUrl;
        guestEmail = acct.email;
      } else { userId = buyer.user.id; userEmail = buyer.user.email; }

      // Upsert purchase row. Unique index prevents dupes.
      const purchaseRow = {
        user_id:         userId,
        slug,
        locale,
        report_id:       report.id,
        report_type:     'library_report',
        amount:          paidAmount,
        currency:        report.currency || 'USD',
        paypal_order_id: orderId,
        status:          'completed',
        captured_at:     new Date().toISOString(),
        licence,
        guest:           !!buyer.guest,
        attribution:     cleanAttr(body.attr)
      };

      let purchase, fresh = false;
      try {
        const inserted = await sb('purchases', 'POST', purchaseRow);
        purchase = Array.isArray(inserted) ? inserted[0] : inserted;
        fresh = true;
      } catch (err) {
        // Likely a unique index hit (same order, or same user+report+locale bought twice).
        const sameOrder = await sb(`purchases?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`);
        if (sameOrder && sameOrder[0]) {
          // The order id is already filed. For a guest, captureOrder proved this browser owns the order.
          if (!buyer.guest && sameOrder[0].user_id !== userId) { res.status(409).json({ error: 'order_already_used' }); return; }
          purchase = sameOrder[0];
        } else {
          const existing = await sb(
            `purchases?user_id=eq.${userId}&slug=eq.${encodeURIComponent(slug)}` +
            `&locale=eq.${locale}&status=eq.completed&select=*&limit=1`
          );
          purchase = Array.isArray(existing) ? existing[0] : null;
          if (!purchase) throw err;
          console.error('[library-buy] DOUBLE PURCHASE, refund order', orderId, 'user', userId, 'slug', slug);
        }
      }

      // Fire-and-forget receipt email (a guest gets the sign-in link in the same mail) — never block the
      // success response. Only for a purchase recorded just now, so a retry does not mail twice.
      if (fresh) (async () => {
        let reportTitle = null;
        try {
          const t = await sb(
            `report_translations?report_id=eq.${report.id}` +
            `&locale=eq.${locale}&select=title&limit=1`
          );
          reportTitle = Array.isArray(t) && t[0] ? t[0].title : null;
        } catch (e) {
          console.warn('[library-buy] title fetch for receipt failed', e.message);
        }
        return sendPurchaseReceipt({
          buyerEmail:  userEmail,
          slug:        purchase.slug,
          locale:      purchase.locale,
          amount:      purchase.amount,
          currency:    purchase.currency,
          reportTitle,
          licence,
          signInUrl
        });
      })().catch(e =>
        console.error('[library-buy] receipt threw despite absorber:', e.message)
      );

      res.status(200).json({
        ok: true,
        purchase: { id: purchase.id, slug: purchase.slug, locale: purchase.locale },
        licence: purchase.licence || licence,
        amount: Number(purchase.amount),
        ...(guestEmail ? { guest: { email: maskEmail(guestEmail), accessToken: signGuestToken({ kind: 'report', slug, pid: purchase.id }) } } : {})
      });
      return;
    }

    res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('[library-buy] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
