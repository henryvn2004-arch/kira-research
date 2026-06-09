-- Migration 022: preview fields for anti-thin-content / AEO strategy
-- Adds 4 public-indexable columns to report_translations so each report page
-- can expose abstract + TOC + 1-2 data tables + glossary without showing the
-- full paid PDF. Google Paywall spec (hasPart + cssSelector) in _view.html
-- JSON-LD tells Googlebot these preview blocks are freely crawlable.

ALTER TABLE report_translations
  ADD COLUMN IF NOT EXISTS abstract       text,
  ADD COLUMN IF NOT EXISTS toc_json       jsonb,
  ADD COLUMN IF NOT EXISTS preview_tables jsonb,
  ADD COLUMN IF NOT EXISTS glossary_json  jsonb;

COMMENT ON COLUMN report_translations.abstract       IS 'Public 200-300 word summary — indexable by Google + LLMs without paywall';
COMMENT ON COLUMN report_translations.toc_json       IS 'Array of {section, page_ref} for Table of Contents display';
COMMENT ON COLUMN report_translations.preview_tables IS 'Array of {title, source, html} — 1-2 data tables shown free before paywall';
COMMENT ON COLUMN report_translations.glossary_json  IS 'Array of {term, definition} key industry terms';

DO $$ BEGIN
  RAISE NOTICE 'Migration 022 complete: abstract=%, toc_json=%, preview_tables=%, glossary_json=%',
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='report_translations' AND column_name='abstract'),
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='report_translations' AND column_name='toc_json'),
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='report_translations' AND column_name='preview_tables'),
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='report_translations' AND column_name='glossary_json');
END $$;
