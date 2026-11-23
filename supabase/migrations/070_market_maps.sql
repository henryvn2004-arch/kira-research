-- ============================================================
-- 070_market_maps.sql — Market mapping: one overview page per (country x segment)
--
--   market_maps   one row per (country, segment): the stats JSON the page is built from, an optional
--                 commentary JSON, and the gates that decide whether the page may be indexed.
--
-- The page is rendered from `stats` by code (api/_lib/market-map/render.js); `commentary` (executive
-- takeaway, a "so what" per chart, implications) is added later and the page reads fine without it.
-- `stats` holds only counts, 20 company names and a 10-row preview WITHOUT phone or email. The paid
-- Excel list and every contact stay in the private pipeline and are never stored here.
--
-- Read only through the API (service role): /api/market-maps returns published rows. RLS on, no policies,
-- exactly like expert_transcripts. Written by scripts/load-market-maps.mjs. Idempotent.
--
-- indexable = at least 50 companies AND at least 2 stages (or service types) with 5 or more companies;
-- the loader computes it with api/_lib/market-map/gate.js and the route checks it again before it
-- allows `index` (and only while setting marketmaps.indexing_enabled is on).
-- ============================================================

create table if not exists market_maps (
  id                   uuid primary key default gen_random_uuid(),
  country              text not null check (country ~ '^[a-z0-9][a-z0-9-]*$'),   -- URL slug, e.g. vietnam
  segment_key          text not null check (segment_key ~ '^[a-z0-9][a-z0-9-]*$'), -- URL slug, e.g. soft-drinks
  slug                 text not null unique,                                        -- '<country>/<segment_key>'
  title                text not null,                                               -- e.g. 'Soft drinks'
  l2_family            text,                                                        -- hub grouping, e.g. 'Beverages'
  n_companies          integer not null check (n_companies >= 0),
  stats                jsonb not null,
  commentary           jsonb,
  commentary_built_at  timestamptz,
  indexable            boolean not null default false,
  status               text not null default 'draft' check (status in ('draft', 'published')),
  built_at             timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (country, segment_key)
);

create index if not exists market_maps_published_idx
  on market_maps (l2_family, country, title) where status = 'published';

alter table market_maps enable row level security;

-- updated_at is set by the writer (the loader's upsert), not by a trigger.
