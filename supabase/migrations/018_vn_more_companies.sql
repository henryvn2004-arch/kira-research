-- ============================================================
-- KIRA RESEARCH — migration 018: Seed additional VN companies
-- Sprint 2: ~100 more curated VN entities across all major sectors
--
-- Target: 125 total (25 from 017 + 100 here)
-- Sources: HOSE/HNX public filings, ĐKKD portal (public MSTs)
-- Confidence: 0.8 static seed, vn_dkkd + vn_masothue connectors
--   will update to 0.9-1.0 on first pipeline run.
--
-- Idempotent: ON CONFLICT DO NOTHING throughout.
-- Run AFTER migrations 016 + 017.
-- ============================================================

-- ── 1. Seed entities ────────────────────────────────────────

insert into entities (type, country_code, tax_id, canonical_name, name_norm, status_cache)
values
  -- ── Banking ─────────────────────────────────────────────
  ('company','VN','0100111948', $n$Ngân hàng Thương mại Cổ phần Công Thương Việt Nam$n$,     'vietinbank ctg',           'active'),
  ('company','VN','0100370753', $n$Ngân hàng Thương mại Cổ phần Quân đội$n$,                 'mb bank mbb',              'active'),
  ('company','VN','0100233583', $n$Ngân hàng Thương mại Cổ phần Việt Nam Thịnh Vượng$n$,     'vpbank vpb',               'active'),
  ('company','VN','0301452871', $n$Ngân hàng Thương mại Cổ phần Á Châu$n$,                   'acb',                      'active'),
  ('company','VN','0301103908', $n$Ngân hàng Thương mại Cổ phần Sài Gòn Thương Tín$n$,       'sacombank stb',            'active'),
  ('company','VN','0300852898', $n$Ngân hàng Thương mại Cổ phần Phát triển Thành phố Hồ Chí Minh$n$, 'hdbank hdb',      'active'),
  ('company','VN','0102112399', $n$Ngân hàng Thương mại Cổ phần Bưu điện Liên Việt$n$,       'lpbank lpb',               'active'),
  ('company','VN','0100548715', $n$Ngân hàng Thương mại Cổ phần Sài Gòn - Hà Nội$n$,         'shb',                      'active'),
  ('company','VN','0100686174', $n$Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam$n$, 'agribank',                 'active'),
  ('company','VN','0100978365', $n$Ngân hàng Thương mại Cổ phần Đông Nam Á$n$,               'seabank ssb',              'active'),
  ('company','VN','0101248154', $n$Ngân hàng Thương mại Cổ phần Tiên Phong$n$,               'tpbank tpb',               'active'),
  ('company','VN','0100289549', $n$Ngân hàng Thương mại Cổ phần Hàng Hải Việt Nam$n$,        'msb maritime bank',        'active'),
  ('company','VN','0100238173', $n$Ngân hàng Thương mại Cổ phần Quốc Tế Việt Nam$n$,         'vib',                      'active'),
  ('company','VN','0300403452', $n$Ngân hàng Thương mại Cổ phần Xuất nhập khẩu Việt Nam$n$,  'eximbank eib',             'active'),

  -- ── Insurance ───────────────────────────────────────────
  ('company','VN','0100111761', $n$Tập đoàn Bảo Việt$n$,                                     'bao viet bvh',             'active'),
  ('company','VN','0300116899', $n$Tổng Công ty Cổ phần Bảo Minh$n$,                         'bao minh bmi',             'active'),

  -- ── Real Estate ─────────────────────────────────────────
  ('company','VN','0301228132', $n$Công ty Cổ phần Tập đoàn Địa ốc Nova$n$,                  'novaland nvl',             'active'),
  ('company','VN','0301053716', $n$Công ty Cổ phần Đầu tư Nam Long$n$,                       'nam long nlg',             'active'),
  ('company','VN','0306810604', $n$Công ty Cổ phần Tập đoàn Đất Xanh$n$,                     'dat xanh dxg',             'active'),
  ('company','VN','0300578180', $n$Công ty Cổ phần Nhà Khang Điền$n$,                        'khang dien kdh',           'active'),
  ('company','VN','0300411435', $n$Công ty Cổ phần Đầu tư Phát triển Xây dựng$n$,            'dig corp',                 'active'),
  ('company','VN','3700413576', $n$Công ty Cổ phần Becamex IDC$n$,                           'becamex bcm',              'active'),
  ('company','VN','0301130889', $n$Công ty Cổ phần Phát triển Nhà Thủ Đức$n$,                'thu duc housing tdh',       'active'),
  ('company','VN','0101282248', $n$Công ty Cổ phần Tập đoàn Hà Đô$n$,                       'ha do group hdg',          'active'),
  ('company','VN','0101278914', $n$Công ty Cổ phần Văn Phú - Invest$n$,                      'van phu invest vpi',       'active'),
  ('company','VN','3700462005', $n$Công ty Cổ phần Sonadezi$n$,                              'sonadezi',                 'active'),

  -- ── Consumer / Retail ───────────────────────────────────
  ('company','VN','0305050084', $n$Công ty Cổ phần Ô tô Trường Hải$n$,                       'truong hai thaco',         'active'),
  ('company','VN','0301185765', $n$Công ty Cổ phần Tập đoàn KIDO$n$,                         'kido kdc',                 'active'),
  ('company','VN','0301317909', $n$Công ty Cổ phần Tập đoàn PAN$n$,                          'pan group pan',            'active'),
  ('company','VN','0300344803', $n$Liên hiệp Hợp tác xã Thương mại Thành phố Hồ Chí Minh$n$,'saigon coop',              'active'),
  ('company','VN','0300103478', $n$Tổng Công ty Cổ phần Công nghiệp Thực phẩm Sài Gòn$n$,    'vissan',                   'active'),
  ('company','VN','0300338948', $n$Tổng Công ty Thương mại Sài Gòn$n$,                       'satra',                    'active'),

  -- ── Food / Agriculture / Seafood ────────────────────────
  ('company','VN','1400140141', $n$Công ty Cổ phần Vĩnh Hoàn$n$,                             'vinh hoan vhc',            'active'),
  ('company','VN','0102116630', $n$Công ty Cổ phần Tập đoàn Thủy sản Minh Phú$n$,            'minh phu seafood mpc',     'active'),
  ('company','VN','1600168844', $n$Công ty Cổ phần Tập đoàn Lộc Trời$n$,                     'loc troi ltg',             'active'),
  ('company','VN','0301472573', $n$Công ty Cổ phần IDI$n$,                                   'idi international',        'active'),
  ('company','VN','1800313250', $n$Công ty Cổ phần Nam Việt$n$,                              'nam viet anv',             'active'),
  ('company','VN','4300348461', $n$Công ty Cổ phần Đường Quảng Ngãi$n$,                      'duong quang ngai qns',     'active'),
  ('company','VN','0305005876', $n$Công ty Cổ phần Dinh dưỡng Nông nghiệp Quốc tế$n$,        'nutifood',                 'active'),
  ('company','VN','4000451948', $n$Công ty Cổ phần Sữa TH$n$,                                'th true milk',             'active'),
  ('company','VN','0304612525', $n$Công ty Cổ phần Masan MEATLife$n$,                         'masan meatlife mml',       'active'),
  ('company','VN','0301209843', $n$Công ty Cổ phần Bibica$n$,                                'bibica bbc',               'active'),
  ('company','VN','0301481852', $n$Công ty Cổ phần TTC Biên Hòa$n$,                          'ttc bien hoa sbt',         'active'),

  -- ── Pharma / Healthcare ─────────────────────────────────
  ('company','VN','1500100063', $n$Công ty Cổ phần Dược Hậu Giang$n$,                        'dhg pharma dhg',           'active'),
  ('company','VN','0100106773', $n$Công ty Cổ phần Traphaco$n$,                              'traphaco tra',             'active'),
  ('company','VN','1800182506', $n$Công ty Cổ phần Dược Bình Định - Imexpharm$n$,             'imexpharm imp',            'active'),
  ('company','VN','0300403578', $n$Công ty Cổ phần Xuất nhập khẩu Y tế Đồng Tháp$n$,         'domesco dmc',              'active'),
  ('company','VN','0300100016', $n$Công ty Cổ phần Dược phẩm OPC$n$,                         'opc pharma',               'active'),
  ('company','VN','0800100012', $n$Công ty Cổ phần Pymepharco$n$,                            'pymepharco',               'active'),

  -- ── Technology / Digital ────────────────────────────────
  ('company','VN','0308532789', $n$Công ty Cổ phần VNG$n$,                                   'vng corp',                 'active'),
  ('company','VN','0308128498', $n$Công ty Cổ phần Dịch vụ Di động Trực tuyến$n$,             'momo m service',           'active'),
  ('company','VN','0101243426', $n$Công ty Cổ phần MISA$n$,                                  'misa',                     'active'),
  ('company','VN','0100109937', $n$Tập đoàn Công nghệ CMC$n$,                                'cmc corp',                 'active'),
  ('company','VN','0107270888', $n$Công ty Cổ phần Giải pháp Thanh toán Việt Nam$n$,          'vnpay',                    'active'),
  ('company','VN','0100686141', $n$Công ty Cổ phần Viễn thông FPT$n$,                        'fpt telecom',              'active'),
  ('company','VN','0102546826', $n$Công ty Cổ phần Truyền thông VCCorp$n$,                   'vccorp',                   'active'),

  -- ── Logistics / Shipping ────────────────────────────────
  ('company','VN','0300321791', $n$Công ty Cổ phần Gemadept$n$,                              'gemadept gmd',             'active'),
  ('company','VN','0300562386', $n$Công ty Cổ phần Transimex$n$,                             'transimex tms',            'active'),
  ('company','VN','0100234888', $n$Tổng Công ty Cổ phần Hàng hải Việt Nam$n$,                'vimc vinalines',           'active'),
  ('company','VN','0202227462', $n$Công ty Cổ phần Vận tải và Xếp dỡ Hải An$n$,              'hai an transport hah',     'active'),
  ('company','VN','0100113140', $n$Công ty Cổ phần Vận tải Dầu khí$n$,                       'pv trans pvt',             'active'),
  ('company','VN','0303735376', $n$Công ty Cổ phần Tân Cảng - Indo Trans Logistics$n$,       'indo trans logistics itl', 'active'),
  ('company','VN','0304143605', $n$Công ty Cổ phần Thế giới Số$n$,                           'digiworld dgw',            'active'),

  -- ── Manufacturing / Building Materials ──────────────────
  ('company','VN','0101239826', $n$Công ty Cổ phần Vicostone$n$,                             'vicostone vcs',            'active'),
  ('company','VN','0100107773', $n$Công ty Cổ phần Vinaconex$n$,                             'vinaconex vcg',            'active'),
  ('company','VN','0300395985', $n$Công ty Cổ phần Cơ Điện Lạnh$n$,                          'ree corp ree',             'active'),
  ('company','VN','0200406512', $n$Công ty Cổ phần Nhựa Thiếu niên Tiền Phong$n$,             'tien phong plastic ntp',   'active'),
  ('company','VN','0100101061', $n$Tổng Công ty Viglacera$n$,                                'viglacera vgc',            'active'),
  ('company','VN','0100114038', $n$Công ty Cổ phần Đầu tư và Phát triển Công nghiệp Idico$n$,'idico',                    'active'),
  ('company','VN','0302099982', $n$Công ty Cổ phần Xây dựng Hòa Bình$n$,                     'hoa binh construction hbc','active'),
  ('company','VN','0302031565', $n$Công ty Cổ phần Đầu tư Hạ tầng Kỹ thuật TP.HCM$n$,       'cii infrastructure',       'active'),
  ('company','VN','0302040001', $n$Công ty Cổ phần Nhựa Bình Minh$n$,                        'binh minh plastic bmp',    'active'),
  ('company','VN','0101210753', $n$Công ty Cổ phần Quốc tế Sơn Hà$n$,                       'son ha international shi', 'active'),
  ('company','VN','0100110680', $n$Công ty Cổ phần Bóng đèn Phích nước Rạng Đông$n$,          'rang dong ral',            'active'),
  ('company','VN','0100101029', $n$Công ty Cổ phần Xây dựng số 1$n$,                         'cc1',                      'active'),

  -- ── Steel / Chemicals / Energy ──────────────────────────
  ('company','VN','0305105290', $n$Công ty Cổ phần Tập đoàn Hoa Sen$n$,                      'hoa sen group hsg',        'active'),
  ('company','VN','0306007264', $n$Công ty Cổ phần Thép Nam Kim$n$,                          'nam kim steel nkg',        'active'),
  ('company','VN','0305066586', $n$Công ty Cổ phần Thép Pomina$n$,                           'pomina steel pom',         'active'),
  ('company','VN','0101243296', $n$Công ty Cổ phần Tập đoàn Hóa chất Đức Giang$n$,           'duc giang chemical dgc',   'active'),
  ('company','VN','2300474807', $n$Công ty Cổ phần Điện lực Dầu khí Việt Nam$n$,              'petrovietnam power pow',   'active'),
  ('company','VN','0600304285', $n$Công ty Cổ phần Nhiệt điện Phả Lại$n$,                    'pha lai power ppc',        'active'),
  ('company','VN','0100113151', $n$Tổng Công ty Phân bón và Hóa chất Dầu khí$n$,              'petrovietnam fertilizer dpn', 'active'),
  ('company','VN','2000823233', $n$Công ty Cổ phần Phân bón Dầu khí Cà Mau$n$,               'phan bon ca mau dcm',      'active'),
  ('company','VN','0100109734', $n$Tổng Công ty Khí Việt Nam$n$,                             'pvgas gas',                'active'),

  -- ── Securities / Finance ────────────────────────────────
  ('company','VN','0100562328', $n$Công ty Cổ phần Chứng khoán SSI$n$,                       'ssi securities',           'active'),
  ('company','VN','0100233483', $n$Công ty Cổ phần Chứng khoán VNDirect$n$,                  'vndirect securities vnd',  'active'),
  ('company','VN','0301367218', $n$Công ty Cổ phần Chứng khoán Bản Việt$n$,                  'vcsc ban viet securities', 'active'),
  ('company','VN','0302257138', $n$Công ty Cổ phần Chứng khoán TP.HCM$n$,                    'hcm securities',           'active'),
  ('company','VN','0301252843', $n$Công ty Cổ phần Chứng khoán Rồng Việt$n$,                 'rong viet securities vdsc','active'),

  -- ── Rubber / Agriculture ────────────────────────────────
  ('company','VN','0301250969', $n$Tập đoàn Công nghiệp Cao su Việt Nam$n$,                  'vietnam rubber group vrg gvr', 'active'),
  ('company','VN','3700239042', $n$Công ty Cổ phần Cao su Đồng Phú$n$,                       'dong phu rubber dpr',      'active'),
  ('company','VN','3700237793', $n$Công ty Cổ phần Cao su Phước Hòa$n$,                      'phuoc hoa rubber phr',     'active'),
  ('company','VN','3800237840', $n$Công ty Cổ phần Cao su Tây Ninh$n$,                       'tay ninh rubber tnc',      'active'),

  -- ── Aviation / Infrastructure / Mining / Other ──────────
  ('company','VN','0103529810', $n$Tổng Công ty Cảng Hàng không Việt Nam - Công ty Cổ phần$n$,'acv airports vietnam',    'active'),
  ('company','VN','0500458494', $n$Công ty Cổ phần Quốc tế Hoàng Anh Gia Lai$n$,             'hagl hoang anh gia lai',   'active'),
  ('company','VN','1000587987', $n$Tập đoàn Công nghiệp Than - Khoáng sản Việt Nam$n$,        'vinacomin tkv',            'active'),
  ('company','VN','0300271339', $n$Công ty Cổ phần Du lịch Thành phố Hồ Chí Minh$n$,          'saigontourist',            'active'),
  ('company','VN','0100107659', $n$Công ty TNHH MTV Xuất nhập khẩu Intimex$n$,                'intimex group',            'active'),
  ('company','VN','0100108661', $n$Công ty Cổ phần GTNFoods$n$,                              'gtnfoods gtn',             'active'),
  ('company','VN','0300117344', $n$Công ty Cổ phần Công nghiệp Thực phẩm Vifon$n$,            'vifon',                    'active')

