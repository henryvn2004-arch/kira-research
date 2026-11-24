-- 072_bizdirect_press_source.sql — register the source behind draft company moves that BizDirect Asia sends from its press-headline store
-- (company_events.source_key references data_sources(key), so the row must exist before the first draft is written).
-- Items are drafts only (status 'draft'): the Routine review (scripts/review-moves.mjs, Step 0.8, guards in api/_lib/moves/review.js)
-- decides published / rejected. Only the headline and the link to the publisher are stored (no article text).
-- Idempotent.
--
-- Rollback (run by hand if the source is withdrawn):
--   delete from public.company_events where source_key = 'bizdirect_press' and status = 'draft';
--   -- published rows from this source: set status = 'rejected' (or delete) first, then:
--   delete from public.data_sources where key = 'bizdirect_press';

insert into public.data_sources (key, name, url, licence, attribution, public, env_key, notes) values
  ('bizdirect_press', 'BizDirect Asia, press headlines (Google News and publisher feeds)', 'https://bizdirectasia.com',
   'Headlines and links only; each item links to its publisher. Sister company data, no article text copied',
   'News found through BizDirect Asia; each item links to its publisher', true, null,
   'Drafts written by BizDirect news/press_to_moves.py (max 100 headlines a day, confidence >= 8). The Routine review publishes or rejects.')
on conflict (key) do update set name = excluded.name, url = excluded.url, licence = excluded.licence, attribution = excluded.attribution,
  env_key = excluded.env_key, notes = excluded.notes, updated_at = now();
