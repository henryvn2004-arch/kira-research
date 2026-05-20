-- ============================================================
-- KIRA RESEARCH — insights + insight_translations
-- Backs /api/insights-list and /api/insight.
-- Free-to-read blog content; cross-links into library_reports.
-- Run once in Supabase SQL editor after 002_library.sql.
-- ============================================================

-- ── insights ──────────────────────────────────────────────
-- Base metadata (locale-independent).
create table if not exists public.insights (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  published_at          timestamptz,

  slug                  text not null unique,
  category              text,       -- 'methodology' | 'field-note' | 'data-explainer' | ...
  country               text,       -- 'vietnam' | 'indonesia' | ... (lowercase)
  industry              text,       -- 'fintech' | 'fmcg' | ... (lowercase)
  featured              boolean not null default false,

  -- Cross-link to one or more reports (drives the bottom-of-article CTA).
  related_report_slugs  text[] not null default '{}',

  status                text not null default 'draft'
                         check (status in ('draft','review','published','retired'))
);

create index if not exists insights_status_published_at_idx
  on public.insights (status, published_at desc);
create index if not exists insights_category_idx on public.insights (category);
create index if not exists insights_country_idx  on public.insights (country);
create index if not exists insights_industry_idx on public.insights (industry);
create index if not exists insights_featured_idx
  on public.insights (featured) where status = 'published';


-- ── insight_translations ──────────────────────────────────
create table if not exists public.insight_translations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,

  insight_id    uuid not null references public.insights(id) on delete cascade,
  locale        text not null check (locale in ('en','ja','ko')),

  title         text not null,
  excerpt       text,                              -- short blurb for cards (<280 chars)
  lede          text,                              -- opening paragraph rendered larger
  body          text,                              -- HTML/markdown body (rendered as-is, trusted source)
  read_time     text,                              -- e.g. "6 min read"

  status        text not null default 'draft'
                 check (status in ('draft','review','published','retired')),

  unique (insight_id, locale)
);

create index if not exists insight_translations_lookup_idx
  on public.insight_translations (insight_id, locale, status);


-- ── updated_at triggers (reuse public.set_updated_at) ─────
drop trigger if exists insights_set_updated_at on public.insights;
create trigger insights_set_updated_at
  before update on public.insights
  for each row execute function public.set_updated_at();

drop trigger if exists insight_translations_set_updated_at on public.insight_translations;
create trigger insight_translations_set_updated_at
  before update on public.insight_translations
  for each row execute function public.set_updated_at();


-- ── RLS — published only for anon ─────────────────────────
alter table public.insights              enable row level security;
alter table public.insight_translations  enable row level security;

drop policy if exists insights_read_published on public.insights;
create policy insights_read_published
  on public.insights for select to anon, authenticated
  using (status = 'published');

drop policy if exists insight_translations_read_published on public.insight_translations;
create policy insight_translations_read_published
  on public.insight_translations for select to anon, authenticated
  using (status = 'published');


-- ============================================================
-- Seed: 6 insights matching the slugs the static insights/index.html
-- referenced before the DB hookup. EN translation only — JA/KO get
-- added via admin tooling later.
-- ============================================================

insert into public.insights (slug, category, country, industry, featured, related_report_slugs, status, published_at)
values
  ('vietnam-sme-lending-shift',     'field-note',  'vietnam',     'fintech',     true,  '{vietnam-fintech-2026,indonesia-fmcg-2026}',          'published', now() - interval '8 days'),
  ('indonesia-warung-instrumented', 'field-note',  'indonesia',   'fmcg',        false, '{indonesia-fmcg-2026}',                                'published', now() - interval '14 days'),
  ('thailand-eec-fulfillment',      'field-note',  'thailand',    'logistics',   false, '{thailand-ecommerce-logistics-2026}',                  'published', now() - interval '30 days'),
  ('philippines-telemedicine-retention', 'field-note', 'philippines','healthtech', false, '{philippines-healthtech-2026}',                       'published', now() - interval '35 days'),
  ('methodology-primary-research-2026',  'methodology', null,    null,          false, '{}',                                                    'published', now() - interval '40 days'),
  ('malaysia-cloud-kitchen-economics',   'field-note',  'malaysia','f&b',        false, '{malaysia-qsr-cafe-2026}',                             'published', now() - interval '60 days'),
  ('singapore-family-office-slowdown',   'field-note',  'singapore','financial', false, '{singapore-private-banking-2026}',                     'published', now() - interval '70 days')
on conflict (slug) do nothing;


