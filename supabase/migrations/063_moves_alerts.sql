-- 063_moves_alerts.sql — Kira Data (D7): "email me new moves" + which data pages are worth indexing.
--   moves_alerts           one row per reader × filter (host market, investor country; either may be empty = all).
--                          Double opt-in: status 'pending' until the reader clicks the link in the confirmation email,
--                          'active' afterwards, 'unsubscribed' after the link in any alert email. token = the secret
--                          in both links. last_event_id = the newest company_events row already sent (set at confirm,
--                          so a new alert starts with the next published move, not the backlog).
--   data_page_coverage()   for the sitemap and the pages' own robots tag: per market, how many public indicators have
--                          a value since `since`; per (reporter, partner) pair, how many distinct public flow links
--                          (source × product × flow) exist since `since`.
-- Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.moves_alerts (
  id               bigserial primary key,
  email            text not null,
  host_country     text references public.tax_countries(code),
  investor_country text,
  locale           text not null default 'en',
  token            text not null unique default encode(gen_random_bytes(18), 'hex'),
  status           text not null default 'pending' check (status in ('pending','active','unsubscribed')),
  ip_address       text,
  attribution      jsonb,
  created_at       timestamptz not null default now(),
  confirm_sent_at  timestamptz,
  confirmed_at     timestamptz,
  last_event_id    bigint,
  last_sent_at     timestamptz,
  unsubscribed_at  timestamptz
);
create unique index if not exists moves_alerts_filter_uidx
  on public.moves_alerts (email, coalesce(host_country, ''), coalesce(investor_country, ''));
create index if not exists moves_alerts_status_idx on public.moves_alerts (status);
alter table public.moves_alerts enable row level security;

create or replace function public.data_page_coverage(since text)
returns table (kind text, a text, b text, n int)
language sql stable
set search_path = public
as $$
  select 'country'::text, s.country_code, null::text, count(distinct s.indicator_key)::int
  from econ_series s
  join data_sources d on d.key = s.source_key and d.public
  where s.period >= since and not s.is_forecast
  group by s.country_code
  union all
  select 'pair'::text, least(f.reporter, f.partner), greatest(f.reporter, f.partner),
         count(distinct (f.source_key, f.product, f.flow))::int
  from econ_flows f
  join data_sources d on d.key = f.source_key and d.public
  where f.period >= since and f.product in ('TOTAL','FDI_NET','FDI_APPROVED','FDI_REALISED','FDI_REG_YTD','VISITORS')
  group by 2, 3
$$;
revoke all on function public.data_page_coverage(text) from public, anon, authenticated;
grant execute on function public.data_page_coverage(text) to service_role;
