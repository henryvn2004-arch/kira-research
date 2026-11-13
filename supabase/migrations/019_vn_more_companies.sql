-- ============================================================
-- KIRA RESEARCH — migration 019: Seed VN companies batch 3
-- Sprint 2: 75 more companies to reach 200 total
--
-- New sectors: Retail, Aviation, Construction/EPC, Telecom,
--   Agriculture/Aquaculture, Water/Utilities, Tourism,
--   Finance/NBFI, Insurance, Healthcare, Textile/Garment,
--   Mining, Education, Technology (more), Automotive
--
-- Sources: HOSE/HNX public filings, ĐKKD portal (public MSTs)
-- Confidence: 0.8 static seed; connectors update to 0.9–1.0 on
--   first pipeline run.
--
-- Idempotent: ON CONFLICT DO NOTHING throughout.
-- Run AFTER migrations 016–018.
-- ============================================================

-- ── 1. Seed entities ─────────────────────────────────────────

insert into entities (type, country_code, tax_id, canonical_name, name_norm, status_cache)
values
  -- ── Retail ──────────────────────────────────────────────────
  ('company','VN','0303005807', $n$Công ty Cổ phần Thế Giới Di Động$n$,                       'the gioi di dong mobile world mwg',  'active'),
  ('company','VN','0107631397', $n$Công ty Cổ phần Bán lẻ Kỹ thuật số FPT$n$,                 'fpt retail frt',                     'active'),
  ('company','VN','0300521994', $n$Công ty Cổ phần Vàng bạc Đá quý Phú Nhuận$n$,              'phu nhuan jewelry pnj',              'active'),
  ('company','VN','0100107519', $n$Tập đoàn Xăng dầu Việt Nam$n$,                             'petrolimex plx',                     'active'),
  ('company','VN','0100107740', $n$Tổng Công ty Thương mại Hà Nội$n$,                         'hapro hanoi trade corp',             'active'),
  ('company','VN','0312036296', $n$Công ty TNHH Central Retail Việt Nam$n$,                   'central retail vietnam go big c',    'active'),

  -- ── Aviation ────────────────────────────────────────────────
  ('company','VN','0302715669', $n$Công ty Cổ phần Hàng không VietJet$n$,                     'vietjet air vjc vja',                'active'),
  ('company','VN','0800964340', $n$Công ty Cổ phần Hàng không Tre Việt$n$,                    'bamboo airways bav',                 'active'),

  -- ── Construction / EPC ──────────────────────────────────────
  ('company','VN','0301228158', $n$Công ty Cổ phần Xây dựng Coteccons$n$,                     'coteccons ctd',                      'active'),
  ('company','VN','0102004940', $n$Công ty Cổ phần FECON$n$,                                  'fecon fcn',                          'active'),
  ('company','VN','0313726458', $n$Công ty Cổ phần Ricons$n$,                                 'ricons',                             'active'),
  ('company','VN','0313248178', $n$Công ty Cổ phần Newtecons$n$,                              'newtecons',                          'active'),
  ('company','VN','0400100557', $n$Tổng Công ty Xây dựng Công trình Giao thông 4$n$,          'cienco4',                            'active'),
  ('company','VN','0302093698', $n$Công ty Cổ phần Phục Hưng Holdings$n$,                     'phuc hung holdings phh',             'active'),
  ('company','VN','0100106742', $n$Công ty Cổ phần Đầu tư và Phát triển Delta$n$,             'delta dlg',                          'active'),

  -- ── Telecom ─────────────────────────────────────────────────
  ('company','VN','0100687790', $n$Tập đoàn Bưu chính Viễn thông Việt Nam$n$,                 'vnpt',                               'active'),
  ('company','VN','0101696633', $n$Công ty Cổ phần Viễn thông Di động GTel$n$,                'gmobile gtel',                       'active'),

  -- ── Agriculture / Aquaculture ───────────────────────────────
  ('company','VN','2300138110', $n$Công ty Cổ phần Tập đoàn Dabaco Việt Nam$n$,               'dabaco dbc',                         'active'),
  ('company','VN','1300181327', $n$Công ty Cổ phần Hùng Vương$n$,                             'hung vuong hvg',                     'active'),
  ('company','VN','0302427478', $n$Công ty Cổ phần Ba Huân$n$,                                'ba huan baf',                        'active'),
  ('company','VN','0300396265', $n$Công ty Cổ phần Thực phẩm Sao Ta$n$,                       'sao ta fmc',                         'active'),
  ('company','VN','0201337527', $n$Công ty Cổ phần Chăn nuôi Việt - Úc$n$,                    'viet uc seafood vau',                 'active'),
  ('company','VN','3800238340', $n$Tổng Công ty Cà phê Việt Nam$n$,                           'vinacafe',                           'active'),

  -- ── Water / Utilities ───────────────────────────────────────
  ('company','VN','0300537450', $n$Tổng Công ty Cổ phần Cấp nước Sài Gòn$n$,                  'saigon water bwe sjw',               'active'),
  ('company','VN','0400100572', $n$Công ty Cổ phần Cấp nước Đà Nẵng$n$,                       'da nang water dnw',                  'active'),
  ('company','VN','3700142938', $n$Công ty Cổ phần Cấp thoát nước Bình Dương$n$,              'binh duong water bws',               'active'),
  ('company','VN','0300537369', $n$Công ty Cổ phần Cấp nước Thủ Đức$n$,                       'thu duc water tdw',                  'active'),
  ('company','VN','0800100050', $n$Công ty Cổ phần Cấp nước Huế$n$,                           'hue water',                          'active'),

  -- ── Tourism / Hospitality ───────────────────────────────────
  ('company','VN','0300579211', $n$Công ty Cổ phần Du lịch Việt Nam Vietravel$n$,              'vietravel',                          'active'),
  ('company','VN','0500135196', $n$Công ty Cổ phần Tập đoàn BIM$n$,                           'bim group',                          'active'),
  ('company','VN','0300487716', $n$Công ty Cổ phần Thương mại Dịch vụ Fiditour$n$,            'fiditour',                           'active'),
  ('company','VN','0300590419', $n$Công ty Cổ phần Du lịch Bến Thành$n$,                      'ben thanh tourist',                  'active'),
  ('company','VN','0301301388', $n$Công ty Cổ phần Du lịch Hòa Bình$n$,                       'hoa binh travel',                    'active'),

  -- ── Finance / NBFI ──────────────────────────────────────────
  ('company','VN','0101700819', $n$Công ty Tài chính TNHH MTV Ngân hàng Việt Nam Thịnh Vượng$n$,'fe credit vpbank finance',          'active'),
  ('company','VN','0302200714', $n$Công ty Tài chính TNHH MTV Home Credit Việt Nam$n$,         'home credit vietnam',                'active'),
  ('company','VN','0107268396', $n$Công ty Tài chính Cổ phần Tín Việt$n$,                     'mcredit',                            'active'),
  ('company','VN','0300595245', $n$Công ty Tài chính Cổ phần HD SAISON$n$,                    'hd saison hds',                      'active'),
  ('company','VN','0102716928', $n$Công ty Cổ phần Thanh toán Quốc gia Việt Nam$n$,            'napas',                              'active'),

  -- ── Insurance (additional) ──────────────────────────────────
  ('company','VN','0100112946', $n$Tổng Công ty Bảo hiểm PVI$n$,                              'pvi insurance',                      'active'),
  ('company','VN','0100100885', $n$Tổng Công ty Cổ phần Bảo hiểm Petrolimex$n$,               'pjico petrolimex insurance',         'active'),
  ('company','VN','0100114740', $n$Tổng Công ty Cổ phần Bảo hiểm Bưu điện$n$,                 'pti insurance',                      'active'),
  ('company','VN','0100107709', $n$Tổng Công ty Cổ phần Bảo Long$n$,                          'bao long insurance',                 'active'),

  -- ── Healthcare / Hospital ───────────────────────────────────
  ('company','VN','0302267428', $n$Tập đoàn Y tế Hoàn Mỹ$n$,                                  'hoan my medical',                   'active'),
  ('company','VN','0102138988', $n$Công ty Cổ phần Bệnh viện Hữu nghị Lạc Việt$n$,            'medlatec',                           'active'),
  ('company','VN','0107365930', $n$Công ty Cổ phần Bệnh viện Đa khoa Tâm Anh$n$,              'tam anh hospital',                   'active'),
  ('company','VN','0107152760', $n$Công ty Cổ phần Bệnh viện Thu Cúc$n$,                      'thu cuc hospital',                   'active'),
  ('company','VN','0312072558', $n$Công ty TNHH Bệnh viện FV$n$,                              'fv hospital',                        'active'),

  -- ── Textile / Garment ───────────────────────────────────────
  ('company','VN','0100103653', $n$Tập đoàn Dệt May Việt Nam$n$,                              'vinatex vtx',                        'active'),
  ('company','VN','0100186074', $n$Công ty Cổ phần May 10$n$,                                 'may 10 m10',                         'active'),
  ('company','VN','0300361698', $n$Tổng Công ty Cổ phần Phong Phú$n$,                         'phong phu textile',                  'active'),
  ('company','VN','0300361680', $n$Công ty Cổ phần Sản xuất Thương mại May Sài Gòn$n$,        'garmex saigon gmx',                  'active'),
  ('company','VN','4600358840', $n$Công ty Cổ phần Đầu tư và Thương mại TNG$n$,               'tng investment tng',                 'active'),

  -- ── Mining / Minerals ───────────────────────────────────────
  ('company','VN','0302054534', $n$Công ty Cổ phần DHA$n$,                                    'dha corp dha',                       'active'),
  ('company','VN','0200120041', $n$Công ty Cổ phần Khoáng sản Cẩm Phả$n$,                     'cam pha mineral',                    'active'),
  ('company','VN','0106891658', $n$Công ty Cổ phần Khoáng sản Bắc Giang$n$,                   'bac giang mineral bsg',              'active'),
  ('company','VN','2800100196', $n$Công ty Cổ phần Than Thanh Hóa$n$,                         'thanh hoa coal tmc',                 'active'),

  -- ── Education / EdTech ──────────────────────────────────────
  ('company','VN','0102246588', $n$Công ty Cổ phần Đào tạo Trực tuyến TOPICA$n$,              'topica edtech',                      'active'),
  ('company','VN','0301360827', $n$Hệ thống Giáo dục Equest$n$,                               'equest education',                   'active'),
  ('company','VN','0302027427', $n$Trung tâm Anh ngữ Hội Việt Mỹ$n$,                          'vus viet my',                        'active'),
  ('company','VN','0100142799', $n$Công ty Cổ phần Sách và Thiết bị Trường học$n$,            'schoolbook thiet bi truong hoc',     'active'),

  -- ── Technology (additional) ─────────────────────────────────
  ('company','VN','0100686173', $n$Công ty Cổ phần ELCOM$n$,                                  'elcom corp elc',                     'active'),
  ('company','VN','0300710767', $n$Công ty Cổ phần Phần mềm TMA$n$,                           'tma solutions',                      'active'),
  ('company','VN','0309073696', $n$Công ty Cổ phần Giải pháp Công nghệ KMS$n$,                'kms technology',                     'active'),
  ('company','VN','0303388694', $n$Công ty Cổ phần Công nghệ Orient$n$,                       'orient software',                    'active'),
  ('company','VN','0100109264', $n$Tổng Công ty Truyền thông Đa phương tiện Việt Nam$n$,       'vtv cab vnpt media',                 'active'),

  -- ── Automotive / Industrial ─────────────────────────────────
  ('company','VN','0100107746', $n$Tổng Công ty Máy động lực và Máy nông nghiệp Việt Nam$n$,  'veam',                               'active'),
  ('company','VN','0100104027', $n$Công ty TNHH Ford Việt Nam$n$,                             'ford vietnam',                       'active'),
  ('company','VN','0301220956', $n$Công ty TNHH Yamaha Motor Việt Nam$n$,                     'yamaha motor vietnam',               'active'),

  -- ── Additional (reach 200 total) ────────────────────────────
  ('company','VN','0100100826', $n$Tổng Công ty Cổ phần Bia - Rượu - Nước giải khát Hà Nội$n$,'habeco bia ha noi',                  'active'),
  ('company','VN','0101244889', $n$Công ty Cổ phần Phát triển Đô thị Kinh Bắc$n$,             'kinh bac city kbc',                  'active'),
  ('company','VN','0100107760', $n$Tổng Công ty Sông Đà$n$,                                   'song da corp sdc',                   'active'),
  ('company','VN','2800186534', $n$Công ty Cổ phần Mía đường Lam Sơn$n$,                      'lam son sugar lss',                  'active'),
  ('company','VN','0100107614', $n$Tổng Công ty Bưu điện Việt Nam$n$,                         'vietnam post vnpost',                'active'),
  ('company','VN','0400582940', $n$Công ty TNHH Lọc hóa dầu Bình Sơn$n$,                     'binh son refinery bsr',              'active'),
  ('company','VN','0102171398', $n$Công ty Cổ phần Tập đoàn Trung Nam$n$,                     'trung nam group',                    'active')

