-- 048_ad_attribution.sql — S17: remember which Google Ads click brought a sign-up.
-- `attribution` holds the click id and campaign tags the browser captured on landing, e.g.
--   {"gclid":"...","utm_source":"google","utm_medium":"cpc","utm_campaign":"123","lp":"/en/reports/x","t":1791787620}
-- Written by /api/topic-request, /api/waitlist and /api/leads (after api/_lib/attribution.js cleaned it);
-- read by /api/admin-funnel and /api/admin-ads-conversions (the file the owner uploads to Google Ads).
-- No new access: the tables already have RLS on and are only touched with the service key.
alter table public.topic_requests add column if not exists attribution jsonb;
alter table public.waitlist       add column if not exists attribution jsonb;
alter table public.leads          add column if not exists attribution jsonb;
create index if not exists topic_requests_attr_idx on public.topic_requests (created_at) where attribution is not null;
create index if not exists waitlist_attr_idx       on public.waitlist       (created_at) where attribution is not null;
create index if not exists leads_attr_idx          on public.leads          (created_at) where attribution is not null;
