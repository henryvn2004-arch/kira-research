-- ============================================================
-- KIRA RESEARCH — KIRA Studio (Phase N)
--
-- Self-serve report generator. Lives at studio.kiraresearch.com.
-- Owner authenticates, submits a topic (optionally with file
-- uploads), and a background worker drives the kira-research-report
-- skill via the Anthropic API. Output is saved to the user's private
-- library — never the public living_reports table.
--
-- Two tables (studio_jobs, studio_reports) + two private buckets
-- (studio-inputs, studio-reports). RLS scoped to auth.uid() = user_id.
-- All writes are service-key only (the worker / API routes).
--
-- Run AFTER 001-009. Idempotent: safe to re-run on every deploy.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) studio_jobs — one row per submitted gen request
-- ─────────────────────────────────────────────────────────────
create table if not exists public.studio_jobs (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,

  -- input
  topic_input          text not null,
  uploaded_file_paths  text[] not null default '{}',     -- paths in studio-inputs bucket
  flags                jsonb not null default '{}'::jsonb, -- e.g. {"locale":"en","design":true}

  -- output (populated when status='completed')
  studio_report_id     uuid,

  -- lifecycle
  status               text not null default 'pending'
                       check (status in ('pending','running','completed','failed','cancelled')),
  progress             int  not null default 0 check (progress between 0 and 100),
  current_stage        text,                              -- human-readable, e.g. "Searching local-language sources…"
  stages_completed     jsonb not null default '[]'::jsonb,-- ["parse","plan","search","content","charts","render"]

  -- errors
  error_code           text,
  error_log            text,

  -- timing
  created_at           timestamptz not null default now(),
  started_at           timestamptz,
  completed_at         timestamptz,

  -- billing telemetry (future credit-based system)
  tokens_input         int        not null default 0,
  tokens_output        int        not null default 0,
  estimated_cost_usd   numeric(10,4) not null default 0
);

create index if not exists studio_jobs_user_created_idx
  on public.studio_jobs (user_id, created_at desc);

create index if not exists studio_jobs_status_idx
  on public.studio_jobs (status, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- 2) studio_reports — final output metadata
-- ─────────────────────────────────────────────────────────────
create table if not exists public.studio_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  job_id        uuid not null references public.studio_jobs(id) on delete restrict,

  -- topic metadata (mirrors living_reports for symmetry, but in user-scope)
  title         text not null,
  eyebrow       text,
  preview       text,                    -- short summary text for cards
  country       text,
  industry      text,
  year          int,

  -- content
  toc           jsonb,                   -- section list with page numbers
  full_content  jsonb,                   -- per-section structured content (mirror of report_translations.full_content shape)

  -- storage refs (paths in studio-reports bucket)
  html_path     text,                    -- "<user_id>/<report_id>/report.html"
  pdf_path      text,                    -- "<user_id>/<report_id>/report.pdf"
  pages         int  not null default 0,

  -- soft-delete (user-initiated archive — keeps PDF for grace period)
  is_archived   boolean not null default false,
  archived_at   timestamptz,

  created_at    timestamptz not null default now()
);

create index if not exists studio_reports_user_created_idx
  on public.studio_reports (user_id, created_at desc) where is_archived = false;

create index if not exists studio_reports_job_idx
  on public.studio_reports (job_id);

-- Add the back-reference FK from studio_jobs → studio_reports now that
-- both tables exist. Done as ALTER so the CREATE order doesn't matter.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'studio_jobs_studio_report_id_fkey'
  ) then
    alter table public.studio_jobs
      add constraint studio_jobs_studio_report_id_fkey
      foreign key (studio_report_id) references public.studio_reports(id) on delete set null;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 3) RLS — owners read their own; nobody writes from client.
--    Service-key (worker + API routes) bypasses RLS.
-- ─────────────────────────────────────────────────────────────
alter table public.studio_jobs    enable row level security;
alter table public.studio_reports enable row level security;

drop policy if exists studio_jobs_owner_select on public.studio_jobs;
create policy studio_jobs_owner_select
  on public.studio_jobs for select to authenticated
  using (user_id = auth.uid());

drop policy if exists studio_reports_owner_select on public.studio_reports;
create policy studio_reports_owner_select
  on public.studio_reports for select to authenticated
  using (user_id = auth.uid() and is_archived = false);

-- No insert/update/delete policies — service-key only.

-- ─────────────────────────────────────────────────────────────
-- 4) Storage buckets
--    • studio-inputs  — user-uploaded files (docx/pdf/csv/xlsx/txt)
--    • studio-reports — generated HTML + PDF outputs
--    Both private; access via short-lived signed URLs.
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'studio-inputs') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'studio-inputs',
      'studio-inputs',
      false,
      25 * 1024 * 1024,                                  -- 25 MB cap per file
      array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       -- .xlsx
        'text/csv',
        'text/plain'
      ]
    );
  end if;

  if not exists (select 1 from storage.buckets where id = 'studio-reports') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'studio-reports',
      'studio-reports',
      false,
      50 * 1024 * 1024,                                  -- 50 MB cap (HTML + PDF)
      array['application/pdf', 'text/html']
    );
  end if;
end $$;

-- Block anon/authenticated direct reads on both buckets. Service-key
-- bypasses RLS; signed URLs handle legitimate end-user access.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'studio_buckets_no_anon_read'
  ) then
    drop policy studio_buckets_no_anon_read on storage.objects;
  end if;
end $$;

create policy studio_buckets_no_anon_read
  on storage.objects
  for select to anon, authenticated
  using (bucket_id not in ('studio-inputs', 'studio-reports'));

-- ─────────────────────────────────────────────────────────────
-- 5) Sanity log
-- ─────────────────────────────────────────────────────────────
do $$
declare
  has_jobs     boolean;
  has_reports  boolean;
  has_inputs   boolean;
  has_outputs  boolean;
begin
  select exists(select 1 from information_schema.tables
                where table_schema='public' and table_name='studio_jobs')    into has_jobs;
  select exists(select 1 from information_schema.tables
                where table_schema='public' and table_name='studio_reports') into has_reports;
  select exists(select 1 from storage.buckets where id='studio-inputs')     into has_inputs;
  select exists(select 1 from storage.buckets where id='studio-reports')    into has_outputs;

  raise notice 'Migration 010 done. studio_jobs:% studio_reports:% studio-inputs bucket:% studio-reports bucket:% (all must be true).',
    has_jobs, has_reports, has_inputs, has_outputs;
end $$;
