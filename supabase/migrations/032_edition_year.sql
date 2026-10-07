-- 032_edition_year.sql — a report's year is its edition year (the year it is
-- published), never a future year (owner, 2026-10-07).
--
-- Before: topics defaulted to 2027 and the search functions inserted 2027, so
-- 45 reports published in 2026 showed "2027" in the library.
-- After: no topic or report carries a year later than the current one. The
-- trigger also covers code paths that still pass a hard-coded year
-- (ensure_search_topic, ensure_reader_topic, the topic planner). Topic slugs
-- keep their "2027-" prefix so existing coming-soon URLs do not break.
-- Idempotent.

alter table public.topics alter column year set default extract(year from now())::smallint;

create or replace function public.topics_clamp_year()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.year is null or new.year > extract(year from now()) then
    new.year := extract(year from now())::smallint;
  end if;
  return new;
end $$;

revoke all on function public.topics_clamp_year() from public, anon, authenticated;

drop trigger if exists topics_clamp_year on public.topics;
create trigger topics_clamp_year before insert or update of year on public.topics
  for each row execute function public.topics_clamp_year();

update public.topics set year = extract(year from now())::smallint
  where year > extract(year from now());

update public.living_reports set year = extract(year from coalesce(published_at, now()))::smallint, updated_at = now()
  where year > extract(year from coalesce(published_at, now()));
