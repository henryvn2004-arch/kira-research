-- 058_econ_national.sql — Kira Data (D2): national statistics APIs.
--   data_sources.env_key        name of the Vercel environment variable a source needs (null = no key);
--                               the refresh job skips a source whose key is not set and reports it as "waiting for key".
--   econ_indicators.country_code  set for a national series that exists for one market only (null = all markets).
--   econ_indicators.params        adapter-specific selectors (dataset id, table path, filters), so a new series is a row, not code.
--   econ_flows                    bilateral trade: one row per reporter × partner × product × flow × period.
-- Idempotent.

alter table public.data_sources    add column if not exists env_key text;
alter table public.econ_indicators add column if not exists country_code text references public.tax_countries(code);
alter table public.econ_indicators add column if not exists params jsonb not null default '{}'::jsonb;

create table if not exists public.econ_flows (
  source_key    text not null references public.data_sources(key),
  reporter      text not null references public.tax_countries(code),   -- the market whose customs reported the flow
  partner       text not null,                                         -- ISO2 of the partner (any country), 'WLD' for the world total
  product       text not null default 'TOTAL',                         -- 'TOTAL' or an HS code (2/4/6 digits)
  flow          text not null check (flow in ('X','M')),               -- X = reporter's exports to partner, M = imports from partner
  freq          text not null check (freq in ('A','Q','M')),
  period        text not null,                                         -- '2025' | '2025-Q3' | '2025-09'
  value         double precision not null,
  currency      text not null,                                         -- as reported (USD, JPY, KRW, PHP, MYR, SGD, IDR ...)
  retrieved_at  timestamptz not null default now(),
  primary key (source_key, reporter, partner, product, flow, freq, period)
);
create index if not exists econ_flows_lookup_idx on public.econ_flows (reporter, partner, flow, period desc);
alter table public.econ_flows enable row level security;

-- Sources (licence register). `public` is only set on insert: the owner may switch it later.
insert into public.data_sources (key, name, url, licence, attribution, public, env_key, notes) values
  ('psa_openstat', 'Philippine Statistics Authority, OpenSTAT', 'https://openstat.psa.gov.ph',
   'CC BY (PSA Open Data Product Agreement)', 'Source: Philippine Statistics Authority (PSA); trade: PSA and Bureau of Customs', true, null,
   'PSA terms pages refuse automated reads; licence wording from their search snippets, 2026-10-14.'),
  ('boj', 'Bank of Japan, Time-Series Data Search', 'https://www.stat-search.boj.or.jp',
   'BoJ API terms: credit required, notify BoJ (post.rsd17@boj.or.jp) when the service is released',
   'This service uses the API provided by the "Bank of Japan Time-Series Data Search." The Bank of Japan does not guarantee the content of the service.', true, null, null),
  ('vn_nso', 'National Statistics Office of Viet Nam', 'https://www.nso.gov.vn',
   'Citation required (nso.gov.vn); no open licence published', 'Source: National Statistics Office of Viet Nam (www.nso.gov.vn)', true, null,
   'Statistics Law 89/2015 Art. 53; ask banbientap@nso.gov.vn if commercial reuse is questioned.'),
  ('opendosm', 'Department of Statistics Malaysia, OpenDOSM', 'https://data.gov.my',
   'CC BY 4.0', 'Source: Department of Statistics Malaysia (OpenDOSM), CC BY 4.0', true, null, null),
  ('bnm', 'Bank Negara Malaysia OpenAPI', 'https://www.bnm.gov.my/terms-of-use-bnm-datasets',
   'Terms of Use for BNM Datasets (commercial use allowed)', 'Source: Bank Negara Malaysia. Data and information are subject to Terms of Use for BNM Datasets.', true, null, null),
  ('singstat', 'Singapore Department of Statistics, SingStat Table Builder', 'https://data.gov.sg/open-data-licence',
   'Singapore Open Data Licence v1.0', 'Contains information from SingStat Table Builder, made available under the terms of the Singapore Open Data Licence version 1.0', true, null, null),
  ('estat', 'e-Stat (Japan): Trade Statistics, Ministry of Finance', 'https://www.e-stat.go.jp',
   'e-Stat terms: commercial use allowed with credit', 'Source: e-Stat (Portal Site of Official Statistics of Japan); Trade Statistics of Japan, Ministry of Finance', true, 'ESTAT_APP_ID', null),
  ('kr_customs', 'Korea Customs Service via data.go.kr', 'https://www.data.go.kr/data/15100475/openapi.do',
   'data.go.kr: no restriction on permitted use', 'Source: Korea Customs Service (data.go.kr)', true, 'DATA_GO_KR_KEY', null),
  ('bok_ecos', 'Bank of Korea, ECOS', 'https://ecos.bok.or.kr',
   'ECOS Open API terms (read when the key is issued)', 'Source: Bank of Korea, Economic Statistics System (ECOS)', false, 'ECOS_API_KEY',
   'Set public after reading the terms shown at key sign-up.'),
  ('bot', 'Bank of Thailand API', 'https://portal.api.bot.or.th',
   'BoT API terms (read when the key is issued)', 'Source: Bank of Thailand', false, 'BOT_API_TOKEN',
   'Set public after reading the terms shown at key sign-up; reply shape confirmed on the first run.')
