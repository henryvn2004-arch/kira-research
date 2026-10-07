-- 034_job_runs.sql — one row per run of a scheduled job (Vercel cron etc.), read by /en/admin/health.
-- The batch runner is NOT logged here: its history is report_queue_events.
create table if not exists public.job_runs (
  id          bigint generated always as identity primary key,
  job         text not null,
  ok          boolean not null,
  detail      text,
  duration_ms integer,
  at          timestamptz not null default now()
);
create index if not exists job_runs_job_at_idx on public.job_runs (job, at desc);
alter table public.job_runs enable row level security;
