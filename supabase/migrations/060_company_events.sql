-- 060_company_events.sql — Kira Data (D4): company moves (investments, acquisitions, new plants and subsidiaries)
-- into the 15 markets, gathered daily by /api/cron-moves (api/_lib/moves/).
--   tier    filing = a stock-exchange / regulator filing (OpenDART, EDINET); news = a news article (GDELT)
--   status  draft until the owner publishes it on /en/admin/moves; a filing whose host market and type are
--           both known publishes itself. Only published rows from public sources reach the site.
--   url     the original article or filing (unique: a re-run never adds the same item twice)
--   also    other URLs that reported the same move (dedupe by investor × host × type × headline words, 7 days)
-- Idempotent.

create table if not exists public.company_events (
  id               bigserial primary key,
  source_key       text not null references public.data_sources(key),
  url              text not null unique,
  title            text not null,
  domain           text,
  lang             text not null default 'en',
  event_date       date not null,
  investor_country text,                                   -- ISO2 of the company's home (JP, KR, TW, SG, CN, US ...)
  host_country     text references public.tax_countries(code),
  type             text not null default 'other' check (type in ('acquisition','stake','investment','plant','jv','subsidiary','expansion','exit','other')),
  company          text,                                   -- filled from the filing, or by the owner on review
  value_usd        double precision,
  tier             text not null check (tier in ('filing','release','news')),
  status           text not null default 'draft' check (status in ('draft','published','rejected')),
  also             jsonb not null default '[]'::jsonb,
  raw              jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  reviewed_at      timestamptz,
  reviewed_by      text
);
create index if not exists company_events_feed_idx on public.company_events (status, host_country, investor_country, event_date desc);
alter table public.company_events enable row level security;

insert into public.data_sources (key, name, url, licence, attribution, public, env_key, notes) values
  ('gdelt', 'GDELT Project, DOC 2.0 API (news search)', 'https://www.gdeltproject.org',
   'GDELT data is free and open with citation; headlines link to the original publisher', 'News found through the GDELT Project; each item links to its publisher', true, null,
   'Max one request every 5 seconds. Items stay drafts until the owner publishes them.'),
  ('opendart', 'OpenDART, Financial Supervisory Service (Korea)', 'https://opendart.fss.or.kr',
   'OpenDART terms: public disclosure data, credit required', 'Source: OpenDART (Financial Supervisory Service, Korea)', true, 'OPENDART_API_KEY',
   'Filing list filtered by country names in the report title; tuned on the first run with a key.'),
  ('edinet', 'EDINET, Financial Services Agency (Japan)', 'https://disclosure2.edinet-fsa.go.jp',
   'Public Data License 1.0 (PDL1.0), credit required', 'Source: EDINET (Financial Services Agency, Japan)', true, 'EDINET_API_KEY',
   'Document list filtered by country names in the description; tuned on the first run with a key.')
on conflict (key) do update set name = excluded.name, url = excluded.url, licence = excluded.licence, attribution = excluded.attribution,
  env_key = excluded.env_key, notes = excluded.notes, updated_at = now();
