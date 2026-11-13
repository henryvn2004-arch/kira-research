// ============================================================
// KIRA RESEARCH — api/_lib/subscription.js
// The Month ($149) and Annual ($1,190) plans (PayPal Subscriptions): plan setup, status refresh, who is entitled, and the
// "PDF downloads per billing period" allowance. Used by api/subscription.js, api/library-pdf.js,
// api/library-verify.js, api/library-content.js and api/_lib/transcripts.js.
//
// A subscriber gets: every report in full online, every transcript, and N PDF downloads per billing
// period (setting subscription.pdf_per_month on Month, subscription.pdf_per_year on Annual). Our table mirrors PayPal; it is refreshed from PayPal when
// it is older than STALE_MS (and always while a subscription is still pending), so no webhook is needed:
// a lapse or cancellation shows up the next time the reader or an entitlement check looks.
// ============================================================

import { paypal } from './paypal.js';
import { getConfig } from './config.js';
import { SUBSCRIPTION_MONTH_PRICE, SUBSCRIPTION_YEAR_PRICE } from './pricing.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL              = process.env.APP_URL || 'https://kiraresearch.com';

const STALE_MS = 10 * 60 * 1000;     // refresh an active row from PayPal at most this often
const PENDING_STALE_MS = 15 * 1000;  // a pending row (reader just came back from PayPal) is re-checked almost every time
// The two plans. `unit` is the PayPal billing interval; `key` names the plan in billing_plans.
export const PLANS = {
  month: { key: `month-${SUBSCRIPTION_MONTH_PRICE}-usd`, unit: 'MONTH', price: SUBSCRIPTION_MONTH_PRICE, label: 'Month', per: 'month', pdfSetting: 'subscription.pdf_per_month', enabledSetting: 'checkout.subscription_enabled' },
  year:  { key: `year-${SUBSCRIPTION_YEAR_PRICE}-usd`,  unit: 'YEAR',  price: SUBSCRIPTION_YEAR_PRICE,  label: 'Annual', per: 'year',  pdfSetting: 'subscription.pdf_per_year',  enabledSetting: 'checkout.annual_enabled' }
};
export const planOf = (row) => PLANS[row && row.plan] || PLANS.month;

const STATUS = { ACTIVE: 'active', APPROVAL_PENDING: 'pending', APPROVED: 'pending', SUSPENDED: 'suspended', CANCELLED: 'cancelled', EXPIRED: 'expired' };

async function sb(path, method = 'GET', body = null, prefer = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json',
      Prefer: prefer || (method === 'POST' || method === 'PATCH' ? 'return=representation' : '')
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();          // return=minimal answers 201 with an empty body
  return text ? JSON.parse(text) : null;
}

const addPeriod = (iso, plan) => { const d = new Date(iso); if (plan === 'year') d.setUTCFullYear(d.getUTCFullYear() + 1); else d.setUTCMonth(d.getUTCMonth() + 1); return d.toISOString(); };

// ── plan: created in PayPal once, remembered in billing_plans ──────────────
export async function ensurePlan(plan = 'month') {
  const P = PLANS[plan];
  if (!P) throw new Error('unknown_plan');
  const have = await sb(`billing_plans?key=eq.${P.key}&select=paypal_plan_id&limit=1`);
  if (have[0]) return have[0].paypal_plan_id;
  // One PayPal product serves both plans. PayPal-Request-Id makes the calls safe if two first checkouts race.
  const known = await sb('billing_plans?select=paypal_product_id&limit=1');
  const productId = known[0] ? known[0].paypal_product_id : (await paypal('/v1/catalogs/products', 'POST', {
    name: 'KIRA Research Library', description: 'Every KIRA Research report and expert-interview transcript online, plus PDF downloads.', type: 'DIGITAL'
  }, { requestId: 'kira-product-library' })).id;
  const created = await paypal('/v1/billing/plans', 'POST', {
    product_id: productId,
    name: `KIRA Research ${P.label} ($${P.price}/${P.per})`,
    description: `${P.label} subscription, cancel any time.`,
    status: 'ACTIVE',
    billing_cycles: [{
      frequency: { interval_unit: P.unit, interval_count: 1 }, tenure_type: 'REGULAR', sequence: 1, total_cycles: 0,
      pricing_scheme: { fixed_price: { value: P.price.toFixed(2), currency_code: 'USD' } }
    }],
    payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CANCEL', payment_failure_threshold: 2 }
  }, { requestId: `kira-plan-${P.key}` });
  await sb('billing_plans', 'POST', { key: P.key, paypal_product_id: productId, paypal_plan_id: created.id, price: P.price, currency: 'USD' }, 'resolution=ignore-duplicates,return=minimal');
  const again = await sb(`billing_plans?key=eq.${P.key}&select=paypal_plan_id&limit=1`);
  return again[0].paypal_plan_id;
}

// ── entitlement ────────────────────────────────────────────
export function isEntitledRow(row, now = Date.now()) {
  if (!row) return false;
  if (row.status === 'active') return true;
  if (row.status === 'cancelled' || row.status === 'suspended') {
    return !!row.current_period_end && new Date(row.current_period_end).getTime() > now;   // the paid period still runs
  }
  return false;
}
export const periodStartOf = (row) => row.current_period_start || row.started_at || row.created_at;

