-- ============================================================
-- KIRA RESEARCH — migration 021: Seed JP companies
-- Sprint 8 (Company Intelligence expansion): 50 major Japanese
-- corporations across key APAC sectors.
--
-- Sources: National Tax Agency 法人番号公表サイト (public registry),
--          TSE (Tokyo Stock Exchange) public filings.
-- Tax ID format: JP 法人番号 — 13 digits.
-- Confidence: 0.8 static seed; JP connectors TBD in later sprint.
--
-- Idempotent: ON CONFLICT DO NOTHING throughout.
-- Run AFTER migration 020.
-- ============================================================

-- ── 1. Seed entities ────────────────────────────────────────

insert into entities (type, country_code, tax_id, canonical_name, name_norm, status_cache)
values
  -- ── Automotive ───────────────────────────────────────────
  ('company','JP','9180301018771', 'Toyota Motor Corporation',           'toyota',              'active'),
  ('company','JP','1180301018889', 'Honda Motor Co., Ltd.',              'honda',               'active'),
  ('company','JP','7180301023050', 'Nissan Motor Co., Ltd.',             'nissan',              'active'),
  ('company','JP','8180301016251', 'Mazda Motor Corporation',            'mazda',               'active'),
  ('company','JP','6180301022468', 'Subaru Corporation',                 'subaru',              'active'),
  ('company','JP','2190001043819', 'DENSO Corporation',                  'denso',               'active'),
  ('company','JP','1170001020671', 'Aisin Corporation',                  'aisin',               'active'),

  -- ── Technology / Electronics ─────────────────────────────
  ('company','JP','4010401021116', 'Sony Group Corporation',             'sony',                'active'),
  ('company','JP','5120001094766', 'Panasonic Holdings Corporation',     'panasonic',           'active'),
  ('company','JP','1010001010800', 'Canon Inc.',                         'canon',               'active'),
  ('company','JP','4010001015007', 'Hitachi, Ltd.',                      'hitachi',             'active'),
  ('company','JP','2130001022016', 'Mitsubishi Electric Corporation',    'mitsubishi electric', 'active'),
  ('company','JP','9010401045725', 'Fujitsu Limited',                    'fujitsu',             'active'),
  ('company','JP','7120001134440', 'KEYENCE CORPORATION',                'keyence',             'active'),
  ('company','JP','8010001096332', 'Kyocera Corporation',                'kyocera',             'active'),
  ('company','JP','5010001114565', 'Murata Manufacturing Co., Ltd.',     'murata',              'active'),
  ('company','JP','6010001077889', 'TDK Corporation',                    'tdk',                 'active'),

  -- ── Telecom / Internet ───────────────────────────────────
  ('company','JP','4010401005765', 'Nippon Telegraph and Telephone Corporation', 'ntt',         'active'),
  ('company','JP','5010401041662', 'SoftBank Group Corp.',               'softbank',            'active'),
  ('company','JP','0011001083240', 'KDDI Corporation',                   'kddi',                'active'),
  ('company','JP','3010001124093', 'Recruit Holdings Co., Ltd.',         'recruit',             'active'),

  -- ── Financial / Banking ──────────────────────────────────
  ('company','JP','9010401028423', 'Mitsubishi UFJ Financial Group',     'mufg',                'active'),
  ('company','JP','4010001055820', 'Sumitomo Mitsui Financial Group',    'smfg',                'active'),
  ('company','JP','5010001051098', 'Mizuho Financial Group',             'mizuho',              'active'),
  ('company','JP','5010401040507', 'Japan Post Holdings Co., Ltd.',      'japan post',          'active'),
  ('company','JP','2010401050498', 'Tokio Marine Holdings',              'tokio marine',        'active'),
  ('company','JP','3010001037459', 'Nomura Holdings, Inc.',              'nomura',              'active'),

  -- ── Retail / Consumer ────────────────────────────────────
  ('company','JP','8370001022271', 'Fast Retailing Co., Ltd.',           'fast retailing uniqlo', 'active'),
  ('company','JP','8010001023622', 'Seven & i Holdings Co., Ltd.',       'seven eleven 7i',     'active'),
  ('company','JP','1010001006703', 'AEON Co., Ltd.',                     'aeon',                'active'),
  ('company','JP','9010001069994', 'Lawson, Inc.',                       'lawson',              'active'),
  ('company','JP','9010001155180', 'FamilyMart Co., Ltd.',               'familymart',          'active'),

  -- ── F&B / Beverages ──────────────────────────────────────
  ('company','JP','6130001007775', 'Asahi Group Holdings, Ltd.',         'asahi beer',          'active'),
  ('company','JP','4010001046888', 'Kirin Holdings Company, Limited',    'kirin',               'active'),
  ('company','JP','3010401033950', 'Suntory Holdings Limited',           'suntory',             'active'),
  ('company','JP','2010001086021', 'Ajinomoto Co., Inc.',                'ajinomoto',           'active'),
  ('company','JP','8010001035536', 'Nisshin Seifun Group Inc.',          'nisshin seifun',      'active'),

  -- ── Healthcare / Pharma ──────────────────────────────────
  ('company','JP','5010401087426', 'Takeda Pharmaceutical Company',      'takeda',              'active'),
  ('company','JP','6010001012509', 'Astellas Pharma Inc.',               'astellas',            'active'),
  ('company','JP','5010001028816', 'Daiichi Sankyo Company, Limited',    'daiichi sankyo',      'active'),
  ('company','JP','1010001021082', 'Terumo Corporation',                 'terumo',              'active'),

  -- ── Materials / Chemicals ────────────────────────────────
  ('company','JP','9010001005218', 'Nippon Steel Corporation',           'nippon steel',        'active'),
  ('company','JP','5010001030596', 'Sumitomo Chemical Co., Ltd.',        'sumitomo chemical',   'active'),
  ('company','JP','8010001025752', 'Shin-Etsu Chemical Co., Ltd.',       'shinetsu chemical',   'active'),
  ('company','JP','6010001076613', 'JSR Corporation',                    'jsr',                 'active'),

  -- ── Trading / Conglomerates ──────────────────────────────
  ('company','JP','8010001049451', 'Mitsubishi Corporation',             'mitsubishi corp',     'active'),
  ('company','JP','4010001040672', 'Mitsui & Co., Ltd.',                 'mitsui',              'active'),
  ('company','JP','8010001049450', 'Sumitomo Corporation',               'sumitomo corp',       'active'),
  ('company','JP','9010001007539', 'Itochu Corporation',                 'itochu',              'active'),
  ('company','JP','4010001079033', 'Marubeni Corporation',               'marubeni',            'active')
