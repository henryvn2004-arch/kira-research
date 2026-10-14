-- 056: analysis type of each published report.
-- The library filtered by investor stage (Assess / Enter / Expand), which told readers little. Every
-- topic is now one segment x one standard analysis (market overview, competitive landscape, ...), kept in
-- topics.competency_key (tax_competencies.key), so the library filters by that instead.
-- Published reports get the same key: from the topic they were made from, otherwise from their stage
-- (the older reports are all market overviews, XPL; the one ENT report without a topic is an entry
-- strategy). The batch runner sets it at publish (batch_runner.md, "Link the topic to its report").
-- Idempotent.
alter table public.living_reports add column if not exists analysis text references public.tax_competencies(key);

update public.living_reports r set analysis = t.competency_key
  from public.topics t
 where t.report_id = r.id and t.competency_key is not null and r.analysis is null;

update public.living_reports set analysis = case stage when 'XPL' then 'market_assessment' when 'ENT' then 'market_entry' end
 where analysis is null and stage in ('XPL', 'ENT');

create index if not exists living_reports_analysis_idx on public.living_reports (analysis);
