-- ============================================================
-- KIRA RESEARCH — Storage bucket for report PREVIEW HTML
--
-- Creates a PRIVATE bucket 'reports-html' that holds the first 5 pages of
-- each report's source HTML (one file per locale: en.html, ja.html, ko.html).
-- Served to the iframe preview on /<locale>/reports/<slug> via the
-- /api/preview-html proxy endpoint (which fetches with the service key).
--
-- Why private (and not a direct public bucket URL):
--   Supabase Storage stamps public-bucket files with `Content-Type: text/plain`
--   and a strict sandbox CSP (`default-src 'none'; sandbox`). That breaks the
--   report styling — fonts, inline CSS, none of it loads. Serving through
--   our own API lets us set the correct Content-Type and avoid the CSP.
--   It also keeps the Supabase URL out of the page HTML.
--
-- Why a separate bucket from reports-pdfs:
--   Different file type (text/html vs application/pdf), different content
--   (sliced preview vs full report). Keeping them apart avoids accidental
--   policy bleed.
--
-- Run AFTER 001-010. Idempotent.
-- ============================================================

do $$
begin
  if not exists (select 1 from storage.buckets where id = 'reports-html') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'reports-html',
      'reports-html',
      false,                              -- private — served via /api/preview-html proxy
      5 * 1024 * 1024,                    -- 5 MB cap (preview HTML is ~50-200 KB; cap is headroom)
      array['text/html']
    );
  else
    -- If the bucket already exists (e.g. an earlier run created it as public),
    -- coerce it back to private so the CSP/MIME quirks don't bite.
    update storage.buckets set public = false where id = 'reports-html' and public = true;
  end if;
end $$;

-- Storage RLS — same pattern as 005_storage.sql. service_role bypasses RLS,
-- so /api/preview-html.js (running with the service key) can read freely.
-- We explicitly block anon/authenticated reads so a future bucket flip
-- can't leak the previews directly.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'reports_html_no_anon_read'
  ) then
    drop policy reports_html_no_anon_read on storage.objects;
  end if;
end $$;

create policy reports_html_no_anon_read
  on storage.objects
  for select to anon, authenticated
  using (bucket_id <> 'reports-html');

do $$
declare
  bucket_ok boolean;
begin
  select exists(select 1 from storage.buckets where id = 'reports-html' and public = false)
    into bucket_ok;
  raise notice 'reports-html bucket present and private: %', bucket_ok;
end $$;
