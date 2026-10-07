-- 037_site_events.sql — first-party funnel events (no cookies, no IP, no email).
-- One row per event, written only by /api/track; read only through funnel_summary() from /en/admin/funnel.
-- `sid` is a random per-tab id (sessionStorage); it can not be tied to a person.
create table if not exists public.site_events (
  id     bigint generated always as identity primary key,
  at     timestamptz not null default now(),
  sid    text not null,
  event  text not null check (event in ('pageview', 'search', 'request_email', 'waitlist', 'lead')),
  kind   text,                 -- pageview only: home | library | report | pricing | insight | other
  locale text,                 -- en | ja | ko | zh (from the path)
  src    text,                 -- traffic source of the session's entry: direct | google | bing | linkedin | ... | utm_source
  path   text,                 -- path only, query string removed
  hit    boolean               -- search only: did the library find a published report?
);
create index if not exists site_events_at_idx  on public.site_events (at desc);
create index if not exists site_events_sid_idx on public.site_events (sid);
alter table public.site_events enable row level security;

-- Visitors per funnel step (distinct sessions), by source, locale and day, plus top report pages.
create or replace function public.funnel_summary(p_from timestamptz, p_to timestamptz default now())
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  with ev as (select * from site_events where at >= p_from and at < p_to),
  s as (
    select sid,
      bool_or(event = 'pageview') as visited,
      bool_or(event = 'search' or (event = 'pageview' and kind in ('library', 'report'))) as researched,
      bool_or(event = 'pageview' and kind = 'report') as opened,
      bool_or(event in ('request_email', 'waitlist', 'lead')) as raised,
      (array_agg(src order by at) filter (where src is not null))[1] as src,
      (array_agg(locale order by at) filter (where locale is not null))[1] as locale
    from ev group by sid
  )
  select jsonb_build_object(
    'steps', (select jsonb_build_object(
        'visited',    count(*) filter (where visited),
        'researched', count(*) filter (where visited and researched),
        'opened',     count(*) filter (where visited and opened),
        'raised',     count(*) filter (where visited and raised)) from s),
    'by_source', (select coalesce(jsonb_agg(x order by x.visitors desc), '[]'::jsonb) from (
        select coalesce(src, 'direct') as source, count(*) filter (where visited) as visitors,
               count(*) filter (where visited and raised) as raised from s group by 1) x),
    'by_locale', (select coalesce(jsonb_agg(x order by x.visitors desc), '[]'::jsonb) from (
        select coalesce(locale, 'other') as locale, count(*) filter (where visited) as visitors,
               count(*) filter (where visited and raised) as raised from s group by 1) x),
    'by_day', (select coalesce(jsonb_agg(d order by d.day), '[]'::jsonb) from (
        select (at at time zone 'UTC')::date as day,
               count(distinct sid) filter (where event = 'pageview') as visitors,
               count(*) filter (where event = 'pageview') as pageviews
        from ev group by 1) d),
    'top_pages', (select coalesce(jsonb_agg(p), '[]'::jsonb) from (
        select path, count(distinct sid) as visitors from ev
        where event = 'pageview' and kind = 'report' group by path order by 2 desc, 1 limit 10) p),
    'signups', (select coalesce(jsonb_object_agg(event, c), '{}'::jsonb) from (
        select event, count(*) as c from ev where event in ('request_email', 'waitlist', 'lead') group by 1) q),
    'searches', (select jsonb_build_object('total', count(*), 'no_hit', count(*) filter (where hit is false))
                 from ev where event = 'search')
  );
$$;
revoke all on function public.funnel_summary(timestamptz, timestamptz) from public, anon, authenticated;
