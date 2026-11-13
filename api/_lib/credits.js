// ============================================================
// KIRA RESEARCH — api/_lib/credits.js
//
// Shared credit-wallet helpers for KIRA Studio.
//   • Pack catalog (single source of truth for pricing)
//   • getBalance(userId)
//   • holdCredits(userId, amount, jobId)     — atomic debit
//   • refundCredits(userId, amount, jobId)   — refund after worker fail
//   • addCredits(userId, amount, kind, ...)  — topup / bonus / adjust
//   • listTransactions(userId, limit)
//
// All writes go through Supabase RPCs (migration 013) so the math
// stays atomic under concurrent requests.
//
// Vercel routing: this file lives in /api/_lib/ — underscore-prefixed
// dirs are skipped by Vercel routing, so this is import-only.
// ============================================================

import { sb, SUPABASE_URL, SUPABASE_SERVICE_KEY } from './studio-shared.js';

// ── Pack catalog ──────────────────────────────────────────
// `code` is the stable identifier carried in PayPal `custom_id` so the
// capture step can rebuild context server-side without trusting the
// client. Prices and credit amounts are validated against this table
// before crediting — never trust client values.
export const PACKS = {
  starter: { code: 'starter', label: 'Starter', usd: 10,  credits: 100,  bonus: 0  },
  plus:    { code: 'plus',    label: 'Plus',    usd: 25,  credits: 275,  bonus: 10 },
  power:   { code: 'power',   label: 'Power',   usd: 50,  credits: 600,  bonus: 20 },
  bulk:    { code: 'bulk',    label: 'Bulk',    usd: 200, credits: 2600, bonus: 30 }
};

export const REPORT_COST = 100;   // flat credit cost per Studio gen

export function isValidPackCode(code) {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(PACKS, code);
}

// ── Read balance (service-key bypasses RLS) ───────────────
export async function getBalance(userId) {
  if (!userId) return 0;
  try {
    const rows = await sb(
      `user_credits?user_id=eq.${userId}&select=balance&limit=1`
    );
    return (Array.isArray(rows) && rows[0]) ? Number(rows[0].balance || 0) : 0;
  } catch (err) {
    console.error('[credits] getBalance failed:', err.message);
    return 0;
  }
}

// ── Low-level RPC call ────────────────────────────────────
async function callRpc(fnName, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify(args)
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    const err = new Error(`rpc ${fnName} → ${r.status}: ${txt}`);
    err.status = r.status;
    err.body   = txt;
    throw err;
  }
  // Postgres `returns integer` comes back as a bare JSON number.
  return r.json();
}

// ── Hold (debit) — atomic check + decrement ───────────────
// Returns { ok: true, newBalance } on success
//         { ok: false, reason: 'insufficient_credits' } on shortfall
//         { ok: false, reason: 'duplicate_hold' } if this job already
//           has a hold row (replay-safe — caller can treat as success)
export async function holdCredits(userId, amount, jobId) {
  try {
    const newBalance = await callRpc('credit_debit', {
      p_user_id:       userId,
      p_amount:        amount,
      p_studio_job_id: jobId
    });
    return { ok: true, newBalance: Number(newBalance) };
  } catch (err) {
    const body = String(err.body || err.message || '');
    if (body.includes('insufficient_credits') || body.includes('P0001')) {
      return { ok: false, reason: 'insufficient_credits' };
    }
    if (body.includes('credit_transactions_job_debit_idx')) {
      // Hold already exists for this job (workflow replay) — re-fetch balance.
      const bal = await getBalance(userId);
      return { ok: true, newBalance: bal, replay: true };
    }
    console.error('[credits] holdCredits failed:', body);
    return { ok: false, reason: 'rpc_error', detail: body.slice(0, 400) };
  }
}

// ── Refund a previously-held hold ─────────────────────────
// Best-effort: never throws (used in failure paths where the caller
// already has its hands full). Returns the new balance or null.
export async function refundCredits(userId, amount, jobId, reason = 'studio_refund') {
  try {
    // Reject double-refund attempts at the unique-index level (safe).
    const newBalance = await callRpc('credit_add', {
      p_user_id:         userId,
      p_delta:           amount,
      p_kind:            reason,
      p_studio_job_id:   jobId
    });
    return Number(newBalance);
  } catch (err) {
    const body = String(err.body || err.message || '');
    if (body.includes('credit_transactions_job_refund_idx')) {
      // Already refunded — treat as success.
      return await getBalance(userId);
    }
    console.error('[credits] refundCredits failed:', body);
    return null;
  }
}

// ── Add credits (topup / bonus) ───────────────────────────
// Caller MUST verify the source of truth (e.g. PayPal capture amount)
// before calling — this is a pure ledger writer.
export async function addCredits({
  userId, amount, kind = 'topup',
  paypalOrderId = null, packCode = null, amountUsd = null
}) {
  if (!userId || !Number.isInteger(amount) || amount <= 0) {
    throw new Error('addCredits: invalid args');
  }
  try {
    const newBalance = await callRpc('credit_add', {
      p_user_id:         userId,
      p_delta:           amount,
      p_kind:            kind,
      p_paypal_order_id: paypalOrderId,
      p_pack_code:       packCode,
      p_amount_usd:      amountUsd
    });
    return Number(newBalance);
  } catch (err) {
    const body = String(err.body || err.message || '');
    if (body.includes('credit_transactions_paypal_topup_idx')) {
      // PayPal order already credited (capture replay) — idempotent success.
      return await getBalance(userId);
    }
    throw err;
  }
}

// ── List recent transactions (UI history table) ───────────
export async function listTransactions(userId, limit = 25) {
  if (!userId) return [];
  try {
    const rows = await sb(
      `credit_transactions?user_id=eq.${userId}` +
      `&order=created_at.desc&limit=${Math.min(100, Math.max(1, limit))}` +
      `&select=id,created_at,delta,balance_after,kind,paypal_order_id,studio_job_id,pack_code,amount_usd`
    );
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error('[credits] listTransactions failed:', err.message);
    return [];
  }
}
