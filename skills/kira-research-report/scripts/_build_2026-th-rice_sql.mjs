// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-th-rice. Run via Supabase MCP execute_sql.

const SLUG    = 'rice-thailand-2026';
const COUNTRY = 'Thailand';
const INDUSTRY= 'Rice';
const YEAR    = 2026;
const PAGES   = 12;
const PRICE   = 39;

// Chart bars: Thailand rice exports volume (Mt). 2024 actual, 2025 actual, 2026 target.
// Tallest (9.95) = 100%.
const chartBars = [
  { pct: 100, label: '2024', value: 9.95 },
  { pct: 79,  label: '2025', value: 7.9  },
  { pct: 70,  label: '2026T', value: 7.0 },
];

const META = {
  en: {
    title: "Thailand rice — the jasmine premium against the yield gap",
    eyebrow: 'THAILAND · RICE · MARKET ANALYSIS',
    preview: {
      lede: "Thailand shipped 7.9 million tonnes of rice in 2025 [TREA 2026], beating its 7.5 Mt target and earning 148.2 billion baht (USD 4.5 billion) [TREA 2026]. Yet the country has slipped from second to third among world exporters, behind India and Vietnam [Platts 2026], and the Commerce Ministry guides only 7.0 Mt for 2026 [MOC 2026]. The centre of gravity shifts from volume to defending the premium.",
      paragraphs: [
        "India lifted all export curbs and targets a record 30 Mt for 2026 [Platts 2026], pulling Thai 5% white-rice FOB toward ~USD 340/t [Platts 2026]. The baht's strength priced Thai grain ~USD 40/t above Indian [Nation 2026] just as buyers turned origin-flexible. IRRI-bred and Vietnamese aromatics — ST25 reached ~USD 1,200/t [Vietnam News 2025] — now contest the fragrant niche Hom Mali long owned.",
        "Thai paddy yields ~2.9 t/ha [Nation 2026], against Vietnam's higher base. Production cost runs 7,200–7,500 baht/t versus Vietnam ~6,000 and India ~5,000 [Nation 2026]. Five strategic implications are mapped: Hom Mali's narrowing moat, the yield-cost gap, India's price-floor reset, IRRI variety competition, and the populist subsidy trap delaying the productivity fix.",
      ],
      chart: {
        title: 'Thailand rice exports — volume',
        subtitle: '2024 actual · 2025 actual · 2026 target',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                         pages: 'PG 002', locked: false },
      { num: '02', name: 'Contents',                            pages: 'PG 003', locked: false },
      { num: '03', name: 'Executive summary',                   pages: 'PG 004', locked: false },
      { num: '04', name: 'Macro context',                       pages: 'PG 006', locked: true  },
      { num: '05', name: 'Sector overview & sizing',            pages: 'PG 008', locked: true  },
      { num: '06', name: 'Segment economics',                   pages: 'PG 010', locked: true  },
      { num: '07', name: 'Competitive landscape',               pages: 'PG 012', locked: true  },
      { num: '08', name: 'Demand drivers & channels',           pages: 'PG 017', locked: true  },
      { num: '09', name: 'Regulatory landscape',                pages: 'PG 019', locked: true  },
      { num: '10', name: 'AI impact on the rice value chain',   pages: 'PG 020', locked: true  },
      { num: '11', name: 'Outlook & forecast',                  pages: 'PG 021', locked: true  },
      { num: '12', name: 'Methodology endnote',                 pages: 'PG 022', locked: true  },
    ],
  },

  ja: {
    title: 'タイ米 — ジャスミンプレミアムと収量格差の攻防',
    eyebrow: '東南アジア · 米 · 市場分析',
    preview: {
      lede: 'タイは2025年に790万トンの米を輸出し[TREA 2026]、目標の750万トンを上回り1,482億バーツ（USD 45億）を獲得しました[TREA 2026]。しかし国際輸出順位はインド、ベトナムに続く世界第3位に後退し[Platts 2026]、商務省の2026年ガイダンスは700万トンに留まります[MOC 2026]。重心は数量から、プレミアムの防衛へと移っています。',
      paragraphs: [
        'インドはすべての輸出規制を撤廃し2026年に3,000万トンという記録的目標を掲げており[Platts 2026]、タイ産5%砕け米のFOB価格は~USD 340/tに押し下げられています[Platts 2026]。バーツ高によりタイ産穀物はインド産より~USD 40/t割高となり[Nation 2026]、バイヤーが産地選択に柔軟性を持ち始めた時期に重なっています。IRRI育成品種やベトナム産香り米（ST25は~USD 1,200/tに達した[Vietnam News 2025]）が、ホムマリが長年独占してきた香り米市場に参入しています。',
        'タイの籾収量は~2.9 t/haで[Nation 2026]、ベトナムの収量水準を下回ります。生産コストはトン当たり7,200〜7,500バーツとベトナムの~6,000、インドの~5,000を上回ります[Nation 2026]。本レポートは5つの戦略的示唆を分析します：ホムマリの狭まる護城河、収量・コスト格差、インドによる価格底上げのリセット、IRRI品種の競合、そして生産性改善を遅らせるポピュリスト的補助金の罠。',
      ],
      chart: {
        title: 'タイ米輸出量',
        subtitle: '2024年実績 · 2025年実績 · 2026年目標',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査方法論',                          pages: 'P 002', locked: false },
      { num: '02', name: '目次',                                pages: 'P 003', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',              pages: 'P 004', locked: false },
      { num: '04', name: 'マクロ環境',                          pages: 'P 006', locked: true  },
      { num: '05', name: '部門概観と市場規模',                  pages: 'P 008', locked: true  },
      { num: '06', name: 'セグメント経済性',                    pages: 'P 010', locked: true  },
      { num: '07', name: '競合状況',                            pages: 'P 012', locked: true  },
      { num: '08', name: '需要ドライバーと流通チャネル',        pages: 'P 017', locked: true  },
      { num: '09', name: '規制環境',                            pages: 'P 019', locked: true  },
      { num: '10', name: '米バリューチェーンのAI影響',          pages: 'P 020', locked: true  },
      { num: '11', name: '見通しと予測',                        pages: 'P 021', locked: true  },
      { num: '12', name: '調査手法エンドノート',                pages: 'P 022', locked: true  },
    ],
  },

  ko: {
    title: '태국 쌀 — 자스민 프리미엄과 수확량 격차의 대결',
    eyebrow: '동남아시아 · 쌀 · 시장 분석',
    preview: {
      lede: '태국은 2025년 쌀 790만 톤을 수출하여[TREA 2026] 750만 톤 목표를 상회하고 1,482억 바트(USD 45억)를 달성했습니다[TREA 2026]. 그러나 세계 수출 순위에서 인도·베트남에 밀려 3위로 하락했으며[Platts 2026], 상무부는 2026년 목표를 700만 톤으로 하향 제시했습니다[MOC 2026]. 이제 전략적 무게 중심은 물량에서 프리미엄 수호로 이동합니다.',
      paragraphs: [
        '인도가 모든 수출 규제를 해제하고 2026년 3,000만 톤이라는 사상 최대 목표를 설정함으로써[Platts 2026] 태국 5% 백미 FOB가 ~USD 340/t 수준으로 하락 압박을 받고 있습니다[Platts 2026]. 강세 바트화로 태국 곡물이 인도산보다 ~USD 40/t 高[Nation 2026]에 책정되는 상황에서 구매자들은 원산지 유연성을 높이고 있습니다. IRRI 육성 및 베트남 향미 품종 — ST25는 ~USD 1,200/t[Vietnam News 2025] — 이 Hom Mali가 오랫동안 독점하던 향미 틈새 시장을 잠식하고 있습니다.',
        '태국 벼 수확량은 ~2.9 t/ha[Nation 2026]로 베트남 대비 낮습니다. 생산원가는 톤당 7,200~7,500 바트로 베트남 ~6,000, 인도 ~5,000에 비해 높습니다[Nation 2026]. 5가지 전략적 시사점을 분석합니다: Hom Mali의 좁아지는 해자, 수확량·원가 격차, 인도의 가격 하한선 재설정, IRRI 품종 경쟁, 생산성 개선을 지연시키는 보조금 함정.',
      ],
      chart: {
        title: '태국 쌀 수출량',
        subtitle: '2024 실적 · 2025 실적 · 2026 목표',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                              pages: 'P 002', locked: false },
      { num: '02', name: '목차',                                pages: 'P 003', locked: false },
      { num: '03', name: '임원 요약',                           pages: 'P 004', locked: false },
      { num: '04', name: '거시 맥락',                           pages: 'P 006', locked: true  },
      { num: '05', name: '부문 개요 및 규모',                   pages: 'P 008', locked: true  },
      { num: '06', name: '세그먼트 경제학',                     pages: 'P 010', locked: true  },
      { num: '07', name: '경쟁 구도',                           pages: 'P 012', locked: true  },
      { num: '08', name: '수요 동인 및 유통 채널',              pages: 'P 017', locked: true  },
      { num: '09', name: '규제 환경',                           pages: 'P 019', locked: true  },
      { num: '10', name: '쌀 가치 사슬의 AI 영향',              pages: 'P 020', locked: true  },
      { num: '11', name: '전망 및 예측',                        pages: 'P 021', locked: true  },
      { num: '12', name: '방법론 후기',                         pages: 'P 022', locked: true  },
    ],
  },
};

function dq(s, tag = 'kbat') {
  return `$${tag}$${s}$${tag}$`;
}

const transValues = ['en', 'ja', 'ko'].map((loc) => {
  const m = META[loc];
  const previewJson = JSON.stringify(m.preview);
  const tocJson     = JSON.stringify(m.toc);
  return `('${loc}', ${dq(m.title)}, ${dq(m.eyebrow)}, ${dq(previewJson)}, ${dq(tocJson)})`;
}).join(',\n      ');

const sql = `
WITH new_report AS (
  INSERT INTO living_reports (slug, country, industry, year, pages, price, currency, status, published_at)
  VALUES (${dq(SLUG)}, ${dq(COUNTRY)}, ${dq(INDUSTRY)}, ${YEAR}, ${PAGES}, ${PRICE}, 'USD', 'published', now())
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
      ${transValues}
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
`;

process.stdout.write(sql);