on conflict (key) do update set name = excluded.name, url = excluded.url, licence = excluded.licence, attribution = excluded.attribution,
  env_key = excluded.env_key, notes = excluded.notes, updated_at = now();

-- National series (one market each). params.group lets pages treat e.g. every "policy rate" alike.
insert into public.econ_indicators (key, source_key, source_code, country_code, label, unit, freq, ord, params) values
  ('ph_gdp_growth_q', 'psa_openstat', '0022B5BEXQ2', 'PH', '{"en":"Real GDP growth (quarterly)","ja":"実質GDP成長率（四半期）","ko":"실질 GDP 성장률(분기)","zh":"实际GDP增长率（季度）"}', 'pct', 'Q', 300, '{"group":"gdp_growth_q"}'),
  ('ph_cpi_yoy', 'psa_openstat', '0012M4ACP23', 'PH', '{"en":"Inflation (monthly)","ja":"インフレ率（月次）","ko":"물가상승률(월간)","zh":"通胀率（月度）"}', 'pct', 'M', 310, '{"group":"cpi_yoy"}'),
  ('my_gdp_growth_q', 'opendosm', 'gdp_qtr_real', 'MY', '{"en":"Real GDP growth (quarterly)","ja":"実質GDP成長率（四半期）","ko":"실질 GDP 성장률(분기)","zh":"实际GDP增长率（季度）"}', 'pct', 'Q', 300, '{"group":"gdp_growth_q"}'),
  ('my_cpi_yoy', 'opendosm', 'cpi_headline_inflation', 'MY', '{"en":"Inflation (monthly)","ja":"インフレ率（月次）","ko":"물가상승률(월간)","zh":"通胀率（月度）"}', 'pct', 'M', 310, '{"group":"cpi_yoy"}'),
  ('my_ipi_yoy', 'opendosm', 'ipi', 'MY', '{"en":"Industrial production growth","ja":"鉱工業生産伸び率","ko":"산업생산 증가율","zh":"工业生产增长率"}', 'pct', 'M', 320, '{"group":"ipi_growth"}'),
  ('my_exports', 'opendosm', 'trade_headline', 'MY', '{"en":"Merchandise exports (monthly)","ja":"商品輸出（月次）","ko":"상품 수출(월간)","zh":"商品出口（月度）"}', 'lcu', 'M', 330, '{"group":"exports_m","currency":"MYR"}'),
  ('my_imports', 'opendosm', 'trade_headline', 'MY', '{"en":"Merchandise imports (monthly)","ja":"商品輸入（月次）","ko":"상품 수입(월간)","zh":"商品进口（月度）"}', 'lcu', 'M', 340, '{"group":"imports_m","currency":"MYR"}'),
  ('my_usdmyr', 'bnm', 'exchange-rate/USD', 'MY', '{"en":"Ringgit per US$ (monthly average)","ja":"リンギ／米ドル（月平均）","ko":"링깃/미 달러(월평균)","zh":"林吉特兑美元（月均）"}', 'lcu_per_usd', 'M', 350, '{"group":"fx_usd"}'),
  ('my_opr', 'bnm', 'opr', 'MY', '{"en":"Policy rate","ja":"政策金利","ko":"정책금리","zh":"政策利率"}', 'pct', 'M', 360, '{"group":"policy_rate"}'),
  ('sg_gdp_growth_q', 'singstat', 'M015631', 'SG', '{"en":"Real GDP growth (quarterly)","ja":"実質GDP成長率（四半期）","ko":"실질 GDP 성장률(분기)","zh":"实际GDP增长率（季度）"}', 'pct', 'Q', 300, '{"group":"gdp_growth_q"}'),
  ('sg_cpi_yoy', 'singstat', 'M213781', 'SG', '{"en":"Inflation (monthly)","ja":"インフレ率（月次）","ko":"물가상승률(월간)","zh":"通胀率（月度）"}', 'pct', 'M', 310, '{"group":"cpi_yoy"}'),
  ('jp_usdjpy', 'boj', 'FM08/FXERM07', 'JP', '{"en":"Yen per US$ (monthly average)","ja":"円／米ドル（月平均）","ko":"엔/미 달러(월평균)","zh":"日元兑美元（月均）"}', 'lcu_per_usd', 'M', 350, '{"group":"fx_usd"}'),
  ('jp_call_rate', 'boj', 'FM02/STRACLUCON', 'JP', '{"en":"Policy rate (overnight call rate)","ja":"政策金利（無担保コール翌日物）","ko":"정책금리(무담보 콜 익일물)","zh":"政策利率（无担保隔夜拆借利率）"}', 'pct', 'M', 360, '{"group":"policy_rate"}'),
  ('kr_usdkrw', 'bok_ecos', '731Y004', 'KR', '{"en":"Won per US$ (monthly average)","ja":"ウォン／米ドル（月平均）","ko":"원/미 달러(월평균)","zh":"韩元兑美元（月均）"}', 'lcu_per_usd', 'M', 350, '{"group":"fx_usd"}'),
  ('kr_base_rate', 'bok_ecos', '722Y001', 'KR', '{"en":"Policy rate","ja":"政策金利","ko":"기준금리","zh":"政策利率"}', 'pct', 'M', 360, '{"group":"policy_rate"}'),
  ('kr_cpi_yoy', 'bok_ecos', '901Y009', 'KR', '{"en":"Inflation (monthly)","ja":"インフレ率（月次）","ko":"물가상승률(월간)","zh":"通胀率（月度）"}', 'pct', 'M', 310, '{"group":"cpi_yoy"}'),
  ('th_usdthb', 'bot', 'MONTHLY_AVG_EXG_RATE', 'TH', '{"en":"Baht per US$ (monthly average)","ja":"バーツ／米ドル（月平均）","ko":"바트/미 달러(월평균)","zh":"泰铢兑美元（月均）"}', 'lcu_per_usd', 'M', 350, '{"group":"fx_usd"}'),
  ('th_policy_rate', 'bot', 'policy_rate', 'TH', '{"en":"Policy rate","ja":"政策金利","ko":"정책금리","zh":"政策利率"}', 'pct', 'M', 360, '{"group":"policy_rate"}'),
  ('vn_ipi_growth', 'vn_nso', 'V07.02', 'VN', '{"en":"Industrial production growth","ja":"鉱工業生産伸び率","ko":"산업생산 증가율","zh":"工业生产增长率"}', 'pct', 'A', 320, '{"group":"ipi_growth"}'),
  ('vn_wage_all', 'vn_nso', 'V05.33', 'VN', '{"en":"Average monthly income, enterprise workers","ja":"企業従業員の平均月収","ko":"기업 근로자 월평균 소득","zh":"企业职工月均收入"}', 'lcu', 'A', 370, '{"group":"wage","currency":"VND"}'),
  ('vn_wage_foreign', 'vn_nso', 'V05.33', 'VN', '{"en":"Average monthly income, foreign-owned enterprises","ja":"外資100%企業の平均月収","ko":"외국인 투자기업 월평균 소득","zh":"外商独资企业月均收入"}', 'lcu', 'A', 380, '{"group":"wage_foreign","currency":"VND"}'),
  ('vn_urban_pop', 'vn_nso', 'V02.03-07', 'VN', '{"en":"Urban population (people)","ja":"都市人口（人）","ko":"도시 인구(명)","zh":"城镇人口（人）"}', 'people', 'A', 390, '{"group":"urban_pop"}')
on conflict (key) do update set source_key = excluded.source_key, source_code = excluded.source_code, country_code = excluded.country_code,
  label = excluded.label, unit = excluded.unit, freq = excluded.freq, ord = excluded.ord, params = excluded.params;
