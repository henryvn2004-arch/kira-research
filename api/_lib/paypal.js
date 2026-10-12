// ============================================================
// KIRA RESEARCH — api/_lib/paypal.js
// Small PayPal REST helper for the subscription code (S7): token + one call function.
// The one-off checkouts (api/library-buy.js, api/transcript-buy.js) keep their own copies.
// Sandbox unless PAYPAL_MODE=live.
// ============================================================

export const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function token() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('PayPal auth failed: ' + res.status);
  return (await res.json()).access_token;
}

// paypal('/v1/billing/subscriptions/I-XXX') or paypal(path, 'POST', body, { requestId }).
// Returns the parsed JSON ({} for an empty 204). Throws an Error with .status and .body on a PayPal error.
export async function paypal(path, method = 'GET', body = null, opts = {}) {
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.requestId ? { 'PayPal-Request-Id': opts.requestId } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (_e) { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`PayPal ${method} ${path} -> ${res.status}`);
    err.status = res.status; err.body = json;
    throw err;
  }
  return json;
}