on conflict (country_code, tax_id) do nothing;

-- ── 2. Seed static facts ─────────────────────────────────────

do $$
declare
  src_id uuid := '00000000-0000-0000-0000-000000000001';
  e      jsonb;

  -- (mst, industry, sector, founding_year, approx_charter_capital_vnd)
  company_meta jsonb[] := array[
    -- Retail
    '{"mst":"0303005807","industry":"Retail","sector":"electronics_retail","founded":2004,"cap":14674000000000}'::jsonb,
    '{"mst":"0107631397","industry":"Retail","sector":"electronics_retail","founded":2012,"cap":1500000000000}'::jsonb,
    '{"mst":"0300521994","industry":"Retail","sector":"jewelry","founded":1988,"cap":2323000000000}'::jsonb,
    '{"mst":"0100107519","industry":"Energy","sector":"oil_gas_retail","founded":1956,"cap":12939000000000}'::jsonb,
    '{"mst":"0100107740","industry":"Retail","sector":"retail","founded":1986,"cap":1200000000000}'::jsonb,
    '{"mst":"0312036296","industry":"Retail","sector":"supermarket","founded":2011,"cap":2400000000000}'::jsonb,
    -- Aviation
    '{"mst":"0302715669","industry":"Aviation","sector":"airline","founded":2007,"cap":4020000000000}'::jsonb,
    '{"mst":"0800964340","industry":"Aviation","sector":"airline","founded":2017,"cap":7200000000000}'::jsonb,
    -- Construction / EPC
    '{"mst":"0301228158","industry":"Construction","sector":"epc","founded":2004,"cap":1600000000000}'::jsonb,
    '{"mst":"0102004940","industry":"Construction","sector":"geotechnical","founded":2004,"cap":2100000000000}'::jsonb,
    '{"mst":"0313726458","industry":"Construction","sector":"epc","founded":2009,"cap":1800000000000}'::jsonb,
    '{"mst":"0313248178","industry":"Construction","sector":"epc","founded":2010,"cap":500000000000}'::jsonb,
    '{"mst":"0400100557","industry":"Construction","sector":"infrastructure","founded":1984,"cap":1000000000000}'::jsonb,
    '{"mst":"0302093698","industry":"Construction","sector":"epc","founded":1993,"cap":1200000000000}'::jsonb,
    '{"mst":"0100106742","industry":"Real Estate","sector":"real_estate","founded":1974,"cap":3800000000000}'::jsonb,
    -- Telecom
    '{"mst":"0100687790","industry":"Telecom","sector":"telecom","founded":1995,"cap":17000000000000}'::jsonb,
    '{"mst":"0101696633","industry":"Telecom","sector":"telecom","founded":2007,"cap":1000000000000}'::jsonb,
    -- Agriculture / Aquaculture
    '{"mst":"2300138110","industry":"Agriculture","sector":"livestock","founded":1996,"cap":1500000000000}'::jsonb,
    '{"mst":"1300181327","industry":"F&B","sector":"seafood","founded":1997,"cap":2500000000000}'::jsonb,
    '{"mst":"0302427478","industry":"Agriculture","sector":"poultry","founded":1993,"cap":1000000000000}'::jsonb,
    '{"mst":"0300396265","industry":"F&B","sector":"seafood","founded":1996,"cap":1000000000000}'::jsonb,
    '{"mst":"0201337527","industry":"Agriculture","sector":"seafood","founded":2000,"cap":900000000000}'::jsonb,
    '{"mst":"3800238340","industry":"F&B","sector":"coffee","founded":1978,"cap":2200000000000}'::jsonb,
    -- Water / Utilities
    '{"mst":"0300537450","industry":"Utilities","sector":"water","founded":1954,"cap":1500000000000}'::jsonb,
    '{"mst":"0400100572","industry":"Utilities","sector":"water","founded":1977,"cap":640000000000}'::jsonb,
    '{"mst":"3700142938","industry":"Utilities","sector":"water","founded":1983,"cap":820000000000}'::jsonb,
    '{"mst":"0300537369","industry":"Utilities","sector":"water","founded":1981,"cap":480000000000}'::jsonb,
    '{"mst":"0800100050","industry":"Utilities","sector":"water","founded":1984,"cap":310000000000}'::jsonb,
    -- Tourism / Hospitality
    '{"mst":"0300579211","industry":"Tourism","sector":"travel_agency","founded":1995,"cap":710000000000}'::jsonb,
    '{"mst":"0500135196","industry":"Tourism","sector":"hospitality","founded":2000,"cap":8000000000000}'::jsonb,
    '{"mst":"0300487716","industry":"Tourism","sector":"travel_agency","founded":1990,"cap":200000000000}'::jsonb,
    '{"mst":"0300590419","industry":"Tourism","sector":"travel_agency","founded":1976,"cap":150000000000}'::jsonb,
    '{"mst":"0301301388","industry":"Tourism","sector":"travel_agency","founded":2004,"cap":100000000000}'::jsonb,
    -- Finance / NBFI
    '{"mst":"0101700819","industry":"Finance","sector":"consumer_finance","founded":2010,"cap":10928000000000}'::jsonb,
    '{"mst":"0302200714","industry":"Finance","sector":"consumer_finance","founded":2009,"cap":4000000000000}'::jsonb,
    '{"mst":"0107268396","industry":"Finance","sector":"consumer_finance","founded":2017,"cap":1500000000000}'::jsonb,
    '{"mst":"0300595245","industry":"Finance","sector":"consumer_finance","founded":2005,"cap":1540000000000}'::jsonb,
    '{"mst":"0102716928","industry":"Finance","sector":"payment","founded":2004,"cap":1500000000000}'::jsonb,
    -- Insurance (additional)
    '{"mst":"0100112946","industry":"Insurance","sector":"insurance","founded":1996,"cap":2000000000000}'::jsonb,
    '{"mst":"0100100885","industry":"Insurance","sector":"insurance","founded":1996,"cap":1400000000000}'::jsonb,
    '{"mst":"0100114740","industry":"Insurance","sector":"insurance","founded":1996,"cap":1200000000000}'::jsonb,
    '{"mst":"0100107709","industry":"Insurance","sector":"insurance","founded":1995,"cap":800000000000}'::jsonb,
    -- Healthcare
    '{"mst":"0302267428","industry":"Healthcare","sector":"hospital","founded":1997,"cap":2500000000000}'::jsonb,
    '{"mst":"0102138988","industry":"Healthcare","sector":"diagnostics","founded":1999,"cap":400000000000}'::jsonb,
    '{"mst":"0107365930","industry":"Healthcare","sector":"hospital","founded":2006,"cap":1800000000000}'::jsonb,
    '{"mst":"0107152760","industry":"Healthcare","sector":"hospital","founded":2008,"cap":700000000000}'::jsonb,
    '{"mst":"0312072558","industry":"Healthcare","sector":"hospital","founded":2010,"cap":2800000000000}'::jsonb,
    -- Textile / Garment
    '{"mst":"0100103653","industry":"Manufacturing","sector":"textile","founded":1995,"cap":5000000000000}'::jsonb,
    '{"mst":"0100186074","industry":"Manufacturing","sector":"garment","founded":1946,"cap":500000000000}'::jsonb,
    '{"mst":"0300361698","industry":"Manufacturing","sector":"textile","founded":1967,"cap":770000000000}'::jsonb,
    '{"mst":"0300361680","industry":"Manufacturing","sector":"garment","founded":1975,"cap":320000000000}'::jsonb,
    '{"mst":"4600358840","industry":"Manufacturing","sector":"garment","founded":1979,"cap":480000000000}'::jsonb,
    -- Mining / Minerals
    '{"mst":"0302054534","industry":"Mining","sector":"aggregates","founded":2000,"cap":280000000000}'::jsonb,
    '{"mst":"0200120041","industry":"Mining","sector":"coal","founded":1965,"cap":350000000000}'::jsonb,
    '{"mst":"0106891658","industry":"Mining","sector":"mineral","founded":2011,"cap":150000000000}'::jsonb,
    '{"mst":"2800100196","industry":"Mining","sector":"coal","founded":1986,"cap":200000000000}'::jsonb,
    -- Education / EdTech
    '{"mst":"0102246588","industry":"Education","sector":"edtech","founded":2009,"cap":300000000000}'::jsonb,
    '{"mst":"0301360827","industry":"Education","sector":"education","founded":2004,"cap":500000000000}'::jsonb,
    '{"mst":"0302027427","industry":"Education","sector":"language_training","founded":1997,"cap":80000000000}'::jsonb,
    '{"mst":"0100142799","industry":"Education","sector":"education","founded":1991,"cap":150000000000}'::jsonb,
    -- Technology (additional)
    '{"mst":"0100686173","industry":"Technology","sector":"telecom_equipment","founded":1995,"cap":500000000000}'::jsonb,
    '{"mst":"0300710767","industry":"Technology","sector":"software_outsourcing","founded":1997,"cap":120000000000}'::jsonb,
    '{"mst":"0309073696","industry":"Technology","sector":"software_outsourcing","founded":2009,"cap":100000000000}'::jsonb,
    '{"mst":"0303388694","industry":"Technology","sector":"software_outsourcing","founded":2005,"cap":90000000000}'::jsonb,
    '{"mst":"0100109264","industry":"Technology","sector":"media_telecom","founded":2007,"cap":800000000000}'::jsonb,
    -- Automotive / Industrial
    '{"mst":"0100107746","industry":"Automotive","sector":"industrial_equipment","founded":1990,"cap":1400000000000}'::jsonb,
    '{"mst":"0100104027","industry":"Automotive","sector":"automotive","founded":1995,"cap":1200000000000}'::jsonb,
    '{"mst":"0301220956","industry":"Automotive","sector":"motorcycle","founded":1998,"cap":3200000000000}'::jsonb,
    -- Additional
    '{"mst":"0100100826","industry":"F&B","sector":"beer","founded":1890,"cap":2400000000000}'::jsonb,
    '{"mst":"0101244889","industry":"Real Estate","sector":"industrial_zone","founded":2002,"cap":1800000000000}'::jsonb,
    '{"mst":"0100107760","industry":"Construction","sector":"infrastructure","founded":1974,"cap":3500000000000}'::jsonb,
    '{"mst":"2800186534","industry":"F&B","sector":"sugar","founded":1980,"cap":1200000000000}'::jsonb,
    '{"mst":"0100107614","industry":"Logistics","sector":"postal","founded":1945,"cap":4800000000000}'::jsonb,
    '{"mst":"0400582940","industry":"Energy","sector":"refining","founded":2008,"cap":35000000000000}'::jsonb,
    '{"mst":"0102171398","industry":"Energy","sector":"renewable_energy","founded":2004,"cap":5000000000000}'::jsonb
  ];

