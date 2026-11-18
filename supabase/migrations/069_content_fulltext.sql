-- ============================================================
-- 069_content_fulltext.sql — "which reports and interviews name this brand?"
--
-- BizDirect Asia asks /api/brand-mentions which KIRA reports and transcripts mention a brand in their
-- FULL text. The full text of a report is not in the database (report_translations.full_content is null;
-- reports-html holds only the 5-page preview), so the plain text of every published report is loaded here
-- by scripts/load-report-fulltext.py. Transcripts are read from their own tables.
--
-- The text never leaves the database: content_brand_mentions returns only (kind, slug, locale, counts),
-- /api/brand-mentions turns that into catalogue fields. RLS on, no policies, execute for service_role only.
-- Idempotent. NOT applied by the session that wrote it: the commander applies it.
-- ============================================================

create extension if not exists pg_trgm;

create table if not exists content_fulltext_reports (
  slug        text not null,
  locale      text not null check (locale in ('en', 'ja', 'ko', 'zh')),
  report_id   uuid references living_reports(id) on delete cascade,
  body        text not null,          -- plain text of the full report (tags stripped), never served
  body_sha1   text,
  updated_at  timestamptz not null default now(),
  primary key (slug, locale)
);
alter table content_fulltext_reports enable row level security;

create index if not exists content_fulltext_reports_trgm_idx
  on content_fulltext_reports using gin (body gin_trgm_ops);

-- Reports and transcripts as one searchable set (published rows only).
create or replace view content_fulltext_v as
  select 'report'::text as kind, f.slug, f.locale, f.body
    from content_fulltext_reports f
    join living_reports r on r.id = f.report_id and r.status = 'published'
  union all
  select 'transcript', e.slug, t.locale,
         concat_ws(' ', t.title, t.blurb,
           (select string_agg(x #>> '{}', ' ') from jsonb_array_elements(t.summary) x),
           (select string_agg(y #>> '{}', ' ') from jsonb_path_query(t.sections, '$[*].turns[*].text') y))
    from expert_transcript_translations t
    join expert_transcripts e on e.id = t.transcript_id and e.status = 'published'
   where t.status = 'published';

-- p_solid: case-insensitive patterns, one mention is enough. p_weak: case-sensitive, the caller wants >= 2.
-- Patterns are Postgres regexes built by api/_lib/brand-match.js.
create or replace function content_brand_mentions(p_solid text[], p_weak text[], p_locales text[])
returns table (kind text, slug text, locale text, n_solid int, n_weak int)
language sql stable
as $$
  select v.kind, v.slug, v.locale,
         coalesce((select sum(regexp_count(v.body, p, 1, 'i')) from unnest(p_solid) p), 0)::int,
         coalesce((select sum(regexp_count(v.body, p)) from unnest(p_weak) p), 0)::int
    from content_fulltext_v v
   where v.locale = any (p_locales)
     and (v.body ~* any (p_solid) or v.body ~ any (p_weak));
$$;

revoke all on function content_brand_mentions(text[], text[], text[]) from public, anon, authenticated;
grant execute on function content_brand_mentions(text[], text[], text[]) to service_role;
revoke all on content_fulltext_reports from anon, authenticated;
revoke all on content_fulltext_v from anon, authenticated;
