// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-th-tourism. Run via Supabase MCP execute_sql.

const SLUG    = 'thailand-tourism-2026';
const COUNTRY = 'Thailand';
const INDUSTRY= 'Tourism';
const YEAR    = 2026;
const PAGES   = 17;
const PRICE   = 39;

// Chart bars: Thailand international arrivals (million). 2025 actual, 2026F, 2030F horizon.
// From exec-chart trajectory: 2025=33.0, 2026F=34.0, 2030F=41.0. Tallest (41.0) = 100%.
const chartBars = [
  { pct: 80,  label: '2025',  value: 33.0 },
  { pct: 83,  label: '2026F', value: 34.0 },
  { pct: 100, label: '2030F', value: 41.0 },
];

const META = {
  en: {
    title: "Thailand's tourism market 2026: Chinese return & the medical-wellness engine",
    eyebrow: 'THAILAND · TOURISM · MARKET ANALYSIS',
    preview: {
      lede: "Thailand closed 2025 at 32.97 million international arrivals — its first non-pandemic annual decline in a decade, driven by a 34% collapse in Chinese visitors. 2026 reframes the market around “value over volume”: the Chinese rebound de-risks the headline while the THB 670bn wellness and medical-tourism segment becomes the structural margin engine. This report takes a five-year view to 2030.",
      paragraphs: [
        "Chinese arrivals fell from 6.73m in 2024 to 4.47m in 2025 — the single factor behind the headline decline — after a high-profile safety incident and intensifying regional competition drained confidence. TAT targets 6m Chinese arrivals for 2026 with an upside read of 7-9m, and Chinese New Year 2026 already ran 13% ahead of the prior year.",
        "The 2026 strategy — “Value is the New Volume” — targets THB 3 trillion in revenue on 36-37m arrivals. The THB 670bn wellness economy and the ~THB 125bn medical-tourism stream are the highest-yielding levers, with long-haul and medical visitors out-spending short-haul arrivals by roughly 1.7x. The report maps the BDMS and Bumrungrad competitive estate, visa-policy shifts, AI's impact on hospitality, and a base/bull/bear outlook to 2030.",
      ],
      chart: {
        title: 'Thailand international arrivals (million)',
        subtitle: '2025 actual · 2026 forecast · 2030 horizon',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',                pages: 'PG 004', locked: false },
      { num: '04', name: 'Macro context: Thailand 2026',     pages: 'PG 007', locked: true  },
      { num: '05', name: 'The Chinese return',               pages: 'PG 009', locked: true  },
      { num: '06', name: 'Source-market reshuffle',          pages: 'PG 010', locked: true  },
      { num: '07', name: 'Wellness & medical sizing',        pages: 'PG 012', locked: true  },
      { num: '08', name: 'Medical-tourism competitive map',  pages: 'PG 013', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',    pages: 'PG 015', locked: true  },
      { num: '10', name: 'AI impact on hospitality',         pages: 'PG 016', locked: true  },
      { num: '11', name: '5-year outlook & forecast',        pages: 'PG 017', locked: true  },
      { num: '12', name: 'Methodology endnote',              pages: 'PG 017', locked: true  },
    ],
  },

  ja: {
    title: 'タイ観光市場 2026:中国人旅行者の復帰とメディカルウェルネス・エンジン',
    eyebrow: 'タイ · 観光 · マーケット分析',
    preview: {
      lede: 'タイは2025年を国際入国者数3,297万人で終え、これは過去10年でパンデミック期を除く初の年間減少でした。中国人旅行者の34%急減が主因です。2026年は「数量より価値」へと市場を再定義します。中国人需要の回復がヘッドラインのリスクを和らげる一方、THB 670億のウェルネス・医療観光セグメントが構造的なマージンエンジンとなります。本レポートは2030年までの5年間を展望します。',
      paragraphs: [
        '中国人入国者は2024年の673万人から2025年には447万人へ減少し、これがヘッドライン減少の唯一の要因でした。注目を集めた安全事案と地域間競争の激化が信頼を損ないました。TATは2026年の中国人入国者を600万人と見込み、上振れで700-900万人と読みます。2026年の春節入国者数はすでに前年を13%上回りました。',
        '2026年戦略「Value is the New Volume(価値こそ新たな数量)」は、3,600-3,700万人の入国者でTHB 3兆の収入を目標とします。THB 670億のウェルネス経済と約THB 1,250億の医療観光フローが最も高収益のレバーであり、長距離・医療訪客は短距離訪客の約1.7倍を支出します。本レポートはBDMS・バムルンラードの競合基盤、ビザ政策の変化、ホスピタリティへのAI影響、2030年までの基本・強気・弱気シナリオを描きます。',
      ],
      chart: {
        title: 'タイ国際入国者数 (百万人)',
        subtitle: '2025年実績 · 2026年予測 · 2030年ホライズン',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',         pages: 'P 004', locked: false },
      { num: '04', name: 'マクロ環境:タイ 2026年',         pages: 'P 007', locked: true  },
      { num: '05', name: '中国人旅行者の復帰',             pages: 'P 009', locked: true  },
      { num: '06', name: '送客市場の再編',                 pages: 'P 010', locked: true  },
      { num: '07', name: 'ウェルネス・医療観光の規模感',   pages: 'P 012', locked: true  },
      { num: '08', name: '医療観光の競合マップ',           pages: 'P 013', locked: true  },
      { num: '09', name: '規制・政策の状況',               pages: 'P 015', locked: true  },
      { num: '10', name: 'ホスピタリティへのAI影響',       pages: 'P 016', locked: true  },
      { num: '11', name: '5年間展望と予測',                pages: 'P 017', locked: true  },
      { num: '12', name: '調査手法エンドノート',           pages: 'P 017', locked: true  },
    ],
  },

  ko: {
    title: '태국 관광 시장 2026: 중국인 귀환과 의료·웰니스 엔진',
    eyebrow: '태국 · 관광 · 시장 분석',
    preview: {
      lede: '태국은 2025년 국제 방문객 3,297만 명으로 마감했으며, 이는 팬데믹 시기를 제외하면 10년 만의 첫 연간 감소입니다. 중국인 방문객의 34% 급감이 주요 원인입니다. 2026년은 "물량 대신 가치"로 시장을 재정의합니다. 중국인 수요 반등이 헤드라인 리스크를 완화하는 한편, THB 670bn 규모의 웰니스·의료관광 부문이 구조적 마진 엔진이 됩니다. 본 보고서는 2030년까지 5개년을 전망합니다.',
      paragraphs: [
        '중국인 방문객은 2024년 673만 명에서 2025년 447만 명으로 감소했으며, 이는 헤드라인 감소의 유일한 요인이었습니다. 큰 주목을 받은 안전 사고와 역내 경쟁 심화가 신뢰를 떨어뜨렸습니다. TAT는 2026년 중국인 방문객을 600만 명으로 목표하며 상단으로는 700-900만 명을 봅니다. 2026년 춘절 방문객은 이미 전년 대비 13% 앞섰습니다.',
        '2026년 전략 "Value is the New Volume(가치가 곧 새로운 물량)"은 3,600-3,700만 명 방문객으로 THB 3조 수익을 목표합니다. THB 670bn 웰니스 경제와 약 THB 1,250억 의료관광 흐름이 가장 수익성 높은 레버이며, 장거리·의료 방문객은 단거리 방문객 대비 약 1.7배를 지출합니다. 본 보고서는 BDMS·범룽랏 경쟁 구도, 비자 정책 변화, 호스피탈리티에 대한 AI 영향, 2030년까지의 기본·낙관·비관 시나리오를 다룹니다.',
      ],
      chart: {
        title: '태국 국제 방문객 수 (백만 명)',
        subtitle: '2025 실적 · 2026 예측 · 2030 호라이즌',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '요약',                            pages: 'P 004', locked: false },
      { num: '04', name: '거시 맥락: 태국 2026',            pages: 'P 007', locked: true  },
      { num: '05', name: '중국인 귀환',                     pages: 'P 009', locked: true  },
      { num: '06', name: '출처 시장 재편',                  pages: 'P 010', locked: true  },
      { num: '07', name: '웰니스 & 의료관광 규모',          pages: 'P 012', locked: true  },
      { num: '08', name: '의료관광 경쟁 지도',              pages: 'P 013', locked: true  },
      { num: '09', name: '규제 및 정책 환경',               pages: 'P 015', locked: true  },
      { num: '10', name: 'AI의 호스피탈리티 영향',          pages: 'P 016', locked: true  },
      { num: '11', name: '5개년 전망 및 예측',              pages: 'P 017', locked: true  },
      { num: '12', name: '방법론 엔드노트',                 pages: 'P 017', locked: true  },
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
