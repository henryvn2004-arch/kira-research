-- ============================================================
-- 028_search_topics_country.sql — fix for 027's search_topics
--
-- A query that names a market ("convenience stores in thailand") must only
-- return topics of that market. 027 matched on fuzzy similarity alone, so the
-- country word was a weak signal and Vietnam topics came back for Thailand.
-- Now: if the query names one or more known countries, only those countries'
-- topics are searched; no topic then means "not planned yet" and the page
-- shows the request form. The country words are then removed from the text
-- that is matched against the topic, so "ev charging vietnam" does not match
-- every Vietnam topic just because it says Vietnam. A query that is only a
-- country lists that country's topics. Same signature, safe to re-run.
-- ============================================================

create or replace function public.search_topics(q text, lim int default 6)
returns table (slug text, title text, country_code text, country_name text,
               industry text, competency text, year smallint, status text, score real)
language sql stable
set search_path = public, extensions
as $$
  with named as (
    select code from tax_countries where lower(q) ~ ('\m' || lower(name) || '\M')
    union
    select code from (values ('KR', 'korea'), ('VN', 'viet nam'), ('MM', 'burma')) a(code, alias)
      where lower(q) ~ ('\m' || alias || '\M')
  ), rest as (   -- the query without country words and filler
    select nullif(trim(regexp_replace(lower(q),
      '\m(' || (select string_agg(lower(name), '|') from tax_countries) || '|korea|viet nam|burma|in|the|of|for|a)\M', ' ', 'g')), '') as r
  ), c as (
    select t.slug as t_slug, t.title as t_title, t.country_code as t_cc, cn.name as t_country,
           i.name as t_industry, comp.label as t_comp, t.year as t_year, t.status as t_status,
           concat_ws(' ', cn.name, i.name, comp.label, t.title) as hay
    from topics t
    join tax_countries cn on cn.code = t.country_code
    join tax_industries i on i.id = t.industry_id
    left join tax_competencies comp on comp.key = t.competency_key
    where t.status <> 'rejected' and t.report_id is null
      and (not exists (select 1 from named) or t.country_code in (select code from named))
  ), s as (
    select c.*, (case when r is null then 1.0
                      else greatest(word_similarity(r, lower(hay)), case when hay ilike '%' || r || '%' then 1.0 else 0.0 end)
                 end)::real as sc
    from c, rest
  )
  select t_slug, t_title, t_cc, t_country, t_industry, t_comp, t_year, t_status, sc
  from s where sc >= 0.4
  order by sc desc, t_slug
  limit least(greatest(lim, 1), 12);
$$;

revoke all on function public.search_topics(text, int) from public, anon, authenticated;
