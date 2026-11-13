-- 066_geo_post_log.sql — which expert transcripts have already been posted to LinkedIn (admin /en/admin/geo).
-- One row per transcript once the owner ticks "posted". Written only through api/admin-geo.js (service key).
-- Idempotent.

create table if not exists public.geo_post_log (
  transcript_slug text primary key,
  posted_at       timestamptz not null default now(),
  posted_by       text not null
);

alter table public.geo_post_log enable row level security;
-- No policies: anon and authenticated readers get nothing; the service key bypasses RLS.
