-- 062_file_sources.sql — Kira Data (D6): sources read from files and pages rather than an API.
-- They run together in one weekly slot (/api/cron-econ-refresh?source=files, Saturdays). No new table: rows go to
-- econ_flows (migration 058) with these products:
--   FDI_REALISED  realised foreign investment by investor country (Indonesia, BKPM), quarterly
--   FDI_REG_YTD   registered FDI, new + added capital, year to date (Viet Nam, NSO monthly workbook), monthly
--   FDI_APPROVED  approved investment (Taiwan outward, flow X), monthly
--   FDI_NET       net FDI inflow by source country (ASEANstats), annual
--   TOTAL         merchandise trade by partner (Viet Nam Customs, preliminary monthly PDFs)
-- Idempotent.

insert into public.data_sources (key, name, url, licence, attribution, public, env_key, notes) values
  ('bkpm', 'Ministry of Investment / BKPM (Indonesia), open data portal', 'https://data.bkpm.go.id',
   'CC BY 4.0', 'Source: Ministry of Investment and Downstreaming / BKPM, Republic of Indonesia (data.bkpm.go.id), CC BY 4.0', true, null,
   'Quarterly "Data Realisasi Investasi" datasets (zip with CSV).'),
  ('aseanstats', 'ASEANstats, ASEAN Secretariat (FDI by host and source country)', 'https://data.aseanstats.org',
   'ASEANstats terms: may be reproduced with credit', 'Source: ASEANstats, ASEAN Secretariat (data.aseanstats.org)', true, null,
   'Undocumented dashboard endpoint; the site firewall shows a captcha to some data-centre addresses. Viet Nam does not report by source country.'),
  ('vn_customs', 'Viet Nam Customs, preliminary monthly trade by country', 'https://www.customs.gov.vn',
   'Citation required (customs.gov.vn); no open licence published', 'Source: Viet Nam Customs (customs.gov.vn), preliminary figures', true, null,
   'Monthly PDFs (exports 5X / imports 5N by country and main commodity); the final figures are not online.'),
  ('tw_mac', 'Taiwan approved outward investment by destination (data.gov.tw)', 'https://data.gov.tw/dataset/7476',
   'Open Government Data License, Taiwan v1.0', 'Source: Mainland Affairs Council and Department of Investment Review, MOEA (data.gov.tw), Open Government Data License v1.0', true, null, null)
on conflict (key) do update set name = excluded.name, url = excluded.url, licence = excluded.licence, attribution = excluded.attribution,
  env_key = excluded.env_key, notes = excluded.notes, updated_at = now();
