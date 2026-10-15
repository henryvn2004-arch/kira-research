-- 061_registries.sql — Kira Data (D5): company registries + GLEIF.
--   entities.*            legal identity from registries: LEI (GLEIF), national number (UEN, ABN, NZBN, corporate
--                         number), legal name, status, founding date, parent and ultimate parent LEI.
--                         registry = what each source returned; registry_checked_at = last lookup (batch order).
--   company_groups        Japanese / Korean / Taiwanese groups we follow: a new company in one of the 15 markets
--                         whose name carries a group's token (whole words), or whose GLEIF ultimate parent is the
--                         group, becomes a draft "new subsidiary" move for the owner.
--   company_events.tier   adds 'registry' (a registry record, not a filing or an article).
-- Idempotent.

alter table public.entities add column if not exists lei text;
alter table public.entities add column if not exists legal_name text;
alter table public.entities add column if not exists reg_id text;
alter table public.entities add column if not exists reg_status text;
alter table public.entities add column if not exists founded date;
alter table public.entities add column if not exists parent_lei text;
alter table public.entities add column if not exists ultimate_parent_lei text;
alter table public.entities add column if not exists registry jsonb not null default '{}'::jsonb;
alter table public.entities add column if not exists registry_checked_at timestamptz;
create unique index if not exists entities_lei_uidx on public.entities (lei) where lei is not null;
create index if not exists entities_registry_checked_idx on public.entities (registry_checked_at nulls first);

alter table public.company_events drop constraint if exists company_events_tier_check;
alter table public.company_events add constraint company_events_tier_check check (tier in ('filing','release','news','registry'));

create table if not exists public.company_groups (
  key       text primary key,
  name      text not null,
  country   text not null,
  tokens    text[] not null,          -- upper case; matched as whole words in a company name
  lei       text,                     -- filled by the registry job
  active    boolean not null default true
);
alter table public.company_groups enable row level security;

insert into public.data_sources (key, name, url, licence, attribution, public, env_key, notes) values
  ('gleif', 'GLEIF, Global LEI Index (API)', 'https://www.gleif.org/en/lei-data/gleif-api',
   'CC0 1.0 (no restriction)', 'Source: Global Legal Entity Identifier Foundation (GLEIF), LEI data', true, null, 'About 60 requests a minute.'),
  ('acra', 'ACRA entities with a Unique Entity Number (data.gov.sg)', 'https://data.gov.sg/datasets/d_3f960c10fed6145404ca7b821f263b87/view',
   'Singapore Open Data Licence v1.0', 'Contains information from ACRA, made available on data.gov.sg under the Singapore Open Data Licence version 1.0', true, null, null),
  ('houjin_bangou', 'National Tax Agency Japan, Corporate Number Publication Site (Web-API)', 'https://www.houjin-bangou.nta.go.jp/webapi/',
   'NTA terms: credit required; the service is not guaranteed by the NTA', 'This service uses the API of the Corporate Number Publication Site of the National Tax Agency, but the service is not guaranteed by the National Tax Agency.', true, 'HOUJIN_BANGOU_APP_ID', 'Application ID issued after review (2-4 weeks).'),
  ('abn_lookup', 'Australian Business Register, ABN Lookup web services', 'https://abr.business.gov.au/Tools/WebServices',
   'ABN Lookup terms (free, credit)', 'Source: Australian Business Register (ABN Lookup)', true, 'ABN_GUID', null),
  ('nzbn', 'NZBN API, Ministry of Business, Innovation and Employment', 'https://api.business.govt.nz',
   'NZBN API terms (free)', 'Source: New Zealand Business Number register (MBIE)', true, 'NZBN_API_KEY', null)
on conflict (key) do update set name = excluded.name, url = excluded.url, licence = excluded.licence, attribution = excluded.attribution,
  env_key = excluded.env_key, notes = excluded.notes, updated_at = now();

