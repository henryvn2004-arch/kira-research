-- 047_email_deliverability.sql — S16: know when our emails bounce or are marked as spam.
--   topic_requests.confirmed_at  set when the instant "we got your request" email was sent (caps abuse: 3 per address per 24 h)
--   email_events                 one row per Resend webhook event we keep (delivered / bounced / complained / delivery_delayed)
--   email_suppressions           addresses we must not email again (hard bounce or spam complaint)
-- Written only by /api/email-webhook (service key); read by /api/admin-health and api/_lib/email.js. RLS on, no policies.
alter table public.topic_requests add column if not exists confirmed_at timestamptz;
create index if not exists topic_requests_confirmed_idx on public.topic_requests (lower(email), confirmed_at) where confirmed_at is not null;

create table if not exists public.email_events (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  svix_id  text unique,               -- webhook delivery id: a retried webhook is stored once
  type     text not null,             -- delivered | bounced | complained | delivery_delayed
  email    text,
  detail   text                       -- bounce type / reason, short
);
create index if not exists email_events_at_idx on public.email_events (at desc);
alter table public.email_events enable row level security;

create table if not exists public.email_suppressions (
  email  text primary key,            -- lower-case
  reason text not null check (reason in ('bounced', 'complained')),
  at     timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;
