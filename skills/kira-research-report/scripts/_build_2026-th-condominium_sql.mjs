// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-th-condominium. Run:
//   node skills/kira-research-report/scripts/_build_2026-th-condominium_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql (or PostgREST upsert if MCP down).
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'condominium-thailand-2026';
const COUNTRY  = 'Thailand';
const INDUSTRY = 'Condominium';
const YEAR     = 2026;
const PAGES    = 17;
const PRICE    = 39;

// Exec chart (page 4): foreign condo transfer value THB bn, 2023-2025. Max 73 -> pct.
const chartBars = [
  { pct: 100, label: '2023', value: '73'   },
  { pct: 93,  label: '2024', value: '68'   },
  { pct: 83,  label: '2025', value: '60.9' },
];

const META = {
  en: {
    title: "Thailand's condominium reset — the Chinese-buyer rebound meets a Bangkok mid-tier glut",
    eyebrow: 'THAILAND · CONDOMINIUM · MARKET ANALYSIS',
    preview: {
      lede: "Two pressures meet in 2026. Bangkok ended 2025 with about 93,600 unsold condominium units worth ~THB 760 bn, condominiums making up nearly 38% of all unsold residential stock [REIC 2025]. At the same time, foreign condominium transfers reached 14,899 units in 2025 (+2.2%) but value fell 10.7% to THB 60.9 bn as Chinese buyers traded down to smaller units [REIC 2025].",
      paragraphs: [
        "Two pressures meet in 2026. Bangkok ended 2025 with about 93,600 unsold condominium units worth ~THB 760 bn, condominiums making up nearly 38% of all unsold residential stock [REIC 2025]. At the same time, foreign condominium transfers reached 14,899 units in 2025 (+2.2%) but value fell 10.7% to THB 60.9 bn as Chinese buyers traded down to smaller units [REIC 2025].",
        "The Chinese rebound is partial, not restored. China still leads foreign buyers but its share slid from roughly 60% to ~30%, pressured by a soft domestic property cycle and tighter capital controls [Nation 2026]. Q1 2026 foreign transfers fell 17.3% to 3,241 units [REIC 2026]. Russian and Indian demand partly fills the gap, but neither matches China's prior scale.",
      ],
      chart: {
        title: 'Foreign condo transfers — value vs China share',
        subtitle: 'Thailand · THB bn · 2022–2025',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',         pages: 'PG 04', locked: false },
      { num: '03', name: 'Strategic implications',     pages: 'PG 05', locked: true  },
      { num: '04', name: 'Macro & policy backdrop',    pages: 'PG 07', locked: true  },
      { num: '05', name: 'Foreign demand reset',       pages: 'PG 09', locked: true  },
      { num: '06', name: 'Market size & trajectory',   pages: 'PG 11', locked: true  },
      { num: '06', name: 'The mid-tier oversupply',    pages: 'PG 12', locked: true  },
      { num: '07', name: 'Competitive structure',      pages: 'PG 14', locked: true  },
      { num: '10', name: 'Technology in the channel',  pages: 'PG 15', locked: true  },
      { num: '11', name: '2028 outlook & scenarios',   pages: 'PG 16', locked: true  },
      { num: '12', name: 'Methodology & sources',      pages: 'PG 17', locked: true  },
    ],
  },

  ja: {
    title: 'タイ コンドミニアムの調整 — 中国人購入者の回帰とバンコク中価格帯の在庫過剰',
    eyebrow: 'タイ · コンドミニアム · マーケット分析',
    preview: {
      lede: '2026年には2つの圧力が交差しています。バンコクは2025年末時点で約93,600戸・約THB 760 bn相当の未売却コンドミニアムを抱え、コンドミニアムが未売却住宅全体の約38%を占めています[REIC 2025]。一方、外国人コンドミニアム移転登記は2025年に14,899戸（+2.2%）と戸数は微増したものの、中国人購入者が小型ユニットにシフトしたことで価値は10.7%減のTHB 60.9 bnに落ち込みました[REIC 2025]。',
      paragraphs: [
        '2026年には2つの圧力が交差しています。バンコクは2025年末時点で約93,600戸・約THB 760 bn相当の未売却コンドミニアムを抱え、コンドミニアムが未売却住宅全体の約38%を占めています[REIC 2025]。一方、外国人コンドミニアム移転登記は2025年に14,899戸（+2.2%）と戸数は微増したものの、中国人購入者が小型ユニットにシフトしたことで価値は10.7%減のTHB 60.9 bnに落ち込みました[REIC 2025]。',
        '中国人需要の回帰は部分的であり、本格回復には至っていません。中国は依然として外国人購入者の首位ですが、国内不動産市況の軟化と資本規制の強化により、そのシェアは約60%から約30%へと半減しています[Nation 2026]。Q1 2026の外国人移転登記は17.3%減の3,241戸でした[REIC 2026]。ロシアおよびインドからの需要が一部補完していますが、かつての中国規模には及びません。',
      ],
      chart: {
        title: '外国人コンドミニアム移転登記 — 価値と中国シェア',
        subtitle: 'タイ · THB bn · 2022–2025年',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブ・サマリー', pages: 'P 04', locked: false },
      { num: '03', name: '戦略的示唆',               pages: 'P 05', locked: true  },
      { num: '04', name: 'マクロ・政策の背景',       pages: 'P 07', locked: true  },
      { num: '05', name: '外国人需要の調整',         pages: 'P 09', locked: true  },
      { num: '06', name: '市場規模と軌跡',           pages: 'P 11', locked: true  },
      { num: '06', name: '中価格帯の在庫過剰',       pages: 'P 12', locked: true  },
      { num: '07', name: '競争構造',                 pages: 'P 14', locked: true  },
      { num: '10', name: 'テクノロジーの活用',       pages: 'P 15', locked: true  },
      { num: '11', name: '2028年展望・シナリオ',     pages: 'P 16', locked: true  },
      { num: '12', name: '調査手法・出典',           pages: 'P 17', locked: true  },
    ],
  },

  ko: {
    title: '태국 콘도미니엄 재편 — 중국인 구매자 반등이 방콕 중간가 공급 과잉과 맞닥뜨리다',
    eyebrow: '태국 · 콘도미니엄 · 시장 분석',
    preview: {
      lede: '두 가지 압박이 2026년에 교차합니다. 방콕은 2025년 말 기준 약 93,600세대, 가액 약 THB 760 bn의 미분양 콘도미니엄을 보유하며, 콘도미니엄이 전체 미분양 주거용 재고의 거의 38%를 차지합니다[REIC 2025]. 동시에 외국인 콘도 양도는 2025년 14,899세대(+2.2%)로 세대 수는 소폭 증가했지만 가액은 10.7% 감소하여 THB 60.9 bn에 그쳤는데, 중국인 구매자들이 더 소형 단위로 이동했기 때문입니다[REIC 2025].',
      paragraphs: [
        '두 가지 압박이 2026년에 교차합니다. 방콕은 2025년 말 기준 약 93,600세대, 가액 약 THB 760 bn의 미분양 콘도미니엄을 보유하며, 콘도미니엄이 전체 미분양 주거용 재고의 거의 38%를 차지합니다[REIC 2025]. 동시에 외국인 콘도 양도는 2025년 14,899세대(+2.2%)로 세대 수는 소폭 증가했지만 가액은 10.7% 감소하여 THB 60.9 bn에 그쳤는데, 중국인 구매자들이 더 소형 단위로 이동했기 때문입니다[REIC 2025].',
        '중국인 반등은 회복이 아닌 부분적 개선에 불과합니다. 중국은 여전히 외국인 구매자 1위를 유지하지만 점유율은 약 60%에서 ~30%로 하락했습니다. 자국 부동산 경기 둔화와 자본 통제 강화가 배경입니다[Nation 2026]. Q1 2026 외국인 양도는 17.3% 감소한 3,241세대에 머물렀습니다[REIC 2026]. 러시아와 인도 수요가 일부 공백을 메우고 있으나 중국의 이전 규모에는 미치지 못합니다.',
      ],
      chart: {
        title: '외국인 콘도 양도 — 가액 vs 중국 비중',
        subtitle: '태국 · THB bn · 2022–2025',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',             pages: 'P 04', locked: false },
      { num: '03', name: '전략적 시사점',           pages: 'P 05', locked: true  },
      { num: '04', name: '거시·정책 배경',          pages: 'P 07', locked: true  },
      { num: '05', name: '외국인 수요 재편',        pages: 'P 09', locked: true  },
      { num: '06', name: '시장 규모 및 추세',       pages: 'P 11', locked: true  },
      { num: '06', name: '중간가 공급 과잉',        pages: 'P 12', locked: true  },
      { num: '07', name: '경쟁 구조',               pages: 'P 14', locked: true  },
      { num: '10', name: '채널 내 기술',            pages: 'P 15', locked: true  },
      { num: '11', name: '2028 전망 및 시나리오',   pages: 'P 16', locked: true  },
      { num: '12', name: '방법론 및 출처',          pages: 'P 17', locked: true  },
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
