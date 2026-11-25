-- 073: Japanese / Korean / Chinese market-map pages (owner, 2026-11-25).
-- market_maps.i18n           per-language commentary written by the private kira-pipeline translator:
--                            { "ja": { "commentary": {takeaway, so_what{...}, implications[]}, "src_built_at": <commentary_built_at it was
--                                      translated from>, "built_at": <ts> }, "ko": {...}, "zh": {...} }
--                            A language whose src_built_at differs from commentary_built_at is stale and is re-translated.
-- market_map_names           translated segment titles and hub family names, one row per (kind, key, lang).
-- Idempotent. Rollback: alter table market_maps drop column if exists i18n; drop table if exists market_map_names;

alter table market_maps add column if not exists i18n jsonb;

create table if not exists market_map_names (
  kind        text not null check (kind in ('segment', 'family')),
  key         text not null,                 -- segment: segment_key; family: the English l2_family text
  lang        text not null check (lang in ('ja', 'ko', 'zh')),
  name        text not null,
  updated_at  timestamptz not null default now(),
  primary key (kind, key, lang)
);

alter table market_map_names enable row level security;
-- No policies: read and written with the service key only (server-rendered pages and the pipeline loader).
