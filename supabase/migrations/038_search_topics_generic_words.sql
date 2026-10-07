-- ============================================================
-- 038_search_topics_generic_words.sql — fix for 028's search_topics
--
-- "condom market in australia" returned six unrelated Australian topics: after
-- the country is removed, "condom market" scored 0.5 against every topic whose
-- title or competency says "market assessment" / "market entry", so the fuzzy
-- layer always "found" something and the layer that files a new product search
-- (Claude Haiku, api/_lib/search-interpret.js) never ran.
-- Generic words (market, industry, sector, report, …) are now dropped from the
-- text that is matched. A query with nothing left and no market named matches
-- nothing; "<market> market" alone still lists that market's topics.
-- Match threshold raised from 0.4 to 0.5 (0.43 was a chance hit).
-- Same signature, safe to re-run.
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
  ), rest as (
    select nullif(trim(regexp_replace(lower(q),
      '\m(' || (select string_agg(lower(name), '|') from tax_countries) ||
      '|korea|viet nam|burma|in|the|of|for|a|market|markets|industry|industries|sector|sectors|report|reports|analysis|research|size|outlook|overview|study|trends|and)\M', ' ', 'g')), '') as r
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
    select c.*, (case when r is null then (case when exists (select 1 from named) then 1.0 else 0.0 end)
                      else greatest(word_similarity(r, lower(hay)), case when hay ilike '%' || r || '%' then 1.0 else 0.0 end)
                 end)::real as sc
    from c, rest
  )
  select t_slug, t_title, t_cc, t_country, t_industry, t_comp, t_year, t_status, sc
  from s where sc >= 0.5
  order by sc desc, t_slug
  limit least(greatest(lim, 1), 12);
$$;

revoke all on function public.search_topics(text, int) from public, anon, authenticated;
