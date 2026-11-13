---
name: no-fake-counts-on-landing
description: "Hardcoded counts on landing pages (industries grid, library facets, total report tally) become a credibility hit the moment a click lands in an empty filter result. Render counts live from /api/library-list and hide zero-count rows."
metadata:
  node_type: memory
  type: feedback
---

## What went wrong

Homepage `/<locale>/` "Industries we track" section shipped with 12 brand-built SVG icon cells, each labelled with a hardcoded count: Fintech 14 reports, FMCG 22, Logistics 8, etc. Library page `/<locale>/library` sidebar carried matching hardcoded country/industry/year/price counts ("128 REPORTS", Vietnam 28, Indonesia 26, Thailand 22, etc.).

The DB at that point had **10 published reports total**, 9 in Vietnam and 1 in Indonesia, spanning Fintech, Coffee, SaaS, Pharma, Logistics, EV, E-commerce, Aquaculture. Half the homepage industry cells (FMCG, Media, Real Estate, Telecom, Hospitality, Manufacturing) mapped to zero reports.

Click on "FMCG 22 reports" → empty filter result. Click on "Indonesia 26 reports" → 1 report shown. Anyone touching the catalog could tell the numbers were aspirational; for a paid product with a $39 checkout button at the end of the funnel, the trust hit lands quickly.

## Fix shipped 2026-05-27 (`cc1fa29`)

Single client-side script `public/js/live-counts.js`:

1. Hits `/api/library-list?locale=<loc>&limit=200` once on `DOMContentLoaded`.
2. Aggregates the response by `industry` / `country` / `year` / price-band.
3. On homepage: each `.ind-cell` carries `data-industry-key="key1,key2,..."` mapping its brand label to one or more DB industry values (case-insensitive, e.g. `f&b,coffee,aquaculture`). Cells with 0 reports get `display:none`.
4. On library: each existing `[data-filter][data-value]` row's count is updated; rows with 0 are hidden; DB values without a hardcoded row (Coffee, SaaS, 2027, etc.) get appended dynamically with click handlers that navigate via `?industry=<key>`.

Defer-loaded (`<script src="/js/live-counts.js" defer>`) so the static HTML still renders something during the brief fetch window — but the placeholder is `— reports` (em-dash), not a fake number.

## When to extend this pattern

Any page that currently has a hardcoded count of *anything* in the DB should be looked at:
- `/<locale>/pricing` — if a "X published reports" claim ever gets added
- `/<locale>/methodology` — if methodology cites volume
- `/<locale>/insights/` — already dynamic, fine
- Future Phase R companies directory — start dynamic from day one

The general rule: **if the count comes from a row count in Supabase, fetch it.** If it's a brand claim ("two decades of regional research"), hardcode is fine because the source isn't a DB query.

## What NOT to do

- Don't add a `count` column to a config/seed file. Stale within a week of any batch fire.
- Don't rely on the Supabase scheduled function to overwrite static HTML — Vercel re-deploys on every push, so the static HTML wins next deploy.
- Don't fetch the count from the server at request time (this is a Vercel-static site, no SSR). Client-side fetch + skeleton placeholder is the only option without bringing in Next.js.

## Performance note

`/api/library-list?limit=200` returns ~30KB at current corpus (10 reports). Edge-cached `s-maxage=120, stale-while-revalidate=300`. One fetch on each page load is cheap. Bump the `limit` parameter when published count crosses ~150.

## See also

- [[feedback_stub_content_filter]] — same hygiene applied to `insight_translations.body=NULL` rows
- [[project_kira_logo_architecture]] — for the brand-defined icon cells the count-mapping has to respect
- [[project_batch_cron_system]] — what drives the underlying row counts
