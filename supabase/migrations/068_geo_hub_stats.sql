-- 068_geo_hub_stats.sql — GEO: one row per (country, segment) hub, computed in the database.
-- api/_lib/geo.js (listHubs) used to read every published answer to build the hub list; PostgREST caps a response at
-- 1,000 rows and there are now ~3,000 answers, so the list was incomplete. This function returns ~150 small rows.
-- Read-only, idempotent. api/_lib/geo.js falls back to paging through the table until this is applied.

create or replace function public.geo_hub_stats()
returns table (country_code text, segment_key text, n integer, updated timestamptz, slugs text[], n_ja integer, n_ko integer, n_zh integer)
language sql stable security definer set search_path = '' as $$
  select a.country_code, a.segment_key,
         count(*)::integer,
         max(a.updated_at),
         coalesce(array_agg(distinct a.source_ref ->> 'slug') filter (where a.source_ref ->> 'slug' is not null), '{}'),
         (count(*) filter (where nullif(btrim(a.i18n -> 'ja' ->> 'question'), '') is not null and nullif(btrim(a.i18n -> 'ja' ->> 'answer_short'), '') is not null))::integer,
         (count(*) filter (where nullif(btrim(a.i18n -> 'ko' ->> 'question'), '') is not null and nullif(btrim(a.i18n -> 'ko' ->> 'answer_short'), '') is not null))::integer,
         (count(*) filter (where nullif(btrim(a.i18n -> 'zh' ->> 'question'), '') is not null and nullif(btrim(a.i18n -> 'zh' ->> 'answer_short'), '') is not null))::integer
  from public.kira_answers a
  where a.status = 'published' and a.segment_key is not null
  group by a.country_code, a.segment_key;
$$;
revoke execute on function public.geo_hub_stats() from public, anon, authenticated;
grant  execute on function public.geo_hub_stats() to service_role;
