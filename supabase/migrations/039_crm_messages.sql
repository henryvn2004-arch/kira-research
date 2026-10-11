-- 039_crm_messages.sql — emails the owner sent one-to-one from /en/admin/crm.
-- Kept so a person's history shows what was said to them, and so the daily send cap can be counted.
-- Service role only (RLS on, no policies). Idempotent.
create table if not exists public.crm_messages (
  id        uuid primary key default gen_random_uuid(),
  email     text not null check (email = lower(email)),
  subject   text not null,
  body      text not null,
  sent_by   text not null,
  sent_at   timestamptz not null default now(),
  ok        boolean not null
);
create index if not exists crm_messages_email_idx on public.crm_messages (email, sent_at desc);
alter table public.crm_messages enable row level security;
