-- 081: stage 1 fixes (2026-11-27). Idempotent.
--  * site_events.pg / via: preview page reached + how (preview_page, lock_hit events)
--  * purchases.*.withdrawal_waiver: buyer ticked the EU/UK withdrawal acknowledgement before paying
--  * funnel_checkout(): adds avg pages reached and lock hits by source for /en/admin/funnel

alter table public.site_events add column if not exists pg  smallint;
alter table public.site_events add column if not exists via text;

alter table public.purchases            add column if not exists withdrawal_waiver boolean not null default false;
alter table public.transcript_purchases add column if not exists withdrawal_waiver boolean not null default false;
alter table public.list_purchases       add column if not exists withdrawal_waiver boolean not null default false;

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
        from site_events where at >= p_from and at < p_to and event = 'purchase' group by 1 order by 2 desc) x),
    -- average deepest preview page reached per session (pg is the page number in the full report)
    'avg_page_reached', (select round(coalesce(avg(m), 0)::numeric, 1) from (
        select max(pg) as m from site_events
        where at >= p_from and at < p_to and event = 'preview_page' and pg is not null group by sid) z),
    'lock_by_via', (select coalesce(jsonb_object_agg(v, c), '{}'::jsonb) from (
        select coalesce(via, 'unknown') as v, count(*) as c from site_events
        where at >= p_from and at < p_to and event = 'lock_hit' group by 1) y));
$$;
revoke all on function public.funnel_checkout(timestamptz, timestamptz) from public, anon, authenticated;
