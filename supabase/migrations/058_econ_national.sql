-- 058_econ_national.sql — Kira Data (D2): national statistics APIs.
--   data_sources.env_key        name of the Vercel environment variable a source needs (null = no key);
--                               the refresh job skips a source whose key is not set and reports it as "waiting for key".
--   econ_indicators.country_code  set for a national series that exists for one market only (null = all markets).
--   econ_indicators.params        adapter-specific selectors (dataset id, table path, filters), so a new series is a row, not code.
--   econ_flows                    bilateral trade: one row per reporter × partner × product × flow × period.
-- Idempotent.

alter table public.data_sources    add column if not exists env_key text;
alter table public.econ_indicators add column if not exists country_code text references public.tax_countries(code);
alter table public.econ_indicators add column if not exists params jsonb not null default '{}'::jsonb;

create table if not exists public.econ_flows (
  source_key    text not null references public.data_sources(key),
  reporter      text not null references public.tax_countries(code),   -- the market whose customs reported the flow
  partner       text not null,                                         -- ISO2 of the partner (any country), 'WLD' for the world total
  product       text not null default 'TOTAL',                         -- 'TOTAL' or an HS code (2/4/6 digits)
  flow          text not null check (flow in ('X','M')),               -- X = reporter's exports to partner, M = imports from partner
  freq          text not null check (freq in ('A','Q','M')),
  period        text not null,                                         -- '2025' | '2025-Q3' | '2025-09'
  value         double precision not null,
  currency      text not null,                                         -- as reported (USD, JPY, KRW, PHP, MYR, SGD, IDR ...)
  retrieved_at  timestamptz not null default now(),
  primary key (source_key, reporter, partner, product, flow, freq, period)
);
create index if not exists econ_flows_lookup_idx on public.econ_flows (reporter, partner, flow, period desc);
alter table public.econ_flows enable row level security;
