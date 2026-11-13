-- ============================================================
-- KIRA RESEARCH — waitlist table (Sprint S5)
-- Backs /api/waitlist (pricing-page waitlist form) and /api/admin-waitlist.
-- Validates demand for the subscription library (Week / Month / Annual)
-- before any billing is built. Nothing is charged at sign-up.
-- Idempotent: safe to re-run.
-- ============================================================

create table if not exists public.waitlist (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Contact
  email        text not null,
  name         text,
  company      text,
  role         text,

  -- Interest
  plan         text not null default 'not-sure'
                check (plan in ('week','month','annual','not-sure')),

  -- Provenance
  locale       text not null default 'en'
                check (locale in ('en','ja','ko','zh')),
  source       text not null default 'pricing',
  ip_address   text,
  user_agent   text,
  referer      text,

  -- Pipeline
  status       text not null default 'new'
                check (status in ('new','contacted','converted','spam')),
  notes        text
);

-- One row per email (case-insensitive). /api/waitlist upserts on repeat sign-ups.
create unique index if not exists waitlist_email_lower_key
  on public.waitlist (lower(email));

create index if not exists waitlist_status_created_at_idx
  on public.waitlist (status, created_at desc);

create index if not exists waitlist_plan_idx
  on public.waitlist (plan);

-- updated_at auto-bump (set_updated_at() is defined in 001_leads.sql;
-- re-declared here so this migration also runs on its own).
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists waitlist_set_updated_at on public.waitlist;
create trigger waitlist_set_updated_at
  before update on public.waitlist
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
--   /api/waitlist and /api/admin-waitlist use the service key and
--   bypass RLS. RLS on with NO policies = deny-all for anon and
--   authenticated clients. (Intentionally no policies.)
-- ============================================================

alter table public.waitlist enable row level security;

do $$
begin
  raise notice 'waitlist:% rls:%',
    (select exists (select 1 from information_schema.tables where table_schema='public' and table_name='waitlist')),
    (select relrowsecurity from pg_class where oid = 'public.waitlist'::regclass);
end $$;
