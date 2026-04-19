// KIRA RESEARCH — api/credits.js
// GET  /api/credits?action=balance&userId=X      → { balance, transactions[] }
// POST /api/credits?action=topup                 → { approveUrl, orderId, credits }
// POST /api/credits?action=capture               → { success, balance }
// POST /api/credits?action=spend                 → { success, balance }
// POST /api/credits?action=refund                → { success, balance }

export const config = { maxDuration: 30, runtime: 'nodejs' };

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Credit packages ───────────────────────────────────────
// price: USD charged | credits: what user receives
const PACKAGES = {
  starter:     { price: '19.00', credits: 19,  label: 'Starter Pack'   },
  popular:     { price: '49.00', credits: 59,  label: 'Popular Pack'   },  // +20% bonus
  professional:{ price: '99.00', credits: 129, label: 'Pro Pack'       },  // +30% bonus
};

// ── Report credit costs ───────────────────────────────────
const REPORT_COSTS = {
  market_overview:         19,
  competitive_analysis:    19,
  customer_intelligence:   19,
  value_chain:             19,
  go_to_market:            19,
  partner_search:          19,
  proposition_development: 19,
  industry_deep_dive:      19,
  strategy_builder:        19,
  gtm_strategy:            19,
  doc_intelligence:         9,
  document_analysis:        9,
};

// ── Helpers ───────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

async function rpc(fn, params) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function getPayPalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(
        process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET
      ).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('PayPal auth failed');
  return d.access_token;
}

// ── Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const SITE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://kiraresearch.com';

  try {

    // ── GET BALANCE ───────────────────────────────────────
    if (action === 'balance' && req.method === 'GET') {
      const { userId } = req.query;
      if (!userId) return res.json({ balance: 0, transactions: [] });

      const [creditRows, txRows] = await Promise.all([
        sb(`user_credits?user_id=eq.${userId}&select=balance`),
        sb(`credit_transactions?user_id=eq.${userId}&order=created_at.desc&limit=20&select=type,amount,description,created_at`),
      ]);

      return res.json({
        balance:      creditRows?.[0]?.balance ?? 0,
        transactions: txRows || [],
      });
    }

    // ── GET COST for a report type ────────────────────────
    if (action === 'cost' && req.method === 'GET') {
      const { reportType } = req.query;
      return res.json({ credits: REPORT_COSTS[reportType] ?? 19 });
    }

    // ── GET PACKAGES ──────────────────────────────────────
    if (action === 'packages' && req.method === 'GET') {
      return res.json({ packages: PACKAGES });
    }

    // ── CREATE TOP-UP ORDER (PayPal) ──────────────────────
    if (action === 'topup' && req.method === 'POST') {
      const { packageId, userId } = req.body;
      const pkg = PACKAGES[packageId];
      if (!pkg) return res.status(400).json({ error: 'Invalid package' });
      if (!userId) return res.status(400).json({ error: 'Not logged in' });

      const token = await getPayPalToken();
      const order = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: 'USD', value: pkg.price },
            description: `KIRA RESEARCH — ${pkg.label} (${pkg.credits} credits)`,
            custom_id: `credits:${userId}:${pkg.credits}`,
          }],
          application_context: {
            brand_name: 'KIRA RESEARCH',
            landing_page: 'BILLING',
            user_action: 'PAY_NOW',
            return_url: `${SITE_URL}/payment-success.html?type=topup&userId=${encodeURIComponent(userId)}&credits=${pkg.credits}&pkg=${packageId}`,
            cancel_url: `${SITE_URL}/pricing.html?cancelled=1`,
          },
        }),
      }).then(r => r.json());

      const approveUrl = order.links?.find(l => l.rel === 'approve')?.href;
      if (!approveUrl) throw new Error('No approve URL from PayPal');

      return res.json({ approveUrl, orderId: order.id, credits: pkg.credits, price: pkg.price });
    }

    // ── CAPTURE TOP-UP + ADD CREDITS ──────────────────────
    if (action === 'capture' && req.method === 'POST') {
      const { orderId, userId, credits } = req.body;
      if (!orderId || !userId || !credits) {
        return res.status(400).json({ error: 'Missing params' });
      }

      const token = await getPayPalToken();
      const capture = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }).then(r => r.json());

      if (capture.status !== 'COMPLETED') {
        throw new Error('PayPal capture failed: ' + (capture.status || JSON.stringify(capture)));
      }

      // Add credits atomically via DB function
      const newBalance = await rpc('add_credits', {
        p_user_id:   userId,
        p_amount:    parseInt(credits),
        p_paypal_id: orderId,
        p_desc:      `Top-up: ${credits} credits`,
      });

      return res.json({ success: true, balance: newBalance, credits: parseInt(credits) });
    }

    // ── SPEND CREDITS (called when generation confirmed) ──
    if (action === 'spend' && req.method === 'POST') {
      const { userId, reportType, reportId } = req.body;
      if (!userId || !reportType) return res.status(400).json({ error: 'Missing params' });

      const cost = REPORT_COSTS[reportType] ?? 19;
      const success = await rpc('spend_credits', {
        p_user_id:   userId,
        p_amount:    cost,
        p_desc:      `Report: ${reportType.replace(/_/g, ' ')}`,
        p_report_id: reportId || null,
      });

      if (!success) {
        return res.status(402).json({ error: 'Insufficient credits', cost });
      }

      // Get updated balance
      const rows = await sb(`user_credits?user_id=eq.${userId}&select=balance`);
      return res.json({ success: true, balance: rows?.[0]?.balance ?? 0, spent: cost });
    }

    // ── REFUND CREDITS (called when generation fails) ─────
    if (action === 'refund' && req.method === 'POST') {
      const { userId, reportType, reportId, reason } = req.body;
      if (!userId || !reportType) return res.status(400).json({ error: 'Missing params' });

      const cost = REPORT_COSTS[reportType] ?? 19;

      // Add credits back
      await rpc('add_credits', {
        p_user_id:   userId,
        p_amount:    cost,
        p_paypal_id: null,
        p_desc:      `Refund: ${reportType.replace(/_/g, ' ')} — ${reason || 'generation failed'}`,
      });

      // Also log a refund transaction explicitly
      await sb('credit_transactions', 'POST', {
        user_id:     userId,
        type:        'refund',
        amount:      cost,
        description: `Refund: ${reason || 'generation failed'}`,
        report_id:   reportId || null,
      });

      const rows = await sb(`user_credits?user_id=eq.${userId}&select=balance`);
      return res.json({ success: true, balance: rows?.[0]?.balance ?? 0, refunded: cost });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (e) {
    console.error('[credits]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
