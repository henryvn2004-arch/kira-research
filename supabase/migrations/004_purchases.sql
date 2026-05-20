-- ============================================================
-- KIRA RESEARCH — extend purchases for library model
-- Adds locale + report_id to the existing purchases table so each
-- purchase is unique per (user, report, locale) and joinable to
-- living_reports / report_translations.
--
-- Idempotent: safe to re-run.
-- ============================================================

-- 1) Create purchases table if it doesn't already exist (defensive — the
--    table was originally created by legacy migrations).
create table if not exists public.purchases (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid,
  slug            text not null,
  report_type     text,
  amount          numeric(10,2),
  currency        text default 'USD',
  paypal_order_id text,
  status          text default 'pending'
);

-- 2) Add columns the new library model needs.
alter table public.purchases
  add column if not exists locale     text default 'en'
                                       check (locale in ('en','ja','ko')),
  add column if not exists report_id  uuid references public.living_reports(id),
  add column if not exists captured_at timestamptz;

-- 3) Indexes for the hot paths (verify + content gating).
create index if not exists purchases_user_slug_locale_status_idx
  on public.purchases (user_id, slug, locale, status);

create index if not exists purchases_paypal_order_idx
  on public.purchases (paypal_order_id);

create index if not exists purchases_user_created_idx
  on public.purchases (user_id, created_at desc);

-- 4) Unique constraint: one completed purchase per (user, slug, locale).
--    Lets us idempotently re-process a PayPal capture without duplicate rows.
create unique index if not exists purchases_unique_completed_idx
  on public.purchases (user_id, slug, locale)
  where status = 'completed';

-- 5) Backfill report_id where slug matches and column is null.
update public.purchases p
   set report_id = r.id
  from public.living_reports r
 where p.report_id is null
   and p.slug = r.slug;

-- ============================================================
-- RLS — owner reads own purchases; nobody writes from client.
-- All writes happen via /api/library-buy (service-key path).
-- ============================================================
alter table public.purchases enable row level security;

drop policy if exists purchases_owner_select on public.purchases;
create policy purchases_owner_select
  on public.purchases for select to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies — service-key only.


-- ============================================================
-- downloads — tracks each gated-content delivery.
-- Written by /api/library-content; readable by admins via service-key.
-- ============================================================
create table if not exists public.downloads (
  id              uuid primary key default gen_random_uuid(),
  delivered_at    timestamptz not null default now(),
  user_id         uuid,
  report_id       uuid references public.living_reports(id),
  slug            text,
  locale          text check (locale in ('en','ja','ko')),
  ua              text
);

create index if not exists downloads_user_idx
  on public.downloads (user_id, delivered_at desc);

create index if not exists downloads_report_idx
  on public.downloads (report_id, delivered_at desc);

alter table public.downloads enable row level security;

drop policy if exists downloads_owner_select on public.downloads;
create policy downloads_owner_select
  on public.downloads for select to authenticated
  using (user_id = auth.uid());

-- All writes via service-key (api/library-content.js).
