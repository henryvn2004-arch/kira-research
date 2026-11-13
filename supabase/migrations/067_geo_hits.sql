-- 067_geo_hits.sql — GEO G7: daily counts of AI crawler / AI-user hits on the server-rendered pages.
-- Written by api/_lib/geo-hits.js (service key) from api/ssr.js and api/geo.js; shown on the admin funnel page.
-- AI referrals (chatgpt.com, perplexity.ai, …) are not stored here: they come from site_events.src (track.js).
-- Idempotent. Retention (180 days) is applied by the existing daily cron /api/cron-site-events-retention.

create table if not exists public.geo_hits (
  day        date    not null,
  bot_or_ref text    not null,                                   -- GPTBot, ClaudeBot, Googlebot, …
  kind       text    not null check (kind in ('crawler', 'ai_user')),
  path       text    not null,                                   -- path only, no query string
  count      integer not null default 0,
  primary key (day, bot_or_ref, kind, path)
);
create index if not exists geo_hits_day_idx on public.geo_hits (day desc);
alter table public.geo_hits enable row level security;           -- no policies: service key only

-- One call per hit: insert the row or add 1.
create or replace function public.geo_hit_add(p_day date, p_name text, p_kind text, p_path text)
returns void language sql security definer set search_path = '' as $$
  insert into public.geo_hits (day, bot_or_ref, kind, path, count)
  values (p_day, p_name, p_kind, p_path, 1)
  on conflict (day, bot_or_ref, kind, path) do update set count = public.geo_hits.count + 1;
$$;
revoke execute on function public.geo_hit_add(date, text, text, text) from public, anon, authenticated;
grant  execute on function public.geo_hit_add(date, text, text, text) to service_role;
