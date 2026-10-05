-- ============================================================
-- 023_taxonomy_topics.sql — Phase S / Sprint S3
-- Taxonomy (countries, industries L1/L2, competencies) and the topic
-- pipeline (proposed → approved/rejected → queued) behind /en/admin/topics.
--
-- Data is NOT seeded here: the taxonomy content is the editorial plan and
-- lives in the private repo; it is loaded straight into the database.
-- All tables are service-role only (RLS on, no policies).
-- Idempotent.
-- ============================================================

create table if not exists tax_countries (
  code        text primary key,
  name        text not null,
  tier        smallint not null check (tier between 1 and 3),
  ord         int not null default 0
);

create table if not exists tax_competencies (
  key         text primary key,
  label       text not null,
  stage       text not null check (stage in ('explore','enter','expand','any')),
  ord         int not null default 0
);

-- Industries form a two-level tree: level 1 = broad industry, level 2 = a
-- narrower segment (parent_id points at the level-1 row).
create table if not exists tax_industries (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  level       smallint not null default 1 check (level in (1,2)),
  parent_id   uuid references tax_industries(id),
  brain_slug  text,
  created_at  timestamptz not null default now(),
  constraint tax_industries_level_parent check ((level = 1 and parent_id is null) or (level = 2 and parent_id is not null))
);

-- One row per (country, industry): the market-seeking-FDI judgement for that pair.
-- Level-2 rows start as status 'proposed' (a split suggestion) until the owner approves.
create table if not exists tax_country_industry (
  id            uuid primary key default gen_random_uuid(),
  country_code  text not null references tax_countries(code),
  industry_id   uuid not null references tax_industries(id),
  priority      text not null check (priority in ('P1','P2','P3')),
  heat          smallint not null check (heat between 1 and 5),
  origins       text[] not null default '{}',
  why_domestic  text,
  evidence      text,
  verified      boolean not null default false,
  signals       jsonb not null default '{}'::jsonb,
  status        text not null default 'active' check (status in ('active','proposed','rejected')),
  created_at    timestamptz not null default now(),
  unique (country_code, industry_id)
);

-- A topic = one report (or snapshot) to write. `slug` becomes the queue id.
create table if not exists topics (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  country_code  text not null references tax_countries(code),
  industry_id   uuid not null references tax_industries(id),
  competency_key text references tax_competencies(key),
  kind          text not null default 'deep' check (kind in ('deep','snapshot')),
  year          smallint not null default 2027,
  title         text not null,
  buyer_question text,
  questions     jsonb not null default '[]'::jsonb,
  rationale     text,
  signals       jsonb not null default '{}'::jsonb,
  status        text not null default 'proposed' check (status in ('proposed','approved','rejected','queued')),
  note          text,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  queued_at     timestamptz
);

create unique index if not exists topics_unique_slot
  on topics (country_code, industry_id, kind, coalesce(competency_key, ''));
create index if not exists topics_status_idx on topics (status, country_code);
create index if not exists tax_country_industry_status_idx on tax_country_industry (status, country_code);

alter table tax_countries        enable row level security;
alter table tax_competencies     enable row level security;
alter table tax_industries       enable row level security;
alter table tax_country_industry enable row level security;
alter table topics               enable row level security;
