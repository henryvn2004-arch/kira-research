-- 053 — Report exhibits as data (S12, 2026-10-12)
-- One row per report: the numbers behind each exhibit (outputs/batch/<id>/exhibits.json), so a reader
-- who owns the report (bought it or has the Month plan) can download them as Excel or PowerPoint.
-- Read only by api/library-exhibits.js and api/library-content.js with the service key.
-- RLS is on with no policies: anon and signed-in browsers cannot read it.
create table if not exists report_exhibits (
  report_id     uuid primary key references living_reports(id) on delete cascade,
  data          jsonb not null,
  exhibit_count integer not null default 0,
  updated_at    timestamptz not null default now()
);
alter table report_exhibits enable row level security;
