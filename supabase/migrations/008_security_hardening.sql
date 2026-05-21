-- ============================================================
-- KIRA RESEARCH — Security hardening (close Supabase advisor flags)
--
-- After 007 was applied, the Supabase security advisor flagged 3
-- non-trivial items left over from the platform era's credit system
-- (kept for the deferred /custom-research rebuild, per `project des/
-- CLAUDE.md`). This migration closes them WITHOUT removing the
-- credit tables / functions:
--
--   (a) ERROR  — `public.credit_costs` has RLS disabled. Anyone with
--                the anon key can read all 12 rows.
--   (b) WARN   — `add_credits` + `spend_credits` are SECURITY DEFINER
--                and executable by `anon` + `authenticated` via
--                `/rest/v1/rpc/*`. Dead code right now, but exposed.
--   (c) WARN   — `add_credits`, `spend_credits`, `set_updated_at`
--                have role-mutable `search_path`. Set explicitly to
--                eliminate the search-path-hijack class of attack on
--                SECURITY DEFINER functions.
--
-- This migration is idempotent. Re-running is a no-op.
--
-- NOT INCLUDED (owner click-through, no SQL path):
--   • Auth → Settings → "Leaked password protection" → toggle ON.
--     Supabase Auth feature, not a DB object.
-- ============================================================

-- ─────────── (a) Lock down credit_costs ───────────
-- Enable RLS with NO policies. PostgREST will return empty / 403 for
-- anon + authenticated. Service-role key bypasses RLS, so admin code
-- can still query it if/when the Custom Research rebuild reactivates
-- this table.
alter table public.credit_costs enable row level security;

-- ─────────── (b) Revoke RPC EXECUTE from anon + authenticated ───────────
-- The functions remain in the DB for the deferred rebuild, but are no
-- longer callable from public REST. Service-role still has EXECUTE
-- (it inherits all privileges as superuser-equivalent). When the rebuild
-- happens, the new code path can either GRANT EXECUTE back to a specific
-- role or call via service key.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('add_credits', 'spend_credits')
  loop
    execute format('revoke execute on function public.%I(%s) from public, anon, authenticated',
      fn.proname, fn.args);
  end loop;
end $$;

-- ─────────── (c) Pin search_path on the 3 flagged functions ───────────
-- Empty search_path = caller must fully qualify every identifier. Combined
-- with SECURITY DEFINER this closes the search-path-hijack vector. The
-- existing function bodies already use `public.` prefixes, so this is safe.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('add_credits', 'spend_credits', 'set_updated_at')
  loop
    execute format('alter function public.%I(%s) set search_path = ''''',
      fn.proname, fn.args);
  end loop;
end $$;

-- ─────────── Sanity log ───────────
do $$
declare
  cc_rls       boolean;
  add_grants   int;
  spend_grants int;
  mutable_fns  int;
begin
  select relrowsecurity into cc_rls
  from pg_class where oid = 'public.credit_costs'::regclass;

  select count(*) into add_grants
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'add_credits'
    and grantee in ('anon', 'authenticated', 'PUBLIC');

  select count(*) into spend_grants
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'spend_credits'
    and grantee in ('anon', 'authenticated', 'PUBLIC');

  select count(*) into mutable_fns
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('add_credits', 'spend_credits', 'set_updated_at')
    and (p.proconfig is null
         or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'));

  raise notice 'Migration 008 done. credit_costs RLS: % (must be true). add_credits anon/auth grants: % (must be 0). spend_credits anon/auth grants: % (must be 0). Functions with mutable search_path: % (must be 0).',
    cc_rls, add_grants, spend_grants, mutable_fns;
end $$;
