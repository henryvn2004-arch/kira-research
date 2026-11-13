// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-vn-data-center. Run:
//   node skills/kira-research-report/scripts/_build_2027-vn-data-center_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql (or PostgREST upsert if MCP down).
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'data-center-vietnam-2027';
const COUNTRY  = 'Vietnam';
const INDUSTRY = 'Data Center';
const YEAR     = 2027;
const PAGES    = 17;
const PRICE    = 39;

// Exec chart (page 4): live capacity vs announced pipeline. Max ~525 → pct.
const chartBarsEn = [
  { pct: 11,  label: 'HCMC+HN live',  value: '~60'  },
  { pct: 100, label: 'VN live total', value: '~525' },
  { pct: 95,  label: 'HCMC pipeline', value: '500+' },
];
const chartBarsJa = [
  { pct: 11,  label: 'HCMC+HN稼働',     value: '~60'  },
  { pct: 100, label: 'VN稼働合計',       value: '~525' },
  { pct: 95,  label: 'HCMCパイプライン', value: '500+' },
];
const chartBarsKo = [
  { pct: 11,  label: 'HCMC+HN 운영',      value: '~60'  },
  { pct: 100, label: 'VN 운영 합계',       value: '~525' },
  { pct: 95,  label: 'HCMC 파이프라인',    value: '500+' },
];

