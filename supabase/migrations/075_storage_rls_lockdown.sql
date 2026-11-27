-- 075: close the storage read hole (security audit, C1).
-- The policies from 005 (reports_pdfs_no_anon_read), 010 (studio_buckets_no_anon_read)
-- and 040 (reports_html_no_anon_read) each read `bucket_id <> '<x>'`. Policies are
-- PERMISSIVE and OR-ed, so together they let anon/authenticated SELECT every bucket
-- (paid PDFs, reports-html-full, market-lists, studio files).
-- Fix: drop them. service_role bypasses RLS, and every server path (api/*) uses it.
-- The public `covers` bucket is served through the public object URL, which does not
-- depend on storage.objects RLS; no client code lists or reads buckets with the anon key.
-- Idempotent. Apply by hand (MCP or dashboard).
drop policy if exists reports_pdfs_no_anon_read   on storage.objects;
drop policy if exists studio_buckets_no_anon_read on storage.objects;
drop policy if exists reports_html_no_anon_read   on storage.objects;

-- Check afterwards (expect no permissive SELECT policy for anon/authenticated on private buckets):
--   select policyname, permissive, roles, qual from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
