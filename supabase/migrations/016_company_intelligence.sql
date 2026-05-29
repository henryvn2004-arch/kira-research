-- ============================================================
-- KIRA RESEARCH — migration 016: Company Intelligence Engine
-- Sprint 0: DB schema — 7 tables + extensions + RLS
--
-- Run in Supabase dashboard → SQL Editor.
-- Idempotent (CREATE ... IF NOT EXISTS everywhere).
-- Expected final notice: "Company Intelligence schema: all 7 tables OK"
-- ============================================================

-- Extensions for Vietnamese fuzzy search
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- ──────────────────────────────────────────────────────────────
-- 1. ENTITIES — companies, brands, persons, addresses, foreign orgs
-- ──────────────────────────────────────────────────────────────
create table if not exists entities (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('company','brand','person','address','foreign_org')),
  mst              text unique,               -- VN tax ID: 10-digit = legal entity, 13-digit = branch
  canonical_name   text not null,
  name_norm        text not null,             -- unaccent + lower + stripped legal suffix → used for fuzzy search
  status_cache     text,                      -- denorm: 'active'|'dissolved'|'suspended' — source of truth is facts table
  last_enriched_at timestamptz,
  created_at       timestamptz default now()
);

create index if not exists entities_name_norm_trgm  on entities using gin (name_norm gin_trgm_ops);
create index if not exists entities_mst             on entities (mst) where mst is not null;
create index if not exists entities_type            on entities (type);
create index if not exists entities_status          on entities (status_cache) where status_cache is not null;

-- ──────────────────────────────────────────────────────────────
-- 2. SOURCES — provenance records (one row per fetch operation)
-- ──────────────────────────────────────────────────────────────
create table if not exists sources (
  id          uuid primary key default gen_random_uuid(),
  source_type text not null,  -- dkkd|tax|noip|court|bidding|gmb|shopee|facebook|website|news|foreign_filing
  url         text,
  reliability text,           -- 'high'|'medium'|'low'
  fetched_at  timestamptz default now()
);

create index if not exists sources_type       on sources (source_type);
create index if not exists sources_fetched_at on sources (fetched_at);

-- ──────────────────────────────────────────────────────────────
-- 3. FACTS — EAV: one row per attribute, each with its own provenance
-- ──────────────────────────────────────────────────────────────
create table if not exists facts (
  id          uuid primary key default gen_random_uuid(),
  entity_id   uuid not null references entities(id) on delete cascade,
  key         text not null,   -- charter_capital|founding_date|industry|phone|legal_status|tax_debt|...
  value       jsonb not null,
  source_id   uuid references sources(id),
  confidence  numeric not null default 0.5 check (confidence between 0 and 1),
  observed_at timestamptz      -- when the SOURCE observed this (not when we fetched it)
);

create index if not exists facts_entity_key on facts (entity_id, key);
create index if not exists facts_source     on facts (source_id) where source_id is not null;

-- ──────────────────────────────────────────────────────────────
-- 4. RELATIONSHIPS — graph edges between entities
-- ──────────────────────────────────────────────────────────────
create table if not exists relationships (
  id             uuid primary key default gen_random_uuid(),
  src_entity_id  uuid not null references entities(id) on delete cascade,
  dst_entity_id  uuid not null references entities(id) on delete cascade,
  type           text not null,
  -- owns_trademark | operates_brand | shares_legal_rep | shares_address
  -- shareholder_of | subsidiary_of | branch_of | legal_rep_of | mentioned_with
  percent        numeric,   -- ownership % if known, nullable
  source_id      uuid references sources(id),
  confidence     numeric not null default 0.5 check (confidence between 0 and 1),
  observed_at    timestamptz,
  check (src_entity_id <> dst_entity_id)
);

create index if not exists relationships_src on relationships (src_entity_id, type);  -- forward traversal
create index if not exists relationships_dst on relationships (dst_entity_id, type);  -- reverse-index

