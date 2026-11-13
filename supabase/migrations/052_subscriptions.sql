-- 052_subscriptions.sql — the Month plan ($149, PayPal Subscriptions) (S7, 2026-10-12).
--
--   billing_plans              the PayPal product/plan created once per price (key like 'month-149-usd')
--   subscriptions              one row per PayPal subscription a reader started; status mirrors PayPal
--                              (pending → active → cancelled/suspended/expired); the period dates are what
--                              PayPal last told us, refreshed on read (api/_lib/subscription.js)
--   subscription_pdf_downloads one row per (reader, report, language, billing period): the Month plan includes
--                              5 PDF downloads per period (setting subscription.pdf_per_month); downloading
--                              the same PDF again in the same period does not count again
--
-- Written only by the API (service role). A reader may read their own rows. Idempotent.

create table if not exists public.billing_plans (
  key               text primary key,
  paypal_product_id text not null,
  paypal_plan_id    text not null,
  price             numeric(10,2) not null,
  currency          text not null default 'USD',
  created_at        timestamptz not null default now()
);
alter table public.billing_plans enable row level security;

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  user_id                uuid not null,
  plan                   text not null default 'month',
  paypal_subscription_id text not null unique,
  status                 text not null default 'pending'
                         check (status in ('pending', 'active', 'cancelled', 'suspended', 'expired')),
  started_at             timestamptz,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_requested_at    timestamptz,
  last_checked_at        timestamptz,
  welcomed_at            timestamptz            -- set when the "your subscription is live" email was sent
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, created_at desc);
create unique index if not exists subscriptions_one_active_idx on public.subscriptions (user_id) where status = 'active';
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_owner_select on public.subscriptions;
create policy subscriptions_owner_select on public.subscriptions for select to authenticated using (user_id = auth.uid());

create table if not exists public.subscription_pdf_downloads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null,
  subscription_id uuid not null references public.subscriptions(id),
  slug            text not null,
  locale          text not null,
  period_start    timestamptz not null
);
create unique index if not exists subscription_pdf_once_idx
  on public.subscription_pdf_downloads (user_id, slug, locale, period_start);
alter table public.subscription_pdf_downloads enable row level security;
drop policy if exists subscription_pdf_owner_select on public.subscription_pdf_downloads;
create policy subscription_pdf_owner_select on public.subscription_pdf_downloads for select to authenticated using (user_id = auth.uid());
