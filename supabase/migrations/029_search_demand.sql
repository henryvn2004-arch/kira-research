-- ============================================================
-- 029_search_demand.sql — three-layer search + search demand
--
-- Search layers: 1) published report, 2) planned topic (coming soon),
-- 3) a market + industry KIRA covers but has not planned yet: a placeholder
-- topic (status 'proposed') is created from the search so it gets a page,
-- and readers can leave an email.
--
-- Spam bound: layer 3 only accepts a query that names exactly ONE market and
-- an industry that is an active pair for that market in tax_country_industry
-- (184 pairs), one placeholder per pair. Anything else is only counted in
-- search_misses.
--
--   topics.search_count      searches that found no published report
--   search_misses            keywords that matched nothing, with a counter
--   resolve_search_pair(q)   query → (market, industry) or nothing
--   ensure_search_topic(..)  create-if-missing placeholder topic, returns it
--   bump_topic_search(slug)  search_count + 1
--   log_search_miss(kw)      search_misses upsert + 1
--
-- Service-role only. Idempotent.
-- ============================================================

alter table topics add column if not exists search_count int not null default 0;

create table if not exists search_misses (
  keyword  text primary key,
  searches int not null default 1,
  first_at timestamptz not null default now(),
  last_at  timestamptz not null default now()
);
alter table search_misses enable row level security;

create or replace function public.resolve_search_pair(q text)
returns table (country_code text, country_name text, industry_id uuid,
               industry_name text, industry_slug text, score real)
language sql stable
set search_path = public, extensions
as $$
  with named as (
    select code from tax_countries where lower(q) ~ ('\m' || lower(name) || '\M')
    union
    select code from (values ('KR', 'korea'), ('VN', 'viet nam'), ('MM', 'burma')) a(code, alias)
      where lower(q) ~ ('\m' || alias || '\M')
  ), one as (
    select code from named where (select count(*) from named) = 1
  ), rest as (
    select nullif(trim(regexp_replace(lower(q),
      '\m(' || (select string_agg(lower(name), '|') from tax_countries) || '|korea|viet nam|burma|in|the|of|for|a)\M', ' ', 'g')), '') as r
  ), cand as (
    select o.code as cc, cn.name as cname, i.id as iid, i.name as iname, i.slug as islug,
           greatest(word_similarity(r, lower(i.name)),
                    case when lower(i.name) like '%' || r || '%' then 1.0 else 0.0 end)::real as sc
    from one o
    join tax_countries cn on cn.code = o.code
    join tax_country_industry ci on ci.country_code = o.code and ci.status = 'active'
    join tax_industries i on i.id = ci.industry_id, rest
    where r is not null
  )
  select cc, cname, iid, iname, islug, sc from cand
  where sc >= 0.5
  order by sc desc, iname
  limit 1;
$$;

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

  insert into topics (slug, country_code, industry_id, competency_key, kind, year, title, questions, rationale, status, note)
  select v_slug, p_cc, p_industry, null, 'deep', 2027, p_title, coalesce(p_questions, '[]'::jsonb),
         'Requested through reader search; not yet reviewed.', 'proposed', 'created from a reader search'
  where not exists (
    select 1 from topics t
    where t.country_code = p_cc and t.industry_id = p_industry and t.kind = 'deep' and t.competency_key is null
  )
  on conflict do nothing;

  return query
    select t.slug, t.status, t.title from topics t
    where t.country_code = p_cc and t.industry_id = p_industry and t.kind = 'deep' and t.competency_key is null
    limit 1;
end $$;

create or replace function public.bump_topic_search(p_slug text)
returns void language sql set search_path = public
as $$ update topics set search_count = search_count + 1 where slug = p_slug; $$;

create or replace function public.log_search_miss(p_kw text)
returns void language sql set search_path = public
as $$
  insert into search_misses (keyword) values (lower(left(p_kw, 60)))
  on conflict (keyword) do update set searches = search_misses.searches + 1, last_at = now();
$$;

revoke all on function public.resolve_search_pair(text) from public, anon, authenticated;
revoke all on function public.ensure_search_topic(text, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.bump_topic_search(text) from public, anon, authenticated;
revoke all on function public.log_search_miss(text) from public, anon, authenticated;