-- ──────────────────────────────────────────────────────────────
-- 5. COVERAGE — found / checked_empty / not_checked / failed
--    Distinguishes "source was empty" from "we never checked"
-- ──────────────────────────────────────────────────────────────
create table if not exists coverage (
  entity_id   uuid not null references entities(id) on delete cascade,
  source_type text not null,
  status      text not null check (status in ('found','checked_empty','not_checked','failed')),
  checked_at  timestamptz default now(),
  primary key (entity_id, source_type)
);

-- ──────────────────────────────────────────────────────────────
-- 6. RAW DOCUMENTS — raw payload cache + hash for change detection
-- ──────────────────────────────────────────────────────────────
create table if not exists raw_documents (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid references sources(id),
  content      jsonb,        -- raw payload; large blobs go to Supabase Storage, path stored here
  content_hash text,         -- SHA-256 of content — different hash = re-process; same = skip
  expires_at   timestamptz   -- TTL per source_type (dkkd=30d, tax=7d, news=realtime etc.)
);

create index if not exists raw_documents_source  on raw_documents (source_id) where source_id is not null;
create index if not exists raw_documents_expires on raw_documents (expires_at) where expires_at is not null;
create index if not exists raw_documents_hash    on raw_documents (content_hash) where content_hash is not null;

-- ──────────────────────────────────────────────────────────────
-- 7. COMPANY REPORTS — assembled report cache + SEO slug
--    Also serves as the data source for public SEO pages.
-- ──────────────────────────────────────────────────────────────
create table if not exists company_reports (
  entity_id        uuid primary key references entities(id) on delete cascade,
  slug             text unique not null,  -- URL-safe identifier, used for SEO page routing
  payload          jsonb not null,        -- full assembled report (fields + narrative + subgraph + coverage)
  pipeline_version int not null default 1,
  expires_at       timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists company_reports_slug    on company_reports (slug);
create index if not exists company_reports_expires on company_reports (expires_at) where expires_at is not null;
create index if not exists company_reports_version on company_reports (pipeline_version);

-- ──────────────────────────────────────────────────────────────
-- RLS — enable on all 7 tables
-- ──────────────────────────────────────────────────────────────
alter table entities          enable row level security;
alter table sources           enable row level security;
alter table facts             enable row level security;
alter table relationships     enable row level security;
alter table coverage          enable row level security;
alter table raw_documents     enable row level security;
alter table company_reports   enable row level security;

-- Public read on entities (needed for search autocomplete)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'entities' and policyname = 'entities_public_read'
  ) then
    create policy "entities_public_read"
      on entities for select using (true);
  end if;
end $$;

-- Public read on company_reports (SEO pages + public API)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'company_reports' and policyname = 'company_reports_public_read'
  ) then
    create policy "company_reports_public_read"
      on company_reports for select using (true);
  end if;
end $$;

-- All other tables: service_role only (no public policy = deny for anon/authenticated).
-- Facts, sources, relationships, coverage, raw_documents are internal pipeline tables —
-- never queried directly by public clients.

-- ──────────────────────────────────────────────────────────────
-- RPC: company_graph_bfs
-- Called by pipeline.js expandGraph(). Returns BFS traversal rows.
-- ──────────────────────────────────────────────────────────────
create or replace function company_graph_bfs(
  p_seed      uuid,
  p_max_depth int  default 2,
  p_max_nodes int  default 30,
  p_min_conf  numeric default 0.3
)
returns table (
  entity_id  uuid,
  edge_type  text,
  path_conf  numeric,
  depth      int
)
language sql
security definer
set search_path = public
as $$
  with recursive g as (
    select
      r.dst_entity_id  as entity_id,
      r.type           as edge_type,
      r.confidence     as path_conf,
      1                as depth,
      array[p_seed, r.dst_entity_id] as path
    from relationships r
    where r.src_entity_id = p_seed

    union all

    select
      r.dst_entity_id,
      r.type,
      (g.path_conf * r.confidence)::numeric,
      g.depth + 1,
      g.path || r.dst_entity_id
    from relationships r
    join g on r.src_entity_id = g.entity_id
    where g.depth < p_max_depth
      and r.dst_entity_id <> all(g.path)
      and g.path_conf * r.confidence > p_min_conf
  )
  select entity_id, edge_type, path_conf, depth
  from g
  order by path_conf desc
  limit p_max_nodes;
