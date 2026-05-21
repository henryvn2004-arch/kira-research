-- ============================================================
-- KIRA RESEARCH — Aggregator tracking (Sprint 4.4)
--
-- Year 1 distribution: KIRA submits reports to third-party aggregators
-- (ResearchAndMarkets, MarketResearch.com, ASDReports, GIIResearch,
-- Yano Research, Mordor Korea, dataintelo, …). Aggregators sell on
-- commission and report sales back manually. We store both sides:
--
--   aggregator_submissions  → "we submitted X to Y on date Z, status …"
--   aggregator_sales        → "Y reported a sale of X on date Z, gross/commission/net"
--
-- Year 1 is fully manual (no API integration with aggregators per the
-- Decisions Log in `project des/CLAUDE.md`). Owner types entries via
-- /en/admin/aggregators. Schema is intentionally loose — `aggregator`
-- is free text rather than an enum so adding a new partner doesn't
-- need a schema change.
--
-- Run AFTER 001-006 in the Supabase SQL editor. Idempotent.
-- ============================================================

-- ─────────── Submissions ───────────
create table if not exists public.aggregator_submissions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  report_id       uuid references public.living_reports(id) on delete cascade,
  locale          text not null check (locale in ('en', 'ja', 'ko')),
  -- e.g. 'research-and-markets' | 'market-research' | 'asd-reports' |
  --      'gii-research' | 'yano' | 'mordor-korea' | 'dataintelo' | 'other'
  aggregator      text not null,

  submitted_at    timestamptz,                     -- when we sent it (nullable while drafting)
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected', 'live')),
  aggregator_url  text,                            -- where it's published on their site
  commission_pct  numeric(5,2),                    -- e.g. 35.00 = 35%
  contact_name    text,
  contact_email   text,
  notes           text
);

create index if not exists aggregator_submissions_report_idx
  on public.aggregator_submissions (report_id, locale);

create index if not exists aggregator_submissions_status_idx
  on public.aggregator_submissions (status, submitted_at desc);

create index if not exists aggregator_submissions_aggregator_idx
  on public.aggregator_submissions (aggregator, submitted_at desc);

-- Auto-bump updated_at on UPDATE — reuses the public.set_updated_at()
-- function that's already in the DB from earlier migrations.
drop trigger if exists aggregator_submissions_set_updated on public.aggregator_submissions;
create trigger aggregator_submissions_set_updated
  before update on public.aggregator_submissions
  for each row execute function public.set_updated_at();

-- ─────────── Sales ───────────
create table if not exists public.aggregator_sales (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  report_id       uuid references public.living_reports(id) on delete cascade,
  locale          text not null check (locale in ('en', 'ja', 'ko')),
  aggregator      text not null,

  sold_at         timestamptz not null default now(),  -- when the aggregator reports the sale
  gross_amount    numeric(10,2) not null,              -- list price on the aggregator
  commission_pct  numeric(5,2),                        -- snapshot for this sale (may differ from submission default)
  net_amount      numeric(10,2),                       -- payable to KIRA — computed by owner from gross + commission
  currency        text not null default 'USD',
  buyer_country   text,                                -- free text (aggregator-reported)
  notes           text
);

create index if not exists aggregator_sales_report_idx
  on public.aggregator_sales (report_id, locale);

create index if not exists aggregator_sales_when_idx
  on public.aggregator_sales (sold_at desc);

create index if not exists aggregator_sales_aggregator_idx
  on public.aggregator_sales (aggregator, sold_at desc);

-- ─────────── RLS ───────────
-- Both tables are admin-only. Service-key writes from /api/admin-*
-- bypass RLS, so no policies are needed for the admin path. Lock down
-- anon + authenticated by enabling RLS without any select/insert/etc
-- policies — PostgREST returns empty/forbidden.
alter table public.aggregator_submissions enable row level security;
alter table public.aggregator_sales       enable row level security;

-- Sanity log.
do $$
declare
  sub_count int;
  sales_count int;
begin
  select count(*) into sub_count   from public.aggregator_submissions;
  select count(*) into sales_count from public.aggregator_sales;
  raise notice 'Migration 007 done. aggregator_submissions: % rows, aggregator_sales: % rows. Both RLS-enabled, service-key-only writes.',
    sub_count, sales_count;
end $$;
