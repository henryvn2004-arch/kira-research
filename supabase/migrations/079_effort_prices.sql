-- 079 — Effort-based prices, per item (owner decisions 2026-11-27, stage 0 "pricing").
-- Rules (the JS twin is api/_lib/pricing.js; change both together). Whole dollars, never ending in 9 (9 -> 8):
--   report      = round((18 + 0.8*pages + 0.5*exhibits) * rarity * freshness), clamp 31..78
--                 exhibits unknown -> round(pages*0.55); freshness 1.0 under 6 months from published_at, 0.9 under 12, else 0.8
--   transcript  = round((9 + 0.35*printed_pages) * rarity), clamp 14..28; printed pages = read minutes * 238 / 450
--   company list = round(6 + 11*log10(companies)), clamp 18..38 (computed on every read in code; the SQL function is for checks)
-- Idempotent. Applied by hand (MCP or dashboard).
--
-- BEFORE applying, look at what changes: node scripts/reprice-dry-run.mjs  (prints old -> new for every report and transcript, writes nothing).
-- Re-run the two recompute_* functions whenever rarity/exhibits change or a report passes its 6/12-month mark
-- (freshness uses published_at): select recompute_report_prices(); select recompute_transcript_prices();

-- 1. Columns ------------------------------------------------------------------------------------
alter table living_reports add column if not exists exhibits integer;                 -- chart count; set only when the report has exhibit data (report_exhibits)
alter table living_reports add column if not exists rarity numeric not null default 1.0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'living_reports_rarity_range') then
    alter table living_reports add constraint living_reports_rarity_range check (rarity between 1.0 and 1.3);
  end if;
end $$;
comment on column living_reports.exhibits is 'Number of exhibits (charts) with data behind them; null = no exhibit data. Shown on the report page; the Excel/PowerPoint line appears only when set.';
comment on column living_reports.rarity is 'Price multiplier 1.0-1.3 set by the owner for hard-to-find topics (default 1.0).';

alter table expert_transcripts add column if not exists rarity numeric not null default 1.0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'expert_transcripts_rarity_range') then
    alter table expert_transcripts add constraint expert_transcripts_rarity_range check (rarity between 1.0 and 1.3);
  end if;
end $$;
alter table expert_transcripts add column if not exists price integer not null default 14;
comment on column expert_transcripts.price is 'USD price of the full transcript (all languages), from kira_transcript_price(); read by /api/transcript and /api/transcript-buy.';

-- 2. Price functions ------------------------------------------------------------------------------
create or replace function kira_no_nine(n numeric) returns integer language sql immutable as $$
  select case when round(n)::int % 10 = 9 then round(n)::int - 1 else round(n)::int end
$$;

create or replace function kira_report_price(p_pages integer, p_exhibits integer, p_rarity numeric, p_published timestamptz)
returns integer language sql stable as $$
  select kira_no_nine(greatest(31, least(78, round(
    (18 + 0.8 * coalesce(p_pages, 0)
        + 0.5 * coalesce(p_exhibits, round(coalesce(p_pages, 0) * 0.55))) * least(1.3, greatest(1.0, coalesce(p_rarity, 1.0)))
    * (case when p_published is null then 1.0
            when extract(epoch from (now() - p_published)) / 86400.0 / 30.4375 < 6 then 1.0
            when extract(epoch from (now() - p_published)) / 86400.0 / 30.4375 < 12 then 0.9
            else 0.8 end)
  ))))
$$;

create or replace function kira_transcript_price(p_printed_pages numeric, p_rarity numeric)
returns integer language sql immutable as $$
  select kira_no_nine(greatest(14, least(28, round((9 + 0.35 * coalesce(p_printed_pages, 0)) * least(1.3, greatest(1.0, coalesce(p_rarity, 1.0)))))))
$$;

create or replace function kira_list_price(p_companies integer)
returns integer language sql immutable as $$
  select kira_no_nine(greatest(18, least(38, round(6 + 11 * log(10, greatest(1, coalesce(p_companies, 1)))::numeric))))
$$;

-- Printed pages of a transcript from its EN "≈ 25 min read" label (238 words a minute, 450 words a page).
create or replace function kira_transcript_pages(p_transcript uuid) returns numeric language sql stable as $$
  select coalesce(
    (select (substring(length_label from '(\d+)'))::numeric * 238 / 450
       from expert_transcript_translations
      where transcript_id = p_transcript and locale = 'en' and length_label ~ '\d+' limit 1),
    0)
$$;

-- 3. Recompute (report prices of every published report; transcript prices of every transcript) ------
create or replace function recompute_report_prices() returns integer language plpgsql as $$
declare n integer;
begin
  update living_reports l
     set price = kira_report_price(l.pages, l.exhibits, l.rarity, l.published_at)
   where l.status = 'published'
     and l.pages > 0          -- a report with no page count keeps its price until the count is filled in
     and l.price is distinct from kira_report_price(l.pages, l.exhibits, l.rarity, l.published_at);
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function recompute_transcript_prices() returns integer language plpgsql as $$
declare n integer;
begin
  update expert_transcripts t
     set price = kira_transcript_price(kira_transcript_pages(t.id), t.rarity)
   where t.price is distinct from kira_transcript_price(kira_transcript_pages(t.id), t.rarity);
  get diagnostics n = row_count;
  return n;
end $$;

-- New transcripts arrive from the generator with the default price (14): after saving a transcript's EN translation run
-- select recompute_transcript_prices(); (the length label that sets the price lives in the translation row).

-- 4. Backfill chart counts, then reprice what is on sale now -------------------------------------------
update living_reports l
   set exhibits = e.exhibit_count
  from report_exhibits e
 where e.report_id = l.id and e.exhibit_count > 0 and l.exhibits is distinct from e.exhibit_count;

select recompute_report_prices();
select recompute_transcript_prices();

-- 5. Month and Annual are no longer sold (owner 2026-11-27). Existing subscribers keep access and /subscription.
insert into app_config (key, value, updated_by) values
  ('checkout.subscription_enabled', 'false'::jsonb, 'migration 079'),
  ('checkout.annual_enabled',       'false'::jsonb, 'migration 079'),
  ('transcripts.public_full',       'false'::jsonb, 'migration 079')
on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