$$;

-- Revoke from public; only service_role executes this
revoke execute on function company_graph_bfs(uuid, int, int, numeric) from public, anon, authenticated;

-- ──────────────────────────────────────────────────────────────
-- SMOKE TEST: insert + query + CTE
-- ──────────────────────────────────────────────────────────────
do $$
declare
  v_entity_id   uuid;
  v_src_id      uuid;
  v_child_id    uuid;
  v_edge_id     uuid;
  v_count       int;
begin
  -- Insert seed entity
  insert into entities (type, mst, canonical_name, name_norm, status_cache)
  values ('company', '0000000000', 'TEST COMPANY TNHH', 'test company', 'active')
  on conflict (mst) do update set canonical_name = excluded.canonical_name
  returning id into v_entity_id;

  -- Insert source
  insert into sources (source_type, url, reliability)
  values ('dkkd', 'https://test.example', 'high')
  returning id into v_src_id;

  -- Insert fact
  insert into facts (entity_id, key, value, source_id, confidence, observed_at)
  values (v_entity_id, 'charter_capital', '5000000000'::jsonb, v_src_id, 1.0, now());

  -- Insert coverage
  insert into coverage (entity_id, source_type, status)
  values (v_entity_id, 'dkkd', 'found')
  on conflict (entity_id, source_type) do update set status = excluded.status;

  -- Insert child entity + edge (for CTE test)
  insert into entities (type, canonical_name, name_norm)
  values ('company', 'TEST CHILD CO', 'test child co')
  returning id into v_child_id;

  insert into relationships (src_entity_id, dst_entity_id, type, confidence, source_id)
  values (v_entity_id, v_child_id, 'subsidiary_of', 0.9, v_src_id)
  returning id into v_edge_id;

  -- Test recursive CTE (bounded BFS depth=2)
  with recursive g as (
    select
      dst_entity_id as entity_id,
      type,
      confidence as path_conf,
      1 as depth,
      array[v_entity_id, dst_entity_id] as path
    from relationships
    where src_entity_id = v_entity_id
    union all
    select
      r.dst_entity_id,
      r.type,
      g.path_conf * r.confidence,
      g.depth + 1,
      g.path || r.dst_entity_id
    from relationships r
    join g on r.src_entity_id = g.entity_id
    where g.depth < 2
      and r.dst_entity_id <> all(g.path)
      and g.path_conf * r.confidence > 0.3
  )
  select count(*) into v_count from g;

  -- Cleanup test data
  delete from relationships where id = v_edge_id;
  delete from entities      where id = v_child_id;
  delete from facts         where entity_id = v_entity_id;
  delete from coverage      where entity_id = v_entity_id;
  delete from entities      where id = v_entity_id;
  delete from sources       where id = v_src_id;

  raise notice 'Smoke test OK — CTE returned % row(s)', v_count;
end $$;

-- ──────────────────────────────────────────────────────────────
-- FINAL VERIFICATION
-- ──────────────────────────────────────────────────────────────
do $$
declare
  tbl  text;
  ok   boolean := true;
begin
  foreach tbl in array array[
    'entities','sources','facts','relationships',
    'coverage','raw_documents','company_reports'
  ] loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = tbl
    ) then
      ok := false;
      raise warning 'MISSING: %', tbl;
    end if;
  end loop;
  if ok then
    raise notice 'Company Intelligence schema: all 7 tables OK';
  end if;
end $$;
