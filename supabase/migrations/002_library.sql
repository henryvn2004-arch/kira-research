-- ============================================================
-- KIRA RESEARCH — living_reports + report_translations
-- Backs /api/library-report and the library + report-detail UIs.
-- Run once in Supabase SQL editor after 001_leads.sql.
-- ============================================================

-- ── Reset legacy schema (safe on fresh installs) ──────────
-- The original Supabase project has platform-era `living_reports` and
-- `report_translations` tables predating this model. They keep NOT NULL
-- columns (title, etc.) bundled into the base table that don't fit the
-- base + per-locale-translation split below, so the seed inserts at the
-- bottom of this file fail against them. Year 1 has no useful data in
-- those legacy rows, so we drop and recreate cleanly.
--
-- CASCADE removes any dependent foreign keys — notably purchases.report_id
-- if migration 004 already ran. The end-of-file block re-attaches that FK.
-- DROP IF EXISTS is a no-op on fresh installs, so this is idempotent.
drop table if exists public.report_translations cascade;
drop table if exists public.living_reports      cascade;

-- ── living_reports ────────────────────────────────────────
-- Base metadata for each report. One row per report (regardless of locale).
--
-- This migration was rerun against an existing project that already had a
-- legacy `living_reports` table from the platform era (different column set).
-- The CREATE TABLE below is greenfield-only; the ALTER TABLE block right
-- after backfills any missing columns into a legacy table. Both paths
-- converge on the same final schema.
create table if not exists public.living_reports (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz,

  -- Identity
  slug            text not null unique,
  country         text not null,
  industry        text not null,
  year            integer not null,
  pages           integer,

  -- Pricing (Year 1: flat $39 — kept as column to allow per-report exceptions later)
  price           integer not null default 39,
  currency        text not null default 'USD',

  -- Distribution
  aggregators     text[] not null default '{}',  -- ['ResearchAndMarkets', 'GIIResearch', ...]

  -- Lifecycle
  status          text not null default 'draft'
                   check (status in ('draft', 'published', 'retired'))
);

create index if not exists living_reports_country_year_idx
  on public.living_reports (country, year desc);

create index if not exists living_reports_industry_year_idx
  on public.living_reports (industry, year desc);

create index if not exists living_reports_status_idx
  on public.living_reports (status);


-- ── report_translations ───────────────────────────────────
-- One row per (report_id, locale). Each locale is published independently.
-- full_content is NEVER served by /api/library-report (preview is) — it's
-- gated behind purchase via a separate endpoint.
create table if not exists public.report_translations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz,

  report_id       uuid not null references public.living_reports(id) on delete cascade,
  locale          text not null check (locale in ('en','ja','ko')),

  -- Marketing-visible
  title           text not null,
  eyebrow         text,                          -- e.g. "VIETNAM · FINTECH · MARKET ANALYSIS"
  preview         jsonb,                         -- structured first-section preview
  toc             jsonb not null default '[]',   -- [{num, name, pages, locked}]

  -- Gated content (delivered post-purchase only)
  full_content    jsonb,
  pdf_url         text,                          -- Supabase Storage public URL or signed URL

  -- Lifecycle
  status          text not null default 'draft'
                   check (status in ('draft', 'review', 'published', 'retired')),

  unique (report_id, locale)
);

create index if not exists report_translations_lookup_idx
  on public.report_translations (report_id, locale, status);

create index if not exists report_translations_locale_published_idx
  on public.report_translations (locale, published_at desc)
  where status = 'published';


-- ── updated_at trigger (reuse function from 001_leads.sql) ─
drop trigger if exists living_reports_set_updated_at on public.living_reports;
create trigger living_reports_set_updated_at
  before update on public.living_reports
  for each row execute function public.set_updated_at();

drop trigger if exists report_translations_set_updated_at on public.report_translations;
create trigger report_translations_set_updated_at
  before update on public.report_translations
  for each row execute function public.set_updated_at();


