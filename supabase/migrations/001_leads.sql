-- ============================================================
-- KIRA RESEARCH — leads table
-- Backs /api/leads (custom-research form) and /api/admin-leads.
-- Run once in Supabase SQL editor.
-- ============================================================

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Contact
  name         text not null,
  email        text not null,
  company      text,
  role         text,

  -- Project shape
  tier         text not null default 'not-sure'
                check (tier in ('briefing','custom','retainer','not-sure')),
  deadline     text not null default 'flex'
                check (deadline in ('2w','month','quarter','flex')),
  brief        text not null,

  -- Provenance
  locale       text not null default 'en'
                check (locale in ('en','ja','ko')),
  source       text not null default 'custom-research',
  ip_address   text,
  user_agent   text,
  referer      text,

  -- Pipeline
  status       text not null default 'new'
                check (status in ('new','contacted','qualified','closed','rejected')),
  notes        text
);

create index if not exists leads_status_created_at_idx
  on public.leads (status, created_at desc);

create index if not exists leads_locale_idx
  on public.leads (locale);

create index if not exists leads_email_idx
  on public.leads (email);

-- updated_at auto-bump on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
--   The /api/leads endpoint uses the service-key and bypasses RLS.
--   The admin client never reads this table directly — it goes
--   through /api/admin-leads, which also uses the service-key.
--   So we enable RLS with NO permissive policies, which denies
--   all direct access from anon/authenticated clients.
-- ============================================================

alter table public.leads enable row level security;

-- (Intentionally no policies — only service_role can read/write.)
