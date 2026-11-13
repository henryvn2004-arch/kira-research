// ============================================================
// KIRA RESEARCH — api/subscription.js
// The Month ($149 / month) and Annual ($1,190 / year) plans, PayPal Subscriptions.
// All actions need Authorization: Bearer <supabase-jwt>.
//
//   GET  /api/subscription                    → { enabled, price, pdfPerMonth, plans, subscription }
//        enabled / price / pdfPerMonth describe the Month plan (kept for older pages);
//        plans = { month: { enabled, price, pdfLimit }, year: { enabled, price, pdfLimit } }
//        subscription = null or { plan, status, entitled, periodEnd, cancelRequested, pdf: { used, limit } }
//        Also settles a subscription the reader has just approved at PayPal (pending → active) and sends
//        the one "your subscription is live" email.
//   POST /api/subscription?action=create     body { locale, plan: 'month' | 'year' } → { approveUrl }
//        (403 checkout_closed while that plan's switch is off; 409 already_subscribed; 400 unknown_plan)
//   POST /api/subscription?action=cancel                      → { ok, periodEnd }    (stops the next charge;
//        access continues to the end of the period already paid for)
//
// Selling is switched per plan by config `checkout.subscription_enabled` (Month) and `checkout.annual_enabled`
// (Annual), both default off. Existing subscribers keep every right and can always see and cancel their
// subscription, switch or no switch.
// ============================================================

import { getConfig } from './_lib/config.js';
import { sendSubscriptionStarted } from './_lib/email.js';
import { PLANS, planOf, getSubscription, isEntitledRow, startSubscription, cancelSubscription, pdfUsage } from './_lib/subscription.js';
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
        const P = planOf(row);
        sendSubscriptionStarted({
          buyerEmail: user.email, plan: row.plan === 'year' ? 'year' : 'month', amount: P.price, periodEnd: row.current_period_end,
          pdfLimit: await getConfig(P.pdfSetting)
        }).catch((e) => console.error('[subscription] welcome email threw:', e.message));
      }
      const usage = row && entitled ? await pdfUsage(user.id, row) : null;
      const plans = {};
      for (const [k, P] of Object.entries(PLANS)) plans[k] = { enabled: await getConfig(P.enabledSetting), price: P.price, pdfLimit: await getConfig(P.pdfSetting) };
      res.status(200).json({
        enabled: plans.month.enabled,
        price: plans.month.price,
        pdfPerMonth: plans.month.pdfLimit,
        plans,
        subscription: row ? {
          plan: row.plan === 'year' ? 'year' : 'month',
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
      const plan = body.plan === undefined ? 'month' : body.plan;
      if (!PLANS[plan]) { res.status(400).json({ error: 'unknown_plan' }); return; }
      if (!(await getConfig(PLANS[plan].enabledSetting))) { res.status(403).json({ error: 'checkout_closed' }); return; }
      const locale = LOCALES.has(body.locale) ? body.locale : 'en';
      const out = await startSubscription(user, locale, plan);
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