on conflict (country_code, tax_id) do nothing;

-- ── 2. Seed static facts ────────────────────────────────────

do $$
declare
  src_id uuid := '00000000-0000-0000-0000-000000000001';
  e      record;

  -- (mst, industry, sector, founding_year, approx_charter_capital_vnd)
  company_meta jsonb[] := array[
    -- Banking
    '{"mst":"0100111948","industry":"Banking","sector":"banking","founded":1988,"cap":53700000000000}'::jsonb,
    '{"mst":"0100370753","industry":"Banking","sector":"banking","founded":1994,"cap":27988000000000}'::jsonb,
    '{"mst":"0100233583","industry":"Banking","sector":"banking","founded":1993,"cap":67434000000000}'::jsonb,
    '{"mst":"0301452871","industry":"Banking","sector":"banking","founded":1993,"cap":38840000000000}'::jsonb,
    '{"mst":"0301103908","industry":"Banking","sector":"banking","founded":1991,"cap":32616000000000}'::jsonb,
    '{"mst":"0300852898","industry":"Banking","sector":"banking","founded":1990,"cap":25000000000000}'::jsonb,
    '{"mst":"0102112399","industry":"Banking","sector":"banking","founded":2008,"cap":25576000000000}'::jsonb,
    '{"mst":"0100548715","industry":"Banking","sector":"banking","founded":1993,"cap":36459000000000}'::jsonb,
    '{"mst":"0100686174","industry":"Banking","sector":"banking","founded":1988,"cap":34000000000000}'::jsonb,
    '{"mst":"0100978365","industry":"Banking","sector":"banking","founded":1994,"cap":20000000000000}'::jsonb,
    '{"mst":"0101248154","industry":"Banking","sector":"banking","founded":2008,"cap":22000000000000}'::jsonb,
    '{"mst":"0100289549","industry":"Banking","sector":"banking","founded":1991,"cap":26000000000000}'::jsonb,
    '{"mst":"0100238173","industry":"Banking","sector":"banking","founded":1996,"cap":21069000000000}'::jsonb,
    '{"mst":"0300403452","industry":"Banking","sector":"banking","founded":1989,"cap":17468000000000}'::jsonb,
    -- Insurance
    '{"mst":"0100111761","industry":"Insurance","sector":"insurance","founded":1965,"cap":6804000000000}'::jsonb,
    '{"mst":"0300116899","industry":"Insurance","sector":"insurance","founded":1994,"cap":1500000000000}'::jsonb,
    -- Real Estate
    '{"mst":"0301228132","industry":"Real Estate","sector":"real_estate","founded":1992,"cap":17000000000000}'::jsonb,
    '{"mst":"0301053716","industry":"Real Estate","sector":"real_estate","founded":1992,"cap":3000000000000}'::jsonb,
    '{"mst":"0306810604","industry":"Real Estate","sector":"real_estate","founded":2003,"cap":8000000000000}'::jsonb,
    '{"mst":"0300578180","industry":"Real Estate","sector":"real_estate","founded":2001,"cap":4200000000000}'::jsonb,
    '{"mst":"0300411435","industry":"Real Estate","sector":"real_estate","founded":1990,"cap":3500000000000}'::jsonb,
    '{"mst":"3700413576","industry":"Real Estate","sector":"industrial_zone","founded":1976,"cap":4000000000000}'::jsonb,
    '{"mst":"0301130889","industry":"Real Estate","sector":"real_estate","founded":1990,"cap":1500000000000}'::jsonb,
    '{"mst":"0101282248","industry":"Real Estate","sector":"real_estate","founded":1990,"cap":3200000000000}'::jsonb,
    '{"mst":"0101278914","industry":"Real Estate","sector":"real_estate","founded":2005,"cap":2700000000000}'::jsonb,
    '{"mst":"3700462005","industry":"Real Estate","sector":"industrial_zone","founded":1989,"cap":2800000000000}'::jsonb,
    -- Consumer
    '{"mst":"0305050084","industry":"Automotive","sector":"automotive","founded":1997,"cap":8000000000000}'::jsonb,
    '{"mst":"0301185765","industry":"FMCG","sector":"fmcg","founded":1993,"cap":1807000000000}'::jsonb,
    '{"mst":"0301317909","industry":"FMCG","sector":"agri_food","founded":1998,"cap":1700000000000}'::jsonb,
    '{"mst":"0300344803","industry":"Retail","sector":"retail","founded":1989,"cap":4000000000000}'::jsonb,
    '{"mst":"0300103478","industry":"FMCG","sector":"meat_processing","founded":1970,"cap":450000000000}'::jsonb,
    '{"mst":"0300338948","industry":"Retail","sector":"retail","founded":1975,"cap":3200000000000}'::jsonb,
    -- Food / Seafood / Agri
    '{"mst":"1400140141","industry":"F&B","sector":"seafood","founded":1997,"cap":1800000000000}'::jsonb,
    '{"mst":"0102116630","industry":"F&B","sector":"seafood","founded":1992,"cap":2000000000000}'::jsonb,
    '{"mst":"1600168844","industry":"Agriculture","sector":"agri","founded":1994,"cap":2400000000000}'::jsonb,
    '{"mst":"0301472573","industry":"F&B","sector":"seafood","founded":2004,"cap":800000000000}'::jsonb,
    '{"mst":"1800313250","industry":"F&B","sector":"seafood","founded":1993,"cap":850000000000}'::jsonb,
    '{"mst":"4300348461","industry":"F&B","sector":"sugar","founded":1995,"cap":1900000000000}'::jsonb,
    '{"mst":"0305005876","industry":"F&B","sector":"dairy","founded":2000,"cap":600000000000}'::jsonb,
    '{"mst":"4000451948","industry":"F&B","sector":"dairy","founded":2008,"cap":5000000000000}'::jsonb,
    '{"mst":"0304612525","industry":"FMCG","sector":"meat_processing","founded":2015,"cap":2500000000000}'::jsonb,
    '{"mst":"0301209843","industry":"FMCG","sector":"food","founded":1999,"cap":500000000000}'::jsonb,
    '{"mst":"0301481852","industry":"F&B","sector":"sugar","founded":2010,"cap":2800000000000}'::jsonb,
    -- Pharma
    '{"mst":"1500100063","industry":"Healthcare","sector":"pharma","founded":1975,"cap":891000000000}'::jsonb,
    '{"mst":"0100106773","industry":"Healthcare","sector":"pharma","founded":1972,"cap":453000000000}'::jsonb,
    '{"mst":"1800182506","industry":"Healthcare","sector":"pharma","founded":1986,"cap":267000000000}'::jsonb,
    '{"mst":"0300403578","industry":"Healthcare","sector":"pharma","founded":1978,"cap":200000000000}'::jsonb,
    '{"mst":"0300100016","industry":"Healthcare","sector":"pharma","founded":1977,"cap":180000000000}'::jsonb,
    '{"mst":"0800100012","industry":"Healthcare","sector":"pharma","founded":1997,"cap":280000000000}'::jsonb,
    -- Technology
    '{"mst":"0308532789","industry":"Technology","sector":"technology","founded":2004,"cap":2500000000000}'::jsonb,
    '{"mst":"0308128498","industry":"Fintech","sector":"fintech","founded":2007,"cap":2200000000000}'::jsonb,
    '{"mst":"0101243426","industry":"Technology","sector":"software","founded":1994,"cap":350000000000}'::jsonb,
    '{"mst":"0100109937","industry":"Technology","sector":"technology","founded":1993,"cap":600000000000}'::jsonb,
    '{"mst":"0107270888","industry":"Fintech","sector":"fintech","founded":2007,"cap":1000000000000}'::jsonb,
    '{"mst":"0100686141","industry":"Telecommunications","sector":"telco","founded":1997,"cap":3000000000000}'::jsonb,
    '{"mst":"0102546826","industry":"Technology","sector":"media_tech","founded":2006,"cap":500000000000}'::jsonb,
    -- Logistics
    '{"mst":"0300321791","industry":"Logistics","sector":"logistics","founded":1990,"cap":1200000000000}'::jsonb,
    '{"mst":"0300562386","industry":"Logistics","sector":"logistics","founded":1995,"cap":800000000000}'::jsonb,
    '{"mst":"0100234888","industry":"Logistics","sector":"shipping","founded":1995,"cap":12000000000000}'::jsonb,
    '{"mst":"0202227462","industry":"Logistics","sector":"shipping","founded":1975,"cap":500000000000}'::jsonb,
    '{"mst":"0100113140","industry":"Logistics","sector":"shipping","founded":2002,"cap":1800000000000}'::jsonb,
    '{"mst":"0303735376","industry":"Logistics","sector":"logistics","founded":2002,"cap":600000000000}'::jsonb,
    '{"mst":"0304143605","industry":"Retail","sector":"electronics_dist","founded":2007,"cap":1000000000000}'::jsonb,
    -- Manufacturing
    '{"mst":"0101239826","industry":"Manufacturing","sector":"building_materials","founded":2001,"cap":1100000000000}'::jsonb,
    '{"mst":"0100107773","industry":"Construction","sector":"construction","founded":1988,"cap":2000000000000}'::jsonb,
    '{"mst":"0300395985","industry":"Manufacturing","sector":"mech_elec","founded":1977,"cap":940000000000}'::jsonb,
    '{"mst":"0200406512","industry":"Manufacturing","sector":"plastics","founded":1960,"cap":684000000000}'::jsonb,
    '{"mst":"0100101061","industry":"Manufacturing","sector":"building_materials","founded":1974,"cap":4800000000000}'::jsonb,
    '{"mst":"0100114038","industry":"Real Estate","sector":"industrial_zone","founded":1990,"cap":2000000000000}'::jsonb,
    '{"mst":"0302099982","industry":"Construction","sector":"construction","founded":1987,"cap":1700000000000}'::jsonb,
    '{"mst":"0302031565","industry":"Construction","sector":"infrastructure","founded":2001,"cap":2400000000000}'::jsonb,
    '{"mst":"0302040001","industry":"Manufacturing","sector":"plastics","founded":1977,"cap":557000000000}'::jsonb,
    '{"mst":"0101210753","industry":"Manufacturing","sector":"mech_elec","founded":2000,"cap":500000000000}'::jsonb,
    '{"mst":"0100110680","industry":"Manufacturing","sector":"electronics","founded":1958,"cap":288000000000}'::jsonb,
    '{"mst":"0100101029","industry":"Construction","sector":"construction","founded":1960,"cap":1500000000000}'::jsonb,
    -- Steel / Chemicals / Energy
    '{"mst":"0305105290","industry":"Steel","sector":"steel","founded":2001,"cap":6500000000000}'::jsonb,
    '{"mst":"0306007264","industry":"Steel","sector":"steel","founded":2002,"cap":2600000000000}'::jsonb,
    '{"mst":"0305066586","industry":"Steel","sector":"steel","founded":2000,"cap":2000000000000}'::jsonb,
    '{"mst":"0101243296","industry":"Chemicals","sector":"chemicals","founded":1988,"cap":2900000000000}'::jsonb,
    '{"mst":"2300474807","industry":"Energy","sector":"power","founded":2007,"cap":23418000000000}'::jsonb,
    '{"mst":"0600304285","industry":"Energy","sector":"power","founded":1998,"cap":1400000000000}'::jsonb,
    '{"mst":"0100113151","industry":"Chemicals","sector":"fertilizer","founded":2003,"cap":3800000000000}'::jsonb,
    '{"mst":"2000823233","industry":"Chemicals","sector":"fertilizer","founded":2011,"cap":3800000000000}'::jsonb,
    '{"mst":"0100109734","industry":"Energy","sector":"oil_gas","founded":1990,"cap":22800000000000}'::jsonb,
    -- Securities
    '{"mst":"0100562328","industry":"Finance","sector":"securities","founded":1999,"cap":2200000000000}'::jsonb,
    '{"mst":"0100233483","industry":"Finance","sector":"securities","founded":2006,"cap":5000000000000}'::jsonb,
    '{"mst":"0301367218","industry":"Finance","sector":"securities","founded":1999,"cap":4000000000000}'::jsonb,
    '{"mst":"0302257138","industry":"Finance","sector":"securities","founded":2000,"cap":2700000000000}'::jsonb,
    '{"mst":"0301252843","industry":"Finance","sector":"securities","founded":2006,"cap":1200000000000}'::jsonb,
    -- Rubber
    '{"mst":"0301250969","industry":"Agriculture","sector":"rubber","founded":1975,"cap":40000000000000}'::jsonb,
    '{"mst":"3700239042","industry":"Agriculture","sector":"rubber","founded":1975,"cap":1740000000000}'::jsonb,
    '{"mst":"3700237793","industry":"Agriculture","sector":"rubber","founded":1975,"cap":1200000000000}'::jsonb,
    '{"mst":"3800237840","industry":"Agriculture","sector":"rubber","founded":1975,"cap":970000000000}'::jsonb,
    -- Aviation / Infrastructure / Mining
    '{"mst":"0103529810","industry":"Aviation","sector":"aviation","founded":2012,"cap":21770000000000}'::jsonb,
    '{"mst":"0500458494","industry":"Agriculture","sector":"conglomerate","founded":1990,"cap":12700000000000}'::jsonb,
    '{"mst":"1000587987","industry":"Mining","sector":"mining","founded":1994,"cap":35000000000000}'::jsonb,
    '{"mst":"0300271339","industry":"Tourism","sector":"tourism","founded":1975,"cap":700000000000}'::jsonb,
    '{"mst":"0100107659","industry":"Retail","sector":"trading","founded":1967,"cap":600000000000}'::jsonb,
    '{"mst":"0100108661","industry":"F&B","sector":"dairy","founded":2005,"cap":500000000000}'::jsonb,
    '{"mst":"0300117344","industry":"FMCG","sector":"food","founded":1963,"cap":400000000000}'::jsonb
  ];
  m jsonb;
