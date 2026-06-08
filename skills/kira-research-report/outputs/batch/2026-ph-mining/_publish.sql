
WITH new_report AS (
  INSERT INTO living_reports (slug, country, industry, year, pages, price, currency, status, published_at)
  VALUES ($kbat$mining-philippines-2026$kbat$, $kbat$Philippines$kbat$, $kbat$Mining$kbat$, 2026, 21, 39, 'USD', 'published', now())
  ON CONFLICT (slug) DO UPDATE SET
    updated_at   = now(),
    published_at = now(),
    pages        = EXCLUDED.pages,
    status       = 'published'
  RETURNING id
)
INSERT INTO report_translations (report_id, locale, title, eyebrow, preview, toc, pdf_url, status, published_at)
SELECT
  new_report.id,
  t.locale,
  t.title,
  t.eyebrow,
  t.preview::jsonb,
  t.toc::jsonb,
  new_report.id::text || '/' || t.locale || '.pdf',
  'published',
  now()
FROM new_report
CROSS JOIN (VALUES
      ('en', $kbat$Philippines mining 2026 — the raw-ore model meets its downstream reckoning$kbat$, $kbat$PHILIPPINES · MINING · MARKET ANALYSIS$kbat$, $kbat${"lede":"The Philippines mined ~330 kt of contained nickel in 2024, second only to Indonesia, and supplies roughly 95% of the world's traded nickel ore. But almost all of it leaves as unprocessed laterite — only two HPAL plants operate, both shipping intermediate product to Japan for refining. Raw ore averaged ~USD 26/wmt in 2025; battery-grade sulfate clears multiples higher. The value sits downstream, and the Philippines has not captured it.","paragraphs":["The Senate passed SB 2826 in February 2025 to ban raw-ore exports five years after enactment; it sits in bicameral review. RA 12253's margin-based royalty and windfall tax took effect February 2026. Both raise the cost of staying raw — but a multi-year nickel surplus and weak prices blunt the investment case for processing.","This report covers the macro backdrop, sector sizing and ore tonnage, the value-add ladder from ore to NPI to MHP to sulfate, the competitive landscape with profiles of Nickel Asia Corporation and the ferronickel field, China-versus-Japan export channels, the SB 2826 / RA 12253 / EO 130 regulatory and political landscape, AI's impact on mine economics, and a five-year outlook to 2030."],"chart":{"title":"Nickel ore production trajectory","subtitle":"Million dry metric tons · 2021-2030F","bars":[{"pct":77,"label":"2021","value":33},{"pct":91,"label":"2026F","value":39},{"pct":100,"label":"2030F","value":43}]}}$kbat$, $kbat$[{"num":"03","name":"Executive summary","pages":"PG 04","locked":false},{"num":"04","name":"Macro context: Philippines 2026","pages":"PG 06","locked":true},{"num":"05","name":"Sector overview & sizing","pages":"PG 07","locked":true},{"num":"06","name":"Value-add ladder economics","pages":"PG 08","locked":true},{"num":"07","name":"Competitive landscape","pages":"PG 09","locked":true},{"num":"07a","name":"Player · Nickel Asia Corporation","pages":"PG 11","locked":true},{"num":"07b","name":"Players · Ferronickel & the field","pages":"PG 12","locked":true},{"num":"08","name":"Demand & export channels","pages":"PG 14","locked":true},{"num":"09","name":"Regulatory & political landscape","pages":"PG 15","locked":true},{"num":"10","name":"AI impact on mine economics","pages":"PG 17","locked":true},{"num":"11","name":"5-year outlook & forecast","pages":"PG 18","locked":true},{"num":"12","name":"Methodology endnote","pages":"PG 20","locked":true}]$kbat$),
      ('ja', $kbat$フィリピン鉱業 2026 — 鉱石輸出モデルは下流転換の岐路に立つ$kbat$, $kbat$フィリピン · 鉱業 · マーケット分析$kbat$, $kbat${"lede":"フィリピンは2024年に含有ニッケル約330ktを採掘し、インドネシアに次ぐ世界第2位であり、世界の取引ニッケル鉱石の約95%を供給しています。しかしそのほぼ全量が未処理のラテライトとして輸出され、稼働するHPALプラントはわずか2基で、いずれも中間品を日本に送り最終精製に回しています。鉱石の実現価格は2025年に平均約USD 26/wmtであるのに対し、電池グレード硫酸塩はその数倍に達します。価値は下流にあり、フィリピンはそれを捕捉できていません。","paragraphs":["上院は2025年2月に SB 2826 を可決し、施行後5年での鉱石輸出禁止を規定しました。現在は両院協議会で審議中です。RA 12253 のマージン連動ロイヤルティと超過利潤税は2026年2月に発効しています。いずれも鉱石のままでいることのコストを引き上げる措置ですが、多年にわたるニッケル供給過剰と価格低迷が処理投資の事業性を損なっています。","本レポートはマクロ環境、セクター規模と鉱石生産量、鉱石からNPI・MHP・硫酸塩へと至る付加価値ラダー、ニッケル・アジア・コーポレーションとフェロニッケル各社のプロファイルを含む競争環境、中国対日本の輸出チャネル、SB 2826・RA 12253・EO 130 を含む規制・政治環境、AIが鉱山経済性に与える影響、そして2030年までの5年見通しを扱います。"],"chart":{"title":"ニッケル鉱石生産量の推移","subtitle":"百万乾燥メートルトン · 2021-2030F","bars":[{"pct":77,"label":"2021","value":33},{"pct":91,"label":"2026F","value":39},{"pct":100,"label":"2030F","value":43}]}}$kbat$, $kbat$[{"num":"03","name":"エグゼクティブサマリー","pages":"P 04","locked":false},{"num":"04","name":"マクロ環境：フィリピン 2026","pages":"P 06","locked":true},{"num":"05","name":"セクター概観・規模","pages":"P 07","locked":true},{"num":"06","name":"付加価値ラダーの経済性","pages":"P 08","locked":true},{"num":"07","name":"競争環境","pages":"P 09","locked":true},{"num":"07a","name":"事業者 · ニッケル・アジア・コーポレーション","pages":"P 11","locked":true},{"num":"07b","name":"事業者 · フェロニッケル各社","pages":"P 12","locked":true},{"num":"08","name":"需要・輸出チャネル","pages":"P 14","locked":true},{"num":"09","name":"規制・政治環境","pages":"P 15","locked":true},{"num":"10","name":"AI が鉱山経済性に与える影響","pages":"P 17","locked":true},{"num":"11","name":"5年見通し・予測","pages":"P 18","locked":true},{"num":"12","name":"方法論エンドノート","pages":"P 20","locked":true}]$kbat$),
      ('ko', $kbat$필리핀 광업 2026 — 원광 수출 모델, 하류 전환의 기로에 서다$kbat$, $kbat$필리핀 · 광업 · 시장 분석$kbat$, $kbat${"lede":"필리핀은 2024년 함유 니켈 약 330kt을 채굴하여 인도네시아에 이어 세계 2위를 기록하고, 세계 니켈 원광 거래량의 약 95%를 공급합니다. 그러나 산출량의 거의 전부가 미가공 라테라이트로 반출됩니다 — HPAL 플랜트는 두 곳뿐이며, 모두 일본으로 중간 제품을 출하해 최종 정련을 위탁합니다. 원광 평균 실현 가격은 2025년 약 USD 26/wmt이지만, 배터리급 황산염은 수배에 달합니다. 가치는 하류에 있으며, 필리핀은 이를 확보하지 못하고 있습니다.","paragraphs":["상원은 2025년 2월 SB 2826을 통과시켜 발효 5년 후 원광 수출을 금지하도록 했으며, 현재 양원 조정 심의 중입니다. RA 12253의 이익 기반 로열티 및 횡재세는 2026년 2월 발효되었습니다. 두 조치 모두 원광 유지 비용을 높이지만 — 다년간의 니켈 공급 과잉과 가격 약세가 가공 투자 논거를 무력화합니다.","본 보고서는 거시 환경, 섹터 규모와 원광 생산량, 원광에서 NPI·MHP·황산염으로 이어지는 가치 사슬 경제성, Nickel Asia Corporation과 페로니켈 사업자 프로파일을 포함한 경쟁 구조, 중국 대 일본 수출 채널, SB 2826·RA 12253·EO 130을 포함한 규제·정치 환경, AI의 광업 경제성 영향, 그리고 2030년까지의 5년 전망을 다룹니다."],"chart":{"title":"니켈 광석 생산 추세","subtitle":"백만 건조 미터톤 · 2021-2030F","bars":[{"pct":77,"label":"2021","value":33},{"pct":91,"label":"2026F","value":39},{"pct":100,"label":"2030F","value":43}]}}$kbat$, $kbat$[{"num":"03","name":"경영진 요약","pages":"P 04","locked":false},{"num":"04","name":"거시 환경: 필리핀 2026","pages":"P 06","locked":true},{"num":"05","name":"섹터 개요 & 시장 규모","pages":"P 07","locked":true},{"num":"06","name":"가치 사슬 경제성","pages":"P 08","locked":true},{"num":"07","name":"경쟁 구조","pages":"P 09","locked":true},{"num":"07a","name":"사업자 · Nickel Asia Corporation","pages":"P 11","locked":true},{"num":"07b","name":"사업자 · Ferronickel & 기타","pages":"P 12","locked":true},{"num":"08","name":"수요 & 수출 채널","pages":"P 14","locked":true},{"num":"09","name":"규제 & 정치 환경","pages":"P 15","locked":true},{"num":"10","name":"AI의 광업 경제성 영향","pages":"P 17","locked":true},{"num":"11","name":"5년 전망 & 예측","pages":"P 18","locked":true},{"num":"12","name":"방법론 주석","pages":"P 20","locked":true}]$kbat$)
) AS t(locale, title, eyebrow, preview, toc)
ON CONFLICT (report_id, locale) DO UPDATE SET
  title        = EXCLUDED.title,
  eyebrow      = EXCLUDED.eyebrow,
  preview      = EXCLUDED.preview,
  toc          = EXCLUDED.toc,
  pdf_url      = EXCLUDED.pdf_url,
  status       = 'published',
  published_at = now()
RETURNING report_id, locale, title;
