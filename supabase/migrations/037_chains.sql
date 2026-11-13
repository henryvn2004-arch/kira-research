-- 037_chains.sql — Kira Chain: one generic page for every product (Phase S10)
--
-- A reader types a product or service on /en/chain/; /api/chain-search finds the
-- chain, /api/chain returns its data and one page draws it (value-chain stages,
-- flow arrows, companies, sourced market estimates).
--
--   chains          one row per product x country. The chain itself lives in
--                   `payload` (jsonb, the shape the page reads: stages, flows,
--                   companies, facts) or, for hand-made prototypes, in a static
--                   file named by `payload_url`. Chains built from the reports'
--                   "who's who" data (industry_players, migration 033) fill
--                   `payload` the same way.
--   chain_requests  a search that finds no chain: the query, optional email.
--                   Demand signal for which chain to build next.
--
-- Service role only (RLS on, no policies). Idempotent.

create table if not exists public.chains (
  id           uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  slug         text not null check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name         text not null,
  aliases      text[] not null default '{}',
  summary      text,
  status       text not null default 'draft' check (status in ('draft', 'published')),
  stats        jsonb not null default '{}',
  payload      jsonb,
  payload_url  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (country_code, slug),
  check (payload is not null or payload_url is not null)
);

create index if not exists chains_published_idx on public.chains (status) where status = 'published';

create table if not exists public.chain_requests (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  query        text not null,
  email        text,
  ip_address   text,
  notified_at  timestamptz
);

-- one row per (email, query); anonymous requests (no email) are kept as they come
create unique index if not exists chain_requests_email_query_key
  on public.chain_requests (lower(email), lower(query)) where email is not null;
create index if not exists chain_requests_query_idx on public.chain_requests (lower(query));

alter table public.chains enable row level security;
alter table public.chain_requests enable row level security;
