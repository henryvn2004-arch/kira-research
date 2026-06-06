// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-my-data-center-johor (Malaysia data centre, Johor / JS-SEZ).
// pdf_url emits a STORAGE PATH computed inside the SQL; storage upload happens after.

const SLUG    = 'data-center-malaysia-2026';
const COUNTRY = 'Malaysia';
const INDUSTRY= 'Data Center';
const YEAR    = 2026;
const PAGES   = 16;
const PRICE   = 39;

// Johor data centre capacity ladder (MW). Max ~3,300 → pct relative.
const chartBars = [
  { pct: 26,  label: 'Live',     value: '~850'   },
  { pct: 21,  label: 'Building', value: '~700'   },
  { pct: 100, label: 'Pipeline', value: '~3,300' },
];

const META = {
  en: {
    title: "Johor's data centre build-out at the JS-SEZ inflection",
    eyebrow: 'MALAYSIA · DATA CENTRE INFRASTRUCTURE · 2026',
    preview: {
      lede: "Johor's data centre surge is fundamentally Singapore's overflow. A 2019 moratorium and tight green rules capped the island — even the December 2025 DC-CFA2 call releases only ~200 MW there [IMDA 2025]. Sixteen kilometres away with sub-5 ms latency and 20+ subsea cables, Johor absorbs the workloads Singapore cannot site, and the January 2025 JS-SEZ pact has reset the cost of co-locating south. Malaysian capacity is set to roughly double to 2,055 MW in 2026 [JLL 2026]; the build is now power-gated, not demand-gated.",
      paragraphs: [
        "This report covers the demand engine (Singapore overflow mechanics, latency and cable geography), Johor's capacity ladder across live, building and ~4 GW pipeline, the JS-SEZ co-investment mechanics and incentives (5% corporate tax for up to 15 years, 100% investment tax allowance), the operator landscape, and the binding constraints of grid headroom, tariffs and water stress.",
        "The 2026 inflection is structural, not cyclical. JS-SEZ projects made up 74.6% of Johor's RM91.1 bn approved investment in 9M 2025 [MIDA 2025], and the market is forecast to compound at 22.4% to USD 13.6 bn by 2030 [Arizton 2025]. Section 10 profiles the pivot from colocation overflow to sovereign and AI compute, and Section 11 sets capacity scenarios to 2030.",
      ],
      chart: {
        title: 'Johor data centre capacity ladder',
        subtitle: 'Johor · MW · live → pipeline',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'Executive summary',                      pages: 'PG 004', locked: false },
      { num: '05', name: 'The demand engine',                      pages: 'PG 006', locked: true  },
      { num: '06', name: 'Capacity build-out',                     pages: 'PG 008', locked: true  },
      { num: '07', name: 'Where capital lands',                    pages: 'PG 010', locked: true  },
      { num: '08', name: 'Operator landscape',                     pages: 'PG 011', locked: true  },
      { num: '09', name: 'Power, water and the binding constraint',pages: 'PG 013', locked: true  },
      { num: '10', name: 'The AI workload pivot',                  pages: 'PG 014', locked: true  },
      { num: '11', name: 'Outlook to 2030',                        pages: 'PG 015', locked: true  },
    ],
  },

  ja: {
    title: 'JS-SEZ転換点におけるジョホールのデータセンター建設拡張',
    eyebrow: 'マレーシア · データセンターインフラ · 2026',
    preview: {
      lede: 'ジョホールのデータセンター急増は本質的にシンガポールの需要溢れです。2019年のモラトリアムと厳格な環境規制が同島を制約し、2025年12月のDC-CFA2募集でも解放されるのは約200 MWにとどまります[IMDA 2025]。16km先でレイテンシ5ms未満、20本超の海底ケーブルを持つジョホールが、シンガポールで立地できないワークロードを吸収し、2025年1月のJS-SEZ協定が南側への共同立地コストを変えました。マレーシアの設備容量は2026年に約2倍の2,055 MWへ拡大する見通しで[JLL 2026]、建設は需要ではなく電力に律速されています。',
      paragraphs: [
        '本レポートは、需要エンジン(シンガポール需要溢れの構造、レイテンシと海底ケーブル地理)、稼働中・建設中・約4 GWのパイプラインにわたるジョホールの設備容量ラダー、JS-SEZの共同投資メカニズムとインセンティブ(最長15年間の法人税率5%、投資税額控除100%)、事業者の競争構造、そして系統余力・電力料金・水ストレスという制約要因を扱います。',
        '2026年の転換点は循環的ではなく構造的です。2025年9月期にJS-SEZプロジェクトはジョホール承認投資額RM91.1 bnの74.6%を占め[MIDA 2025]、市場は2030年までにUSD 13.6 bnへ年率22.4%で拡大すると予測されます[Arizton 2025]。第10章はコロケーション溢れからソブリン/AI計算基盤への転換を、第11章は2030年までの容量シナリオを示します。',
      ],
      chart: {
        title: 'ジョホール データセンター設備容量ラダー',
        subtitle: 'ジョホール · MW · 稼働中 → パイプライン',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'エグゼクティブサマリー',          pages: 'P 004', locked: false },
      { num: '05', name: '需要の推進力',                    pages: 'P 006', locked: true  },
      { num: '06', name: '設備容量の建設拡張',              pages: 'P 008', locked: true  },
      { num: '07', name: '資本の集積地',                    pages: 'P 010', locked: true  },
      { num: '08', name: '事業者の競争構造',                pages: 'P 011', locked: true  },
      { num: '09', name: '電力・水資源と制約要因',          pages: 'P 013', locked: true  },
      { num: '10', name: 'AIワークロードへの転換',          pages: 'P 014', locked: true  },
      { num: '11', name: '2030年展望',                      pages: 'P 015', locked: true  },
    ],
  },

  ko: {
    title: 'JS-SEZ 변곡점에서의 조호르 데이터센터 구축',
    eyebrow: '말레이시아 · 데이터센터 인프라 · 2026',
    preview: {
      lede: '조호르의 데이터센터 급성장은 본질적으로 싱가포르의 초과 수요입니다. 2019년 모라토리엄과 엄격한 친환경 규정이 싱가포르 섬 공급을 제한했고, 2025년 12월 DC-CFA2 공모조차 약 200 MW만 해제합니다[IMDA 2025]. 5 ms 미만 레이턴시와 20개 이상 해저 케이블을 갖춘 16 km 거리의 조호르가 싱가포르가 수용하지 못하는 워크로드를 흡수하며, 2025년 1월 JS-SEZ 협정이 남쪽 코로케이션 비용 구조를 재설정했습니다. 말레이시아 용량은 2026년 약 2배인 2,055 MW로 확대될 전망이며[JLL 2026], 구축은 이제 수요가 아닌 전력에 의해 제약됩니다.',
      paragraphs: [
        '본 보고서는 수요 엔진(싱가포르 초과 수요 메커니즘, 레이턴시·해저 케이블 지리), 가동·건설·약 4 GW 파이프라인에 걸친 조호르 용량 계단, JS-SEZ 공동투자 메커니즘과 인센티브(최대 15년 법인세 5%, 100% 투자 세액공제), 사업자 현황, 그리고 계통 여력·전력 요금·물 스트레스라는 구조적 제약을 다룹니다.',
        '2026년 변곡점은 순환적이 아닌 구조적입니다. 2025년 9M JS-SEZ 사업이 조호르 승인 투자액 RM91.1 bn의 74.6%를 차지했으며[MIDA 2025], 시장은 2030년까지 USD 13.6 bn으로 연 22.4% 성장할 전망입니다[Arizton 2025]. 제10장은 코로케이션 초과분에서 소버린·AI 컴퓨팅으로의 전환을, 제11장은 2030년까지의 용량 시나리오를 제시합니다.',
      ],
      chart: {
        title: '조호르 데이터센터 용량 계단',
        subtitle: '조호르 · MW · 가동 → 파이프라인',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: '경영진 요약',                    pages: 'P 004', locked: false },
      { num: '05', name: '수요 동인',                      pages: 'P 006', locked: true  },
      { num: '06', name: '용량 구축',                      pages: 'P 008', locked: true  },
      { num: '07', name: '자본 귀속지',                    pages: 'P 010', locked: true  },
      { num: '08', name: '사업자 현황',                    pages: 'P 011', locked: true  },
      { num: '09', name: '전력·수자원과 구조적 제약',       pages: 'P 013', locked: true  },
      { num: '10', name: 'AI 워크로드 전환',               pages: 'P 014', locked: true  },
      { num: '11', name: '2030년 전망',                    pages: 'P 015', locked: true  },
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
