-- ============================================================
-- Migration 020: Enrich company_reports payloads from facts table
--
-- Context: migrations 017-019 seeded stub company_reports rows with
-- minimal payloads (is_stub=true, no facts). The facts table was
-- populated separately with industry/sector/founding_year/charter_capital.
-- This migration assembles those facts into each company_reports.payload
-- so profile pages display meaningful data without needing a pipeline run.
--
-- Safe to re-run: UPDATE only affects rows where is_stub=true.
-- ============================================================

-- Step 1: Enrich payloads for all stub company_reports that have facts
UPDATE company_reports cr
SET
  payload = cr.payload
    -- Merge in 'facts' assembled from the facts table
    || jsonb_build_object(
        'facts',
        (
          SELECT jsonb_object_agg(
            f.key,
            jsonb_build_object(
              'value',      f.value,
              'confidence', f.confidence
            )
          )
          FROM facts f
          WHERE f.entity_id = cr.entity_id
        )
      )
    -- Clear is_stub flag so pipeline knows payload has real facts
    || jsonb_build_object('is_stub', false, 'generated_at', now()),
  updated_at = now()
WHERE
  (cr.payload->>'is_stub')::boolean = true
  AND EXISTS (
    SELECT 1 FROM facts WHERE entity_id = cr.entity_id
  );

-- Step 2: Also enrich with canonical_name + status from entities table
-- (some stubs only have tax_id, not the full name in payload)
UPDATE company_reports cr
SET
  payload = cr.payload
    || jsonb_build_object(
        'name',   e.canonical_name,
        'status', COALESCE(e.status_cache, 'active')
      ),
  updated_at = now()
FROM entities e
WHERE e.id = cr.entity_id
  AND cr.payload->>'is_stub' = 'false'
  AND (
    cr.payload->>'name' IS NULL
    OR cr.payload->>'name' = ''
    OR cr.payload->>'status' IS NULL
  );

-- ── Verify ────────────────────────────────────────────────────
DO $$
DECLARE
  stub_count      int;
  enriched_count  int;
  total_count     int;
BEGIN
  SELECT count(*) INTO total_count    FROM company_reports;
  SELECT count(*) INTO stub_count     FROM company_reports WHERE (payload->>'is_stub')::boolean = true;
  SELECT count(*) INTO enriched_count FROM company_reports WHERE (payload->>'is_stub')::boolean = false
                                                              AND payload ? 'facts';

  RAISE NOTICE 'company_reports total:% | stubs_remaining:% | enriched_with_facts:%',
    total_count, stub_count, enriched_count;
END $$;
