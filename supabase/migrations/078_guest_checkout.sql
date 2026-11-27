-- 078: guest checkout (stage 0, 2026-11-27).
--  * licence (single | team | company) and ad attribution on every purchase table
--  * site_events accepts the checkout / auth events and carries item + value
--  * funnel_checkout(): distinct sessions per checkout step + revenue, for /en/admin/funnel
-- Idempotent.

alter table public.purchases            add column if not exists licence text not null default 'single';
alter table public.purchases            add column if not exists attribution jsonb;
alter table public.purchases            add column if not exists guest boolean not null default false;
alter table public.transcript_purchases add column if not exists licence text not null default 'single';
alter table public.transcript_purchases add column if not exists attribution jsonb;
alter table public.transcript_purchases add column if not exists guest boolean not null default false;
alter table public.list_purchases       add column if not exists licence text not null default 'single';
alter table public.list_purchases       add column if not exists attribution jsonb;
alter table public.list_purchases       add column if not exists guest boolean not null default false;

do $$
declare t text;
begin
  foreach t in array array['purchases','transcript_purchases','list_purchases'] loop
    if not exists (select 1 from pg_constraint where conname = t || '_licence_check') then
      execute format('alter table public.%I add constraint %I check (licence in (''single'',''team'',''company''))', t, t || '_licence_check');
    end if;
  end loop;
end $$;

alter table public.site_events add column if not exists item  text;      -- report | transcript | list (checkout events)
alter table public.site_events add column if not exists value numeric;   -- purchase: amount paid, USD
alter table public.site_events drop constraint if exists site_events_event_check;
alter table public.site_events add constraint site_events_event_check check (event in (
  'pageview', 'search', 'request_email', 'waitlist', 'lead',
  'buy_click', 'begin_checkout', 'paypal_cancel', 'purchase', 'sign_up', 'login', 'lock_hit', 'preview_page'));

create or replace function public.funnel_checkout(p_from timestamptz, p_to timestamptz default now())
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'steps', (select coalesce(jsonb_object_agg(event, c), '{}'::jsonb) from (
        select event, count(distinct sid) as c from site_events
        where at >= p_from and at < p_to
          and event in ('lock_hit', 'preview_page', 'buy_click', 'begin_checkout', 'paypal_cancel', 'purchase', 'sign_up', 'login')
        group by event) q),
    'revenue', (select coalesce(sum(value), 0) from site_events where at >= p_from and at < p_to and event = 'purchase'),
    'by_item', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select coalesce(item, 'unknown') as item, count(*) as purchases, coalesce(sum(value), 0) as revenue
        from site_events where at >= p_from and at < p_to and event = 'purchase' group by 1 order by 2 desc) x));
$$;
revoke all on function public.funnel_checkout(timestamptz, timestamptz) from public, anon, authenticated;
