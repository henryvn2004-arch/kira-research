// ============================================================
// KIRA RESEARCH — api/subscription.js
// The Month plan ($149 / month, PayPal Subscriptions). All actions need Authorization: Bearer <supabase-jwt>.
//
//   GET  /api/subscription                    → { enabled, price, pdfPerMonth, subscription }
//        subscription = null or { status, entitled, periodEnd, cancelRequested, pdf: { used, limit } }
//        Also settles a subscription the reader has just approved at PayPal (pending → active) and sends
//        the one "your subscription is live" email.
//   POST /api/subscription?action=create     body { locale } → { approveUrl }       (403 checkout_closed while off)
//   POST /api/subscription?action=cancel                      → { ok, periodEnd }    (stops the next charge;
//        access continues to the end of the period already paid for)
//
// Selling is switched by config `checkout.subscription_enabled` (default off). Existing subscribers keep
// every right and can always see and cancel their subscription, switch or no switch.
// ============================================================

import { getConfig } from './_lib/config.js';
import { SUBSCRIPTION_MONTH_PRICE } from './_lib/pricing.js';
import { sendSubscriptionStarted } from './_lib/email.js';
import { getSubscription, isEntitledRow, startSubscription, cancelSubscription, pdfUsage } from './_lib/subscription.js';
import { verifyBearer } from './_lib/transcripts.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const LOCALES = new Set(['en', 'ja', 'ko', 'zh']);

// Claim the "welcome" email for a row exactly once (the PATCH only matches while welcomed_at is null).
async function claimWelcome(rowId) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${rowId}&welcomed_at=is.null`, {
    method: 'PATCH',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ welcomed_at: new Date().toISOString() })
  });
  if (!r.ok) return false;
  return (await r.json()).length > 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const action = (req.query || {}).action;

  try {
    if (req.method === 'GET') {
      const row = await getSubscription(user.id);
      const entitled = isEntitledRow(row);
      if (entitled && row.status === 'active' && await claimWelcome(row.id)) {
        sendSubscriptionStarted({
          buyerEmail: user.email, amount: SUBSCRIPTION_MONTH_PRICE, periodEnd: row.current_period_end,
          pdfPerMonth: await getConfig('subscription.pdf_per_month')
        }).catch((e) => console.error('[subscription] welcome email threw:', e.message));
      }
      const usage = row && entitled ? await pdfUsage(user.id, row) : null;
      res.status(200).json({
        enabled: await getConfig('checkout.subscription_enabled'),
        price: SUBSCRIPTION_MONTH_PRICE,
        pdfPerMonth: await getConfig('subscription.pdf_per_month'),
        subscription: row ? {
          status: row.status,
          entitled,
          periodEnd: row.current_period_end || null,
          cancelRequested: !!row.cancel_requested_at || row.status === 'cancelled',
          pdf: usage ? { used: usage.used, limit: usage.limit } : null
        } : null
      });
      return;
    }

    if (action === 'create') {
      let body = {};
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (_e) { res.status(400).json({ error: 'invalid_json' }); return; }
      if (!(await getConfig('checkout.subscription_enabled'))) { res.status(403).json({ error: 'checkout_closed' }); return; }
      const locale = LOCALES.has(body.locale) ? body.locale : 'en';
      const out = await startSubscription(user, locale);
      if (out.error) { res.status(409).json({ error: out.error }); return; }
      res.status(200).json({ approveUrl: out.approveUrl });
      return;
    }

    if (action === 'cancel') {
      const out = await cancelSubscription(user.id);
      if (out.error) { res.status(409).json({ error: out.error }); return; }
      res.status(200).json({ ok: true, periodEnd: out.periodEnd || null });
      return;
    }

    res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('[subscription] error:', err.message, err.body ? JSON.stringify(err.body).slice(0, 400) : '');
    res.status(500).json({ error: 'server_error' });
  }
}
