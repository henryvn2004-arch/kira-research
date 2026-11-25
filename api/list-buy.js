// ============================================================
// KIRA RESEARCH — api/list-buy.js
// PayPal checkout for one market-map company list (Excel), $36 up to 500 companies, $57 above (api/_lib/pricing.js).
// Same shape as api/transcript-buy.js.
//
//   POST /api/list-buy?action=create   body { slug: '<country>/<segment>' }
//       → { approveUrl, orderId, amount, currency }               (403 checkout_closed while off)
//   POST /api/list-buy?action=capture  body { orderId }   Authorization: Bearer <supabase-jwt>
//       → { ok, purchase: { id, slug, status: 'ready'|'pending', downloadUrl? } }
//   POST /api/list-buy?action=build    body { purchaseId }  Authorization: Bearer …   (retry a build that did not finish)
//
// Selling is switched by config `checkout.list_enabled` (/en/admin/config → Checkout, default off). The price
// always comes from the server (the map's company count). After capture the purchase is recorded at once; the file
// is built by the BizDirect partner API through api/_lib/list-source.js with the segment definition stored in the map
// (stats.meta.definition). If the build fails the purchase is 'failed' (receipt says the file is being prepared) and
// the build can be retried. The link lives 7 days and allows 5 downloads.
// ============================================================
import { getConfig } from './_lib/config.js';
import { listPrice } from './_lib/pricing.js';
import { verifyBearer } from './_lib/transcripts.js';
import { sb, SLUG_RE, finishBuild, linkLive, downloadUrl } from './_lib/lists.js';

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const APP_URL = process.env.APP_URL || 'https://kiraresearch.com';

async function getPayPalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET).toString('base64') },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('PayPal auth failed: ' + res.status);
  return (await res.json()).access_token;
}

const view = (p) => ({ id: p.id, slug: p.slug, status: p.build_status === 'ready' ? 'ready' : 'pending', ...(linkLive(p) ? { downloadUrl: downloadUrl(p) } : {}) });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch (_e) { res.status(400).json({ error: 'invalid_json' }); return; }
  const action = (req.query || {}).action;

  try {
    // ── CREATE ──────────────────────────────────────────
    if (action === 'create') {
      const slug = body.slug;
      if (typeof slug !== 'string' || !SLUG_RE.test(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }
      if (!(await getConfig('checkout.list_enabled'))) { res.status(403).json({ error: 'checkout_closed' }); return; }
      const rows = await sb(`market_maps?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,slug,n_companies,definition:stats->meta->definition&limit=1`);
      if (!rows[0]) { res.status(404).json({ error: 'list_not_found' }); return; }
      if (!rows[0].definition) { res.status(409).json({ error: 'list_unavailable' }); return; }   // no segment definition: the file could not be built
      const amount = listPrice(rows[0].n_companies).toFixed(2);
      const loc = ['en', 'ja', 'ko', 'zh'].includes(body.loc) ? body.loc : 'en';   // the buyer returns to the language page they bought on
      const token = await getPayPalToken();
      const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ amount: { currency_code: 'USD', value: amount }, description: `KIRA RESEARCH — company list ${slug}`, custom_id: slug }],
          application_context: { brand_name: 'KIRA RESEARCH', landing_page: 'BILLING', user_action: 'PAY_NOW',
            return_url: `${APP_URL}/${loc}/market-maps/${slug}?paypal=success`, cancel_url: `${APP_URL}/${loc}/market-maps/${slug}?paypal=cancel` },
        }),
      });
      if (!orderRes.ok) throw new Error('paypal_create_failed_' + orderRes.status);
      const order = await orderRes.json();
      const approveUrl = (order.links || []).find((l) => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('no_approve_url');
      res.status(200).json({ approveUrl, orderId: order.id, amount: Number(amount), currency: 'USD', slug });
      return;
    }

    // ── CAPTURE ─────────────────────────────────────────
    if (action === 'capture') {
      const user = await verifyBearer(req);
      if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
      const orderId = body.orderId;
      if (!orderId || typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{5,64}$/.test(orderId)) { res.status(400).json({ error: 'bad_order_id' }); return; }

      const token = await getPayPalToken();
      const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      const capture = await capRes.json().catch(() => ({}));
      const alreadyCaptured = capRes.status === 422 && String(capture?.details?.[0]?.issue || '').includes('ALREADY_CAPTURED');
      if (!capRes.ok && !alreadyCaptured) {
        console.error('[list-buy] capture failed', capRes.status, capture);
        res.status(400).json({ error: 'paypal_capture_failed', details: capture.status || capture.details?.[0]?.issue || '' });
        return;
      }
      let units;
      if (alreadyCaptured) {
        const o = await (await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })).json();
        units = o.purchase_units || [];
      } else units = capture.purchase_units || [];
      const unit = units[0] || {};
      const customId = unit.custom_id || unit.payments?.captures?.[0]?.custom_id || '';
      const slug = SLUG_RE.test(customId) ? customId : null;
      if (!slug) { res.status(400).json({ error: 'bad_custom_id' }); return; }
      const maps = await sb(`market_maps?slug=eq.${encodeURIComponent(slug)}&select=id,slug,title,n_companies&limit=1`);
      const map = maps[0];
      if (!map) { res.status(404).json({ error: 'list_not_found' }); return; }

      const expected = listPrice(map.n_companies);
      const paid = Number(unit.amount?.value ?? unit.payments?.captures?.[0]?.amount?.value ?? 0);
      if (paid > 0 && Math.abs(paid - expected) > 0.01) console.warn('[list-buy] amount mismatch', { paid, expected, slug });

      const row = { user_id: user.id, map_id: map.id, slug, n_companies: map.n_companies, amount: paid || expected, currency: 'USD',
        paypal_order_id: orderId, status: 'completed', captured_at: new Date().toISOString() };
      let purchase, fresh = false;
      try {
        const ins = await sb('list_purchases', 'POST', row);
        purchase = Array.isArray(ins) ? ins[0] : ins; fresh = true;
      } catch (err) {
        const existing = await sb(`list_purchases?paypal_order_id=eq.${encodeURIComponent(orderId)}&user_id=eq.${user.id}&select=*&limit=1`);
        purchase = existing[0];
        if (!purchase) throw err;
      }
      if (fresh) purchase = await finishBuild(purchase, user.email, `${map.title} (company list)`);
      res.status(200).json({ ok: true, purchase: view(purchase) });
      return;
    }

    // ── BUILD (retry) ───────────────────────────────────
    if (action === 'build') {
      const user = await verifyBearer(req);
      if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
      const id = String(body.purchaseId || '');
      if (!/^[0-9a-f-]{36}$/.test(id)) { res.status(400).json({ error: 'bad_purchase_id' }); return; }
      const rows = await sb(`list_purchases?id=eq.${id}&user_id=eq.${user.id}&status=eq.completed&select=*,market_maps(title)&limit=1`);
      const p = rows[0];
      if (!p) { res.status(404).json({ error: 'purchase_not_found' }); return; }
      if (p.build_status === 'ready') { res.status(200).json({ ok: true, purchase: view(p) }); return; }
      const done = await finishBuild(p, user.email, `${p.market_maps?.title || p.slug} (company list)`);
      res.status(200).json({ ok: true, purchase: view(done) });
      return;
    }

    res.status(400).json({ error: 'unknown_action' });
  } catch (err) {
    console.error('[list-buy] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
