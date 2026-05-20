-- ============================================================
-- KIRA RESEARCH — Storage bucket for report PDFs
--
-- Creates a PRIVATE bucket 'reports-pdfs' where /api/admin-upload-pdf writes
-- and /api/library-content reads (via short-lived signed URLs).
--
-- Run AFTER 001-004 in the Supabase SQL editor. Idempotent.
--
-- Why a migration file for a bucket? You can also create it in
-- Dashboard → Storage → New bucket. This SQL version means owner can
-- paste-and-run once and everything is in place. Either path works —
-- choose what's easier for the moment.
-- ============================================================

-- Create the bucket as private. INSERT-OR-IGNORE pattern via DO block so
-- re-runs don't error out.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'reports-pdfs') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'reports-pdfs',
      'reports-pdfs',
      false,                              -- private — readable only via signed URL
      32 * 1024 * 1024,                   -- 32 MB hard cap (matches API limit + a hair of headroom)
      array['application/pdf']
    );
  end if;
end $$;

-- Storage RLS — service_role (used by /api/* endpoints) already bypasses
-- RLS, so anon/auth users can't list or read. We explicitly block any
-- direct anon/auth access here so a mis-configured bucket can't leak.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'reports_pdfs_no_anon_read'
  ) then
    drop policy reports_pdfs_no_anon_read on storage.objects;
  end if;
end $$;

create policy reports_pdfs_no_anon_read
  on storage.objects
  for select to anon, authenticated
  using (bucket_id <> 'reports-pdfs');

-- Sanity: the service_role can do whatever it wants regardless. The above
-- policy just forbids non-service reads. Uploads happen with the service
-- key from /api/admin-upload-pdf.js (admin-gated by ADMIN_EMAILS check).
