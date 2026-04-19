// ============================================================
// KIRA RESEARCH — api/payment.js
// PayPal create order + capture + verify
// Usage:
//   POST /api/payment?action=create  → { approveUrl }
//   POST /api/payment?action=capture → { success, orderId }
//   GET  /api/payment?action=verify&slug=X&userId=Y → { purchased }
// ============================================================

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── PayPal auth token ────────────────────────────────────
async function getPayPalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET
      ).toString('base64')
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  return data.access_token;
}

// ── Supabase helper ──────────────────────────────────────
async function supabase(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

// ── CORS headers ─────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const SITE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://kiraresearch.com';

  try {

    // ── CREATE ORDER ──────────────────────────────────────
    if (action === 'create' && req.method === 'POST') {
      const { slug, amount, reportType } = req.body;
      if (!slug || !amount) return res.status(400).json({ error: 'Missing slug or amount' });

      const token = await getPayPalToken();
      const order = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value: String(amount) },
            description: `KIRA RESEARCH — ${reportType?.replace(/_/g,' ')} Report`,
            custom_id: slug
          }],
          application_context: {
            brand_name: 'KIRA RESEARCH',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW',
            // slug + userId passed in URL so payment-success.html can read them
            return_url: `${SITE_URL}/payment-success.html?slug=${encodeURIComponent(slug)}&userId=${encodeURIComponent(req.body.userId || '')}`,
            cancel_url: `${SITE_URL}/payment-success.html?cancelled=1&slug=${encodeURIComponent(slug)}`
          }
        })
      }).then(r => r.json());

      const approveUrl = order.links?.find(l => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('No approve URL from PayPal');

      return res.json({ approveUrl, orderId: order.id });
    }

    // ── CAPTURE ORDER ─────────────────────────────────────
    if (action === 'capture' && req.method === 'POST') {
      const { orderId, slug, userId, reportType, amount } = req.body;
      if (!orderId || !slug) return res.status(400).json({ error: 'Missing orderId or slug' });

      const token = await getPayPalToken();
      const capture = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).then(r => r.json());

      if (capture.status !== 'COMPLETED') {
        throw new Error('PayPal capture failed: ' + capture.status);
      }

      // Save purchase record to Supabase
      await supabase('purchases', 'POST', {
        user_id: userId || null,
        slug,
        report_type: reportType || 'custom_report',
        amount: parseFloat(amount) || 0,
        currency: 'USD',
        paypal_order_id: orderId,
        status: 'completed'
      });

      return res.json({ success: true, orderId });
    }

    // ── VERIFY PURCHASE ───────────────────────────────────
    if (action === 'verify' && req.method === 'GET') {
      const { slug, userId } = req.query;
      if (!slug || !userId) return res.json({ purchased: false });

      const data = await supabase(
        `purchases?user_id=eq.${userId}&slug=eq.${slug}&status=eq.completed&select=id&limit=1`
      );
      return res.json({ purchased: Array.isArray(data) && data.length > 0 });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (e) {
    console.error('[payment]', e);
    return res.status(500).json({ error: e.message });
  }
}
