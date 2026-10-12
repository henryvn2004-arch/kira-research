-- ============================================================
-- KIRA RESEARCH — waitlist plan 'report' (Sprint S5b)
-- The Week plan is replaced by a single-report plan. 'week' stays valid so
-- rows already on the list keep their value. Idempotent: safe to re-run.
-- ============================================================

alter table public.waitlist drop constraint if exists waitlist_plan_check;
alter table public.waitlist add constraint waitlist_plan_check
  check (plan in ('report','week','month','annual','not-sure'));
