-- ============================================================
-- 037_expert_transcripts.sql — Kira Experts transcript library
--
--   expert_transcripts               one row per transcript (language-neutral facts)
--   expert_transcript_translations   one row per (transcript, locale): the text
--
-- Read only through the API (service role): /api/transcript-list and
-- /api/transcript return published rows and the free part of the text;
-- /api/transcript-content returns the full text to entitled users.
-- RLS on, no policies. Idempotent.
--
-- Translation JSON shapes (written by the generator in kira-pipeline after QC):
--   summary  ["sentence [N1] [F2]", ...]
--   sections [{"title": "...", "turns": [{"who": "Q"|"A", "text": "... [N1]"}]}]
--   sources  {"N1": {"claim": "...", "src": "...", "url": "..."|null}, ...}
--            N# = dated public source; F# = channel practice from KIRA field interviews
-- ============================================================

create table if not exists expert_transcripts (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]+$'),
  interview_type     text not null check (interview_type in (
                       'Market assessment', 'Market entry', 'Distribution & channels', 'Partner search',
                       'Competitive landscape', 'Pricing & margins', 'Regulation', 'Customer voice')),
  country_code       text not null,
  market             text not null,
  industry           text not null,
  expert_group       text not null,
  format             text not null default 'Modelled interview',
  status             text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  published_at       timestamptz,
  source_report_code text,          -- internal: archive report the framework came from; never sent to readers
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists expert_transcripts_published_idx
  on expert_transcripts (published_at desc) where status = 'published';

create table if not exists expert_transcript_translations (
  id              uuid primary key default gen_random_uuid(),
  transcript_id   uuid not null references expert_transcripts(id) on delete cascade,
  locale          text not null default 'en' check (locale in ('en', 'ja', 'ko', 'zh')),
  status          text not null default 'draft' check (status in ('draft', 'published')),
  title           text not null,
  blurb           text not null,
  expert_role     text not null,
  expert_type     text not null,
  expert_profile  text not null,
  basis           text not null,
  as_of           text not null,
  length_label    text,
  companies       text[] not null default '{}',
  summary         jsonb not null default '[]'::jsonb,
  sections        jsonb not null default '[]'::jsonb,
  sources         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (transcript_id, locale)
);

alter table expert_transcripts enable row level security;
alter table expert_transcript_translations enable row level security;

-- updated_at is set by the writer (the generator's upsert), not by a trigger.
