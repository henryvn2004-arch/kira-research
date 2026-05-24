// ============================================================
// KIRA RESEARCH — api/studio-credits.js
//
// Read-only endpoint for the Studio billing UI.
//
//   GET /api/studio-credits
//   Authorization: Bearer <supabase-jwt>
//   → {
//       balance:        <int>,
//       report_cost:    100,
//       packs:          [{ code, label, usd, credits, bonus }, …],
//       transactions:   [{ id, created_at, delta, balance_after, kind,
//                          paypal_order_id, studio_job_id, pack_code,
//                          amount_usd }, …]   (last 25)
//     }
//
// All writes go through /api/studio-credits-buy (PayPal) or the
// worker's hold/refund path — never here.
// ============================================================

import { verifyBearer, cors } from './_lib/studio-shared.js';
import { PACKS, REPORT_COST, getBalance, listTransactions } from './_lib/credits.js';

export const config = {
  maxDuration: 20
};

export default async function handler(req, res) {
  cors(res, 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  try {
    const [balance, transactions] = await Promise.all([
      getBalance(user.id),
      listTransactions(user.id, 25)
    ]);

    // Surface PACKS in stable display order (cheap → expensive).
    const packs = ['starter', 'plus', 'power', 'bulk'].map(code => {
      const p = PACKS[code];
      return {
        code:       p.code,
        label:      p.label,
        usd:        p.usd,
        credits:    p.credits,
        bonus:      p.bonus,
        per_report_usd: Number((p.usd / (p.credits / REPORT_COST)).toFixed(2))
      };
    });

    res.status(200).json({
      balance,
      report_cost: REPORT_COST,
      packs,
      transactions
    });
  } catch (err) {
    console.error('[studio-credits] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
