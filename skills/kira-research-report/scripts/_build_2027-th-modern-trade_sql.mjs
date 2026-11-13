// One-off helper: builds SQL to insert living_reports + 3 report_translations
// rows for 2027-th-modern-trade. Run:
//   node skills/kira-research-report/scripts/_build_2027-th-modern-trade_sql.mjs > /tmp/insert.sql
// then feed to Supabase MCP execute_sql. pdf_url emits a STORAGE PATH.

const SLUG    = 'thailand-modern-trade-2027';
const COUNTRY = 'Thailand';
const INDUSTRY= 'Retail';
const YEAR    = 2027;
const PAGES   = 12;
const PRICE   = 39;

// Exec chart (page 4) — convenience & proximity network by chain, store count.
// Scale relative to 7-Eleven = 15,945 → pct 100.
const chartBars = [
  { pct: 100, label: '7-Eleven',        value: '15,945' },
  { pct: 13,  label: "Lotus's go fresh", value: '~2,000' },
  { pct: 8,   label: 'CJ More',         value: '~1,200' },
  { pct: 7,   label: 'Mini Big C',      value: '~1,050' },
];

const META = {
  en: {
    title: 'Thailand modern trade 2027: convenience density & the pressure on 7-Eleven',
    eyebrow: 'THAILAND · MODERN TRADE · MARKET ANALYSIS',
    preview: {
      lede: "Thai modern trade is worth around THB 2.5 tn, but convenience is the exception — a THB 638 bn segment growing 5.3% where 7-Eleven's 15,945 stores hold 70.6% of value and the top three chains control 95.3%. With household debt at 86.8% of GDP (the highest in ASEAN) and challenger capital from CJ More and the Saha–Lawson venture arriving, the next leg of the race is fought on density, format and data — not new white space.",
      paragraphs: [
        "This report covers the macro backdrop (private consumption, household debt, tourism recovery), modern-trade sizing and the convenience TAM, segment economics across convenience, proximity, hypermarket and online formats, the competitive landscape with deep profiles of 7-Eleven (CP All), CP Axtra, Central Retail, BJC/Big C and the CJ More and Saha–Lawson challengers, demand drivers across basket, O2O and quick commerce, the regulatory landscape, and a scenario outlook through 2032.",
        "A dedicated section sizes the AI impact on Thai modern trade and profiles six operator use cases — demand forecasting and auto-replenishment across 15,945 stores, dynamic fresh-food markdown, planogram and space optimisation, O2O personalisation on the 7Delivery and All Online channels, loss and shrinkage detection, and last-mile routing for quick commerce.",
      ],
      chart: {
        title: 'Convenience network by chain, Thailand',
        subtitle: '2025 · store count',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                    pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                       pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',              pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                  pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',       pages: 'PG 08', locked: true  },
      { num: '06', name: 'Segment economics',              pages: 'PG 10', locked: true  },
      { num: '07', name: 'Competitive landscape',          pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand drivers & channels',      pages: 'PG 17', locked: true  },
      { num: '09', name: 'Regulatory landscape',           pages: 'PG 19', locked: true  },
      { num: '10', name: 'AI impact on modern trade',      pages: 'PG 20', locked: true  },
      { num: '11', name: 'Outlook & forecast',             pages: 'PG 21', locked: true  },
      { num: '12', name: 'Methodology endnote',            pages: 'PG 22', locked: true  },
    ],
  },

  ja: {
    title: 'タイ近代小売2027年:コンビニ密度と7-Elevenへの圧力',
    eyebrow: 'タイ · 近代小売 · マーケット分析',
    preview: {
      lede: 'タイの近代小売は約THB 2.5兆規模ですが、コンビニエンスは例外です。THB 638 bnで5.3%成長するこのセグメントでは、7-Elevenの15,945店舗が金額シェアの70.6%を握り、上位3チェーンで95.3%を占めます。家計債務がGDP比86.8%(ASEAN最高)に達し、CJ MoreやSaha–Lawson連合の挑戦者資本が参入する中、次の局面は新規白地ではなく密度・フォーマット・データを巡る競争で決まります。',
      paragraphs: [
        '本レポートはマクロ環境(民間消費・家計債務・観光回復)、近代小売の市場規模とコンビニTAM、コンビニ・近接型・ハイパーマーケット・オンライン各フォーマットのセグメント経済性、7-Eleven(CP All)・CP Axtra・Central Retail・BJC/Big Cおよび挑戦者CJ More・Saha–Lawsonの詳細プロファイルを含む競争環境、バスケット・O2O・クイックコマースにわたる需要ドライバー、規制環境、そして2032年までのシナリオ見通しを扱います。',
        '専用セクションではタイ近代小売へのAIインパクトを定量化し、6つの事業者活用事例を取り上げます。15,945店舗にわたる需要予測と自動補充、生鮮のダイナミック値下げ、棚割り・売場最適化、7DeliveryおよびAll OnlineチャネルでのO2Oパーソナライゼーション、ロス・棚卸差異の検知、クイックコマースのラストマイル配車です。',
      ],
      chart: {
        title: 'チェーン別コンビニ網、タイ',
        subtitle: '2025年 · 店舗数',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                       pages: 'P 02', locked: false },
      { num: '02', name: '目次',                           pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',         pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                     pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観と規模',             pages: 'P 08', locked: true  },
      { num: '06', name: 'セグメント経済性',               pages: 'P 10', locked: true  },
      { num: '07', name: '競争環境',                       pages: 'P 12', locked: true  },
      { num: '08', name: '需要ドライバーとチャネル',       pages: 'P 17', locked: true  },
      { num: '09', name: '規制環境',                       pages: 'P 19', locked: true  },
      { num: '10', name: '近代小売におけるAIインパクト',   pages: 'P 20', locked: true  },
      { num: '11', name: '見通しと予測',                   pages: 'P 21', locked: true  },
      { num: '12', name: '調査手法補遺',                   pages: 'P 22', locked: true  },
    ],
  },

  ko: {
    title: '태국 모던 트레이드 2027: 편의점 밀도와 세븐일레븐이 받는 압력',
    eyebrow: '태국 · 모던 트레이드 · 시장 분석',
    preview: {
      lede: '태국 모던 트레이드는 약 THB 2.5조 규모이지만 편의점은 예외입니다. THB 638 bn 규모로 5.3% 성장하는 이 세그먼트에서 세븐일레븐의 15,945개 매장이 가치의 70.6%를 차지하고 상위 3개 체인이 95.3%를 통제합니다. 가계부채가 GDP 대비 86.8%(ASEAN 최고)에 이르고 CJ More와 Saha–Lawson 합작의 챌린저 자본이 유입되는 가운데, 다음 국면은 신규 공백 지역이 아니라 밀도, 포맷, 데이터를 둘러싼 경쟁에서 결정됩니다.',
      paragraphs: [
        '본 보고서는 거시 배경(민간소비·가계부채·관광 회복), 모던 트레이드 규모 산정과 편의점 TAM, 편의점·근접형·하이퍼마켓·온라인 포맷별 세그먼트 경제성, 세븐일레븐(CP All)·CP Axtra·Central Retail·BJC/Big C 및 챌린저 CJ More·Saha–Lawson의 심층 프로파일을 포함한 경쟁 구도, 장바구니·O2O·퀵커머스에 걸친 수요 동인, 규제 환경, 그리고 2032년까지의 시나리오 전망을 다룹니다.',
        '전용 섹션에서는 태국 모던 트레이드에 대한 AI 영향을 정량화하고 6가지 사업자 활용 사례를 다룹니다. 15,945개 매장에 걸친 수요 예측과 자동 보충, 신선식품 동적 마크다운, 플래노그램·매대 최적화, 7Delivery 및 All Online 채널의 O2O 개인화, 손실·재고 차이 감지, 퀵커머스 라스트마일 배차입니다.',
      ],
      chart: {
        title: '체인별 편의점 네트워크, 태국',
        subtitle: '2025 · 매장 수',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                         pages: 'P 02', locked: false },
      { num: '02', name: '목차',                           pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',                    pages: 'P 04', locked: false },
      { num: '04', name: '거시경제 배경',                  pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개요 및 규모 산정',         pages: 'P 08', locked: true  },
      { num: '06', name: '세그먼트 경제성',                pages: 'P 10', locked: true  },
      { num: '07', name: '경쟁 구도',                      pages: 'P 12', locked: true  },
      { num: '08', name: '수요 동인 및 채널',              pages: 'P 17', locked: true  },
      { num: '09', name: '규제 환경',                      pages: 'P 19', locked: true  },
      { num: '10', name: '모던 트레이드에 대한 AI 영향',   pages: 'P 20', locked: true  },
      { num: '11', name: '전망 및 예측',                   pages: 'P 21', locked: true  },
      { num: '12', name: '방법론 부록',                    pages: 'P 22', locked: true  },
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
