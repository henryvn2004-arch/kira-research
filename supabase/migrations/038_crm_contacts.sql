-- ============================================================
-- KIRA RESEARCH — CRM (admin) · migration 038
-- One row per person (lower-case email) holding only what the owner decides:
-- stage, a note and a follow-up date. Everything else (leads, waitlist,
-- topic requests, purchases) is read from its own table at query time
-- by /api/admin-crm, so there is no second copy to keep in sync.
-- Idempotent.
-- ============================================================

create table if not exists public.crm_contacts (
  email        text primary key check (email = lower(email)),
  stage        text not null default 'open'
               check (stage in ('open','talking','won','lost')),
  note         text,
  follow_up_at date,
  updated_at   timestamptz not null default now()
);

create index if not exists crm_contacts_follow_up_idx
  on public.crm_contacts (follow_up_at) where follow_up_at is not null;

drop trigger if exists crm_contacts_set_updated_at on public.crm_contacts;
create trigger crm_contacts_set_updated_at
  before update on public.crm_contacts
  for each row execute function public.set_updated_at();

-- Service key only (the admin API); no policies = deny-all for anon/authenticated.
alter table public.crm_contacts enable row level security;
