-- ============================================================
-- KIRA RESEARCH — migration 012: PPTX support for Studio
--
-- Two things here, both needed for Phase N.27 (native PPTX export):
--
-- 1. studio_reports.pptx_path TEXT NULL
--      Records the bucket path so the API can hand out signed
--      PPTX URLs alongside the existing PDF URL.
--
-- 2. studio-reports bucket allowed_mime_types
--      The bucket was created in migration 010 with a strict
--      allowlist of ['application/pdf', 'text/html']. The native
--      PPTX MIME type (a famously verbose string) needs to be
--      added or uploads silently reject with 400.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Part 1: column
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.studio_reports
  ADD COLUMN IF NOT EXISTS pptx_path TEXT NULL;

COMMENT ON COLUMN public.studio_reports.pptx_path IS
  'Storage path inside the studio-reports bucket for the native PPTX export, e.g. {user_id}/{report_id}/report.pptx. NULL = no PPTX rendered (older rows from before N.27, or rendering failed).';

-- ─────────────────────────────────────────────────────────────
-- Part 2: bucket MIME allowlist — add PPTX
-- Existing values are ['application/pdf', 'text/html']; we union
-- in the PPTX MIME type. ARRAY_DEDUP keeps re-runs idempotent.
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  current_types text[];
  pptx_mime text := 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
BEGIN
  SELECT allowed_mime_types
    INTO current_types
    FROM storage.buckets
   WHERE id = 'studio-reports';

  IF current_types IS NULL THEN
    RAISE NOTICE 'studio-reports bucket not found — was migration 010 run?';
    RETURN;
  END IF;

  IF pptx_mime = ANY(current_types) THEN
    RAISE NOTICE 'studio-reports bucket already allows PPTX MIME — nothing to do';
  ELSE
    UPDATE storage.buckets
       SET allowed_mime_types = array_append(current_types, pptx_mime)
     WHERE id = 'studio-reports';
    RAISE NOTICE 'studio-reports bucket: added PPTX MIME to allowlist';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- Verification
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  has_col   boolean;
  has_pptx  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'studio_reports'
       AND column_name  = 'pptx_path'
  ) INTO has_col;

  SELECT 'application/vnd.openxmlformats-officedocument.presentationml.presentation' = ANY(allowed_mime_types)
    INTO has_pptx
    FROM storage.buckets
   WHERE id = 'studio-reports';

  RAISE NOTICE 'Migration 012 verification:';
  RAISE NOTICE '  studio_reports.pptx_path column: %', has_col;
  RAISE NOTICE '  studio-reports bucket allows PPTX MIME: %', COALESCE(has_pptx, false);
  RAISE NOTICE 'Both should be TRUE.';
END $$;