begin
  foreach e in array company_meta loop
    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    select
      ent.id,
      fact.key,
      fact.value,
      src_id,
      0.8,
      now()
    from entities ent
    cross join (values
      ('industry',       to_jsonb(e->>'industry')),
      ('sector',         to_jsonb(e->>'sector')),
      ('founding_year',  to_jsonb((e->>'founded')::int)),
      ('charter_capital',to_jsonb((e->>'cap')::bigint))
    ) as fact(key, value)
    where ent.country_code = 'VN'
      and ent.tax_id = e->>'mst'
    on conflict (entity_id, key) do nothing;
  end loop;
end $$;

-- ── 3. Seed coverage rows ─────────────────────────────────────

insert into coverage (entity_id, source_type, status, checked_at)
select ent.id, src.source_type, src.status, now()
from entities ent
cross join (values
  ('static_seed','found'),
  ('dkkd',        'not_checked'),
  ('masothue',    'not_checked'),
  ('tavily',      'not_checked')
) as src(source_type, status)
where ent.country_code = 'VN'
  and ent.tax_id in (
    '0303005807','0107631397','0300521994','0100107519','0100107740','0312036296',
    '0302715669','0800964340',
    '0301228158','0102004940','0313726458','0313248178','0400100557','0302093698','0100106742',
    '0100687790','0101696633',
    '2300138110','1300181327','0302427478','0300396265','0201337527','3800238340',
    '0300537450','0400100572','3700142938','0300537369','0800100050',
    '0300579211','0500135196','0300487716','0300590419','0301301388',
    '0101700819','0302200714','0107268396','0300595245','0102716928',
    '0100112946','0100100885','0100114740','0100107709',
    '0302267428','0102138988','0107365930','0107152760','0312072558',
    '0100103653','0100186074','0300361698','0300361680','4600358840',
    '0302054534','0200120041','0106891658','2800100196',
    '0102246588','0301360827','0302027427','0100142799',
    '0100686173','0300710767','0309073696','0303388694','0100109264',
    '0100107746','0100104027','0301220956',
    '0100100826','0101244889','0100107760','2800186534','0100107614','0400582940','0102171398'
  )
