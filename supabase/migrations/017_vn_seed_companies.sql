-- ============================================================
-- KIRA RESEARCH — migration 017: Seed top VN companies
-- Sprint 1: 25 curated entities + static facts
--
-- MSTs from public HOSE/HNX filings and ĐKKD portal.
-- All facts seeded with confidence 0.8 (static, pre-ĐKKD validation).
-- The vn_dkkd connector updates to 1.0 on first pipeline run.
--
-- Run AFTER migration 016 (company intelligence schema).
-- Idempotent: uses ON CONFLICT DO NOTHING.
-- ============================================================

-- ── 0. Add unique constraint on facts(entity_id, key) ──────────
-- Required for upsert semantics in pipeline.js + idempotent seed below.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'facts'::regclass and conname = 'facts_entity_key_unique'
  ) then
    alter table facts add constraint facts_entity_key_unique unique (entity_id, key);
  end if;
end $$;

-- ── 1. Seed source record for static curations ─────────────────
insert into sources (id, source_type, url, reliability, fetched_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'static_seed',
  'https://kiraresearch.com',
  'medium',
  now()
)
on conflict (id) do nothing;

-- ── 2. Seed entities (25 top VN companies) ─────────────────────
-- name_norm = unaccent + lowercase + legal suffix stripped (matches normalize.js)

insert into entities (type, country_code, tax_id, canonical_name, name_norm, status_cache)
values
  -- Conglomerates & real estate
  ('company','VN','0101231488', $n$Tập đoàn Vingroup - Công ty Cổ phần$n$,        'vingroup',             'active'),
  ('company','VN','0101245765', $n$Công ty Cổ phần Vinhomes$n$,                   'vinhomes',             'active'),
  ('company','VN','0101241133', $n$Công ty Cổ phần Tập đoàn Masan$n$,             'masan',                'active'),
  ('company','VN','0304132923', $n$Công ty Cổ phần Xây dựng Coteccons$n$,         'coteccons',            'active'),
  ('company','VN','0305152492', $n$Công ty Cổ phần Phát triển Bất động sản Phát Đạt$n$, 'phat dat',      'active'),
  ('company','VN','0200170831', $n$Công ty Cổ phần Phát triển Đô thị Kinh Bắc$n$,'kinh bac city',        'active'),

  -- Technology & telco
  ('company','VN','0101248141', $n$Công ty Cổ phần FPT$n$,                        'fpt',                  'active'),
  ('company','VN','0100109106', $n$Tập đoàn Công nghiệp - Viễn thông Quân đội$n$, 'viettel',             'active'),
  ('company','VN','0100686209', $n$Tập đoàn Bưu chính Viễn thông Việt Nam$n$,     'vnpt',                'active'),

  -- Retail & consumer
  ('company','VN','0301452948', $n$Công ty Cổ phần Đầu tư Thế Giới Di Động$n$,   'the gioi di dong mwg', 'active'),
  ('company','VN','0303655599', $n$Công ty Cổ phần Hàng tiêu dùng Masan$n$,       'masan consumer',       'active'),
  ('company','VN','0300715692', $n$Công ty Cổ phần Vàng bạc Đá quý Phú Nhuận$n$, 'pnj',                  'active'),

  -- Food & beverage
  ('company','VN','1800236211', $n$Công ty Cổ phần Sữa Việt Nam$n$,              'vinamilk',             'active'),
  ('company','VN','0300581946', $n$Tổng Công ty Cổ phần Bia - Rượu - Nước giải khát Sài Gòn$n$, 'sabeco', 'active'),
  ('company','VN','0100108704', $n$Tổng Công ty Cổ phần Bia - Rượu - Nước giải khát Hà Nội$n$, 'habeco',  'active'),

  -- Steel & manufacturing
  ('company','VN','0400186680', $n$Công ty Cổ phần Tập đoàn Hòa Phát$n$,         'hoa phat',             'active'),
  ('company','VN','0200284693', $n$Công ty Cổ phần An Phát Holdings$n$,           'an phat holdings',     'active'),

  -- Aviation & transport
  ('company','VN','0100107518', $n$Tổng Công ty Hàng không Việt Nam - Công ty Cổ phần$n$, 'vietnam airlines', 'active'),
  ('company','VN','0102182728', $n$Công ty Cổ phần Hàng không VietJet$n$,         'vietjet',              'active'),

  -- Energy
  ('company','VN','0100107716', $n$Tập đoàn Xăng dầu Việt Nam - Công ty Cổ phần$n$, 'petrolimex',        'active'),
  ('company','VN','0100100079', $n$Tập đoàn Điện lực Việt Nam$n$,                 'evn',                  'active'),
  ('company','VN','0100681380', $n$Tập đoàn Dầu khí Việt Nam$n$,                  'pvn petrovietnam',     'active'),

  -- Banking
  ('company','VN','0100112437', $n$Ngân hàng Thương mại Cổ phần Ngoại thương Việt Nam$n$, 'vietcombank vcb', 'active'),
  ('company','VN','0100150619', $n$Ngân hàng Thương mại Cổ phần Đầu tư và Phát triển Việt Nam$n$, 'bidv', 'active'),
  ('company','VN','0100230800', $n$Ngân hàng Thương mại Cổ phần Kỹ thương Việt Nam$n$, 'techcombank tcb', 'active')

