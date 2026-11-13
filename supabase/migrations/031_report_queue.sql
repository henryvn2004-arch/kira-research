-- 031_report_queue.sql — report production queue moves from data/report_queue.csv to Postgres.
-- Same columns as the CSV so the runner semantics stay identical; adds priority, attempts and an
-- event log (one row per stage attempt) that the admin Pipeline page reads.
-- RLS on, no policies: only the service key (runner + admin API) can touch these tables.

create table if not exists public.report_queue (
  id               text primary key,                 -- topic slug, e.g. 2026-vn-coffee
  topic            text not null,
  country          text,
  industry         text,
  year             smallint,
  target_languages text not null default 'en,ja,ko,zh',
  status           text not null default 'pending',
  output_paths     text not null default '',
  date_added       date not null default current_date,
  date_completed   date,
  error_log        text not null default '',
  claimed_at       timestamptz,
  priority         integer not null default 0,       -- higher first; owner can bump from admin
  attempts         integer not null default 0,
  position         bigint generated always as identity,  -- stable FIFO tiebreak (CSV order)
  updated_at       timestamptz not null default now()
);
create index if not exists report_queue_status_idx on public.report_queue (status);

create table if not exists public.report_queue_events (
  id          bigint generated always as identity primary key,
  queue_id    text not null references public.report_queue(id) on delete cascade,
  stage       text not null,                         -- en | ja | ko | zh | zh_backfill | recover | admin
  outcome     text not null,                         -- claimed | ok | error | recovered | admin
  from_status text,
  to_status   text,
  model       text,
  duration_s  integer,                               -- claim → finish, wall clock
  cost_usd    numeric(10,4),                         -- metered external APIs only (e.g. cover art); Claude Routine usage is not per-token metered
  note        text,
  at          timestamptz not null default now()
);
create index if not exists report_queue_events_queue_idx on public.report_queue_events (queue_id, at desc);
create index if not exists report_queue_events_at_idx on public.report_queue_events (at desc);

alter table public.report_queue enable row level security;
alter table public.report_queue_events enable row level security;
