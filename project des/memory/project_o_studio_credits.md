---
name: kira-studio-credits
description: "Phase O: pay-as-you-go credit system for KIRA Studio. 1 report = 100 credits. 4 PayPal packs. Profile + Studio billing UIs."
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## What this is

[[project_n_kira_studio|KIRA Studio]] (subdomain `studio.kiraresearch.com`) gates self-serve report generation behind a credit wallet. Each successful gen costs **100 credits**. Users top up via PayPal (4 fixed packs). Failed gens auto-refund. Receipts via Resend.

Phase O shipped 2026-05-24 (commits `2738eab` → `09ebe86`).

## Pricing (canonical — single source of truth: `api/_lib/credits.js` PACKS)

| Pack | USD | Credits | Bonus | Reports | $/report |
|---|---|---|---|---|---|
| Starter | $10 | 100 | — | 1 | $10.00 |
| **Plus ⭐** | **$25** | **275** | **+10%** | **2-3** | **$9.09** |
| Power | $50 | 600 | +20% | 6 | $8.33 |
| Bulk | $200 | 2,600 | +30% | 26 | $7.69 |

- 1 report = 100 credits (flat — no variable pricing for upload size)
- $1 = 10 credits (Starter rate)
- Credits never expire
- No subscription (Henry explicit: too confusing for users vs pay-as-you-go)
- No free trial (Henry explicit: must buy from sign-up)

## Architecture

```
Profile (/en/profile) ──► credit dashboard card (balance + 2 CTAs)
                          │
                          │ Both CTAs deep-link into Studio:
                          ▼
   ┌─ "Top up credits →"  → studio.kiraresearch.com/billing
   │                         (4 pack cards · PayPal redirect · history table)
   │
   └─ "New report →"      → studio.kiraresearch.com/new
                            (existing topic form + balance pill + 402 gate)

PayPal flow (mirrors library-buy.js):
   create order  →  approveUrl  →  PayPal site  →  return_url with token
                                                  │
                                                  ▼
                                  /billing auto-captures via ?paypal=success&token=...
                                  → addCredits() RPC → ledger row → receipt email

Studio gen flow:
   POST /api/studio-jobs (auth required)
     → balance pre-flight (cheap read) → 402 + buy_url if < 100
     → insert studio_jobs row
     → atomic credit_debit() RPC (hold 100) → 402 if race-loss
     → inngest.send() → workflow runs
        on success: hold stays (debit committed)
        on failure (workflow onFailure): refundCredits() → +100 back
```

## Database

**Migration 013** dropped Sprint-5.3 retired legacy credit tables (`user_credits`, `credit_transactions` had different schema, no `kind` / `paypal_order_id` columns) and recreated:

- `user_credits (user_id PK, balance, updated_at)` — atomic balance, single row per user
- `credit_transactions (...)` — append-only ledger with `kind` ∈ {topup, studio_debit, studio_refund, bonus, adjust}

**RPCs** (service-key only, REVOKE EXECUTE from anon/authenticated, `SET search_path = ''`):
- `credit_add(p_user_id, p_delta, p_kind, p_paypal_order_id?, p_studio_job_id?, p_pack_code?, p_amount_usd?)`
- `credit_debit(p_user_id, p_amount, p_studio_job_id)` — raises `insufficient_credits` (P0001) if balance < amount

**3 partial unique indexes** make capture / hold / refund idempotent (replay-safe):
- `credit_transactions_paypal_topup_idx` on `(paypal_order_id) WHERE kind='topup'`
- `credit_transactions_job_debit_idx` on `(studio_job_id) WHERE kind='studio_debit'`
- `credit_transactions_job_refund_idx` on `(studio_job_id) WHERE kind='studio_refund'`

The `addCredits()` and `holdCredits()` helpers in `api/_lib/credits.js` catch unique-violation errors → return existing balance instead of throwing → seamless replay handling for PayPal re-capture and Inngest re-retry.

## File map