on conflict (country_code, tax_id) do nothing;

-- ── 3. Seed static facts ────────────────────────────────────────
-- Uses the seed source (id: 00000000-...0001), confidence 0.8

do $$
declare
  src_id uuid := '00000000-0000-0000-0000-000000000001';
  e      record;

  -- (mst, industry, sector, founding_year, approx_charter_capital_vnd)
  company_meta jsonb[] := array[
    '{"mst":"0101231488","industry":"Real Estate","sector":"conglomerate","founded":2002,"cap":33945000000000}'::jsonb,
    '{"mst":"0101245765","industry":"Real Estate","sector":"real_estate","founded":2008,"cap":43100000000000}'::jsonb,
    '{"mst":"0101241133","industry":"FMCG","sector":"conglomerate","founded":2004,"cap":14100000000000}'::jsonb,
    '{"mst":"0304132923","industry":"Construction","sector":"construction","founded":2004,"cap":793000000000}'::jsonb,
    '{"mst":"0305152492","industry":"Real Estate","sector":"real_estate","founded":2004,"cap":1350000000000}'::jsonb,
    '{"mst":"0200170831","industry":"Real Estate","sector":"industrial_zone","founded":2001,"cap":3828000000000}'::jsonb,
    '{"mst":"0101248141","industry":"Technology","sector":"technology","founded":1988,"cap":7797000000000}'::jsonb,
    '{"mst":"0100109106","industry":"Telecommunications","sector":"telco","founded":1989,"cap":100000000000000}'::jsonb,
    '{"mst":"0100686209","industry":"Telecommunications","sector":"telco","founded":1995,"cap":15000000000000}'::jsonb,
    '{"mst":"0301452948","industry":"Retail","sector":"retail","founded":2004,"cap":1794000000000}'::jsonb,
    '{"mst":"0303655599","industry":"FMCG","sector":"fmcg","founded":2011,"cap":4700000000000}'::jsonb,
    '{"mst":"0300715692","industry":"Retail","sector":"jewelry","founded":1988,"cap":1104000000000}'::jsonb,
    '{"mst":"1800236211","industry":"F&B","sector":"dairy","founded":1976,"cap":17416000000000}'::jsonb,
    '{"mst":"0300581946","industry":"F&B","sector":"brewing","founded":1977,"cap":6412000000000}'::jsonb,
    '{"mst":"0100108704","industry":"F&B","sector":"brewing","founded":1958,"cap":2308000000000}'::jsonb,
    '{"mst":"0400186680","industry":"Steel","sector":"steel","founded":1992,"cap":57000000000000}'::jsonb,
    '{"mst":"0200284693","industry":"Manufacturing","sector":"plastics","founded":2000,"cap":2500000000000}'::jsonb,
    '{"mst":"0100107518","industry":"Aviation","sector":"aviation","founded":1956,"cap":22144000000000}'::jsonb,
    '{"mst":"0102182728","industry":"Aviation","sector":"aviation","founded":2007,"cap":1100000000000}'::jsonb,
    '{"mst":"0100107716","industry":"Energy","sector":"petroleum","founded":1956,"cap":12938000000000}'::jsonb,
    '{"mst":"0100100079","industry":"Energy","sector":"power","founded":1994,"cap":200000000000000}'::jsonb,
    '{"mst":"0100681380","industry":"Energy","sector":"oil_gas","founded":1977,"cap":190000000000000}'::jsonb,
    '{"mst":"0100112437","industry":"Banking","sector":"banking","founded":1963,"cap":47325000000000}'::jsonb,
    '{"mst":"0100150619","industry":"Banking","sector":"banking","founded":1957,"cap":57000000000000}'::jsonb,
    '{"mst":"0100230800","industry":"Banking","sector":"banking","founded":1993,"cap":35225000000000}'::jsonb
  ];
  m jsonb;
