-- ============================================================
-- KIRA RESEARCH — Admin audit log (Sprint 4.1)
--
-- Track every write performed via the admin API surface. Year 1 has a
-- single admin (Henry) so concurrent-action conflicts aren't a worry,
-- but a chronological "who did what when" record is still valuable for:
--   (a) Recovering from a misclick — see what changed at what time
--   (b) Diagnosing why a row looks the way it does
--   (c) Defensive evidence if a buyer disputes a refund or PDF swap
--
-- Schema is deliberately minimal: actor (email), action verb, target
-- resource (type + id), and a JSON diff. Diff is opportunistic — admin
-- handlers populate it where it's cheap; left null otherwise.
--
-- Year 2 (when there's a second admin) revisit:
--   • Add RLS so each admin only sees their own actions (or all if "owner")
--   • Surface a per-resource history view in the admin UI
--   • Retention policy + archival to cold storage
--
-- Run AFTER 001-008. Idempotent.
-- ============================================================

create table if not exists public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  actor_email    text not null,            -- the admin who performed the action
  action         text not null,            -- 'create' | 'update' | 'delete' | 'upload' | 'refund' | 'other'
  resource_type  text not null,            -- 'report' | 'insight' | 'transaction' | 'aggregator_submission' | 'aggregator_sale' | 'pdf'
  resource_id    text,                     -- usually a uuid, but text to allow slugs / composite keys
  resource_label text,                     -- short human-readable label (e.g. report slug, insight title) — frozen at log time
  diff           jsonb,                    -- shape: { before: {...}, after: {...} } — may be null

  request_path   text,                     -- e.g. '/api/admin-reports?id=...'  for debugging
  request_method text                      -- 'POST' | 'PATCH' | 'DELETE'
);

create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);

create index if not exists audit_log_actor_idx
  on public.audit_log (actor_email, created_at desc);

create index if not exists audit_log_resource_idx
  on public.audit_log (resource_type, resource_id, created_at desc);

-- ─────────── RLS ───────────
-- Admin-only table. Service-key writes from /api/admin-* bypass RLS.
-- Lock down anon + authenticated by enabling RLS without policies →
-- PostgREST returns empty / 403 for the public roles. Same pattern as
-- aggregator_submissions / aggregator_sales (Sprint 4.4).
alter table public.audit_log enable row level security;

-- Sanity log.
do $$
declare
  has_table boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'audit_log'
  ) into has_table;
  raise notice 'Migration 009 done. audit_log table present: % (must be true). RLS enabled, service-key-only writes.',
    has_table;
end $$;
