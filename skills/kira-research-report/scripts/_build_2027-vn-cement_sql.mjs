// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-vn-cement. Run via Supabase MCP execute_sql.

export const SLUG     = 'cement-vietnam-2027';
export const COUNTRY  = 'Vietnam';
export const INDUSTRY = 'Cement';
export const YEAR     = 2027;
export const PAGES    = 17;
export const PRICE    = 39;

// Exec chart (page 3): Capacity vs domestic demand vs export vent, Mt/yr, 2025.
// Tallest bar = Capacity ~122 = 100%.
const chartBars = [
  { pct: 100, label: 'Capacity',    value: 122 },
  { pct: 53,  label: 'Domestic',    value: 65  },
  { pct: 30,  label: 'Export vent', value: 37  },
];
const chartBarsJa = [
  { pct: 100, label: '設備能力',   value: 122 },
  { pct: 53,  label: '国内需要',   value: 65  },
  { pct: 30,  label: '輸出バルブ', value: 37  },
];
const chartBarsKo = [
  { pct: 100, label: '설비 용량',    value: 122 },
  { pct: 53,  label: '국내 수요',    value: 65  },
  { pct: 30,  label: '수출 배출구',  value: 37  },
];

export const META = {
  en: {
    title: 'Vietnam cement at the decarbonization turn — export relief meets the clinker question',
    eyebrow: 'VIETNAM · CEMENT · MARKET ANALYSIS',
    preview: {
      lede: 'A USD 4.1 bn market in 2025 carries roughly 122 Mt of installed capacity against under 70 Mt of domestic demand. Record exports relieve the surplus; a tightening of trade and carbon walls, not demand, now sets which producers thrive to 2027.',
      paragraphs: [
        "Vietnam's cement market reached USD 4.12 bn in 2025, growing 6.6% with a 6.3% CAGR projected to 2029. The country became the third-largest producer globally, overtaking the United States, and remained the largest cement exporter. Total consumption crossed 100 Mt, of which exports of cement and clinker reached about 37 Mt, near 32% of the total.",
        'The structural problem is supply, not demand. Installed capacity near 122 Mt across 92 lines dwarfs domestic demand below 70 Mt; utilization ran only 64% in 2024. Exports vent the surplus, but Philippine trade remedies, EU CBAM, and a domestic carbon market now reprice that escape valve toward low-clinker, lower-carbon product.',
      ],
      chart: {
        title: 'Capacity vs demand vs the export vent',
        subtitle: 'Vietnam · Mt/yr · 2025',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',         pages: 'PG 004', locked: false },
      { num: '03', name: 'Strategic implications',    pages: 'PG 005', locked: true  },
      { num: '04', name: 'Market sizing & oversupply', pages: 'PG 007', locked: true },
      { num: '04', name: 'Domestic demand engines',   pages: 'PG 008', locked: true  },
      { num: '05', name: 'The export book',           pages: 'PG 010', locked: true  },
      { num: '05', name: 'Trade walls & relief',      pages: 'PG 011', locked: true  },
      { num: '05', name: 'Cost & margin pressure',    pages: 'PG 012', locked: true  },
      { num: '06', name: 'Competitive structure',     pages: 'PG 014', locked: true  },
      { num: '07', name: '2027 outlook & scenarios',  pages: 'PG 016', locked: true  },
      { num: '07', name: 'Methodology & sources',     pages: 'PG 017', locked: true  },
    ],
  },

  ja: {
    title: '脱炭素の転換点に立つベトナムセメント — 輸出緩和とクリンカー問題',
    eyebrow: 'ベトナム · セメント · マーケット分析',
    preview: {
      lede: '2025年にUSD 4.1 bn規模を擁する市場は、国内需要70 Mt未満に対して約122 Mtの設備能力を抱えている。記録的な輸出が余剰を吸収するなか、2027年までの勝者を決定するのは需要ではなく貿易・炭素障壁の締め付けである。',
      paragraphs: [
        'ベトナムのセメント市場は2025年にUSD 4.12 bnに達し、前年比6.6%成長、2029年にかけて6.3% CAGRが見込まれている。同国は世界第3位の生産国となり米国を抜くとともに、最大のセメント輸出国の地位を維持した。総消費量は100 Mtを超え、うちセメント・クリンカー輸出は約37 Mt、総量の約32%に相当する。',
        '問題の本質は需要ではなく供給にある。92ラインで122 Mt/yr超の設備能力が70 Mt未満の国内需要を大きく上回り、稼働率は2024年に64%にとどまった。輸出が余剰を吸収するものの、フィリピンの貿易救済措置・EU CBAM・国内炭素市場が、この出口バルブを低クリンカー・低炭素製品に向けて再価格設定しつつある。',
      ],
      chart: {
        title: '設備能力・需要・輸出バルブ',
        subtitle: 'ベトナム · Mt/yr · 2025年',
        bars: chartBarsJa,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',  pages: 'P 004', locked: false },
      { num: '03', name: '戦略的示唆',              pages: 'P 005', locked: true  },
      { num: '04', name: '市場規模と過剰供給',      pages: 'P 007', locked: true  },
      { num: '04', name: '国内需要の牽引力',        pages: 'P 008', locked: true  },
      { num: '05', name: '輸出構造',                pages: 'P 010', locked: true  },
      { num: '05', name: '貿易障壁と緩和措置',      pages: 'P 011', locked: true  },
      { num: '05', name: 'コストと利益率圧力',      pages: 'P 012', locked: true  },
      { num: '06', name: '競争構造',                pages: 'P 014', locked: true  },
      { num: '07', name: '2027年展望とシナリオ',    pages: 'P 016', locked: true  },
      { num: '07', name: '分析手法と出典',          pages: 'P 017', locked: true  },
    ],
  },

  ko: {
    title: '탈탄소화 전환점에 선 베트남 시멘트 — 수출 완화와 클링커 과제의 교차',
    eyebrow: '베트남 · 시멘트 · 시장 분석',
    preview: {
      lede: '2025년 기준 USD 41억 규모의 시장은 약 122 Mt의 설치 용량에 비해 국내 수요가 70 Mt에 미치지 못합니다. 기록적 수출이 잉여를 해소하고 있으나, 이제는 수요가 아닌 무역·탄소 장벽의 강화가 2027년까지 어느 사업자가 우위를 점하는지를 결정합니다.',
      paragraphs: [
        '베트남 시멘트 시장은 2025년 USD 41.2억에 달하며 6.6% 성장했고, 2029년까지 6.3% CAGR이 전망됩니다. 베트남은 미국을 제치고 세계 3위 생산국으로 부상했으며, 최대 시멘트 수출국 지위를 유지하고 있습니다. 총 소비량은 100 Mt을 돌파했고, 이 중 시멘트·클링커 수출은 약 37 Mt으로 전체의 32%에 달합니다.',
        '구조적 문제는 수요가 아닌 공급에 있습니다. 92개 라인, 122 Mt 이상의 설치 용량이 70 Mt 미만의 국내 수요를 크게 상회하며, 2024년 가동률은 64%에 그쳤습니다. 수출이 잉여를 해소하고 있으나, 필리핀 무역구제·EU CBAM·국내 탄소시장이 이 배출구의 가격을 저클링커·저탄소 제품 방향으로 재조정하고 있습니다.',
      ],
      chart: {
        title: '설비 용량 vs 수요 vs 수출 배출구',
        subtitle: '베트남 · Mt/yr · 2025',
        bars: chartBarsKo,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',           pages: 'P 004', locked: false },
      { num: '03', name: '전략적 시사점',         pages: 'P 005', locked: true  },
      { num: '04', name: '시장 규모 & 공급과잉',  pages: 'P 007', locked: true  },
      { num: '04', name: '국내 수요 견인 요인',   pages: 'P 008', locked: true  },
      { num: '05', name: '수출 물량',             pages: 'P 010', locked: true  },
      { num: '05', name: '무역 장벽 & 완화',      pages: 'P 011', locked: true  },
      { num: '05', name: '원가 & 마진 압박',      pages: 'P 012', locked: true  },
      { num: '06', name: '경쟁 구조',             pages: 'P 014', locked: true  },
      { num: '07', name: '2027 전망 & 시나리오',  pages: 'P 016', locked: true  },
      { num: '07', name: '방법론 & 출처',         pages: 'P 017', locked: true  },
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