| File | Role |
|---|---|
| `supabase/migrations/013_studio_credits.sql` | Tables + RPCs + RLS + drop-legacy |
| `api/_lib/credits.js` | PACKS catalog + getBalance/holdCredits/refundCredits/addCredits/listTransactions |
| `api/studio-credits-buy.js` | POST `?action=create|capture` — PayPal flow, custom_id = `studio_credits\|<pack>\|<user_id>` |
| `api/studio-credits.js` | GET balance + packs + last 25 transactions |
| `api/studio-jobs.js` | POST adds pre-flight 402 + atomic hold + refund on dispatch fail |
| `api/_lib/studio-workflow.js` | onFailure refunds 100 on Inngest exhausted retries |
| `api/_lib/email.js` | `sendCreditTopupReceipt()` |
| `public/studio/billing.html` | Balance card + 4 pack buttons + history table + PayPal return handler |
| `public/studio/new.html` | Balance pill in nav + 402 redirect to /billing |
| `public/{en,ja,ko}/profile.html` | Credit dashboard card replacing static Studio CTA |
| `public/js/nav.js` | Host-aware: on `studio.*` subdomain, all main-site links prefixed with `https://kiraresearch.com` |

## Key code patterns

**Replay-safe atomic add** (idempotent capture):
```js
try { const bal = await callRpc('credit_add', { ... p_paypal_order_id: orderId }); return bal; }
catch (err) {
  if (err.body.includes('credit_transactions_paypal_topup_idx')) return getBalance(userId);
  throw err;
}
```

**Race-safe hold** (concurrent submit guard):
```sql
UPDATE user_credits SET balance = balance - p_amount WHERE user_id = p_user_id AND balance >= p_amount RETURNING balance;
-- If 0 rows updated → raise 'insufficient_credits'
```

**402 contract** (Studio /new client handles this):
```json
{ "error": "insufficient_credits", "balance": 50, "report_cost": 100, "short_by": 50, "buy_url": "/billing" }
```

## Security gates

- Both `/api/studio-credits-buy?action=create|capture` require Bearer JWT → 401 if missing
- Capture verifies `custom_id.userId === caller.user.id` → 403 `order_not_owned` if mismatch (defence-in-depth — even if attacker knows another user's pending order id, they can't credit themselves)
- Capture validates PayPal-reported amount matches PACKS catalog within 1¢ → 400 `amount_mismatch` if not
- `/billing` page preserves `?paypal=success&token=...` query string when auth gate fires → if session expires mid-checkout, post-sign-in capture still works (Phase O.10.1)

## Cross-subdomain nav fix (Phase O.11)

When `nav.js` runs on `studio.kiraresearch.com`, its emitted paths (`/en/insights`, `/en/library`, etc.) used to 404 because those routes only exist on the main domain. Fix:

```js
const isStudioHost = /^studio\./i.test(window.location.hostname);
const HOST_PREFIX  = isStudioHost ? 'https://kiraresearch.com' : '';
function localPath(p) { return HOST_PREFIX + '/' + locale + (p.startsWith('/') ? p : '/' + p); }
```

Also skips canonical / hreflang / Organization JSON-LD injection on Studio host (pages are noindex + Studio is invisible infrastructure per [[project_n_kira_studio]]).

## Future work

- **Admin view** for credit transactions (list topups, refunds, manual adjust button for support)
- **Discount codes** (e.g. WELCOME20 → free 20 credits or % off pack)
- **Referral bonuses** (refer a friend = 50 credits each)
- **Localize `/billing` to JA + KO** — currently EN-only on Studio billing page
- **Sentry monitoring** for credit_debit / credit_add failures (silent ledger errors are bad)
- **Re-test full E2E flow** (Henry hasn't done a real PayPal sandbox → gen → refund cycle yet as of 2026-05-24)

See also: [[project_n_kira_studio]] · [[reference_kira_research]] · [[feedback_clickthrough_not_cli]]
