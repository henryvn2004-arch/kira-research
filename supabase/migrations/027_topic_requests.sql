-- ============================================================
-- 027_topic_requests.sql — "coming soon" report pages
--
-- A search that finds no published report can still land on a topic from the
-- Topic Planner (title, buyer question, contents) and let the reader leave an
-- email. Requests raise the topic's priority and trigger an email on publish.
--
--   topics.report_id     link from a topic to the report that fulfils it
--                        (set by the batch runner at publish; the report slug
--                        is not derived from the topic slug)
--   topic_requests       one row per (email, topic) or (email, keyword)
--   search_topics(q)     fuzzy topic lookup (pg_trgm) used by /api/topic-search
--   due_topic_notifications(n)  requests whose report is now published
--
-- Service-role only (RLS on, no policies; functions not callable by anon).
-- Idempotent.
-- ============================================================

alter table topics add column if not exists report_id uuid references living_reports(id) on delete set null;
create index if not exists topics_report_idx on topics (report_id) where report_id is not null;

create table if not exists topic_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null,
  topic_id    uuid references topics(id) on delete cascade,
  keyword     text,
  locale      text not null default 'en' check (locale in ('en','ja','ko','zh')),
  notified_at timestamptz,
  ip_address  text,
  check (topic_id is not null or keyword is not null)
);

create unique index if not exists topic_requests_topic_email_key
  on topic_requests (lower(email), topic_id) where topic_id is not null;
create unique index if not exists topic_requests_keyword_email_key
  on topic_requests (lower(email), lower(keyword)) where topic_id is null;
create index if not exists topic_requests_topic_idx on topic_requests (topic_id);
create index if not exists topic_requests_due_idx on topic_requests (created_at) where notified_at is null;

alter table topic_requests enable row level security;

-- Fuzzy lookup over country + industry + competency + title. Topics that are
-- rejected or already published are left out (a published one is found by the
-- normal library search).
create or replace function public.search_topics(q text, lim int default 6)
returns table (slug text, title text, country_code text, country_name text,
               industry text, competency text, year smallint, status text, score real)
language sql stable
set search_path = public, extensions
as $$
  with c as (
    select t.slug as t_slug, t.title as t_title, t.country_code as t_cc, cn.name as t_country,
           i.name as t_industry, comp.label as t_comp, t.year as t_year, t.status as t_status,
           concat_ws(' ', cn.name, i.name, comp.label, t.title) as hay
    from topics t
    join tax_countries cn on cn.code = t.country_code
    join tax_industries i on i.id = t.industry_id
    left join tax_competencies comp on comp.key = t.competency_key
    where t.status <> 'rejected' and t.report_id is null
  ), s as (
    select c.*, greatest(word_similarity(lower(q), lower(hay)),
                         case when hay ilike '%' || q || '%' then 1.0 else 0.0 end)::real as sc
    from c
  )
  select t_slug, t_title, t_cc, t_country, t_industry, t_comp, t_year, t_status, sc
  from s where sc >= 0.4
  order by sc desc, t_slug
  limit least(greatest(lim, 1), 12);
$$;

-- Requests whose topic now has a published report and that were not emailed yet.
create or replace function public.due_topic_notifications(lim int default 50)
returns table (request_id uuid, email text, locale text, topic_title text, report_slug text)
language sql stable
set search_path = public
as $$
  select r.id, r.email, r.locale, t.title, lr.slug
  from topic_requests r
  join topics t on t.id = r.topic_id
  join living_reports lr on lr.id = t.report_id and lr.status = 'published'
  where r.notified_at is null
  order by r.created_at
  limit least(greatest(lim, 1), 200);
$$;

revoke all on function public.search_topics(text, int) from public, anon, authenticated;
revoke all on function public.due_topic_notifications(int) from public, anon, authenticated;
