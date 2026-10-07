-- 036_app_config.sql — owner-editable settings (no deploy needed). Only keys registered in
-- api/_lib/config.js are read; a missing row means "use the code default". Edited on /en/admin/config.
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.app_config enable row level security;
