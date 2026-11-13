// One-off helper: builds SQL to insert living_reports + 3 report_translations
// rows for 2026-vn-coffee-2 (Vietnam specialty coffee — chains and Gen Z).
// Sister report to 2026-vn-coffee (different angle: chain banners + Gen Z
// premiumization, vs. the original which was export dynamics).
//
// Run: `node skills/kira-research-report/scripts/_build_vn_coffee_2_sql.mjs`

const SLUG    = 'vietnam-specialty-coffee-2026';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'Coffee';
const YEAR    = 2026;
const PAGES   = 23;
const PRICE   = 39;

// Vietnam chain coffee market value (USD bn). Max ~1.7 → pct relative.
const chartBars = [
  { pct: 56,  label: '2023',  value: 0.95 },
  { pct: 76,  label: '2025',  value: 1.3 },
  { pct: 100, label: '2027F', value: 1.7 },
];

const META = {
  en: {
    title: 'Vietnam specialty coffee 2026: domestic cafe chains and Gen Z premiumization',
    eyebrow: 'VIETNAM · COFFEE · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's USD 1.3 bn coffee-and-tea chain franchise is rotating from price-led store expansion to brand-led densification. Highlands defends the lead at 855 stores; Phuc Long, Katinat, Starbucks, and Trung Nguyen Legend each carry a different bet on premiumization, channel mix, and the under-30 cohort. The 2026-2030 window separates banners that capture Gen Z value share from those defending mass-market footfall.",
      paragraphs: [
        "This report sizes the in-cup, RTD, and at-home segments; profiles the top chain operators with store-count and unit-economics deep dives (Highlands, Phuc Long, Katinat, Starbucks Vietnam, Trung Nguyen Legend); maps the Gen Z premiumization curve and traceable single-origin demand; and quantifies the EUDR + food-safety + sugar-tax regulatory load through 2031.",
        "Six AI use cases across the chain stack are profiled in Section 10 (POS demand sensing, dynamic menu pricing, agronomy-grade traceability for EUDR, roast-curve optimization at specialty banners, fraud detection across green-bean documentation, and barista-task automation). Strategic outlook + 2026-2030 scenarios in Section 11.",
      ],
      chart: {
        title: 'Vietnam chain coffee market value (USD bn)',
        subtitle: '2023 actual · 2025 actual · 2027 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                              pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                                 pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                        pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                            pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',                 pages: 'PG 08', locked: true  },
      { num: '06', name: 'Segment economics',                        pages: 'PG 10', locked: true  },
      { num: '07', name: 'Competitive landscape',                    pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand drivers & channels',                pages: 'PG 17', locked: true  },
      { num: '09', name: 'Regulatory landscape',                     pages: 'PG 19', locked: true  },
      { num: '10', name: 'AI impact on chains',                      pages: 'PG 20', locked: true  },
      { num: '11', name: 'Outlook & forecast 2026–2030',             pages: 'PG 21', locked: true  },
      { num: '12', name: 'Methodology endnote',                      pages: 'PG 23', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム・スペシャルティコーヒー 2026:国内カフェチェーンとGen Zプレミアム化',
    eyebrow: 'ベトナム · コーヒー · マーケット分析',
    preview: {
      lede: 'ベトナムのUSD 13億規模のコーヒー&ティーチェーン市場は、価格主導の店舗拡張からブランド主導の密度向上へと転換しつつあります。Highlandsが855店舗で首位を守り、Phuc Long、Katinat、Starbucks、Trung Nguyen Legendはそれぞれ異なる賭けをプレミアム化・チャネルミックス・30歳未満コホートに対して行っています。2026-2030年の期間は、Gen Z価値シェアを獲得するバナーとマス市場フットフォールを守るバナーを分離します。',
      paragraphs: [
        '本レポートはイン・カップ、RTD、家庭内消費の各セグメントを定量化し、店舗数・ユニットエコノミクスを含む主要チェーン事業者(Highlands、Phuc Long、Katinat、Starbucks Vietnam、Trung Nguyen Legend)の詳細プロファイルを提示します。Gen Zプレミアム化曲線とトレーサブル・シングルオリジン需要を整理し、2031年までのEUDR + 食品安全 + 砂糖税の規制負荷を定量化します。',
        'チェーンスタック全体にわたる6つのAI活用事例を第10章で取り上げます(POS需要センシング、動的メニュー価格、EUDR対応のアグロノミー級トレーサビリティ、スペシャルティバナーでの焙煎曲線最適化、グリーンビーン書類の不正検知、バリスタ業務自動化)。戦略的展望および2026-2030年シナリオは第11章。',
      ],
      chart: {
        title: 'ベトナムチェーンコーヒー市場規模(USD bn)',
        subtitle: '2023年実績 · 2025年実績 · 2027年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査方法',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                  pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',                pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ背景',                            pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観 & 市場規模',               pages: 'P 08', locked: true  },
      { num: '06', name: 'セグメント経済性',                      pages: 'P 10', locked: true  },
      { num: '07', name: '競合環境',                              pages: 'P 12', locked: true  },
      { num: '08', name: '需要ドライバー & チャネル',              pages: 'P 17', locked: true  },
      { num: '09', name: '規制環境',                              pages: 'P 19', locked: true  },
      { num: '10', name: 'チェーンへのAI影響',                     pages: 'P 20', locked: true  },
      { num: '11', name: '展望 & 予測 2026-2030',                 pages: 'P 21', locked: true  },
      { num: '12', name: '方法論巻末注',                          pages: 'P 23', locked: true  },
    ],
  },

  ko: {
    title: '베트남 스페셜티 커피 2026: 국내 카페 체인과 Gen Z 프리미엄화',
    eyebrow: '베트남 · 커피 · 시장 분석',
    preview: {
      lede: '베트남의 USD 13억 규모 커피·차 체인 시장은 가격 주도 매장 확장에서 브랜드 주도 밀집화로 이행 중입니다. Highlands가 855개 매장으로 선두를 지키고, Phuc Long, Katinat, Starbucks, Trung Nguyen Legend는 각기 다른 프리미엄화·채널 믹스·30세 미만 코호트 전략에 베팅하고 있습니다. 2026-2030년은 Gen Z 가치 점유를 확보하는 브랜드와 매스 마켓 풋트래픽을 방어하는 브랜드를 가르는 분기점입니다.',
      paragraphs: [
        '본 보고서는 인컵·RTD·홈브루 세그먼트별 규모를 산정하고 주요 체인 사업자(Highlands, Phuc Long, Katinat, Starbucks Vietnam, Trung Nguyen Legend)의 매장 수 및 유닛 이코노믹스 심층 프로파일을 제시합니다. Gen Z 프리미엄화 곡선과 추적 가능한 싱글 오리진 수요를 정리하고, 2031년까지의 EUDR + 식품 안전 + 설탕세 규제 부담을 정량화합니다.',
        '체인 스택 전반의 6가지 AI 활용 사례를 제10장에서 다룹니다(POS 수요 센싱, 동적 메뉴 가격, EUDR 대응 농학적 트레이서빌리티, 스페셜티 브랜드의 로스팅 곡선 최적화, 그린빈 서류 사기 감지, 바리스타 업무 자동화). 전략적 전망 및 2026-2030 시나리오는 제11장.',
      ],
      chart: {
        title: '베트남 체인 커피 시장 규모 (USD bn)',
        subtitle: '2023 실적 · 2025 실적 · 2027 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                              pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                pages: 'P 03', locked: false },
      { num: '03', name: '요약 보고',                           pages: 'P 04', locked: false },
      { num: '04', name: '매크로 컨텍스트',                     pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개요 & 규모',                    pages: 'P 08', locked: true  },
      { num: '06', name: '세그먼트 경제성',                     pages: 'P 10', locked: true  },
      { num: '07', name: '경쟁 구도',                           pages: 'P 12', locked: true  },
      { num: '08', name: '수요 동인 & 채널',                    pages: 'P 17', locked: true  },
      { num: '09', name: '규제 환경',                           pages: 'P 19', locked: true  },
      { num: '10', name: '체인에 대한 AI 영향',                 pages: 'P 20', locked: true  },
      { num: '11', name: '전망 & 예측 2026-2030',               pages: 'P 21', locked: true  },
      { num: '12', name: '방법론 미주',                         pages: 'P 23', locked: true  },
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
