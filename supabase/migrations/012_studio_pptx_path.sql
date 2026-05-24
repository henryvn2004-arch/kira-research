-- ============================================================
-- KIRA RESEARCH — migration 012: studio reports PPTX path
--
-- Phase N.27 ships native PowerPoint output alongside the HTML +
-- PDF for every Studio deliverable. We need a column to record
-- the bucket path so the API can hand out signed PPTX URLs.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE public.studio_reports
  ADD COLUMN IF NOT EXISTS pptx_path TEXT NULL;

-- Optional index — we don't query by pptx_path, but adding a
-- comment helps future readers know what this column is.
COMMENT ON COLUMN public.studio_reports.pptx_path IS
  'Storage path inside the studio-reports bucket for the native PPTX export, e.g. {user_id}/{report_id}/report.pptx. NULL = no PPTX rendered (older rows from before N.27, or rendering failed).';

DO $$
DECLARE
  has_col boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'studio_reports'
       AND column_name  = 'pptx_path'
  ) INTO has_col;
  RAISE NOTICE 'studio_reports.pptx_path column present: %', has_col;
END $$;