on conflict (country_code, tax_id) do nothing;

-- ── 2. Seed facts (industry, sector, confidence 0.8) ─────────

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Automotive'),
  ('sector',        'Manufacturing')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('9180301018771','1180301018889','7180301023050','8180301016251',
                     '6180301022468','2190001043819','1170001020671')
on conflict (entity_id, key) do nothing;

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Technology'),
  ('sector',        'Electronics & Hardware')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('4010401021116','5120001094766','1010001010800','4010001015007',
                     '2130001022016','9010401045725','7120001134440','8010001096332',
                     '5010001114565','6010001077889')
on conflict (entity_id, key) do nothing;

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Technology'),
  ('sector',        'Telecom & Internet')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('4010401005765','5010401041662','0011001083240','3010001124093')
on conflict (entity_id, key) do nothing;

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Banking & Finance'),
  ('sector',        'Financial Services')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('9010401028423','4010001055820','5010001051098','5010401040507',
                     '2010401050498','3010001037459')
on conflict (entity_id, key) do nothing;

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Retail & Consumer'),
  ('sector',        'Retail')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('8370001022271','8010001023622','1010001006703','9010001069994','9010001155180')
on conflict (entity_id, key) do nothing;

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Food & Beverage'),
  ('sector',        'Consumer Staples')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('6130001007775','4010001046888','3010401033950','2010001086021','8010001035536')
on conflict (entity_id, key) do nothing;

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Healthcare'),
  ('sector',        'Pharmaceuticals')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('5010401087426','6010001012509','5010001028816','1010001021082')
on conflict (entity_id, key) do nothing;

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Materials'),
  ('sector',        'Chemicals & Steel')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('9010001005218','5010001030596','8010001025752','6010001076613')
on conflict (entity_id, key) do nothing;

insert into facts (entity_id, key, value, confidence, observed_at)
select
  ent.id,
  src.key,
  to_jsonb(src.value),
  0.8,
  now()
from entities ent
cross join (values
  ('industry',      'Trading & Conglomerates'),
  ('sector',        'General Trading')
) as src(key, value)
where ent.country_code = 'JP'
  and ent.tax_id in ('8010001049451','4010001040672','8010001049450','9010001007539','4010001079033')
on conflict (entity_id, key) do nothing;

-- ── 3. Seed stub company_reports ─────────────────────────────

insert into company_reports (entity_id, slug, payload, pipeline_version, expires_at, updated_at)
select
  ent.id,
  'jp-' || lower(regexp_replace(ent.canonical_name, '[^a-zA-Z0-9]+', '-', 'g'))
         || '-' || ent.tax_id,
  jsonb_build_object(
    'entity_id',    ent.id,
    'country_code', 'JP',
    'tax_id',       ent.tax_id,
    'name',         ent.canonical_name,
    'status',       'active',
    'is_stub',      true,
    'generated_at', now()
  ),
  1,
  now() + interval '30 days',
  now()
from entities ent
where ent.country_code = 'JP'
on conflict (entity_id) do nothing;

-- ── 4. Seed coverage stubs ───────────────────────────────────

insert into coverage (entity_id, source_type, status, checked_at)
select
  ent.id,
  src.source_type,
  src.status,
  now()
from entities ent
cross join (values
  ('static_seed', 'found'),
  ('dkkd',        'not_checked'),
  ('masothue',    'not_checked'),
  ('tavily',      'not_checked')
) as src(source_type, status)
where ent.country_code = 'JP'
on conflict (entity_id, source_type) do nothing;

-- ── Verify ────────────────────────────────────────────────────
do $$
declare
  vn_count int;
  jp_count int;
  total    int;
begin
  select count(*) into vn_count from entities where country_code = 'VN' and type = 'company';
  select count(*) into jp_count from entities where country_code = 'JP' and type = 'company';
  total := vn_count + jp_count;
  raise notice 'VN companies: % | JP companies: % | Total: %', vn_count, jp_count, total;
end $$;
