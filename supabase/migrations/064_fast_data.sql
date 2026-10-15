-- 064_fast_data.sql — Kira Data: faster-moving series for the dashboard.
--   freq 'D' (daily, period 'YYYY-MM-DD') and 'H' (half-month, period 'YYYY-MM-H1' | 'YYYY-MM-H2')
--   ecb: ECB euro reference rates (every working day). KIRA turns them into local currency per US dollar
--        (rate of the currency per euro ÷ rate of the US dollar per euro). Covers JPY, KRW, IDR, THB, MYR, PHP, SGD,
--        AUD, NZD; not VND, TWD, KHR, LAK, MMK, BND.
--   Viet Nam Customs half-month releases ("Kỳ 1" = 1st–15th, "Kỳ 2" = 16th–end): total exports and imports.
-- Refreshed by the daily cron slot /api/cron-econ-refresh?source=daily. Idempotent.

alter table public.econ_indicators drop constraint if exists econ_indicators_freq_check;
alter table public.econ_indicators add constraint econ_indicators_freq_check check (freq in ('A','Q','M','H','D'));

insert into public.data_sources (key, name, url, licence, attribution, public, env_key, notes) values
  ('ecb', 'European Central Bank, euro foreign exchange reference rates', 'https://data.ecb.europa.eu/data/datasets/EXR',
   'ECB statistics: reuse free of charge with the source acknowledged', 'Source: European Central Bank, euro reference rates; US dollar cross rates computed by KIRA', true, null,
   'Data API data-api.ecb.europa.eu, no key. Published around 16:00 CET on TARGET working days.')
on conflict (key) do update set name = excluded.name, url = excluded.url, licence = excluded.licence,
  attribution = excluded.attribution, notes = excluded.notes, updated_at = now();

insert into public.econ_indicators (key, source_key, source_code, label, unit, freq, ord) values
  ('fx_usd_daily', 'ecb', 'EXR.D.*.EUR.SP00.A',
   '{"en":"Exchange rate, local currency per US$ (daily)","ja":"為替レート、対米ドル（日次）","ko":"환율, 미 달러당 현지통화(일간)","zh":"汇率，每美元兑本币（每日）"}', 'lcu_per_usd', 'D', 300),
  ('vn_exports_half', 'vn_customs', '1X(VN-SB)',
   '{"en":"Exports, every half month","ja":"輸出（半月ごと）","ko":"수출(반월)","zh":"出口（每半月）"}', 'usd', 'H', 310),
  ('vn_imports_half', 'vn_customs', '1N(VN-SB)',
   '{"en":"Imports, every half month","ja":"輸入（半月ごと）","ko":"수입(반월)","zh":"进口（每半月）"}', 'usd', 'H', 311)
on conflict (key) do update set source_key = excluded.source_key, source_code = excluded.source_code,
  label = excluded.label, unit = excluded.unit, freq = excluded.freq, ord = excluded.ord;

update public.econ_indicators set country_code = 'VN' where key in ('vn_exports_half', 'vn_imports_half');
