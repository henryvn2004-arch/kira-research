-- 072: register BizDirect press as a source of company moves (owner, 2026-11-24; bizdirectasia PR #655).
-- company_events.source_key references data_sources(key), so this row must exist before the BizDirect bridge writes.
-- Rows from this source are inserted as status = 'draft' only; publishing is decided by the review step
-- (skills/kira-research-report/prompts/batch_runner.md Step 0.8, guards in api/_lib/moves/review.js), as for GDELT.
-- No collector is added in api/_lib/moves (the cron iterates its own ADAPTERS), so the daily cron is unchanged.
-- Idempotent. Rollback (only while no company_events row uses the key):
--   delete from public.data_sources where key = 'bizdirect_press'
--     and not exists (select 1 from public.company_events where source_key = 'bizdirect_press');

insert into public.data_sources (key, name, url, licence, attribution, public, env_key, notes) values
  ('bizdirect_press', 'BizDirect Asia press monitor (news headlines matched to companies)', 'https://bizdirectasia.com',
   'Headlines and links only, no article text; each item links to the original publisher',
   'News found through the BizDirect Asia press monitor; each item links to its publisher', true, null,
   'Written by the BizDirect bridge as drafts; published only after the Step 0.8 review.')
on conflict (key) do update set name = excluded.name, url = excluded.url, licence = excluded.licence,
  attribution = excluded.attribution, notes = excluded.notes, updated_at = now();
