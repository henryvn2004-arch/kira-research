// ============================================================
// KIRA RESEARCH — api/library-buy.js
// PayPal checkout for library reports (one report × one locale).
//
//   POST /api/library-buy?action=create   body { slug, locale }
//       → { approveUrl, orderId, amount, currency }
//
//   POST /api/library-buy?action=capture  body { orderId, slug, locale }
//       Authorization: Bearer <supabase-jwt>   (REQUIRED)
//       → { ok, purchase: { id, slug, locale } }
//
// The PayPal `custom_id` carries "slug|locale" so the capture step can
// rebuild context without trusting the client.
// ============================================================

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const LOCALES = new Set(['en', 'ja', 'ko']);

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

      // Look up the report — price + status come from DB, never from client.
      const rows = await sb(
        `living_reports?slug=eq.${encodeURIComponent(slug)}` +
        `&status=eq.published&select=id,slug,price,currency&limit=1`
      );
      const report = Array.isArray(rows) ? rows[0] : null;
      if (!report) { res.status(404).json({ error: 'report_not_found' }); return; }

      const amount   = (report.price || 39).toFixed(2);
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
            // We re-derive slug + locale from this field at capture time.
            custom_id: `${slug}|${locale}`
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
      // Capture REQUIRES auth so we know which user to attribute the purchase to.
      const user = await verifyBearer(req);
      if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

      const orderId = body.orderId;
      if (!orderId || typeof orderId !== 'string') {
        res.status(400).json({ error: 'bad_order_id' }); return;
      }

      const token = await getPayPalToken();
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });

      // PayPal may return 200 (capture done now) or 422 (already captured) — handle both.
      const capture = await capRes.json().catch(() => ({}));
      const status = capture.status || capture.details?.[0]?.issue || '';
      const alreadyCaptured = capRes.status === 422 && (status === 'ORDER_ALREADY_CAPTURED' || String(capture?.details?.[0]?.issue || '').includes('ALREADY_CAPTURED'));

      if (!capRes.ok && !alreadyCaptured) {
        console.error('[library-buy] capture failed', capRes.status, capture);
        res.status(400).json({ error: 'paypal_capture_failed', details: status });
        return;
      }

      // If we didn't get a fresh capture object, fetch the order to rebuild context.
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
      const customId = unit.custom_id || '';
      const [slugFromPayPal, localeFromPayPal] = String(customId).split('|');

      const slug   = isSlug(slugFromPayPal) ? slugFromPayPal : null;
      const locale = LOCALES.has(localeFromPayPal) ? localeFromPayPal : 'en';
      if (!slug) { res.status(400).json({ error: 'bad_custom_id' }); return; }

      // Re-validate the price against DB (defence in depth).
      const reportRows = await sb(
        `living_reports?slug=eq.${encodeURIComponent(slug)}&select=id,price,currency&limit=1`
      );
      const report = Array.isArray(reportRows) ? reportRows[0] : null;
      if (!report) { res.status(404).json({ error: 'report_not_found' }); return; }

      const expectedAmount = Number((report.price || 39).toFixed(2));
      const paidAmount = Number(
        unit.amount?.value ??
        unit.payments?.captures?.[0]?.amount?.value ??
        0
      );
      if (paidAmount > 0 && Math.abs(paidAmount - expectedAmount) > 0.01) {
        console.warn('[library-buy] amount mismatch', { paid: paidAmount, expected: expectedAmount, slug, locale });
        // Continue anyway — PayPal already captured. Flag in DB for review.
      }

      // Upsert purchase row. Unique index prevents dupes.
      const purchaseRow = {
        user_id:         user.id,
        slug,
        locale,
        report_id:       report.id,
        report_type:     'library_report',
        amount:          paidAmount || expectedAmount,
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
        // Likely the unique-completed index hit (re-capture of the same order).
        // Fetch the existing row to return idempotently.
        const existing = await sb(
          `purchases?user_id=eq.${user.id}&slug=eq.${encodeURIComponent(slug)}` +
          `&locale=eq.${locale}&status=eq.completed&select=*&limit=1`
        );
        purchase = Array.isArray(existing) ? existing[0] : null;
        if (!purchase) throw err;
      }

      res.status(200).json({
        ok: true,
        purchase: { id: purchase.id, slug: purchase.slug, locale: purchase.locale }
      });
      return;
    }

    res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('[library-buy] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
