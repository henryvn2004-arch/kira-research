// ============================================================
// KIRA RESEARCH — api/library-buy.js
// PayPal checkout for library reports (one report × one locale).
//
//   POST /api/library-buy?action=create   body { slug, locale }   Authorization: Bearer (REQUIRED)
//       → { approveUrl, orderId, amount, currency }
//
//   POST /api/library-buy?action=capture  body { orderId, slug, locale }
//       Authorization: Bearer <supabase-jwt>   (REQUIRED)
//       → { ok, purchase: { id, slug, locale } }
//
// The PayPal `custom_id` carries "report:slug|locale|userId" so the capture step can
// rebuild context without trusting the client (see api/_lib/paypal-check.js).
// ============================================================

import { sendPurchaseReceipt } from './_lib/email.js';
import { getConfig } from './_lib/config.js';
import { REPORT_PRICE_DEFAULT } from './_lib/pricing.js';
import { buildCustomId, captureOrder } from './_lib/paypal-check.js';

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

// ── JWT verify ───────────────────────────────────────────
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
      // Orders are bound to the signed-in buyer (custom_id carries the user id; capture must match).
      const buyer = await verifyBearer(req);
      if (!buyer) { res.status(401).json({ error: 'unauthenticated' }); return; }

      // Look up the report — price + status come from DB, never from client.
      const rows = await sb(
        `living_reports?slug=eq.${encodeURIComponent(slug)}` +
        `&status=eq.published&select=id,slug,price,currency&limit=1`
      );
      const report = Array.isArray(rows) ? rows[0] : null;
      if (!report) { res.status(404).json({ error: 'report_not_found' }); return; }

      const amount   = (report.price || REPORT_PRICE_DEFAULT).toFixed(2);
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
            custom_id: buildCustomId('report', slug, locale, buyer.id)
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

      res.status(200).json({
        approveUrl,
        orderId: order.id,
        amount: Number(amount),
        currency,
        slug,
        locale
      });
      return;
    }

    // ── CAPTURE ─────────────────────────────────────────
    if (action === 'capture') {
      // Capture REQUIRES auth; the order must have been created by this same user (custom_id).
      const user = await verifyBearer(req);
      if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

      const orderId = body.orderId;
      if (!orderId || typeof orderId !== 'string') {
        res.status(400).json({ error: 'bad_order_id' }); return;
      }

      // An order already recorded: same buyer gets it back, anyone else is refused.
      const prior = await sb(`purchases?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`);
      if (prior && prior[0]) {
        if (prior[0].user_id !== user.id) { res.status(409).json({ error: 'order_already_used' }); return; }
        res.status(200).json({ ok: true, purchase: { id: prior[0].id, slug: prior[0].slug, locale: prior[0].locale } });
        return;
      }

      const token = await getPayPalToken();
      const cap = await captureOrder({
        token, orderId, kind: 'report', userId: user.id,
        priceFor: async ({ item }) => {
          if (!isSlug(item)) return null;
          const rows = await sb(`living_reports?slug=eq.${encodeURIComponent(item)}&select=id,price,currency&limit=1`);
          const r = Array.isArray(rows) ? rows[0] : null;
          return r ? { ...r, expected: Number((r.price || REPORT_PRICE_DEFAULT).toFixed(2)) } : null;
        }
      });
      if (cap.error) { res.status(cap.status).json({ error: cap.error }); return; }
      const slug   = cap.parsed.item;
      const locale = LOCALES.has(cap.parsed.locale) ? cap.parsed.locale : 'en';
      const report = cap.item;
      const paidAmount = cap.paid;

      // Upsert purchase row. Unique index prevents dupes.
      const purchaseRow = {
        user_id:         user.id,
        slug,
        locale,
        report_id:       report.id,
        report_type:     'library_report',
        amount:          paidAmount,
        currency:        report.currency || 'USD',
        paypal_order_id: orderId,
        status:          'completed',
        captured_at:     new Date().toISOString()
      };

      let purchase;
      try {
        const inserted = await sb('purchases', 'POST', purchaseRow);
        purchase = Array.isArray(inserted) ? inserted[0] : inserted;
      } catch (err) {
        // Likely a unique index hit (same order, or same user+report+locale bought twice).
        const sameOrder = await sb(`purchases?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=id,user_id&limit=1`);
        if (sameOrder && sameOrder[0] && sameOrder[0].user_id !== user.id) { res.status(409).json({ error: 'order_already_used' }); return; }
        const existing = await sb(
          `purchases?user_id=eq.${user.id}&slug=eq.${encodeURIComponent(slug)}` +
          `&locale=eq.${locale}&status=eq.completed&select=*&limit=1`
        );
        purchase = Array.isArray(existing) ? existing[0] : null;
        if (!purchase) throw err;
      }

      // Fire-and-forget receipt email — never block the success response or
      // propagate failures. The helper itself absorbs errors; the .catch() is
      // belt-and-suspenders. Best-effort title fetch — falls back to slug if
      // the translation row is missing or the lookup errors out.
      (async () => {
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
          buyerEmail:  user.email,
          slug:        purchase.slug,
          locale:      purchase.locale,
          amount:      purchase.amount,
          currency:    purchase.currency,
          reportTitle
        });
      })().catch(e =>
        console.error('[library-buy] receipt threw despite absorber:', e.message)
      );

      res.status(200).json({
        ok: true,
        purchase: { id: purchase.id, slug: purchase.slug, locale: purchase.locale },
        order: { id: purchase.id, amount: Number(purchase.amount) || 0, currency: purchase.currency || 'USD' }
      });
      return;
    }

    res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('[library-buy] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
