-- ============================================================
-- 024_locale_zh.sql — Phase S, Sprint S4
-- Allow Simplified Chinese (locale code 'zh') in every locale CHECK constraint.
-- Idempotent: drops and recreates each constraint with the 4-locale list.
-- ============================================================

alter table public.aggregator_sales        drop constraint if exists aggregator_sales_locale_check;
alter table public.aggregator_sales        add  constraint aggregator_sales_locale_check        check (locale = any (array['en','ja','ko','zh']));

alter table public.aggregator_submissions  drop constraint if exists aggregator_submissions_locale_check;
alter table public.aggregator_submissions  add  constraint aggregator_submissions_locale_check  check (locale = any (array['en','ja','ko','zh']));

alter table public.downloads               drop constraint if exists downloads_locale_check;
alter table public.downloads               add  constraint downloads_locale_check               check (locale = any (array['en','ja','ko','zh']));

alter table public.insight_translations    drop constraint if exists insight_translations_locale_check;
alter table public.insight_translations    add  constraint insight_translations_locale_check    check (locale = any (array['en','ja','ko','zh']));

alter table public.leads                   drop constraint if exists leads_locale_check;
alter table public.leads                   add  constraint leads_locale_check                   check (locale = any (array['en','ja','ko','zh']));

alter table public.purchases               drop constraint if exists purchases_locale_check;
alter table public.purchases               add  constraint purchases_locale_check               check (locale = any (array['en','ja','ko','zh']));

alter table public.report_translations     drop constraint if exists report_translations_locale_check;
alter table public.report_translations     add  constraint report_translations_locale_check     check (locale = any (array['en','ja','ko','zh']));