-- EN translation for the featured field note (the only one with full body).
insert into public.insight_translations (insight_id, locale, title, excerpt, lede, body, read_time, status, published_at)
select
  i.id, 'en',
  'How Vietnam''s super-apps quietly rewrote SME lending in 18 months.',
  'Three operators now originate more SME credit than any commercial bank under VND 500M ticket size. The shift isn''t about AI underwriting — it''s about who controls the cash-flow data.',
  'Three super-app operators now originate more SME credit under VND 500M ticket size than any commercial bank in Vietnam. The shift didn''t happen because AI underwriting finally worked — it happened because someone else now owns the cash-flow data.',
  '<p>The conventional story is that fintech disrupted lending by replacing human credit officers with machine-learning models. That framing matches the press releases, but it doesn''t match what we''re seeing in the field. The Vietnamese case is a useful counter-example because the technology under the hood is — frankly — not very interesting. What''s interesting is who has the data.</p>' ||
  '<p>Eighteen months ago, the leading domestic super-apps started bundling working-capital credit products into their merchant-payments tools. The product looked nearly identical to commercial-bank SME lines on paper: rolling line, monthly review, similar pricing. The difference was the underwriting input: instead of relying on tax returns and bank statements (the inputs banks have always used), the super-apps underwrote against <strong>14 months of in-product cash flow</strong> — every settlement, every refund, every chargeback, every dispute, captured natively.</p>' ||
  '<blockquote>The competitive moat isn''t the model. It''s the data the model is fed.</blockquote>' ||
  '<h2>What we''ve heard in the field</h2>' ||
  '<p>We spoke with merchants across HCMC and Hanoi who use multiple payment rails. The consistent pattern: <strong>approval rates 2–3× higher</strong> on super-app lines vs their primary bank, despite the bank holding deeper relationship history. Decision turnaround was the second consistent signal — 24–72 hours on super-app lines vs 2–4 weeks for the equivalent bank product.</p>' ||
  '<p>Both numbers point in the same direction: the super-apps aren''t taking on dramatically worse credit; they''re seeing the borrower more accurately. The data they hold is higher-fidelity than what the SME would normally submit to a bank, and it''s live. Once you have a clean read on a borrower''s cash flow, the underwriting model becomes almost commodity.</p>' ||
  '<h2>Why this matters for incumbents</h2>' ||
  '<p>The standard incumbent response — "we''ll just build the AI model too" — doesn''t solve the actual problem. The problem isn''t model quality. It''s data possession. Banks looking at this market structure now have two real options:</p>' ||
  '<ul><li>Acquire the data layer (partnerships with payment platforms; data-sharing rights)</li><li>Compete on segments where the super-apps don''t have the data yet (cross-border, project finance, secured)</li></ul>' ||
  '<p>The thing that doesn''t work is pretending the gap is technological. We''ve seen at least three banks make that mistake in the last 12 months and shed market share through it.</p>' ||
  '<h3>Methodology note</h3>' ||
  '<p style="font-size:14px;color:var(--muted);font-style:italic;">This field note is drawn from analyst interviews conducted across Vietnamese SME operators between February and April 2026, supplemented by our 2026 Vietnam Fintech Landscape report. Full sourcing, charts, and operator-level cost analysis are in the paid report.</p>',
  '6 min read',
  'published',
  now() - interval '8 days'
from public.insights i where i.slug = 'vietnam-sme-lending-shift'
on conflict (insight_id, locale) do nothing;


-- Shorter EN translations for the other 6 insights (excerpt only, no body yet).
-- These render correctly on the index page but show "coming soon" on article view
-- until full body is added.
insert into public.insight_translations (insight_id, locale, title, excerpt, read_time, status, published_at)
select i.id, 'en',
  case i.slug
    when 'indonesia-warung-instrumented'        then 'Warungs aren''t dying — they''re being instrumented.'
    when 'thailand-eec-fulfillment'             then 'The EEC fulfillment build-out nobody is pricing in.'
    when 'philippines-telemedicine-retention'   then 'Why telemedicine retention is harder in PH than in ID.'
    when 'methodology-primary-research-2026'    then 'What we mean when we say "primary research" in 2026.'
    when 'malaysia-cloud-kitchen-economics'     then 'The cloud-kitchen story Malaysia rarely tells correctly.'
    when 'singapore-family-office-slowdown'     then 'Family-office formation: the slowdown is structural, not cyclical.'
  end,
  case i.slug
    when 'indonesia-warung-instrumented'        then 'Quick-commerce hasn''t replaced the corner store. It''s wrapped it in a logistics layer, and the margin story is more interesting than the channel-shift narrative suggests.'
    when 'thailand-eec-fulfillment'             then 'Thailand''s Eastern Economic Corridor added 1.4M sqm of modern warehousing in 24 months. Most of it isn''t on the official maps yet.'
    when 'philippines-telemedicine-retention'   then 'Same regional sponsor, similar UX, very different cohort curves. The structural difference is doctor density per province, not app design.'
    when 'methodology-primary-research-2026'    then 'The phrase has been so flattened it''s nearly meaningless. Here''s what stays in our definition, what doesn''t, and where AI fits in.'
    when 'malaysia-cloud-kitchen-economics'     then 'Headline GMV looks healthy. The interesting number is the share of operators who closed within 18 months of opening — and what that says about unit economics.'
    when 'singapore-family-office-slowdown'     then '2025 new-formation rates dropped sharply. Most explanations cite rate differentials. The harder explanation involves MAS Section 13O changes nobody talks about.'
  end,
  case i.slug
    when 'methodology-primary-research-2026'    then '4 min read'
    when 'singapore-family-office-slowdown'     then '7 min read'
    when 'malaysia-cloud-kitchen-economics'     then '6 min read'
    when 'indonesia-warung-instrumented'        then '4 min read'
    when 'thailand-eec-fulfillment'             then '5 min read'
    when 'philippines-telemedicine-retention'   then '5 min read'
  end,
  'published',
  i.published_at
from public.insights i
where i.slug in (
  'indonesia-warung-instrumented',
  'thailand-eec-fulfillment',
  'philippines-telemedicine-retention',
  'methodology-primary-research-2026',
  'malaysia-cloud-kitchen-economics',
  'singapore-family-office-slowdown'
)
on conflict (insight_id, locale) do nothing;