begin
  foreach m in array company_meta loop
    select id into e from entities
    where country_code = 'VN' and tax_id = m->>'mst';

    continue when not found;

    -- industry
    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    values (e.id, 'industry', to_jsonb(m->>'industry'), src_id, 0.8, now())
    on conflict (entity_id, key) do nothing;

    -- sector
    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    values (e.id, 'sector', to_jsonb(m->>'sector'), src_id, 0.8, now())
    on conflict (entity_id, key) do nothing;

    -- founding_year
    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    values (e.id, 'founding_year', (m->'founded'), src_id, 0.8, now())
    on conflict (entity_id, key) do nothing;

    -- charter_capital (VND)
    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    values (e.id, 'charter_capital', (m->'cap'), src_id, 0.8, now())
    on conflict (entity_id, key) do nothing;

    -- Mark coverage as pre-seeded (not yet ĐKKD-validated)
    insert into coverage (entity_id, source_type, status, checked_at)
    values (e.id, 'static_seed', 'found', now())
    on conflict (entity_id, source_type) do nothing;

    -- Mark dkkd as not yet checked (will be fetched on first pipeline run)
    insert into coverage (entity_id, source_type, status, checked_at)
    values (e.id, 'dkkd', 'not_checked', now())
    on conflict (entity_id, source_type) do nothing;

  end loop;
end $$;

-- ── 4. Seed company_reports slugs for all seeded entities ───────
-- Slug format: vn-<name_norm_dashed>-<mst>  (mirrors normalize.js makeSlug)

do $$
declare
  e record;
  slug_base text;
  the_slug  text;
  now_ts    timestamptz := now();
begin
  for e in
    select id, canonical_name, name_norm, tax_id
    from entities
    where country_code = 'VN'
      and tax_id is not null
      and not exists (
        select 1 from company_reports where entity_id = entities.id
      )
  loop
    -- Build slug: lowercase+dashes of name_norm, max 55 chars, then append mst
    slug_base := regexp_replace(
      regexp_replace(lower(e.name_norm), '\s+', '-', 'g'),
      '-+', '-', 'g'
    );
    slug_base := left(slug_base, 55);
    the_slug  := 'vn-' || slug_base || '-' || e.tax_id;

    insert into company_reports (entity_id, slug, payload, pipeline_version, expires_at)
    values (
      e.id,
      the_slug,
      jsonb_build_object(
        'entity_id',    e.id,
        'country_code', 'VN',
        'tax_id',       e.tax_id,
        'name',         e.canonical_name,
        'slug',         the_slug,
        'status',       'active',
        'is_stub',      true,
        'coverage',     '{"dkkd":"not_checked","static_seed":"found"}'::jsonb,
        'facts',        '{}'::jsonb,
        'graph',        '[]'::jsonb,
        'narrative',    null,
        'generated_at', now_ts,
        'pipeline_ver', 1
      ),
      1,
      now_ts - interval '1 second'  -- immediately expired so first real pipeline run refreshes
    )
    on conflict (entity_id) do nothing;

  end loop;
end $$;

-- ── Verification ────────────────────────────────────────────────
do $$
declare
  n_entities int;
  n_facts    int;
  n_reports  int;
begin
  select count(*) into n_entities from entities where country_code = 'VN';
  select count(*) into n_facts    from facts f
    join entities e on e.id = f.entity_id where e.country_code = 'VN';
  select count(*) into n_reports  from company_reports cr
    join entities e on e.id = cr.entity_id where e.country_code = 'VN';
  raise notice 'Seed 017 OK — VN entities: %, facts: %, reports: %', n_entities, n_facts, n_reports;
end $$;
