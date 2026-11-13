-- ============================================================
-- KIRA RESEARCH — migration 011: studio activity log
--
-- Adds a streaming activity log to studio_jobs so the polling
-- progress page (public/studio/jobs.html) can show a Claude-chat
-- style live feed of what the worker is doing — parse / plan /
-- each web search query / each section draft / render / done.
--
-- Implementation:
--   • activity_log: jsonb array of { ts, type, stage, msg, detail? }
--   • append_studio_activity(p_job_id, p_event): atomic SQL append
--     via the || operator. Necessary because Stage 5 of the worker
--     runs sections in parallel (SECTION_CONCURRENCY=3) and a
--     read-modify-write from JS would race-condition-drop events.
--
-- Idempotent. Safe to re-run.
-- ============================================================

-- 1. Column ---------------------------------------------------
ALTER TABLE public.studio_jobs
  ADD COLUMN IF NOT EXISTS activity_log jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Atomic append helper -------------------------------------
CREATE OR REPLACE FUNCTION public.append_studio_activity(
  p_job_id uuid,
  p_event  jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.studio_jobs
  SET activity_log = COALESCE(activity_log, '[]'::jsonb) || jsonb_build_array(p_event)
  WHERE id = p_job_id;
$$;

-- Lock down — only the service role (the worker) should write events.
REVOKE EXECUTE ON FUNCTION public.append_studio_activity(uuid, jsonb) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.append_studio_activity(uuid, jsonb) TO service_role;

-- 3. Verification --------------------------------------------
DO $$
DECLARE
  has_col bool;
  has_fn  bool;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='studio_jobs' AND column_name='activity_log'
  ) INTO has_col;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='append_studio_activity'
  ) INTO has_fn;

  RAISE NOTICE 'activity_log column:%, append_studio_activity fn:%', has_col, has_fn;
END $$;
