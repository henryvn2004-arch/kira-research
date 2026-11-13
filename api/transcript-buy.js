// ============================================================
// KIRA RESEARCH — api/transcript-buy.js
// PayPal checkout for one Kira Experts transcript (all its languages), $29 (api/_lib/pricing.js).
//
//   POST /api/transcript-buy?action=create   body { slug, locale }
//       → { approveUrl, orderId, amount, currency }          (403 checkout_closed while off)
//   POST /api/transcript-buy?action=capture  body { orderId }   Authorization: Bearer <supabase-jwt>
//       → { ok, purchase: { id, slug } }
//
// Selling is switched by config `checkout.transcript_enabled` (/en/admin/config → Checkout, default
// off). The price always comes from the server, never from the client. The PayPal `custom_id` carries
// "slug|locale" so the capture step can rebuild the context. A capture of an order started before the
// switch went off still completes. Same shape as api/library-buy.js.
// ============================================================

import { sendPurchaseReceipt } from './_lib/email.js';
import { getConfig } from './_lib/config.js';
import { TRANSCRIPT_PRICE } from './_lib/pricing.js';
import { SLUG_RE, LOCALES, verifyBearer } from './_lib/transcripts.js';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
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

      const rows = await sb(`expert_transcripts?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,slug&limit=1`);
      if (!rows[0]) { res.status(404).json({ error: 'transcript_not_found' }); return; }

      const amount = TRANSCRIPT_PRICE.toFixed(2);
      const token = await getPayPalToken();
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value: amount },
            description: `KIRA RESEARCH — expert transcript ${slug}`,
            custom_id: `${slug}|${locale}`
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
      res.status(200).json({ approveUrl, orderId: order.id, amount: Number(amount), currency: 'USD', slug, locale });
      return;
    }

    // ── CAPTURE ─────────────────────────────────────────
    if (action === 'capture') {
      const user = await verifyBearer(req);
      if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
      const orderId = body.orderId;
      if (!orderId || typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{5,64}$/.test(orderId)) { res.status(400).json({ error: 'bad_order_id' }); return; }

      const token = await getPayPalToken();
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const capture = await capRes.json().catch(() => ({}));
      const issue = capture.status || capture.details?.[0]?.issue || '';
      const alreadyCaptured = capRes.status === 422 && String(capture?.details?.[0]?.issue || '').includes('ALREADY_CAPTURED');
      if (!capRes.ok && !alreadyCaptured) {
        console.error('[transcript-buy] capture failed', capRes.status, capture);
        res.status(400).json({ error: 'paypal_capture_failed', details: issue });
        return;
      }

      let units;
      if (alreadyCaptured) {
        const o = await (await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })).json();
        units = o.purchase_units || [];
      } else units = capture.purchase_units || [];
      const unit = units[0] || {};
      const customId = unit.custom_id || unit.payments?.captures?.[0]?.custom_id || '';
      const [slugFromPayPal, localeFromPayPal] = String(customId).split('|');
      const slug = typeof slugFromPayPal === 'string' && SLUG_RE.test(slugFromPayPal) ? slugFromPayPal : null;
      const locale = LOCALES.has(localeFromPayPal) ? localeFromPayPal : 'en';
      if (!slug) { res.status(400).json({ error: 'bad_custom_id' }); return; }

      const rows = await sb(`expert_transcripts?slug=eq.${encodeURIComponent(slug)}&select=id,slug&limit=1`);
      const transcript = rows[0];
      if (!transcript) { res.status(404).json({ error: 'transcript_not_found' }); return; }

      const paid = Number(unit.amount?.value ?? unit.payments?.captures?.[0]?.amount?.value ?? 0);
      if (paid > 0 && Math.abs(paid - TRANSCRIPT_PRICE) > 0.01) {
        console.warn('[transcript-buy] amount mismatch', { paid, expected: TRANSCRIPT_PRICE, slug });
      }

      const row = {
        user_id: user.id, transcript_id: transcript.id, slug, amount: paid || TRANSCRIPT_PRICE, currency: 'USD',
        paypal_order_id: orderId, status: 'completed', captured_at: new Date().toISOString()
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
          return sendPurchaseReceipt({ buyerEmail: user.email, slug, locale, amount: row.amount, currency: 'USD', reportTitle: title, kind: 'transcript' });
        })().catch(e => console.error('[transcript-buy] receipt threw:', e.message));
      } catch (err) {
        // The same order captured twice, or this reader already owns it: answer with the existing row.
        const existing = await sb(`transcript_purchases?user_id=eq.${user.id}&transcript_id=eq.${transcript.id}&status=eq.completed&select=*&limit=1`);
        purchase = existing[0];
        if (!purchase) throw err;
        // Paid twice for the same transcript with two different orders: tell the owner to refund one.
        if (purchase.paypal_order_id !== orderId) console.error('[transcript-buy] DOUBLE PURCHASE, refund order', orderId, 'user', user.id, 'slug', slug);
      }
      res.status(200).json({ ok: true, purchase: { id: purchase.id, slug: purchase.slug } });
      return;
    }

    res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('[transcript-buy] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
