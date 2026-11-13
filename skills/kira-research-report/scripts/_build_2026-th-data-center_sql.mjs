// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-th-data-center. Run:
//   node skills/kira-research-report/scripts/_build_2026-th-data-center_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql (or PostgREST upsert if MCP down).
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'data-center-thailand-2026';
const COUNTRY  = 'Thailand';
const INDUSTRY = 'Data Center';
const YEAR     = 2026;
const PAGES    = 17;
const PRICE    = 39;

// Exec chart (page 4): live capacity vs 2027 target. Max ~1000 → pct.
const chartBarsEn = [
  { pct: 35,  label: '2024 live',     value: '~350'  },
  { pct: 35,  label: 'Under constr.', value: '~347'  },
  { pct: 100, label: '2027 target',   value: '~1000' },
];
const chartBarsJa = [
  { pct: 35,  label: '2024年稼働',  value: '~350'  },
  { pct: 35,  label: '建設中',      value: '~347'  },
  { pct: 100, label: '2027年目標',  value: '~1000' },
];
const chartBarsKo = [
  { pct: 35,  label: '2024 가동',  value: '~350'  },
  { pct: 35,  label: '건설 중',    value: '~347'  },
  { pct: 100, label: '2027 목표',  value: '~1000' },
];

const META = {
  en: {
    title: "Thailand's data center EEC bet — hyperscaler builds and the renewable-power gate",
    eyebrow: 'THAILAND · DATA CENTER · MARKET ANALYSIS',
    preview: {
      lede: "Thailand's data center market reached roughly USD 1.9 bn in 2025, on a path toward USD 4.9 bn by 2031 at a ~17% CAGR [DC Portfolio 2025]. Live IT capacity sat near 350 MW exiting 2024, against a 2027 ambition near 1 GW [Bloomberg 2025]. A multi-billion-dollar hyperscaler pipeline concentrates in the Eastern Economic Corridor — but firm, clean power through Direct PPA and the Utility Green Tariff, not demand, decides how much energizes by 2027 [ERC 2025].",
      paragraphs: [
        "Thailand's data center market reached roughly USD 1.9 bn in 2025, on a path toward USD 4.9 bn by 2031 at a ~17% CAGR [DC Portfolio 2025]. Live IT capacity sat near 350 MW exiting 2024 [Bloomberg 2025]. The ambition dwarfs that base: BOI logged 36 data-center applications worth THB 728 bn in 2025 [BOI 2025], with ByteDance alone committing up to USD 8.8 bn across three provinces [DCD 2025].",
        "The bottleneck is physical and increasingly green. Hyperscalers tie siting to clean power, so the unlock is the 2,000 MW Direct PPA pilot and the Utility Green Tariff [ERC 2025]. The PDP 2024–2037 plans 73 GW of renewables [PDP 2024], but campus energization tracks grid-connection windows and PPA rules — both of which slipped into review in late 2025.",
      ],
      chart: {
        title: 'Live capacity vs the 2027 target',
        subtitle: 'Thailand · MW · 2024 live vs 2027 goal',
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
      { num: '05', name: 'PPA structures & rules',      pages: 'PG 12', locked: true  },
      { num: '06', name: 'Competitive structure',       pages: 'PG 14', locked: true  },
      { num: '07', name: '2027 outlook & scenarios',    pages: 'PG 16', locked: true  },
      { num: '07', name: 'Methodology & sources',       pages: 'PG 17', locked: true  },
    ],
  },

  ja: {
    title: 'タイのデータセンターEEC戦略 — ハイパースケーラー建設と再生可能エネルギーの制約',
    eyebrow: 'タイ · データセンター · マーケット分析',
    preview: {
      lede: 'タイのデータセンター市場は2025年に約USD 1.9 bnに達し、~17% CAGRで2031年にはUSD 4.9 bnに向かっています[DC Portfolio 2025]。稼働中のITキャパシティは2024年末時点で約350 MWで、2027年には約1 GWを目指しています[Bloomberg 2025]。数十億ドル規模のハイパースケーラー・パイプラインが東部経済回廊（EEC）に集中していますが、2027年までの稼働量を決めるのは需要ではなく、Direct PPAと再生可能エネルギー公益関税（UGT）を通じた確実なクリーン電力です[ERC 2025]。',
      paragraphs: [
        'タイのデータセンター市場は2025年に約USD 1.9 bnに達し、~17% CAGRで2031年にはUSD 4.9 bnに向かっています[DC Portfolio 2025]。稼働中のITキャパシティは2024年末時点で約350 MWでした[Bloomberg 2025]。野心の規模はその基盤をはるかに超えており、BOIは2025年にTHB 728 bn相当のデータセンター申請36件を記録し[BOI 2025]、ByteDanceだけで3県にわたりUSD 8.8 bnを上限とするコミットメントを表明しています[DCD 2025]。',
        'ボトルネックは物理的かつグリーン電力に起因します。ハイパースケーラーはサイト選定をクリーン電力と連動させているため、2,000 MW Direct PPAパイロットと再生可能エネルギー公益関税（UGT）が解決策となります[ERC 2025]。PDP 2024–2037は2037年までに73 GWの再生可能エネルギーを計画していますが[PDP 2024]、キャンパスの稼働は系統接続ウィンドウとPPAルールに連動しており、いずれも2025年後半に審査へ移行しました。',
      ],
      chart: {
        title: '稼働容量と2027年目標の比較',
        subtitle: 'Thailand · MW · 2024年稼働 vs 2027年目標',
        bars: chartBarsJa,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',   pages: 'P 04', locked: false },
      { num: '03', name: '戦略的示唆',               pages: 'P 05', locked: true  },
      { num: '04', name: '市場規模と推移',           pages: 'P 07', locked: true  },
      { num: '04', name: '需要ドライバー',           pages: 'P 08', locked: true  },
      { num: '05', name: '電力と系統',               pages: 'P 10', locked: true  },
      { num: '05', name: '稼働ギャップ',             pages: 'P 11', locked: true  },
      { num: '05', name: 'PPA構造と規制',            pages: 'P 12', locked: true  },
      { num: '06', name: '競争構造',                 pages: 'P 14', locked: true  },
      { num: '07', name: '2027年展望とシナリオ',     pages: 'P 16', locked: true  },
      { num: '07', name: '分析手法と出典',           pages: 'P 17', locked: true  },
    ],
  },

  ko: {
    title: '태국의 데이터센터 EEC 베팅 — 하이퍼스케일러 구축과 재생에너지 전력 게이트',
    eyebrow: '태국 · 데이터센터 · 시장 분석',
    preview: {
      lede: '태국 데이터센터 시장은 2025년 약 USD 1.9 bn에 달했으며, ~17% CAGR로 2031년 USD 4.9 bn을 향해 성장하고 있습니다[DC Portfolio 2025]. 가동 IT 용량은 2024년 말 기준 약 350 MW였으며, 2027년에는 약 1 GW를 목표로 합니다[Bloomberg 2025]. 수십억 달러 규모의 하이퍼스케일러 파이프라인이 동부경제회랑(EEC)에 집중되지만, 2027년까지 얼마나 가동되느냐를 결정하는 것은 수요가 아니라 Direct PPA와 Utility Green Tariff를 통한 확정 청정 전력입니다[ERC 2025].',
      paragraphs: [
        '태국 데이터센터 시장은 2025년 약 USD 1.9 bn에 달하며, ~17% CAGR로 2031년 USD 4.9 bn을 향해 성장하고 있습니다[DC Portfolio 2025]. 가동 IT 용량은 2024년 말 기준 약 350 MW였습니다[Bloomberg 2025]. 야망은 이 기반을 훨씬 능가합니다. BOI는 2025년 36개 데이터센터 신청, 총 THB 728 bn을 기록했으며[BOI 2025], ByteDance 단독으로 3개 주에 최대 USD 8.8 bn을 투자 확약했습니다[DCD 2025].',
        '병목은 물리적이고 점점 더 친환경적입니다. 하이퍼스케일러들은 입지 선정을 청정 전력과 연계하므로, 핵심 열쇠는 2,000 MW Direct PPA 파일럿과 Utility Green Tariff입니다[ERC 2025]. PDP 2024–2037은 73 GW의 재생에너지를 계획하고 있으나[PDP 2024], 캠퍼스 가동은 계통 연결 일정과 PPA 규정에 연동되며 — 두 가지 모두 2025년 말 검토 단계로 미뤄졌습니다.',
      ],
      chart: {
        title: '가동 용량 대 2027년 목표',
        subtitle: '태국 · MW · 2024년 가동 대 2027년 목표',
        bars: chartBarsKo,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',             pages: 'P 04', locked: false },
      { num: '03', name: '전략적 시사점',           pages: 'P 05', locked: true  },
      { num: '04', name: '시장 규모 및 성장 궤도',  pages: 'P 07', locked: true  },
      { num: '04', name: '수요 동인',               pages: 'P 08', locked: true  },
      { num: '05', name: '전력 및 계통',            pages: 'P 10', locked: true  },
      { num: '05', name: '운영 갭',                 pages: 'P 11', locked: true  },
      { num: '05', name: 'PPA 구조 및 규정',        pages: 'P 12', locked: true  },
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