begin
  foreach m in array company_meta loop
    select id into e from entities
    where country_code = 'VN' and tax_id = m->>'mst';

    continue when not found;

    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    values (e.id, 'industry', to_jsonb(m->>'industry'), src_id, 0.8, now())
    on conflict (entity_id, key) do nothing;

    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    values (e.id, 'sector', to_jsonb(m->>'sector'), src_id, 0.8, now())
    on conflict (entity_id, key) do nothing;

    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    values (e.id, 'founding_year', (m->'founded'), src_id, 0.8, now())
    on conflict (entity_id, key) do nothing;

    insert into facts (entity_id, key, value, source_id, confidence, observed_at)
    values (e.id, 'charter_capital', (m->'cap'), src_id, 0.8, now())
    on conflict (entity_id, key) do nothing;

    insert into coverage (entity_id, source_type, status, checked_at)
    values (e.id, 'static_seed', 'found', now())
    on conflict (entity_id, source_type) do nothing;

    insert into coverage (entity_id, source_type, status, checked_at)
    values (e.id, 'dkkd', 'not_checked', now())
    on conflict (entity_id, source_type) do nothing;

    insert into coverage (entity_id, source_type, status, checked_at)
    values (e.id, 'masothue', 'not_checked', now())
    on conflict (entity_id, source_type) do nothing;

    insert into coverage (entity_id, source_type, status, checked_at)
    values (e.id, 'tavily', 'not_checked', now())
    on conflict (entity_id, source_type) do nothing;

  end loop;
end $$;

-- ── 3. Seed company_reports slugs ───────────────────────────

do $$
declare
  e         record;
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
        'coverage',     '{"dkkd":"not_checked","masothue":"not_checked","tavily":"not_checked","static_seed":"found"}'::jsonb,
        'facts',        '{}'::jsonb,
        'graph',        '[]'::jsonb,
        'narrative',    null,
        'generated_at', now_ts,
        'pipeline_ver', 1
      ),
      1,
      now_ts - interval '1 second'
    )
    on conflict (entity_id) do nothing;

  end loop;
end $$;

-- ── Verification ────────────────────────────────────────────
do $$
declare
  n_entities int;
  n_facts    int;
  n_reports  int;
begin
  select count(*) into n_entities from entities where country_code = 'VN';
  select count(*) into n_facts    from facts f join entities e on e.id = f.entity_id where e.country_code = 'VN';
  select count(*) into n_reports  from company_reports cr join entities e on e.id = cr.entity_id where e.country_code = 'VN';
  raise notice 'Seed 018 OK — VN entities: %, facts: %, reports: %', n_entities, n_facts, n_reports;
end $$;
