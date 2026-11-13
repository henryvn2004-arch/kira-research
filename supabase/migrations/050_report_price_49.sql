-- S19 (2026-10-12): single-report price $39 -> $49.
-- New reports are inserted with price from the publish script (default 49 now); this moves the
-- column default and the 125 reports published at the old default. Checkout stays off until the
-- owner turns on config `checkout.single_report_enabled`, so no buyer sees a changed price.
-- Idempotent.
ALTER TABLE living_reports ALTER COLUMN price SET DEFAULT 49;
UPDATE living_reports SET price = 49 WHERE price = 39;