on conflict (entity_id, source_type) do nothing;

-- ── 4. Seed stub company_reports ─────────────────────────────

insert into company_reports (entity_id, slug, payload, pipeline_version, expires_at, updated_at)
select
  ent.id,
  'vn-' || lower(regexp_replace(ent.canonical_name, '[^a-zA-Z0-9]+', '-', 'g'))
         || '-' || ent.tax_id,
  jsonb_build_object(
    'entity_id',    ent.id,
    'country_code', 'VN',
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
where ent.country_code = 'VN'
  and ent.tax_id in (
    '0303005807','0107631397','0300521994','0100107519','0100107740','0312036296',
    '0302715669','0800964340',
    '0301228158','0102004940','0313726458','0313248178','0400100557','0302093698','0100106742',
    '0100687790','0101696633',
    '2300138110','1300181327','0302427478','0300396265','0201337527','3800238340',
    '0300537450','0400100572','3700142938','0300537369','0800100050',
    '0300579211','0500135196','0300487716','0300590419','0301301388',
    '0101700819','0302200714','0107268396','0300595245','0102716928',
    '0100112946','0100100885','0100114740','0100107709',
    '0302267428','0102138988','0107365930','0107152760','0312072558',
    '0100103653','0100186074','0300361698','0300361680','4600358840',
    '0302054534','0200120041','0106891658','2800100196',
    '0102246588','0301360827','0302027427','0100142799',
    '0100686173','0300710767','0309073696','0303388694','0100109264',
    '0100107746','0100104027','0301220956',
    '0100100826','0101244889','0100107760','2800186534','0100107614','0400582940','0102171398'
  )
on conflict (entity_id) do nothing;

-- ── Verify ────────────────────────────────────────────────────
do $$
declare
  entity_count  int;
  fact_count    int;
  report_count  int;
begin
  select count(*) into entity_count  from entities       where country_code = 'VN';
  select count(*) into fact_count    from facts           where entity_id in (select id from entities where country_code = 'VN');
  select count(*) into report_count  from company_reports where entity_id in (select id from entities where country_code = 'VN');

  raise notice 'VN entities: % | facts: % | reports: %', entity_count, fact_count, report_count;
end $$;
