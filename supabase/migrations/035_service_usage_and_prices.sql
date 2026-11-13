-- 035_service_usage_and_prices.sql — metered external-API usage per report, and the prices the owner sets.
-- gen-cover.mjs logs one report_queue_events row (stage 'cover', outcome 'usage') with the API's token counts in `usage`.
-- Dollars are computed when read (tokens x service_prices), so a price change applies to history too.
alter table public.report_queue_events add column if not exists usage jsonb;

create table if not exists public.service_prices (
  service         text primary key,            -- e.g. openai-image
  usd_per_m_in    numeric(10,4),               -- USD per 1M input tokens
  usd_per_m_out   numeric(10,4),               -- USD per 1M output tokens
  updated_at      timestamptz not null default now()
);
alter table public.service_prices enable row level security;