const META = {
  en: {
    title: "Vietnam's data center landing test — capacity, power and the 2027 squeeze",
    eyebrow: 'VIETNAM · DATA CENTER · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's data center market reached USD 1.04 bn in 2025 with installed capacity near 525 MW, on a path toward ~950 MW by 2030 at a 12.6% CAGR [DC Outlook 2025]. Yet only about 60 MW is live across the HCMC and Hanoi clusters against a 500+ MW announced pipeline [VnEconomy 2025]. Power supply and grid transmission, not demand, set the pace at which hyperscale capacity actually lands [MOIT 2025].",
      paragraphs: [
        "Vietnam's data center market reached USD 1.04 bn in 2025 [Arizton 2025] with installed capacity near 525 MW [DC Outlook 2025], on a path toward ~950 MW by 2030 at a 12.6% CAGR. Hyperscale ambition is real: announced and under-construction projects in Ho Chi Minh City alone exceed 500 MW [DCD 2026], anchored by a USD 2 bn G42-Microsoft-FPT campus and Viettel IDC's 140 MW Tan Phu Trung build [Cafef 2025].",
        "The bottleneck is physical. Operational load across Hanoi and HCMC was only about 60 MW in 2025 against a national live base near 104 MW [VnEconomy 2025]. Closing the gap to the announced pipeline depends on grid transmission and clean-power access — national demand is set to grow 10.3-12.5% a year through 2030 [MOIT 2025], and high-tech loads already report intermittent supply stress.",
      ],
      chart: {
        title: 'Live capacity vs announced pipeline',
        subtitle: 'Vietnam · MW · 2025 actual vs pipeline',
        bars: chartBarsEn,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',          pages: 'PG 04', locked: false },
      { num: '03', name: 'Strategic implications',      pages: 'PG 05', locked: true  },
      { num: '04', name: 'Market sizing & trajectory',  pages: 'PG 07', locked: true  },
      { num: '04', name: 'Demand drivers',              pages: 'PG 08', locked: true  },
      { num: '05', name: 'Power & the grid',            pages: 'PG 10', locked: true  },
      { num: '05', name: 'The operational gap',         pages: 'PG 11', locked: true  },
      { num: '05', name: 'Connectivity & regulation',   pages: 'PG 12', locked: true  },
      { num: '06', name: 'Competitive structure',       pages: 'PG 14', locked: true  },
      { num: '07', name: '2027 outlook & scenarios',    pages: 'PG 16', locked: true  },
      { num: '07', name: 'Methodology & sources',       pages: 'PG 17', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナムのデータセンター 着地テスト — 容量・電力と2027年の制約',
    eyebrow: 'ベトナム · データセンター · マーケット分析',
    preview: {
      lede: 'ベトナムのデータセンター市場は2025年にUSD 10.4億に達し、設置容量は約525 MW、12.6% CAGRで2030年には約950 MWに向かっています[DC Outlook 2025]。しかしHCMCとハノイの2大クラスターで稼働中の容量は約60 MWにすぎず、500 MW超の発表済みパイプラインと対照的です[VnEconomy 2025]。ハイパースケール容量が実際に着地するペースを決めるのは需要ではなく、電力と送電網です[MOIT 2025]。',
      paragraphs: [
        'ベトナムのデータセンター市場は2025年にUSD 10.4億に達し[Arizton 2025]、設置容量は約525 MW[DC Outlook 2025]、12.6% CAGRで2030年には約950 MWに向かっています。ハイパースケールへの意欲は本物です：ホーチミン市の発表済み・建設中プロジェクトだけで500 MW超[DCD 2026]に上り、USD 20億のG42-Microsoft-FPTキャンパスとViettel IDCのタンフータウン140 MWビルドがその中核を担っています[Cafef 2025]。',
        'ボトルネックは物理的なものです。ハノイとHCMCの稼働負荷は2025年時点で約60 MWにとどまり、全国稼働ベースは約104 MW[VnEconomy 2025]。発表済みパイプラインとのギャップを埋めるには送電網の整備とクリーン電力へのアクセスが前提となります。全国需要は2030年まで年率10.3-12.5%拡大し[MOIT 2025]、ハイテク向け負荷ではすでに断続的な電力ストレスが報告されています。',
      ],
      chart: {
        title: '稼働容量 対 発表済みパイプライン',
        subtitle: 'ベトナム · MW · 2025年実績 対 パイプライン',
        bars: chartBarsJa,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',   pages: 'P 04', locked: false },
      { num: '03', name: '戦略的示唆',               pages: 'P 05', locked: true  },
      { num: '04', name: '市場規模・成長軌道',       pages: 'P 07', locked: true  },
      { num: '04', name: '需要ドライバー',           pages: 'P 08', locked: true  },
      { num: '05', name: '電力と送電網',             pages: 'P 10', locked: true  },
      { num: '05', name: '稼働ギャップ',             pages: 'P 11', locked: true  },
      { num: '05', name: '接続性と規制',             pages: 'P 12', locked: true  },
      { num: '06', name: '競合構造',                 pages: 'P 14', locked: true  },
      { num: '07', name: '2027年展望・シナリオ',     pages: 'P 16', locked: true  },
      { num: '07', name: '分析手法・出典',           pages: 'P 17', locked: true  },
    ],
  },

  ko: {
    title: '베트남 데이터센터 안착 시험 — 용량, 전력, 그리고 2027년의 병목',
    eyebrow: '베트남 · 데이터센터 · 시장 분석',
    preview: {
      lede: '베트남 데이터센터 시장은 2025년 USD 10억 4천만에 달했으며, 설치 용량은 525 MW 수준으로 12.6% CAGR에 따라 2030년 ~950 MW를 향해 나아가고 있습니다[DC Outlook 2025]. 그러나 HCMC와 하노이 두 클러스터에서 운영 중인 용량은 약 60 MW에 불과해 500 MW 이상의 발표 파이프라인과 대조를 이룹니다[VnEconomy 2025]. 하이퍼스케일 용량이 실제로 안착하는 속도를 결정하는 것은 수요가 아니라 전력과 송전망입니다[MOIT 2025].',
      paragraphs: [
        '베트남 데이터센터 시장은 2025년 USD 10억 4천만에 달했으며[Arizton 2025], 설치 용량은 525 MW 수준[DC Outlook 2025]으로, 12.6% CAGR에 따라 2030년 ~950 MW를 향해 나아가고 있습니다. 하이퍼스케일에 대한 의지는 구체적입니다: 호치민시에서만 발표 및 건설 중인 프로젝트가 500 MW를 초과하며[DCD 2026], USD 20억 규모의 G42-Microsoft-FPT 캠퍼스와 Viettel IDC의 140 MW Tan Phu Trung 건설 프로젝트가 핵심을 이룹니다[Cafef 2025].',
        '병목은 물리적 요인입니다. 전국 운영 기반이 약 104 MW인 가운데, 하노이·HCMC의 운영 부하는 2025년 약 60 MW에 그쳤습니다[VnEconomy 2025]. 발표 파이프라인과의 격차를 좁히려면 송전망 확충과 청정에너지 접근이 선행되어야 합니다. 전국 전력 수요는 2030년까지 연 10.3-12.5% 성장할 전망[MOIT 2025]이며, 첨단 기술 부하는 이미 간헐적인 전력 공급 스트레스를 겪고 있습니다.',
      ],
      chart: {
        title: '운영 용량 대비 발표 파이프라인',
        subtitle: '베트남 · MW · 2025 실적 vs 파이프라인',
        bars: chartBarsKo,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',             pages: 'P 04', locked: false },
      { num: '03', name: '전략적 시사점',           pages: 'P 05', locked: true  },
      { num: '04', name: '시장 규모 및 궤적',       pages: 'P 07', locked: true  },
      { num: '04', name: '수요 동인',               pages: 'P 08', locked: true  },
      { num: '05', name: '전력 및 송전망',          pages: 'P 10', locked: true  },
      { num: '05', name: '운영 격차',               pages: 'P 11', locked: true  },
      { num: '05', name: '연결성 및 규제',          pages: 'P 12', locked: true  },
      { num: '06', name: '경쟁 구조',               pages: 'P 14', locked: true  },
      { num: '07', name: '2027 전망 및 시나리오',   pages: 'P 16', locked: true  },
      { num: '07', name: '방법론 및 출처',          pages: 'P 17', locked: true  },
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