// Pull the subscription from PayPal and store what it says.
export async function refreshRow(row) {
  const s = await paypal(`/v1/billing/subscriptions/${encodeURIComponent(row.paypal_subscription_id)}`);
  const status = STATUS[s.status] || row.status;
  const bi = s.billing_info || {};
  const lastPay = bi.last_payment && bi.last_payment.time;
  const patch = { status, last_checked_at: new Date().toISOString() };
  if (status !== 'pending') {
    patch.started_at = row.started_at || s.start_time || lastPay || patch.last_checked_at;
    patch.current_period_start = lastPay || row.current_period_start || s.start_time || patch.started_at;
    patch.current_period_end = bi.next_billing_time || row.current_period_end || addPeriod(patch.current_period_start, row.plan);
  }
  try {
    const out = await sb(`subscriptions?id=eq.${row.id}`, 'PATCH', patch);
    return out[0] || { ...row, ...patch };
  } catch (err) {
    // Two live subscriptions for one reader (unique index): keep the older one, leave this row as it was.
    console.error('[subscription] refresh could not store', row.id, err.message);
    return row;
  }
}

// The reader's current subscription row (the entitled one if any, else the newest), refreshed when stale.
export async function getSubscription(userId) {
  const rows = await sb(`subscriptions?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=5&select=*`);
  const out = [];
  let refreshes = 0;
  for (let row of rows) {
    const age = Date.now() - (row.last_checked_at ? new Date(row.last_checked_at).getTime() : 0);
    const live = row.status === 'pending' || row.status === 'active' || isEntitledRow(row);
    const stale = row.status === 'pending' ? age > PENDING_STALE_MS : age > STALE_MS;
    // An old pending row nobody approved: stop asking PayPal after a day.
    const abandoned = row.status === 'pending' && Date.now() - new Date(row.created_at).getTime() > 86400000;
    if (live && stale && !abandoned && refreshes < 2) {
      refreshes++;
      try { row = await refreshRow(row); } catch (err) { console.error('[subscription] PayPal refresh failed:', err.message); }
    }
    out.push(row);
  }
  return out.find((r) => isEntitledRow(r)) || out[0] || null;
}

// For the entitlement checks: the row only when it currently grants access.
export async function activeSubscription(userId) {
  if (!userId) return null;
  try {
    const row = await getSubscription(userId);
    return isEntitledRow(row) ? row : null;
  } catch (err) {
    console.error('[subscription] entitlement check failed:', err.message);
    return null;
  }
}

// ── start / cancel ─────────────────────────────────────────
export async function startSubscription(user, locale, plan = 'month') {
  if (!PLANS[plan]) return { error: 'unknown_plan' };
  const existing = await getSubscription(user.id);
  if (isEntitledRow(existing)) return { error: 'already_subscribed' };
  const planId = await ensurePlan(plan);
  const sub = await paypal('/v1/billing/subscriptions', 'POST', {
    plan_id: planId,
    custom_id: user.id,
    ...(user.email ? { subscriber: { email_address: user.email } } : {}),
    application_context: {
      brand_name: 'KIRA RESEARCH', shipping_preference: 'NO_SHIPPING', user_action: 'SUBSCRIBE_NOW',
      return_url: `${APP_URL}/${locale}/subscription?paypal=success`,
      cancel_url: `${APP_URL}/${locale}/subscription?paypal=cancel`
    }
  });
  const approveUrl = (sub.links || []).find((l) => l.rel === 'approve')?.href;
  if (!sub.id || !approveUrl) throw new Error('no_approve_url');
  await sb('subscriptions', 'POST', { user_id: user.id, plan, paypal_subscription_id: sub.id, status: 'pending' }, 'return=minimal');
  return { approveUrl, subscriptionId: sub.id };
}

export async function cancelSubscription(userId) {
  const row = await getSubscription(userId);
  if (!row || !isEntitledRow(row) || row.status !== 'active') return { error: 'nothing_to_cancel' };
  await paypal(`/v1/billing/subscriptions/${encodeURIComponent(row.paypal_subscription_id)}/cancel`, 'POST', { reason: 'Cancelled by the subscriber on kiraresearch.com' });
  const fresh = await refreshRow({ ...row, last_checked_at: null });
  await sb(`subscriptions?id=eq.${row.id}`, 'PATCH', { cancel_requested_at: new Date().toISOString() });
  return { ok: true, status: fresh.status, periodEnd: fresh.current_period_end };
}

// ── PDF allowance per billing period ───────────────────────
export async function pdfUsage(userId, row) {
  const limit = await getConfig(planOf(row).pdfSetting);
  const start = periodStartOf(row);
  const used = await sb(`subscription_pdf_downloads?user_id=eq.${encodeURIComponent(userId)}&period_start=eq.${encodeURIComponent(start)}&select=id`);
  return { limit, used: used.length, periodStart: start };
}

// Claim a download: the same PDF again in the same period is free; a new one needs room in the allowance.
export async function claimPdf(userId, row, slug, locale) {
  const { limit, used, periodStart } = await pdfUsage(userId, row);
  const again = await sb(
    `subscription_pdf_downloads?user_id=eq.${encodeURIComponent(userId)}&slug=eq.${encodeURIComponent(slug)}` +
    `&locale=eq.${encodeURIComponent(locale)}&period_start=eq.${encodeURIComponent(periodStart)}&select=id&limit=1`
  );
  if (again.length) return { ok: true, counted: false, used, limit };
  if (used >= limit) return { ok: false, used, limit };
  try {
    await sb('subscription_pdf_downloads', 'POST', { user_id: userId, subscription_id: row.id, slug, locale, period_start: periodStart }, 'return=minimal');
  } catch (_err) {
    // A double click inserted it first (unique index): same PDF, so still free.
    return { ok: true, counted: false, used, limit };
  }
  return { ok: true, counted: true, used: used + 1, limit };
}
