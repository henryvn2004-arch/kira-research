// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-sg-data-center. Run:
//   node skills/kira-research-report/scripts/_build_2027-sg-data-center_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql (or PostgREST upsert if MCP down).
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.
// Slug convention: Data Center family is industry-first (data-center-<country>-<year>).

const SLUG     = 'data-center-singapore-2027';
const COUNTRY  = 'Singapore';
const INDUSTRY = 'Data Center';
const YEAR     = 2027;
const PAGES    = 17;
const PRICE    = 39;

// Exec chart (page 4): released capacity vs spill-over pipeline. Bar heights 28/40/112 → pct.
const chartBarsEn = [
  { pct: 25,  label: 'SG released',    value: '~500'   },
  { pct: 36,  label: 'SG live',        value: '700+'   },
  { pct: 100, label: 'Johor pipeline', value: '2,000+' },
];
const chartBarsJa = [
  { pct: 25,  label: 'SG放出',     value: '~500'   },
  { pct: 36,  label: 'SG稼働',     value: '700+'   },
  { pct: 100, label: 'ジョホール', value: '2,000+' },
];
const chartBarsKo = [
  { pct: 25,  label: 'SG 방출',  value: '~500'   },
  { pct: 36,  label: 'SG 가동',  value: '700+'   },
  { pct: 100, label: '조호르',   value: '2,000+' },
];

