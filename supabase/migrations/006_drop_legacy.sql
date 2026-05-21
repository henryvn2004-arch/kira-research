-- ============================================================
-- KIRA RESEARCH — Drop unambiguously-deprecated DB objects
--
-- Sprint F (commit a8a9206) removed the app-side files referencing
-- these objects, but left the DB tables, functions, and storage
-- buckets in place. This migration drops only the objects that are:
--   (a) listed in `project des/CLAUDE.md` under "Deprecated (archive,
--       not used for library)", OR
--   (b) part of killed features (`/studio/*` chat history,
--       legacy `contacts` form replaced by `leads`), OR
--   (c) referenced by no code anywhere in api/, public/, or
--       supabase/migrations/001-005 (verified by grep).
--
-- The 4 credit-system / custom_reports tables (`user_credits`,
-- `credit_transactions`, `credit_costs`, `custom_reports`) are
-- INTENTIONALLY KEPT — `project des/CLAUDE.md` earmarks them for
-- the deferred /custom-research/* tool rebuild. Same for
-- `spend_credits` and `add_credits` functions. Drop separately
-- when/if the rebuild is officially scoped out.
--
-- Run AFTER 001-005 in the Supabase SQL editor. Idempotent (uses
-- `if exists`/`cascade`/`where in (...)`) so re-runs are no-ops.
--
-- TWO-STEP CLEANUP (SQL + Dashboard UI):
--   Step A — SQL Editor (this file): drops tables + functions only.
--   Step B — Dashboard → Storage: empty + delete `frameworks` and
--            `reports` buckets manually. Supabase blocks direct SQL
--            delete from storage.objects/buckets via the
--            `storage.protect_delete()` trigger; the supported delete
--            path is the Storage API / Dashboard UI.
--
-- THIS IS DESTRUCTIVE. Expected impact on this owner's project:
--   • 6 tables removed (~3,800 rows total — mostly source_reports
--     204 + report_chunks 2436 + industry_patterns 925 +
--     competency_templates 10 + chat_history 0 + contacts 0)
--   • 3+ function overloads removed (search_report_chunks,
--     search_industry_patterns)
--   • 2 buckets removed via Dashboard UI (frameworks 23 objects
--     ~650 KB, reports 132 objects ~38 MB) — recovered storage quota.
-- The 7 tables created by migrations 001-005 are untouched:
--   leads, living_reports, report_translations, insights,
--   insight_translations, purchases, downloads — plus the
--   reports-pdfs storage bucket from 005. The 4 credit/custom_reports
--   tables are also untouched per intentional decision.
-- ============================================================

-- 1) Drop legacy RAG/search functions. `add_credits` / `spend_credits`
--    are NOT dropped here — they're paired with the kept credit tables.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'search_report_chunks',
        'search_industry_patterns'
      )
  loop
    execute format('drop function if exists public.%I(%s) cascade',
      fn.proname,
      pg_get_function_identity_arguments(fn.oid));
  end loop;
end $$;

-- 2) Drop deprecated tables. CASCADE handles the only intra-set FK
--    (report_chunks.source_report_id → source_reports.id) and any
--    indexes/triggers.
drop table if exists public.report_chunks       cascade;
drop table if exists public.source_reports      cascade;
drop table if exists public.industry_patterns   cascade;
drop table if exists public.competency_templates cascade;
drop table if exists public.chat_history        cascade;
drop table if exists public.contacts            cascade;

-- 3) Storage buckets — DELETED VIA DASHBOARD UI, NOT SQL.
--    Supabase enforces `storage.protect_delete()` trigger which blocks
--    direct `delete from storage.objects` / `storage.buckets`. The
--    intended path is Storage API → bucket manager. Two buckets to
--    remove via Dashboard → Storage:
--      • `frameworks` (23 objects, ~650 KB)
--      • `reports`    (132 objects, ~38 MB)
--    For each: click bucket → "Empty bucket" → confirm → "Delete bucket".
--    The active PDF bucket is `reports-pdfs` from migration 005 — DO
--    NOT touch that one.

-- 4) Sanity log — owner can read these final counts in the Supabase
--    SQL Editor "Messages" output pane to confirm cleanup. Tables
--    remaining should be 0. Bucket count reflects current state; it
--    will only be 0 after the owner does the Dashboard UI delete above.
do $$
declare
  remaining_tables int;
  remaining_buckets int;
begin
  select count(*) into remaining_tables
  from information_schema.tables
  where table_schema = 'public'
    and table_name in (
      'source_reports', 'report_chunks', 'industry_patterns',
      'competency_templates', 'chat_history', 'contacts'
    );

  select count(*) into remaining_buckets
  from storage.buckets where id in ('frameworks', 'reports');

  raise notice 'Migration 006 SQL done. Legacy tables remaining: % (must be 0). Legacy buckets still pending Dashboard delete: % (must be 0 after owner empties + deletes via Storage UI).',
    remaining_tables, remaining_buckets;
end $$;
