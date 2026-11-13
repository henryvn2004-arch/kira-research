-- 026_covers.sql — cover images for reports and insights (library / insights redesign)
--
-- Public bucket `covers` holds generated cover art (scripts/gen-cover.mjs,
-- uploaded by scripts/upload-cover.mjs), three files per item:
--   <kind>/<slug>.jpg        1536x1024 full illustration  -> cover_url
--   <kind>/<slug>-thumb.jpg  360x480 portrait crop         -> cover_thumb_url (library rows)
--   <kind>/<slug>-wide.jpg   800x500 landscape crop        (insight cards; URL derived from cover_url)
-- kind = reports | insights. URLs carry a ?v= version so a regenerated cover
-- is not served stale. Insights linked to a report reuse that report's cover.
-- Idempotent.

alter table living_reports add column if not exists cover_url text;
alter table living_reports add column if not exists cover_thumb_url text;
alter table insights add column if not exists cover_url text;
alter table insights add column if not exists cover_thumb_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
