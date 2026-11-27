-- 077_market_map_key.sql — join key from a report / transcript to the market map (country slug + segment_key) of the same segment.
-- Used to show "companies in this market" links to the sister site (BizDirect Asia list pages). Filled by scripts/match-market-maps.mjs
-- (code match; ambiguous cases stay NULL) and, for new reports, at publish. NULL = no link shown.
-- Idempotent. Rollback: alter table living_reports drop column if exists market_map_country, drop column if exists market_map_segment; (same for expert_transcripts)
alter table living_reports     add column if not exists market_map_country text check (market_map_country is null or market_map_country ~ '^[a-z0-9][a-z0-9-]*$');
alter table living_reports     add column if not exists market_map_segment text check (market_map_segment is null or market_map_segment ~ '^[a-z0-9][a-z0-9-]*$');
alter table expert_transcripts add column if not exists market_map_country text check (market_map_country is null or market_map_country ~ '^[a-z0-9][a-z0-9-]*$');
alter table expert_transcripts add column if not exists market_map_segment text check (market_map_segment is null or market_map_segment ~ '^[a-z0-9][a-z0-9-]*$');
