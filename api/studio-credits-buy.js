// ============================================================
// KIRA RESEARCH — api/studio-credits-buy.js
//
// PayPal checkout for KIRA Studio credit packs.
//
//   POST /api/studio-credits-buy?action=create
//     Authorization: Bearer <supabase-jwt>      (REQUIRED)
//     body { pack_code: 'starter'|'plus'|'power'|'bulk' }
//     → { approveUrl, orderId, amount, currency, credits }
//
//   POST /api/studio-credits-buy?action=capture
//     Authorization: Bearer <supabase-jwt>      (REQUIRED)
//     body { orderId }
//     → { ok, balance, credits_added, pack_code }
//
// Idempotency: PayPal `custom_id` carries
//   "studio_credits|<pack_code>|<user_id>"
// so capture can rebuild context without trusting the client. The
// `credit_transactions_paypal_topup_idx` unique partial index in
// migration 013 absorbs re-capture attempts of the same order.
//
// Pricing source of truth = PACKS in api/_lib/credits.js. Never
// trust client-side amount values.
// ============================================================

import { verifyBearer, cors } from './_lib/studio-shared.js';
import { PACKS, isValidPackCode, addCredits } from './_lib/credits.js';
import { sendCreditTopupReceipt } from './_lib/email.js';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Studio runs on its own subdomain; default to it but allow override.
const STUDIO_URL = process.env.STUDIO_URL || 'https://studio.kiraresearch.com';

export const config = {
  maxDuration: 30
};

// ── PayPal OAuth ────────────────────────────────────────
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

// ── Custom-id helpers ───────────────────────────────────
function buildCustomId(packCode, userId) {
  return `studio_credits|${packCode}|${userId}`;
}
function parseCustomId(s) {
  const parts = String(s || '').split('|');
  if (parts.length !== 3 || parts[0] !== 'studio_credits') return null;
  const [, packCode, userId] = parts;
  if (!isValidPackCode(packCode)) return null;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  return { packCode, userId };
}

export default async function handler(req, res) {
  cors(res, 'POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'method_not_allowed' }); return; }

  // Both create and capture require auth so we can attribute the txn.
  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  const action = req.query.action;
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }

  try {
    // ═══════════════════════════════════════════════════════════
    //  CREATE — start a PayPal order, return approval URL
    // ═══════════════════════════════════════════════════════════
    if (action === 'create') {
      const packCode = body.pack_code;
      if (!isValidPackCode(packCode)) {
        res.status(400).json({ error: 'bad_pack_code' });
        return;
      }
      const pack = PACKS[packCode];
      const amount   = pack.usd.toFixed(2);
      const currency = 'USD';

      const token = await getPayPalToken();
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: currency, value: amount },
            description: `KIRA Studio — ${pack.label} pack (${pack.credits} credits)`,
            // Re-derived at capture; never trust client.
            custom_id: buildCustomId(packCode, user.id)
          }],
          application_context: {
            brand_name:   'KIRA Studio',
            landing_page: 'BILLING',
            user_action:  'PAY_NOW',
            return_url:   `${STUDIO_URL}/billing?paypal=success`,
            cancel_url:   `${STUDIO_URL}/billing?paypal=cancel`
          }
        })
      });

      if (!orderRes.ok) {
        const txt = await orderRes.text().catch(() => '');
        console.error('[studio-credits-buy] create failed:', orderRes.status, txt);
        throw new Error('paypal_create_failed_' + orderRes.status);
      }
      const order = await orderRes.json();
      const approveUrl = (order.links || []).find(l => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('no_approve_url');

      res.status(200).json({
        approveUrl,
        orderId:  order.id,
        amount:   Number(amount),
        currency,
        credits:  pack.credits,
        pack_code: pack.code,
        pack_label: pack.label
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════
    //  CAPTURE — finalise the order and add credits
    // ═══════════════════════════════════════════════════════════
    if (action === 'capture') {
      const orderId = body.orderId;
      if (!orderId || typeof orderId !== 'string') {
        res.status(400).json({ error: 'bad_order_id' });
        return;
      }

      const token = await getPayPalToken();
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      const capture = await capRes.json().catch(() => ({}));
      const issue   = capture?.details?.[0]?.issue || capture?.status || '';
      const alreadyCaptured =
        capRes.status === 422 &&
        (issue === 'ORDER_ALREADY_CAPTURED' || String(issue).includes('ALREADY_CAPTURED'));

      if (!capRes.ok && !alreadyCaptured) {
        console.error('[studio-credits-buy] capture failed', capRes.status, capture);
        res.status(400).json({ error: 'paypal_capture_failed', details: issue });
        return;
      }

      // Re-fetch the order to get a normalised purchase_units shape if we
      // hit the already-captured branch (no fresh capture body).
      let purchaseUnits;
      if (alreadyCaptured) {
        const oRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const order = await oRes.json();
        purchaseUnits = order.purchase_units || [];
      } else {
        purchaseUnits = capture.purchase_units || [];
      }

      const unit = purchaseUnits[0] || {};
      const customId =
        unit.custom_id ||
        unit.payments?.captures?.[0]?.custom_id ||
        '';
      const parsed = parseCustomId(customId);
      if (!parsed) {
        console.error('[studio-credits-buy] bad custom_id:', customId);
        res.status(400).json({ error: 'bad_custom_id' });
        return;
      }

      // Defence: custom_id must match the authenticated caller. Without this
      // a logged-in attacker who knows another user's pending order id
      // could capture it and credit their own wallet (… not possible since
      // we add to parsed.userId, but reject anyway to avoid surprise).
      if (parsed.userId !== user.id) {
        console.warn('[studio-credits-buy] user/custom_id mismatch',
          { caller: user.id, customUser: parsed.userId, orderId });
        res.status(403).json({ error: 'order_not_owned' });
        return;
      }

      const pack = PACKS[parsed.packCode];
      const paidAmount = Number(
        unit.amount?.value ??
        unit.payments?.captures?.[0]?.amount?.value ??
        0
      );
      // Defence in depth — refuse to credit if PayPal reports a different
      // dollar amount than the pack we look up. Allows 1¢ rounding only.
      if (paidAmount > 0 && Math.abs(paidAmount - pack.usd) > 0.01) {
        console.warn('[studio-credits-buy] amount mismatch',
          { paid: paidAmount, expected: pack.usd, packCode: parsed.packCode });
        res.status(400).json({ error: 'amount_mismatch' });
        return;
      }

      // Atomic credit add — unique partial index on paypal_order_id
      // absorbs replay attempts (returns existing balance).
      const newBalance = await addCredits({
        userId:        parsed.userId,
        amount:        pack.credits,
        kind:          'topup',
        paypalOrderId: orderId,
        packCode:      pack.code,
        amountUsd:     paidAmount || pack.usd
      });

      // Best-effort receipt — never block the success response.
      (async () => {
        try {
          await sendCreditTopupReceipt({
            buyerEmail: user.email,
            packLabel:  pack.label,
            credits:    pack.credits,
            amount:     paidAmount || pack.usd,
            currency:   'USD',
            newBalance
          });
        } catch (e) {
          console.error('[studio-credits-buy] receipt threw:', e.message);
        }
      })();

      res.status(200).json({
        ok: true,
        balance:       newBalance,
        credits_added: pack.credits,
        pack_code:     pack.code,
        pack_label:    pack.label,
        amount:        paidAmount || pack.usd,
        currency:      'USD'
      });
      return;
    }

    res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('[studio-credits-buy] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
