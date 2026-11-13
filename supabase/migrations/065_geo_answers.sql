-- 065_geo_answers.sql — GEO data layer (G1 + G2): structured, citable Q&A cut from KIRA content.
--   kira_answers       one buyer question + short answer with number, unit, year and source
--   field_claims       one [F]-tagged practitioner statement from an expert transcript
--   segment_crosswalk  KIRA level-2 segment <-> BizDirect seo_terms / industry <-> HS codes <-> brands
-- Rows are written by the private extraction runner (service key). Public read only for published rows.
-- Idempotent.

create table if not exists public.kira_answers (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,                       -- EN canonical, phrased the way buyers search
  intent        text not null check (intent in ('market_size','growth','key_players','channels','margins','pricing',
                  'regulation','entry','trade_flow','consumer','trends','practitioner','investment','risks','other')),
  country_code  text not null,                       -- ISO-2 ('VN','TH','SG','ID', ...)
  segment_key   text,                                -- tax_industries.slug (level 2)
  brand         text,
  metric        text,
  answer_short  text not null check (char_length(answer_short) <= 400),
  value         numeric,
  unit          text,
  year          smallint,
  as_of         date,
  primary_source text,                               -- the outside source behind the number, if any
  source_kind   text not null check (source_kind in ('report','transcript','insight','econ')),
  source_ref    jsonb not null default '{}'::jsonb,  -- {slug, page|section, locale}
  home          text not null default 'kira' check (home in ('kira','bizdirect')),
  i18n          jsonb not null default '{}'::jsonb,  -- {ja:{question,answer_short}, ko:{...}, zh:{...}}
  status        text not null default 'draft' check (status in ('draft','published','rejected','retired')),
  gate          jsonb,                               -- last gate result {ok, reasons[]}
  checked_at    timestamptz,
  content_hash  text not null,                       -- hash of question + answer_short + source_ref
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (content_hash)
);
create index if not exists kira_answers_lookup on public.kira_answers (country_code, segment_key, intent) where status = 'published';
create index if not exists kira_answers_source on public.kira_answers (source_kind, (source_ref->>'slug'));

create table if not exists public.field_claims (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null check (topic in ('margins','payment_terms','exclusivity','decision_makers','switching_triggers',
                  'channel','lead_times','pricing','buyer_roles','risk','regulation','competition','other')),
  industry      text,                                -- tax_industries.slug when known, else transcript industry
  country_code  text not null,
  speaker_role  text not null,                       -- a role, never a person's name
  claim_text    text not null,
  transcript_slug text not null,
  section       text,
  basis_label   text not null,                       -- e.g. "KIRA field research (interviews with plant managers ... across Asia)"
  i18n          jsonb not null default '{}'::jsonb,
  status        text not null default 'draft' check (status in ('draft','published','rejected','retired')),
  gate          jsonb,
  checked_at    timestamptz,
  content_hash  text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (content_hash)
);
create index if not exists field_claims_lookup on public.field_claims (country_code, industry, topic) where status = 'published';
create index if not exists field_claims_transcript on public.field_claims (transcript_slug);

create table if not exists public.segment_crosswalk (
  id              uuid primary key default gen_random_uuid(),
  country_code    text not null,
  segment_key     text not null,                     -- tax_industries.slug (level 2)
  bizdirect_country text,                            -- BizDirect country slug ('vietnam', ...)
  bizdirect_term_ids  text[] not null default '{}',  -- BizDirect seo_terms ids
  bizdirect_term_slugs text[] not null default '{}',
  bizdirect_industry text,
  hs_codes        text[] not null default '{}',      -- from segment_data_map when mapped
  data_profile    text,                              -- segment_data_map.key
  brands          text[] not null default '{}',
  confidence      numeric(3,2) check (confidence between 0 and 1),
  rationale       text,
  status          text not null default 'auto' check (status in ('auto','review','approved','rejected')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (country_code, segment_key)
);

alter table public.kira_answers      enable row level security;
alter table public.field_claims      enable row level security;
alter table public.segment_crosswalk enable row level security;

drop policy if exists kira_answers_public_read on public.kira_answers;
create policy kira_answers_public_read on public.kira_answers for select to anon, authenticated using (status = 'published');
drop policy if exists field_claims_public_read on public.field_claims;
create policy field_claims_public_read on public.field_claims for select to anon, authenticated using (status = 'published');
drop policy if exists segment_crosswalk_public_read on public.segment_crosswalk;
create policy segment_crosswalk_public_read on public.segment_crosswalk for select to anon, authenticated using (status = 'approved');
-- No insert/update/delete policies: only the service key writes.
