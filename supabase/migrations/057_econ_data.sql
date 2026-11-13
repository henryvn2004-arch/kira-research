-- 057_econ_data.sql — Kira Data (D1): free open data pulled by API.
--   data_sources    licence register: one row per source; only sources with public = true are shown on the site
--   econ_indicators catalogue of series, with labels in EN/JA/KO/ZH
--   econ_series     the numbers: one row per indicator × country × period × source
-- Written only by the server (service key): /api/cron-econ-refresh (weekly) and the backfill.
-- Read through /api/econ, which drops rows from non-public sources. RLS on, no policies.
-- Idempotent.

create table if not exists public.data_sources (
  key          text primary key,
  name         text not null,
  url          text,
  licence      text not null,
  attribution  text not null,            -- credit line printed under every block that uses the source
  public       boolean not null default false,
  notes        text,
  updated_at   timestamptz not null default now()
);

create table if not exists public.econ_indicators (
  key          text primary key,          -- KIRA key, e.g. gdp_usd
  source_key   text not null references public.data_sources(key),
  source_code  text not null,             -- code at the source, e.g. NY.GDP.MKTP.CD
  label        jsonb not null,            -- {"en":..,"ja":..,"ko":..,"zh":..}
  unit         text not null,             -- usd | pct | people | lcu_per_usd | usd_per_person
  freq         text not null default 'A' check (freq in ('A','Q','M')),
  ord          int not null default 0,
  active       boolean not null default true
);

create table if not exists public.econ_series (
  indicator_key text not null references public.econ_indicators(key) on delete cascade,
  country_code  text not null references public.tax_countries(code),
  period        text not null,            -- '2025' | '2025-Q3' | '2025-09'
  value         double precision not null,
  is_forecast   boolean not null default false,
  source_key    text not null references public.data_sources(key),
  vintage       text,                     -- e.g. WEO edition for forecasts
  retrieved_at  timestamptz not null default now(),
  primary key (indicator_key, country_code, period)
);
create index if not exists econ_series_country_idx on public.econ_series (country_code, indicator_key, period desc);

alter table public.data_sources    enable row level security;
alter table public.econ_indicators enable row level security;
alter table public.econ_series     enable row level security;

insert into public.data_sources (key, name, url, licence, attribution, public, notes) values
  ('worldbank_wdi', 'World Bank, World Development Indicators', 'https://datacatalog.worldbank.org/search/dataset/0037712',
   'CC BY 4.0', 'Source: World Bank, World Development Indicators (CC BY 4.0)', true,
   'Licence read on the data catalog page 2026-10-14. No Taiwan.'),
  ('imf_weo', 'IMF, World Economic Outlook', 'https://www.imf.org/external/datamapper',
   'IMF copyright; commercial reuse needs written permission', 'Source: International Monetary Fund, World Economic Outlook', false,
   'Kept internal until copyright@imf.org grants permission (owner action). Covers Taiwan and forecasts.')
on conflict (key) do update set name = excluded.name, url = excluded.url, licence = excluded.licence,
  attribution = excluded.attribution, notes = excluded.notes, updated_at = now();
-- `public` is not overwritten on re-run: the owner may have switched it after a permission arrived.