insert into public.company_groups (key, name, country, tokens) values
  ('toyota', 'Toyota group', 'JP', '{TOYOTA}'), ('honda', 'Honda', 'JP', '{HONDA}'), ('nissan', 'Nissan', 'JP', '{NISSAN}'),
  ('suzuki', 'Suzuki', 'JP', '{SUZUKI}'), ('yamaha', 'Yamaha', 'JP', '{YAMAHA}'), ('denso', 'Denso', 'JP', '{DENSO}'),
  ('bridgestone', 'Bridgestone', 'JP', '{BRIDGESTONE}'), ('mitsubishi', 'Mitsubishi companies', 'JP', '{MITSUBISHI}'),
  ('mitsui', 'Mitsui companies', 'JP', '{MITSUI}'), ('sumitomo', 'Sumitomo companies', 'JP', '{SUMITOMO}'),
  ('marubeni', 'Marubeni', 'JP', '{MARUBENI}'), ('itochu', 'Itochu', 'JP', '{ITOCHU}'), ('sojitz', 'Sojitz', 'JP', '{SOJITZ}'),
  ('panasonic', 'Panasonic', 'JP', '{PANASONIC}'), ('sony', 'Sony', 'JP', '{SONY}'), ('hitachi', 'Hitachi', 'JP', '{HITACHI}'),
  ('toshiba', 'Toshiba', 'JP', '{TOSHIBA}'), ('canon', 'Canon', 'JP', '{CANON}'), ('daikin', 'Daikin', 'JP', '{DAIKIN}'),
  ('aeon', 'AEON', 'JP', '{AEON}'), ('fast_retailing', 'Fast Retailing (Uniqlo)', 'JP', '{UNIQLO,FAST RETAILING}'),
  ('ajinomoto', 'Ajinomoto', 'JP', '{AJINOMOTO}'), ('kirin', 'Kirin', 'JP', '{KIRIN}'), ('asahi', 'Asahi', 'JP', '{ASAHI}'),
  ('suntory', 'Suntory', 'JP', '{SUNTORY}'), ('nissin', 'Nissin Foods', 'JP', '{NISSIN FOODS}'), ('kao', 'Kao', 'JP', '{KAO}'),
  ('shiseido', 'Shiseido', 'JP', '{SHISEIDO}'), ('unicharm', 'Unicharm', 'JP', '{UNICHARM}'), ('ntt', 'NTT group', 'JP', '{NTT}'),
  ('kddi', 'KDDI', 'JP', '{KDDI}'), ('softbank', 'SoftBank', 'JP', '{SOFTBANK}'), ('rakuten', 'Rakuten', 'JP', '{RAKUTEN}'),
  ('orix', 'ORIX', 'JP', '{ORIX}'), ('mufg', 'MUFG', 'JP', '{MUFG}'), ('mizuho', 'Mizuho', 'JP', '{MIZUHO}'), ('smbc', 'SMBC group', 'JP', '{SMBC}'),
  ('nomura', 'Nomura', 'JP', '{NOMURA}'), ('daiwa', 'Daiwa', 'JP', '{DAIWA}'), ('tokio_marine', 'Tokio Marine', 'JP', '{TOKIO MARINE}'),
  ('sompo', 'Sompo', 'JP', '{SOMPO}'), ('dai_ichi', 'Dai-ichi Life', 'JP', '{DAI-ICHI LIFE}'), ('nippon_life', 'Nippon Life', 'JP', '{NIPPON LIFE}'),
  ('kokuyo', 'Kokuyo', 'JP', '{KOKUYO}'), ('obayashi', 'Obayashi', 'JP', '{OBAYASHI}'), ('kajima', 'Kajima', 'JP', '{KAJIMA}'),
  ('taisei', 'Taisei', 'JP', '{TAISEI}'), ('tokyu', 'Tokyu', 'JP', '{TOKYU}'), ('hankyu', 'Hankyu Hanshin', 'JP', '{HANKYU}'),
  ('samsung', 'Samsung', 'KR', '{SAMSUNG}'), ('hyundai', 'Hyundai companies', 'KR', '{HYUNDAI}'), ('kia', 'Kia', 'KR', '{KIA}'),
  ('lg', 'LG group', 'KR', '{LG ELECTRONICS,LG CHEM,LG ENERGY,LG DISPLAY,LG INNOTEK,LG H&H,LG CNS}'),
  ('sk', 'SK group', 'KR', '{SK HYNIX,SK ON,SK INNOVATION,SK TELECOM,SK E&S,SK ECOPLANT}'), ('lotte', 'Lotte', 'KR', '{LOTTE}'),
  ('cj', 'CJ group', 'KR', '{CJ CHEILJEDANG,CJ LOGISTICS,CJ CGV,CJ FOODS,CJ OLIVENETWORKS}'), ('posco', 'POSCO', 'KR', '{POSCO}'),
  ('hanwha', 'Hanwha', 'KR', '{HANWHA}'), ('gs', 'GS group', 'KR', '{GS CALTEX,GS RETAIL,GS E&C}'), ('doosan', 'Doosan', 'KR', '{DOOSAN}'),
  ('shinhan', 'Shinhan', 'KR', '{SHINHAN}'), ('kb', 'KB Financial', 'KR', '{KB KOOKMIN,KOOKMIN}'), ('hana', 'Hana Financial', 'KR', '{HANA FINANCIAL,KEB HANA,HANA BANK}'),
  ('woori', 'Woori', 'KR', '{WOORI}'), ('naver', 'Naver', 'KR', '{NAVER}'), ('kakao', 'Kakao', 'KR', '{KAKAO}'),
  ('amorepacific', 'Amorepacific', 'KR', '{AMOREPACIFIC}'), ('orion', 'Orion', 'KR', '{ORION FOOD,ORION CONFECTIONERY}'),
  ('nongshim', 'Nongshim', 'KR', '{NONGSHIM}'), ('hyosung', 'Hyosung', 'KR', '{HYOSUNG}'), ('hankook', 'Hankook Tire', 'KR', '{HANKOOK}'),
  ('coupang', 'Coupang', 'KR', '{COUPANG}'), ('emart', 'E-Mart', 'KR', '{EMART,E-MART}'),
  ('tsmc', 'TSMC', 'TW', '{TSMC,TAIWAN SEMICONDUCTOR}'), ('foxconn', 'Foxconn (Hon Hai)', 'TW', '{FOXCONN,HON HAI}'),
  ('pegatron', 'Pegatron', 'TW', '{PEGATRON}'), ('quanta', 'Quanta', 'TW', '{QUANTA COMPUTER}'), ('compal', 'Compal', 'TW', '{COMPAL}'),
  ('wistron', 'Wistron', 'TW', '{WISTRON}'), ('delta', 'Delta Electronics', 'TW', '{DELTA ELECTRONICS}'),
  ('formosa', 'Formosa Plastics group', 'TW', '{FORMOSA PLASTICS,NAN YA PLASTICS,FORMOSA HA TINH}'), ('uni_president', 'Uni-President', 'TW', '{UNI-PRESIDENT}'),
  ('cathay', 'Cathay Financial', 'TW', '{CATHAY UNITED,CATHAY LIFE}'), ('fubon', 'Fubon', 'TW', '{FUBON}'), ('ctbc', 'CTBC', 'TW', '{CTBC}'),
  ('esun', 'E.SUN', 'TW', '{E.SUN}'), ('acer', 'Acer', 'TW', '{ACER}'), ('asus', 'ASUS', 'TW', '{ASUS,ASUSTEK}'), ('mediatek', 'MediaTek', 'TW', '{MEDIATEK}'),
  ('yang_ming', 'Yang Ming', 'TW', '{YANG MING}'), ('lite_on', 'Lite-On', 'TW', '{LITE-ON}'), ('inventec', 'Inventec', 'TW', '{INVENTEC}')
on conflict (key) do update set name = excluded.name, country = excluded.country, tokens = excluded.tokens;
