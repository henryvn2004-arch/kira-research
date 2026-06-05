// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-th-automotive-hev (Thailand Automotive 2027). Modeled on _build_2027-th-ev_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_2027-th-automotive-hev_sql.mjs > /tmp/insert_th_auto.sql`
// then feed to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL
// CTE from new_report.id — NOT a GitHub raw URL.

const SLUG     = 'thailand-automotive-2027';
const COUNTRY  = 'Thailand';
const INDUSTRY = 'Automotive';
const YEAR     = 2027;
const PAGES    = 26;
const PRICE    = 39;

// Chart bars — 2025 powertrain sales mix ('000 units, passenger market).
// HEV 151, BEV 126, PHEV 17. Max 151 → pct relative.
const chartBars = [
  { pct: 100, label: 'HEV',  value: 151 },
  { pct: 83,  label: 'BEV',  value: 126 },
  { pct: 11,  label: 'PHEV', value: 17  },
];

const META = {
  en: {
    title: "Thailand's auto market 2027: the hybrid counter-attack",
    eyebrow: 'THAILAND · AUTOMOTIVE · MARKET ANALYSIS',
    preview: {
      lede: "Thailand's auto market enters 2027 with a split personality: Chinese brands own the battery-electric headline — 70-80% of BEV volume and seven of the top-ten EV brands — yet in 2025 hybrids quietly outsold pure EVs, reaching 151,000 units at a ~25% share versus 126,000 BEVs [Proliance 2025]. Japanese makers still hold 69%+ of the total market against China's ~22%, and the 2026 CO2-based excise reset plus a used-car residual shock hand the incumbents a defensible mass-market position even as their share slips toward the high-60s.",
      paragraphs: [
        "Hybrids reached 151,000 units at a ~25% passenger-market share in 2025, outselling battery-electric vehicles by nearly 26,000 units [Proliance 2025]. Toyota and Honda lead the segment — HEVs bridge fuel efficiency with no range anxiety, the binding concern for upcountry travel. xEV demand grew 43.8% in H1 2025 with HEVs at 50.6% of that mix [MReport 2025].",
        "This report covers the macro backdrop, sector sizing and the HEV-vs-BEV trajectory, segment economics, the competitive landscape with profiles of Toyota, Honda, BYD and GWM, demand drivers and channels, the 2026 CO2 excise reset and 30@30 policy, six AI use cases across battery state-of-health and residual pricing, and a base/bull/bear outlook to 2030. Treat the mid-2026 to mid-2028 window as the structural decision point — not the 2030 target.",
      ],
      chart: {
        title: '2025 powertrain sales mix',
        subtitle: "'000 units · passenger market",
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',              pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context: Thailand 2027',   pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',        pages: 'PG 09', locked: true  },
      { num: '06', name: 'Segment economics',               pages: 'PG 11', locked: true  },
      { num: '07', name: 'Competitive landscape',           pages: 'PG 13', locked: true  },
      { num: '08', name: 'Demand drivers & channels',       pages: 'PG 20', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',   pages: 'PG 21', locked: true  },
      { num: '10', name: 'AI impact on auto economics',     pages: 'PG 23', locked: true  },
      { num: '11', name: '5-year outlook & forecast',       pages: 'PG 25', locked: true  },
      { num: '12', name: 'Methodology endnote',             pages: 'PG 26', locked: true  },
    ],
  },

  ja: {
    title: 'タイ自動車市場 2027:ハイブリッドの反撃',
    eyebrow: 'タイ · 自動車 · マーケット分析',
    preview: {
      lede: 'タイの自動車市場は2027年、二面性を抱えて始まります。中国ブランドは電池式EVの主役——BEV数量の70〜80%、EV上位10社中7社——を担う一方、2025年にはハイブリッドが純粋なEVを静かに上回り、151,000台・シェア約25%に達してBEVの126,000台を超えました[Proliance 2025]。日系メーカーは依然として総市場の69%超を保有し、中国系の約22%を上回ります。2026年のCO2排出量ベース物品税改定と中古車残価ショックが、既存勢力に量販市場での守りやすい地歩を与えます。',
      paragraphs: [
        'HEVは2025年の乗用車市場で151,000台・シェア約25%に達し、電池式EVを約26,000台上回りました[Proliance 2025]。Toyota と Honda がセグメントを牽引し、HEVは地方移動における航続距離不安を解消しつつ燃費効率を両立します。xEV需要は2025年上半期に43.8%増となり、そのうちHEVが50.6%を占めました[MReport 2025]。',
        '本レポートはマクロ背景、セクター規模とHEV対BEVの推移、セグメント経済性、Toyota・Honda・BYD・GWMのプロファイルを含む競争環境、需要ドライバーとチャネル、2026年CO2物品税改定と30@30政策、バッテリー健全度と残価算定にわたる6つのAI活用事例、そして2030年までのベース/ブル/ベア見通しを扱います。構造的な意思決定点は2030年目標ではなく、2026年央〜2028年央の窓です。',
      ],
      chart: {
        title: '2025年パワートレイン別販売構成',
        subtitle: "'000台 · 乗用車市場",
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブ・サマリー',     pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ概況:タイ2027年',        pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概況と市場規模',         pages: 'P 09', locked: true  },
      { num: '06', name: 'セグメント経済性',               pages: 'P 11', locked: true  },
      { num: '07', name: '競争環境',                       pages: 'P 13', locked: true  },
      { num: '08', name: '需要ドライバーとチャネル',       pages: 'P 20', locked: true  },
      { num: '09', name: '規制・政策環境',                 pages: 'P 21', locked: true  },
      { num: '10', name: 'AIと自動車経済性',               pages: 'P 23', locked: true  },
      { num: '11', name: '5年間の見通しと予測',            pages: 'P 25', locked: true  },
      { num: '12', name: '調査手法エンドノート',           pages: 'P 26', locked: true  },
    ],
  },

  ko: {
    title: '태국 자동차 시장 2027: 하이브리드의 반격',
    eyebrow: '태국 · 자동차 · 시장 분석',
    preview: {
      lede: '태국 자동차 시장은 2027년 양면적 성격으로 출발합니다. 중국 브랜드는 배터리 전기차의 주역——BEV 물량의 70~80%, 상위 10개 EV 브랜드 중 7개——을 담당하지만, 2025년에는 하이브리드가 순수 EV를 조용히 앞서 15만 1천 대·약 25% 점유율을 기록하며 BEV 12만 6천 대를 넘어섰습니다[Proliance 2025]. 일본 사업자는 여전히 전체 시장의 69% 이상을 점유하며 중국의 약 22%를 앞섭니다. 2026년 CO2 기반 개별소비세 개편과 중고차 잔존가치 충격이 기존 사업자에게 방어 가능한 대중 시장 입지를 제공합니다.',
      paragraphs: [
        '2025년 하이브리드는 승용차 시장에서 15만 1천 대, 약 25% 점유율을 기록하며 배터리 전기차를 약 2만 6천 대 차이로 앞섰습니다[Proliance 2025]. Toyota와 Honda가 세그먼트를 주도하며, HEV는 지방 장거리 운전의 핵심 우려인 항속 불안 없이 연비 효율을 제공합니다. xEV 수요는 2025년 상반기 43.8% 성장했고 HEV가 그 비중의 50.6%를 차지했습니다[MReport 2025].',
        '본 보고서는 거시 환경, 섹터 규모와 HEV 대 BEV 추이, 세그먼트 경제학, Toyota·Honda·BYD·GWM 프로파일을 포함한 경쟁 구도, 수요 동인과 유통 채널, 2026년 CO2 개별소비세 개편과 30@30 정책, 배터리 건전성과 잔존가치 산정에 걸친 6가지 AI 활용 사례, 그리고 2030년까지의 기본/낙관/비관 전망을 다룹니다. 구조적 의사결정 시점은 2030년 목표가 아니라 2026년 중반~2028년 중반 구간입니다.',
      ],
      chart: {
        title: '2025년 파워트레인별 판매 구성',
        subtitle: "'000대 · 승용차 시장",
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',                   pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경: 태국 2027',          pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개요 및 규모',             pages: 'P 09', locked: true  },
      { num: '06', name: '세그먼트 경제학',               pages: 'P 11', locked: true  },
      { num: '07', name: '경쟁 구도',                     pages: 'P 13', locked: true  },
      { num: '08', name: '수요 동인 및 유통채널',         pages: 'P 20', locked: true  },
      { num: '09', name: '규제 및 정책 환경',             pages: 'P 21', locked: true  },
      { num: '10', name: 'AI가 자동차 경제에 미치는 영향', pages: 'P 23', locked: true  },
      { num: '11', name: '5년 전망 및 예측',              pages: 'P 25', locked: true  },
      { num: '12', name: '방법론 후기',                   pages: 'P 26', locked: true  },
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