insert into public.econ_indicators (key, source_key, source_code, label, unit, freq, ord) values
  ('gdp_usd',          'worldbank_wdi', 'NY.GDP.MKTP.CD',    '{"en":"GDP","ja":"名目GDP","ko":"명목 GDP","zh":"国内生产总值"}', 'usd', 'A', 10),
  ('gdp_growth',       'worldbank_wdi', 'NY.GDP.MKTP.KD.ZG', '{"en":"Real GDP growth","ja":"実質GDP成長率","ko":"실질 GDP 성장률","zh":"实际GDP增长率"}', 'pct', 'A', 20),
  ('gdp_per_capita',   'worldbank_wdi', 'NY.GDP.PCAP.CD',    '{"en":"GDP per person","ja":"一人当たりGDP","ko":"1인당 GDP","zh":"人均GDP"}', 'usd_per_person', 'A', 30),
  ('household_spend',  'worldbank_wdi', 'NE.CON.PRVT.CD',    '{"en":"Household spending","ja":"家計消費支出","ko":"가계 소비지출","zh":"家庭消费支出"}', 'usd', 'A', 40),
  ('inflation',        'worldbank_wdi', 'FP.CPI.TOTL.ZG',    '{"en":"Inflation","ja":"インフレ率","ko":"물가상승률","zh":"通胀率"}', 'pct', 'A', 50),
  ('population',       'worldbank_wdi', 'SP.POP.TOTL',       '{"en":"Population","ja":"人口","ko":"인구","zh":"人口"}', 'people', 'A', 60),
  ('urban_share',      'worldbank_wdi', 'SP.URB.TOTL.IN.ZS', '{"en":"Urban population","ja":"都市人口比率","ko":"도시인구 비율","zh":"城镇人口比例"}', 'pct', 'A', 70),
  ('fdi_inflow',       'worldbank_wdi', 'BX.KLT.DINV.CD.WD', '{"en":"FDI net inflow","ja":"対内直接投資（純流入）","ko":"외국인직접투자 순유입","zh":"外国直接投资净流入"}', 'usd', 'A', 80),
  ('exports_usd',      'worldbank_wdi', 'NE.EXP.GNFS.CD',    '{"en":"Exports of goods and services","ja":"財・サービス輸出","ko":"재화·서비스 수출","zh":"货物和服务出口"}', 'usd', 'A', 90),
  ('imports_usd',      'worldbank_wdi', 'NE.IMP.GNFS.CD',    '{"en":"Imports of goods and services","ja":"財・サービス輸入","ko":"재화·서비스 수입","zh":"货物和服务进口"}', 'usd', 'A', 100),
  ('unemployment',     'worldbank_wdi', 'SL.UEM.TOTL.ZS',    '{"en":"Unemployment","ja":"失業率","ko":"실업률","zh":"失业率"}', 'pct', 'A', 110),
  ('internet_users',   'worldbank_wdi', 'IT.NET.USER.ZS',    '{"en":"Internet users","ja":"インターネット利用率","ko":"인터넷 이용률","zh":"互联网使用率"}', 'pct', 'A', 120),
  ('fx_lcu_usd',       'worldbank_wdi', 'PA.NUS.FCRF',       '{"en":"Exchange rate (local currency per US$)","ja":"為替レート（対米ドル）","ko":"환율(미 달러당 현지통화)","zh":"汇率（每美元兑本币）"}', 'lcu_per_usd', 'A', 130),
  ('imf_gdp_growth',   'imf_weo',       'NGDP_RPCH',         '{"en":"Real GDP growth (IMF)","ja":"実質GDP成長率（IMF）","ko":"실질 GDP 성장률(IMF)","zh":"实际GDP增长率（IMF）"}', 'pct', 'A', 200),
  ('imf_inflation',    'imf_weo',       'PCPIPCH',           '{"en":"Inflation (IMF)","ja":"インフレ率（IMF）","ko":"물가상승률(IMF)","zh":"通胀率（IMF）"}', 'pct', 'A', 210),
  ('imf_gdp_usd',      'imf_weo',       'NGDPD',             '{"en":"GDP (IMF)","ja":"名目GDP（IMF）","ko":"명목 GDP(IMF)","zh":"国内生产总值（IMF）"}', 'usd', 'A', 220),
  ('imf_gdp_per_capita','imf_weo',      'NGDPDPC',           '{"en":"GDP per person (IMF)","ja":"一人当たりGDP（IMF）","ko":"1인당 GDP(IMF)","zh":"人均GDP（IMF）"}', 'usd_per_person', 'A', 230),
  ('imf_population',   'imf_weo',       'LP',                '{"en":"Population (IMF)","ja":"人口（IMF）","ko":"인구(IMF)","zh":"人口（IMF）"}', 'people', 'A', 240)
on conflict (key) do update set source_key = excluded.source_key, source_code = excluded.source_code,
  label = excluded.label, unit = excluded.unit, freq = excluded.freq, ord = excluded.ord;
