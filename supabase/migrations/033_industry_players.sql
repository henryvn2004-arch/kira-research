-- 033_industry_players.sql — players by value chain, collected by every report
-- (owner, 2026-10-07). Seed data for Kira Chain (Phase S10).
--
-- Each published report ends with a "who's who" chapter: the companies in the
-- industry grouped by value-chain stage (makers, importers, distributors,
-- retail channels …). scripts/publish-players.mjs writes that list here:
--   entities          one row per company operating in the report's country
--                     (matched by country + name_norm, created when missing)
--   industry_players  company × report × value-chain stage, with role, origin,
--                     brands, scale and the source it came from
-- Service key only (RLS on, no policies). Idempotent.

create table if not exists public.industry_players (
  id            uuid primary key default gen_random_uuid(),
  entity_id     uuid not null references public.entities(id) on delete cascade,
  report_id     uuid not null references public.living_reports(id) on delete cascade,
  country_code  text not null,
  industry_code text,
  segment       text,
  stage_key     text not null,
  stage_label   text not null,
  stage_order   smallint not null default 0,
  role          text,
  origin        text,          -- ISO country of the owner/brand origin (JP, KR, VN …)
  ownership     text,          -- local | foreign | jv | state | listed (free text, lower case)
  brands        text[] not null default '{}',
  scale         text,          -- e.g. "947 stores (2025)" as written in the report
  source        text,          -- source alias as cited in the report
  source_text   text,          -- full citation
  url           text,
  as_of         text,          -- "2026-10" (month the list was compiled)
  created_at    timestamptz not null default now(),
  unique (report_id, entity_id, stage_key)
);

create index if not exists industry_players_entity on public.industry_players (entity_id);
create index if not exists industry_players_market on public.industry_players (country_code, industry_code, stage_key);

alter table public.industry_players enable row level security;
