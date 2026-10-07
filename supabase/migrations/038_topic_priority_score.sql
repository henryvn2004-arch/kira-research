-- 038 (S13): planner priority score (0-100) used to order the production queue after demand.
-- Applied to prod 2026-10-07 via MCP; kept here so a fresh database matches.
alter table topics add column if not exists priority_score smallint;
create index if not exists topics_priority_score_idx on topics (priority_score desc nulls last);
