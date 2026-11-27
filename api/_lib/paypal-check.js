// ============================================================
// KIRA RESEARCH — api/_lib/paypal-check.js
// Shared, strict PayPal order handling for the one-off checkouts
// (library-buy, transcript-buy, list-buy).
//
//  * custom_id = "<kind>:<item>[|<locale>]|<userId>", built at create time (signed-in buyer only)
//    so a capture can be tied to the item AND the account that started the order.
//  * captureOrder(): read the order, check it belongs to this endpoint + caller BEFORE capturing,
//    capture, then require capture status COMPLETED, currency USD and the server-side price.
// ============================================================

export const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const UID_RE = /^[0-9a-f-]{36}$/i;

/**
 * kind: 'report' | 'transcript' | 'list'; item: slug; locale optional.
 * userId is the signed-in buyer's id, or for a guest checkout a random nonce (uuid) the server
 * hands to the browser at create time; only the browser that holds it can capture the order.
 * licence ('team' | 'company') is a 4th segment, left out for 'single' so older orders still parse.
 */
export function buildCustomId(kind, item, locale, userId, licence, waiver) {
  const base = `${kind}:${item}|${locale || ''}|${userId}`;
  if (waiver) return `${base}|${licence || 'single'}|w`;      // 5th segment: buyer ticked the EU/UK withdrawal acknowledgement
  return licence && licence !== 'single' ? `${base}|${licence}` : base;
}

/** Returns { item, locale, userId, licence, waiver } or null when the id is not of this kind / malformed. */
export function parseCustomId(kind, customId) {
  const s = String(customId || '');
  if (!s.startsWith(kind + ':')) return null;
  const [item, locale, userId, licence, waiver] = s.slice(kind.length + 1).split('|');
  if (!item || !UID_RE.test(userId || '')) return null;
  return { item, locale: locale || '', userId: userId.toLowerCase(), licence: licence === 'team' || licence === 'company' ? licence : 'single', ...(waiver === 'w' ? { waiver: true } : {}) };
}

/** Checks the capture inside a purchase unit. Returns { ok, paid } or { ok:false, reason }. */
export function validateCapture(unit, expectedAmount) {
  const cap = unit && unit.payments && unit.payments.captures && unit.payments.captures[0];
  if (!cap) return { ok: false, reason: 'no_capture' };
  if (cap.status !== 'COMPLETED') return { ok: false, reason: 'capture_not_completed:' + cap.status };
  const cur = cap.amount && cap.amount.currency_code;
  if (cur !== 'USD') return { ok: false, reason: 'currency:' + cur };
  const paid = Number(cap.amount.value);
  if (!Number.isFinite(paid) || Math.abs(paid - Number(expectedAmount)) > 0.01) return { ok: false, reason: `amount:${paid}!=${expectedAmount}` };
  return { ok: true, paid };
}

/**
 * opts: { token, orderId, kind, userId (account id, or the guest nonce), priceFor(parsed) -> Promise<{ expected:number, ...item } | null>, fetchImpl? }
 * Returns { status, error } on failure, or { parsed, item, paid, unit } on success.
 */
export async function captureOrder(opts) {
  const f = opts.fetchImpl || fetch;
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.token}` };
  const getOrder = async () => (await f(`${PAYPAL_BASE}/v2/checkout/orders/${opts.orderId}`, { headers: H })).json().catch(() => ({}));

  // 1. Whose order is it, and for which product? (before any money moves)
  let order = await getOrder();
  let unit = (order.purchase_units || [])[0] || {};
  const parsed = parseCustomId(opts.kind, unit.custom_id);
  if (!parsed) return { status: 400, error: 'bad_custom_id' };
  if (parsed.userId !== String(opts.userId).toLowerCase()) return { status: 403, error: 'order_not_yours' };

  // 2. Price from the server, never from PayPal or the client.
  const item = await opts.priceFor(parsed);
  if (!item) return { status: 404, error: 'item_not_found' };

  // 3. Capture unless it already is (idempotent retry by the same buyer).
  if (order.status !== 'COMPLETED') {
    const capRes = await f(`${PAYPAL_BASE}/v2/checkout/orders/${opts.orderId}/capture`, { method: 'POST', headers: H });
    const capture = await capRes.json().catch(() => ({}));
    const already = capRes.status === 422 && String(capture?.details?.[0]?.issue || '').includes('ALREADY_CAPTURED');
    if (!capRes.ok && !already) {
      console.error('[paypal] capture failed', capRes.status, capture);
      return { status: 400, error: 'paypal_capture_failed' };
    }
    order = already ? await getOrder() : capture;
    unit = (order.purchase_units || [])[0] || {};
  }

  // 4. Strict verification of what was actually captured.
  const v = validateCapture(unit, item.expected);
  if (!v.ok) {
    console.error('[paypal] REJECTED capture, check/refund order', opts.orderId, v.reason, 'user', opts.userId);
    return { status: 400, error: 'payment_mismatch' };
  }
  return { parsed, item, paid: v.paid, unit, payer: order.payer || null };
}