-- ── RLS ───────────────────────────────────────────────────
-- Anyone can READ published rows (so the public site can render).
-- Only the service-key (from /api/* endpoints) can write or read drafts.
alter table public.living_reports      enable row level security;
alter table public.report_translations enable row level security;

drop policy if exists living_reports_read_published on public.living_reports;
create policy living_reports_read_published
  on public.living_reports
  for select to anon, authenticated
  using (status = 'published');

drop policy if exists report_translations_read_published on public.report_translations;
create policy report_translations_read_published
  on public.report_translations
  for select to anon, authenticated
  using (status = 'published');

-- Note: full_content is in a published row but the API never returns it
-- without verifying a paid purchase. We deliberately allow SELECT here so
-- the same query path works for both anon (preview) and authenticated buyers
-- (full content) — gating is enforced in the API, not in RLS.


-- ============================================================
-- Sample seed (matches the slugs the library + insights pages link to).
-- Comment out if you'd rather seed manually.
-- ============================================================

insert into public.living_reports (slug, country, industry, year, pages, aggregators, status, published_at)
values
  ('vietnam-fintech-2026',             'Vietnam',     'Fintech',         2026, 78, '{ResearchAndMarkets,MarketResearch.com,GIIResearch}', 'published', now()),
  ('indonesia-fmcg-2026',              'Indonesia',   'FMCG',            2026, 92, '{ResearchAndMarkets,MarketResearch.com,GIIResearch}', 'published', now()),
  ('thailand-ecommerce-logistics-2026','Thailand',    'Logistics',       2026, 84, '{ResearchAndMarkets,ASDReports,GIIResearch}',          'published', now()),
  ('philippines-healthtech-2026',      'Philippines', 'Healthtech',      2026, 70, '{ResearchAndMarkets,MarketResearch.com}',              'published', now()),
  ('malaysia-qsr-cafe-2026',           'Malaysia',    'F&B',             2026, 66, '{ResearchAndMarkets,ASDReports}',                      'published', now()),
  ('vietnam-industrial-real-estate-2026','Vietnam',   'Real Estate',     2026, 74, '{ResearchAndMarkets,MarketResearch.com}',              'published', now()),
  ('singapore-private-banking-2026',   'Singapore',   'Financial',       2026, 80, '{ResearchAndMarkets,GIIResearch}',                     'published', now()),
  ('indonesia-ev-2026',                'Indonesia',   'Energy & EV',     2026, 88, '{ResearchAndMarkets,MarketResearch.com,GIIResearch}', 'published', now())
on conflict (slug) do nothing;

-- English translation for the showcase report (Vietnam Fintech).
-- Other reports + other locales: insert via admin tooling later.
insert into public.report_translations (
  report_id, locale, title, eyebrow, preview, toc, status, published_at
)
select
  r.id,
  'en',
  'Vietnam Fintech Landscape: Payments, Lending & Competitive Dynamics',
  'VIETNAM · FINTECH · MARKET ANALYSIS',
  jsonb_build_object(
    'lede',  $lede$Vietnam's fintech sector entered 2026 with 72% smartphone penetration, a maturing regulatory framework under State Bank of Vietnam (SBV), and rising competition between domestic super-apps and regional challengers. Payments remain the dominant segment, but lending and embedded finance are growing fastest as banks open APIs and quick-commerce platforms add credit products.$lede$,
    'paragraphs', jsonb_build_array(
      $p1$This report covers the competitive landscape across MoMo, ZaloPay, VNPay, and emerging neobank entrants; channel structures across QR-based and account-to-account payments; the regulatory environment under Decree 13/2023 and subsequent amendments; and the increasing role of AI in credit scoring, fraud detection, and customer operations across Vietnamese fintech operators.$p1$,
      $p2$The 2026 AI impact on Vietnamese fintech is structural rather than peripheral. Major operators have integrated LLM-powered customer service (reducing support cost ~30%), AI-driven underwriting (expanding the addressable lending market by ~18%), and fraud-detection improvements that have measurably reduced chargebacks across the leading payment rails.$p2$
    ),
    'chart', jsonb_build_object(
      'title',    'Vietnam Digital Payment Transaction Volume (USD bn)',
      'subtitle', '2021 → 2026E',
      'bars', jsonb_build_array(
        jsonb_build_object('label','2021', 'value',12, 'pct',22),
        jsonb_build_object('label','2022', 'value',19, 'pct',35),
        jsonb_build_object('label','2023', 'value',28, 'pct',51),
        jsonb_build_object('label','2024', 'value',41, 'pct',75),
        jsonb_build_object('label','2025', 'value',52, 'pct',90),
        jsonb_build_object('label','2026E','value',63, 'pct',100)
      )
    )
  ),
  jsonb_build_array(
    jsonb_build_object('num','01','name','Executive Summary',                                 'pages','PG 03','locked',false),
    jsonb_build_object('num','02','name','Market Overview & Sizing',                          'pages','PG 07','locked',true),
    jsonb_build_object('num','03','name','Segmentation: Payments, Lending, Wealth, Insurance','pages','PG 14','locked',true),
    jsonb_build_object('num','04','name','Industry Structure & Value Chain',                  'pages','PG 22','locked',true),
    jsonb_build_object('num','05','name','Competitive Landscape — Top Operators',             'pages','PG 28','locked',true),
    jsonb_build_object('num','06','name','Consumer & SME Insights',                           'pages','PG 38','locked',true),
    jsonb_build_object('num','07','name','Channel & Distribution',                            'pages','PG 45','locked',true),
    jsonb_build_object('num','08','name','Pricing & Unit Economics',                          'pages','PG 52','locked',true),
    jsonb_build_object('num','09','name','Regulatory Environment (SBV, Decree 13)',           'pages','PG 58','locked',true),
    jsonb_build_object('num','10','name','AI Impact on Vietnam Fintech — 2026',               'pages','PG 64','locked',true),
    jsonb_build_object('num','11','name','Outlook & Forecast 2026–2030',                      'pages','PG 70','locked',true),
    jsonb_build_object('num','12','name','Strategic Implications',                            'pages','PG 76','locked',true)
  ),
  'published',
  now()
from public.living_reports r
where r.slug = 'vietnam-fintech-2026'
on conflict (report_id, locale) do nothing;


-- ── Re-attach purchases.report_id → living_reports(id) FK ─
-- The CASCADE drop at the top of this file removed the FK if migration
-- 004_purchases.sql had already run. Re-attach it now that living_reports
-- exists again. Defensive guards: only run if both purchases.report_id
-- column exists and the FK constraint does NOT yet exist.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'purchases' and column_name = 'report_id'
  )
  and not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'purchases'
      and constraint_type = 'FOREIGN KEY' and constraint_name = 'purchases_report_id_fkey'
  )
  then
    alter table public.purchases
      add constraint purchases_report_id_fkey
      foreign key (report_id) references public.living_reports(id);
  end if;
end $$;