const META = {
  en: {
    title: "Singapore's data center allocation regime — capacity, the green gate, and the spill-over",
    eyebrow: 'SINGAPORE · DATA CENTER · MARKET ANALYSIS',
    preview: {
      lede: "Singapore's data center market was worth about USD 4.2 bn in 2024, on a path toward ~USD 5.6 bn by 2030 [Operator filings 2025], on a live base above 700 MW with the lowest colocation vacancy in the region, near 1.4% [Structure Research 2024]. Post-moratorium, capacity is released in deliberate tranches: a green-energy gate, not demand, decides what lands in Singapore — and pushes the remainder offshore to Johor and Batam [IMDA-EDB 2025].",
      paragraphs: [
        "Singapore's data center market was worth about USD 4.2 bn in 2024, on a path toward ~USD 5.6 bn by 2030 [Operator filings 2025], on a live base above 700 MW with the lowest colocation vacancy in the region, near 1.4% [Structure Research 2024]. After the 2019–2022 build pause, supply is now released in deliberate tranches rather than left to the market.",
        "The constraint is policy, not land. The Green Data Centre Roadmap released at least 300 MW near-term plus 200 MW more for green deployments [IMDA GDCR 2024], and the DC-CFA2 call (Dec 2025) allocates 200+ MW under a 50% green-energy mandate and a 1.25 PUE bar [IMDA-EDB 2025]. Capacity that cannot clear the gate goes to Johor and Batam.",
      ],
      chart: {
        title: 'Released capacity vs spill-over pipeline',
        subtitle: 'SG allocation vs Johor pipeline · MW',
        bars: chartBarsEn,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',         pages: 'PG 04', locked: false },
      { num: '03', name: 'Strategic implications',     pages: 'PG 05', locked: true  },
      { num: '04', name: 'Market sizing & trajectory', pages: 'PG 07', locked: true  },
      { num: '04', name: 'Demand drivers',             pages: 'PG 08', locked: true  },
      { num: '05', name: 'Power & sustainability',     pages: 'PG 10', locked: true  },
      { num: '05', name: 'Capacity allocation',        pages: 'PG 11', locked: true  },
      { num: '06', name: 'The overseas spill-over',    pages: 'PG 13', locked: true  },
      { num: '06', name: 'Competitive structure',      pages: 'PG 14', locked: true  },
      { num: '07', name: '2027 outlook & scenarios',   pages: 'PG 16', locked: true  },
      { num: '07', name: 'Methodology & sources',      pages: 'PG 17', locked: true  },
    ],
  },

  ja: {
    title: 'シンガポールのデータセンター配分制度 — 容量、グリーン・ゲート、そしてスピルオーバー',
    eyebrow: 'シンガポール · データセンター · マーケット分析',
    preview: {
      lede: 'シンガポールのデータセンター市場は2024年時点でUSD 42億規模であり、2030年には~USD 56億（CAGR~5%）への成長が見込まれます[Operator filings 2025]。稼働ベースは700MW超で、地域内で最も低い空室率（約1.4%）を維持しています[Structure Research 2024]。モラトリアム後、供給は計画的なトランシェとして放出され、グリーンエネルギー・ゲートがシンガポールに着地する容量を決定し、残りはジョホールとバタムへと溢れ出します[IMDA-EDB 2025]。',
      paragraphs: [
        'シンガポールのデータセンター市場は2024年時点でUSD 42億規模であり、2030年には~USD 56億（CAGR~5%）への成長が見込まれます[Operator filings 2025]。稼働ベースは700MW超で、地域内で最も低い空室率（約1.4%）を維持しています[Structure Research 2024]。2019–2022年の建設停止後、供給は市場任せではなく計画的なトランシェとして放出されています。',
        '制約は土地ではなく政策です。Green Data Centre Roadmapは近期に少なくとも300MW、さらにグリーン展開向けに200MWを放出し[IMDA GDCR 2024]、DC-CFA2（2025年12月）は200MW超を50%グリーンエネルギー義務とPUE 1.25の条件下で配分します[IMDA-EDB 2025]。このゲートをクリアできない容量はジョホールとバタムへと向かいます。',
      ],
      chart: {
        title: '放出容量とスピルオーバーパイプラインの比較',
        subtitle: 'SG配分 vs ジョホールパイプライン · MW',
        bars: chartBarsJa,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',         pages: 'P 04', locked: false },
      { num: '03', name: '戦略的示唆',                     pages: 'P 05', locked: true  },
      { num: '04', name: '市場規模と軌跡',                 pages: 'P 07', locked: true  },
      { num: '04', name: '需要ドライバー',                 pages: 'P 08', locked: true  },
      { num: '05', name: '電力・サステナビリティ',         pages: 'P 10', locked: true  },
      { num: '05', name: '容量配分',                       pages: 'P 11', locked: true  },
      { num: '06', name: '海外スピルオーバー',             pages: 'P 13', locked: true  },
      { num: '06', name: '競争構造',                       pages: 'P 14', locked: true  },
      { num: '07', name: '2027年アウトルックとシナリオ',   pages: 'P 16', locked: true  },
      { num: '07', name: '調査手法と出典',                 pages: 'P 17', locked: true  },
    ],
  },

  ko: {
    title: '싱가포르 데이터센터 배분 체계 — 용량, 녹색 게이트, 그리고 해외 유출',
    eyebrow: '싱가포르 · 데이터센터 · 시장 분석',
    preview: {
      lede: '싱가포르 데이터센터 시장은 2024년 약 USD 4.2 bn으로, 2030년 ~USD 5.6 bn(~5% CAGR) 경로에 있습니다[Operator filings 2025]. 가동 기반은 700 MW를 상회하며 역내 최저 수준인 약 1.4% 공실을 기록하고 있습니다[Structure Research 2024]. 모라토리엄 이후 공급은 계획적 트랜치로 방출되며, 녹색 에너지 게이트가 싱가포르 착지 여부를 결정하고 나머지는 조호르와 바탐으로 유출됩니다[IMDA-EDB 2025].',
      paragraphs: [
        '싱가포르 데이터센터 시장은 2024년 약 USD 4.2 bn으로, 2030년 ~USD 5.6 bn(~5% CAGR) 경로에 있습니다[Operator filings 2025]. 가동 기반은 700 MW를 상회하며 역내 최저 수준인 약 1.4% 공실을 기록하고 있습니다[Structure Research 2024]. 2019–2022년 건설 중단 이후 공급은 시장 자율이 아닌 계획적 트랜치로 방출됩니다.',
        '제약 요인은 토지가 아닌 정책입니다. Green Data Centre Roadmap은 단기 최소 300 MW에 녹색 배치 추가 200 MW를 방출했고[IMDA GDCR 2024], DC-CFA2(2025년 12월)는 50% 녹색 에너지 의무화 및 PUE 1.25 기준 하에 200+ MW를 배분합니다[IMDA-EDB 2025]. 이 기준을 통과하지 못하는 용량은 조호르와 바탐으로 향합니다.',
      ],
      chart: {
        title: '방출 용량 대 해외 유출 파이프라인',
        subtitle: 'SG 배분 vs 조호르 파이프라인 · MW',
        bars: chartBarsKo,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',                pages: 'P 04', locked: false },
      { num: '03', name: '전략적 시사점',              pages: 'P 05', locked: true  },
      { num: '04', name: '시장 규모 및 성장 궤적',     pages: 'P 07', locked: true  },
      { num: '04', name: '수요 동인',                  pages: 'P 08', locked: true  },
      { num: '05', name: '전력 및 지속가능성',         pages: 'P 10', locked: true  },
      { num: '05', name: '용량 배분',                  pages: 'P 11', locked: true  },
      { num: '06', name: '해외 유출',                  pages: 'P 13', locked: true  },
      { num: '06', name: '경쟁 구조',                  pages: 'P 14', locked: true  },
      { num: '07', name: '2027 전망 및 시나리오',      pages: 'P 16', locked: true  },
      { num: '07', name: '방법론 및 출처',             pages: 'P 17', locked: true  },
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
