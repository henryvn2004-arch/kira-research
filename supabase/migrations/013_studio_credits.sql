-- ============================================================
-- KIRA RESEARCH — Studio credit system (Phase O.1)
--
-- Adds pay-as-you-go credit wallet for KIRA Studio gen.
--   1 report = 100 credits
--   $1       = 10 credits (Starter pack)
--   Packs:  starter $10/100, plus $25/275 (+10%),
--           power $50/600 (+20%), bulk $200/2600 (+30%)
--
-- Tables:
--   user_credits         — single row per user, atomic balance
--   credit_transactions  — append-only ledger
--
-- RPCs (service-key only, never exposed to anon/authenticated):
--   credit_add(user_id, delta, kind, ...)
--     → atomic add for topup / refund / bonus
--   credit_debit(user_id, amount, studio_job_id)
--     → atomic deduct for studio hold; raises 'insufficient_credits'
--       if balance < amount
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── 1. Balance table ───────────────────────────────────────
-- Matches existing migrations' convention: plain `user_id uuid` with
-- no hard FK to auth.users (Supabase auth schema permissions can be
-- finicky on cross-schema FKs). RLS + service-key writes are the gate.
create table if not exists public.user_credits (
  user_id     uuid primary key,
  balance     integer not null default 0 check (balance >= 0),
  updated_at  timestamptz not null default now()
);

-- ── 2. Ledger ─────────────────────────────────────────────
create table if not exists public.credit_transactions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null,
  delta           integer not null,                       -- + credit, - debit
  balance_after   integer not null,
  kind            text not null
                  check (kind in ('topup','studio_debit','studio_refund','bonus','adjust')),
  paypal_order_id text,
  studio_job_id   uuid references public.studio_jobs(id) on delete set null,
  pack_code       text,                                   -- 'starter'|'plus'|'power'|'bulk'
  amount_usd      numeric(10,2)
);

create index if not exists credit_transactions_user_idx
  on public.credit_transactions (user_id, created_at desc);

-- Idempotency: re-capturing the same PayPal order can't double-credit.
create unique index if not exists credit_transactions_paypal_topup_idx
  on public.credit_transactions (paypal_order_id)
  where paypal_order_id is not null and kind = 'topup';

-- Idempotency: a job can be debited at most once (hold) and refunded at most once.
create unique index if not exists credit_transactions_job_debit_idx
  on public.credit_transactions (studio_job_id)
  where studio_job_id is not null and kind = 'studio_debit';

create unique index if not exists credit_transactions_job_refund_idx
  on public.credit_transactions (studio_job_id)
  where studio_job_id is not null and kind = 'studio_refund';

-- ── 3. RLS ────────────────────────────────────────────────
alter table public.user_credits         enable row level security;
alter table public.credit_transactions  enable row level security;

drop policy if exists user_credits_owner_select on public.user_credits;
create policy user_credits_owner_select
  on public.user_credits for select to authenticated
  using (user_id = auth.uid());

drop policy if exists credit_transactions_owner_select on public.credit_transactions;
create policy credit_transactions_owner_select
  on public.credit_transactions for select to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies — writes happen via service-key RPCs only.

-- ── 4. Atomic credit-add RPC ──────────────────────────────
create or replace function public.credit_add(
  p_user_id         uuid,
  p_delta           integer,
  p_kind            text,
  p_paypal_order_id text    default null,
  p_studio_job_id   uuid    default null,
  p_pack_code       text    default null,
  p_amount_usd      numeric default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_balance integer;
begin
  if p_delta <= 0 then
    raise exception 'credit_add requires positive delta, got %', p_delta;
  end if;
  if p_kind not in ('topup','studio_refund','bonus','adjust') then
    raise exception 'invalid kind for credit_add: %', p_kind;
  end if;

  insert into public.user_credits (user_id, balance, updated_at)
  values (p_user_id, p_delta, now())
  on conflict (user_id) do update
    set balance    = public.user_credits.balance + excluded.balance,
        updated_at = now()
  returning balance into v_new_balance;

  insert into public.credit_transactions
    (user_id, delta, balance_after, kind, paypal_order_id,
     studio_job_id, pack_code, amount_usd)
  values
    (p_user_id, p_delta, v_new_balance, p_kind, p_paypal_order_id,
     p_studio_job_id, p_pack_code, p_amount_usd);

  return v_new_balance;
end;
$$;

-- ── 5. Atomic credit-debit RPC ────────────────────────────
create or replace function public.credit_debit(
  p_user_id       uuid,
  p_amount        integer,
  p_studio_job_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'credit_debit requires positive amount, got %', p_amount;
  end if;

  -- Atomic decrement gated by balance >= amount.
  -- If no row matches, the user either has no wallet yet OR insufficient
  -- balance — both treated as 'insufficient_credits'.
  update public.user_credits
     set balance    = balance - p_amount,
         updated_at = now()
   where user_id = p_user_id
     and balance >= p_amount
  returning balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_transactions
    (user_id, delta, balance_after, kind, studio_job_id)
  values
    (p_user_id, -p_amount, v_new_balance, 'studio_debit', p_studio_job_id);

  return v_new_balance;
end;
$$;

-- ── 6. Lock down RPC access ───────────────────────────────
-- Service-role bypasses these grants and can still call them.
revoke execute on function public.credit_add(uuid, integer, text, text, uuid, text, numeric)
  from public, anon, authenticated;
revoke execute on function public.credit_debit(uuid, integer, uuid)
  from public, anon, authenticated;

-- ── 7. Verification notice ────────────────────────────────
do $$
declare
  has_credits   boolean;
  has_txns      boolean;
  has_add_rpc   boolean;
  has_debit_rpc boolean;
begin
  select exists(
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'user_credits'
  ) into has_credits;

  select exists(
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'credit_transactions'
  ) into has_txns;

  select exists(
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'credit_add'
  ) into has_add_rpc;

  select exists(
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'credit_debit'
  ) into has_debit_rpc;

  raise notice 'user_credits:% credit_transactions:% credit_add:% credit_debit:%',
    has_credits, has_txns, has_add_rpc, has_debit_rpc;
end$$;
