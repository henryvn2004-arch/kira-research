-- ============================================================
-- 030_reader_topics.sql — automatic placeholder topics from reader searches
--
-- A search that names one market and a lawful product/service that fits one of
-- that market's covered industries (a parent in tax_country_industry) gets a
-- placeholder topic named after the search ("Condom market in Australia"),
-- filed under the parent industry. Interpretation (Claude Haiku) and its
-- safety filter run in api/_lib/search-interpret.js; this migration holds the
-- data side:
--
--   topics.source              'planner' | 'reader'
--   topics.status 'requested'  reader-created, not reviewed (keeps the planner's
--                              'proposed' list clean; the owner can approve it)
--   topics_unique_planner_slot replaces 023's topics_unique_slot: unique per slot for
--                              planner topics only, so several reader topics can sit
--                              under one industry
--   search_interpretations     cache of every LLM decision (also a daily budget)
--   search_country(q)          exactly one market named in q → code, name, rest
--   ensure_reader_topic(..)    create-if-missing by slug
--   ensure_search_topic(..)    (029) now creates 'requested' topics, source 'reader'
--   llm_calls_today()          interpretations made in the last 24 h
--
-- Service-role only. Idempotent.
-- ============================================================

alter table topics add column if not exists source text not null default 'planner'
  check (source in ('planner', 'reader'));

alter table topics drop constraint if exists topics_status_check;
alter table topics add constraint topics_status_check
  check (status in ('proposed', 'approved', 'rejected', 'queued', 'requested'));

update topics set source = 'reader', status = 'requested'
  where note = 'created from a reader search' and status = 'proposed';

create unique index if not exists topics_unique_planner_slot
  on topics (country_code, industry_id, kind, coalesce(competency_key, '')) where source = 'planner';
drop index if exists topics_unique_slot;   -- the unrestricted 023 index; reader topics share (market, industry)

create table if not exists search_interpretations (
  key          text primary key,                    -- country code ':' normalised search text
  country_code text not null,
  ok           boolean not null,
  industry_id  uuid references tax_industries(id),
  topic        text,                                -- validated name of the market, without the country
  reason       text,
  created_at   timestamptz not null default now()
);
create index if not exists search_interpretations_created_idx on search_interpretations (created_at desc);
alter table search_interpretations enable row level security;

create or replace function public.llm_calls_today()
returns int language sql stable set search_path = public
as $$ select count(*)::int from search_interpretations where created_at > now() - interval '24 hours' $$;

create or replace function public.search_country(q text)
returns table (country_code text, country_name text, rest text)
language sql stable
set search_path = public, extensions
as $$
  with named as (
    select code from tax_countries where lower(q) ~ ('\m' || lower(name) || '\M')
    union
    select code from (values ('KR', 'korea'), ('VN', 'viet nam'), ('MM', 'burma')) a(code, alias)
      where lower(q) ~ ('\m' || alias || '\M')
  )
  select tc.code, tc.name,
         nullif(trim(regexp_replace(lower(q),
           '\m(' || (select string_agg(lower(name), '|') from tax_countries) || '|korea|viet nam|burma|in|the|of|for|a)\M', ' ', 'g')), '')
  from tax_countries tc
  where tc.code in (select code from named) and (select count(*) from named) = 1;
$$;

-- Overview placeholder for a covered (market, industry) pair — used when the search
-- text matches the industry itself. Created as 'requested', one per pair.
create or replace function public.ensure_search_topic(p_cc text, p_industry uuid, p_title text, p_questions jsonb)
returns table (o_slug text, o_status text, o_title text)
language plpgsql
set search_path = public
as $$
declare
  v_slug text;
begin
  select '2027-' || lower(p_cc) || '-' || i.slug || '-overview' into v_slug
  from tax_industries i where i.id = p_industry;
  if v_slug is null then return; end if;

  insert into topics (slug, country_code, industry_id, competency_key, kind, year, title, questions, rationale, status, source, note)
  values (v_slug, p_cc, p_industry, null, 'deep', 2027, p_title, coalesce(p_questions, '[]'::jsonb),
          'Requested through reader search; not yet reviewed.', 'requested', 'reader', 'created from a reader search')
  on conflict (slug) do nothing;

  return query select t.slug, t.status, t.title from topics t where t.slug = v_slug;
end $$;

-- Placeholder for a specific product/service filed under a covered parent industry.
create or replace function public.ensure_reader_topic(p_cc text, p_industry uuid, p_slug text, p_title text, p_questions jsonb)
returns table (o_slug text, o_status text, o_title text)
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from tax_country_industry ci
    where ci.country_code = p_cc and ci.industry_id = p_industry and ci.status = 'active'
  ) then return; end if;

  insert into topics (slug, country_code, industry_id, competency_key, kind, year, title, questions, rationale, status, source, note)
  values (p_slug, p_cc, p_industry, null, 'deep', 2027, p_title, coalesce(p_questions, '[]'::jsonb),
          'Requested through reader search; not yet reviewed.', 'requested', 'reader', 'created from a reader search')
  on conflict (slug) do nothing;

  return query select t.slug, t.status, t.title from topics t where t.slug = p_slug;
end $$;

revoke all on function public.llm_calls_today() from public, anon, authenticated;
revoke all on function public.search_country(text) from public, anon, authenticated;
revoke all on function public.ensure_search_topic(text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.ensure_reader_topic(text, uuid, text, text, jsonb) from public, anon, authenticated;
