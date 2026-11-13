// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-th-ev (Thailand EV 2027). Modeled on _build_vn_coffee_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_2027-th-ev_sql.mjs > /tmp/insert_th_ev.sql`
// then feed to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL
// CTE from new_report.id — NOT a GitHub raw URL.

const SLUG     = 'thailand-ev-2027';
const COUNTRY  = 'Thailand';
const INDUSTRY = 'EV';
const YEAR     = 2027;
const PAGES    = 29;
const PRICE    = 39;

// Chart bars — Thailand BEV registrations ('000 units). Values 10,76,70,100,118,135.
// Max 135 → pct relative.
const chartBars = [
  { pct: 7,   label: '2022',  value: 10  },
  { pct: 56,  label: '2023',  value: 76  },
  { pct: 52,  label: '2024',  value: 70  },
  { pct: 74,  label: '2025',  value: 100 },
  { pct: 87,  label: '2026F', value: 118 },
  { pct: 100, label: '2027F', value: 135 },
];

const TOC_LOCKED = (num) => num !== '03'; // Executive summary previewable; rest locked

const META = {
  en: {
    title: "Thailand's EV market 2027: the elimination round",
    eyebrow: 'THAILAND · ELECTRIC VEHICLES · MARKET ANALYSIS',
    preview: {
      lede: "Thailand's EV market enters 2027 at an inflection: BEV sales reached roughly 120,300 units (19.4% of the total market) in 2025, with Chinese brands led by BYD, MG and GWM holding 70-80% of BEV volume and seven of the top-ten EV brands now Chinese. Chinese share of the total auto market rose from 3.2% in 2020 to 21.2% in 2025 — a structural handover no incumbent has reversed — while a new-car price war and a used-car residual shock reshape who survives the region's auto hub.",
      paragraphs: [
        "A new-car price war cut Chinese BEV stickers an average -13.1% at Motor Expo 2024, with discounts reaching 38% by late 2025. That reset cascades into residuals: a one-year-old EV can shed ~30% on new-price cuts and another ~30% as a used unit. The used-car market fell ~10% to 285,000 units in H1 2025, pressuring dealer economics across the channel.",
        "This report covers the macro backdrop, sector sizing and BEV share trajectory, segment economics (BEV vs PHEV vs HEV), the competitive landscape with profiles of BYD, MG (SAIC), GWM and Toyota, the used-car disruption and charging build-out, the EV3.5 production mandate and 30@30 policy, six AI use cases across BMS and residual pricing, and a base/bull/bear outlook to 2030. Market participants should treat the mid-2026 to mid-2028 window as the structural decision point — not the 2030 target.",
      ],
      chart: {
        title: 'Thailand BEV registrations',
        subtitle: "'000 units · 2022 actual → 2027 forecast",
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',              pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context: Thailand 2027',   pages: 'PG 07', locked: true  },
      { num: '05', name: 'Sector overview & sizing',        pages: 'PG 10', locked: true  },
      { num: '06', name: 'Segment economics',               pages: 'PG 12', locked: true  },
      { num: '07', name: 'Competitive landscape',           pages: 'PG 14', locked: true  },
      { num: '08', name: 'Used-car disruption & channels',  pages: 'PG 21', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',   pages: 'PG 24', locked: true  },
      { num: '10', name: 'AI impact on EV economics',       pages: 'PG 26', locked: true  },
      { num: '11', name: '5-year outlook & forecast',       pages: 'PG 28', locked: true  },
      { num: '12', name: 'Methodology endnote',             pages: 'PG 29', locked: true  },
    ],
  },

  ja: {
    title: 'タイのEV市場 2027:淘汰のステージ',
    eyebrow: 'タイ · 電気自動車 · マーケット分析',
    preview: {
      lede: 'タイのEV市場は2027年、転換点を迎えます。BEV販売は2025年に約120,300台(市場全体の19.4%)に達し、BYD・MG・GWMを筆頭とする中国ブランドがBEV数量の70〜80%を占め、上位10EVブランドのうち7社が中国系となりました。中国系の乗用車全体シェアは2020年の3.2%から2025年の21.2%へ移行し、既存勢力はこれを覆せていません。新車値下げ競争と中古車残価ショックが、同地域の自動車生産拠点の生き残り構図を再構成しています。',
      paragraphs: [
        '2024年モーターエキスポでの中国系BEV値下げ平均-13.1%に続き、2025年末には値引き幅が38%に達しました。この価格リセットは残価に連鎖します。購入1年目のEVは新車価格の引き下げで~30%を失い、中古車として改めて~30%を失う構造です。中古車市場は2025年上半期に約10%減少し285,000台となり、チャネル全体のディーラー収益を圧迫しています。',
        '本レポートはマクロ背景、セクター規模とBEVシェア推移、セグメント経済性(BEV vs PHEV vs HEV)、BYD・MG(SAIC)・GWM・トヨタのプロファイルを含む競争環境、中古車市場の混乱と充電網整備、EV3.5現地生産義務と30@30政策、BMS・残価算定にわたる6つのAI活用事例、そして2030年までのベース/ブル/ベア見通しを扱います。市場参加者は2030年目標ではなく、2026年央〜2028年央の窓を構造的な意思決定点として捉えるべきです。',
      ],
      chart: {
        title: 'タイBEV登録台数',
        subtitle: "'000台 · 2022年実績 → 2027年予測",
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブ・サマリー',     pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ概況:タイ2027年',        pages: 'P 07', locked: true  },
      { num: '05', name: 'セクター概況と市場規模',         pages: 'P 10', locked: true  },
      { num: '06', name: 'セグメント経済性',               pages: 'P 12', locked: true  },
      { num: '07', name: '競争環境',                       pages: 'P 14', locked: true  },
      { num: '08', name: '中古車市場の混乱とチャネル',     pages: 'P 21', locked: true  },
      { num: '09', name: '規制・政策環境',                 pages: 'P 24', locked: true  },
      { num: '10', name: 'AI活用とEV経済性',               pages: 'P 26', locked: true  },
      { num: '11', name: '5年間の見通しと予測',            pages: 'P 28', locked: true  },
      { num: '12', name: '調査手法エンドノート',           pages: 'P 29', locked: true  },
    ],
  },

  ko: {
    title: '태국 EV 시장 2027: 탈락전의 서막',
    eyebrow: '태국 · 전기차 · 시장 분석',
    preview: {
      lede: '태국 EV 시장은 2027년 변곡점에 진입합니다. 2025년 BEV 판매는 약 120,300대(전체 시장의 19.4%)를 기록했고, BYD·MG·GWM을 선두로 한 중국 브랜드가 BEV 물량의 70-80%를 점유하며 상위 10개 EV 브랜드 중 7개가 중국산입니다. 전체 자동차 시장에서 중국산 비중은 2020년 3.2%에서 2025년 21.2%로 상승했으며, 어떤 기존 사업자도 이 구조적 전환을 되돌리지 못했습니다. 신차 가격 경쟁과 중고차 잔존가치 충격이 동남아 자동차 허브의 생존 구도를 재편하고 있습니다.',
      paragraphs: [
        '중국 BEV 신차 가격은 2024년 모터 엑스포에서 평균 -13.1% 하락했고, 2025년 말에는 할인율이 38%에 달했습니다. 이 가격 하락은 잔존가치로 전이됩니다. 구입 1년 만에 신차 가격 인하로 ~30%, 중고차 재판매 시 추가 ~30%를 잃을 수 있습니다. 2025년 상반기 중고차 시장은 약 10% 감소해 285,000대를 기록하며 유통 채널 전반의 딜러 수익성을 압박하고 있습니다.',
        '본 보고서는 거시 환경, 섹터 규모와 BEV 점유율 추이, 세그먼트 경제학(BEV vs PHEV vs HEV), BYD·MG(SAIC)·GWM·Toyota 프로파일을 포함한 경쟁 구도, 중고차 교란과 충전 인프라 구축, EV3.5 생산 의무와 30@30 정책, BMS·잔존가치 산정에 걸친 6가지 AI 활용 사례, 그리고 2030년까지의 기본/낙관/비관 전망을 다룹니다. 시장 참여자는 2030년 목표가 아니라 2026년 중반~2028년 중반 구간을 구조적 의사결정 시점으로 보아야 합니다.',
      ],
      chart: {
        title: '태국 BEV 등록대수',
        subtitle: "'000대 · 2022 실적 → 2027 예측",
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',                   pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경: 태국 2027',          pages: 'P 07', locked: true  },
      { num: '05', name: '섹터 개요 및 규모',             pages: 'P 10', locked: true  },
      { num: '06', name: '세그먼트 경제학',               pages: 'P 12', locked: true  },
      { num: '07', name: '경쟁 구도',                     pages: 'P 14', locked: true  },
      { num: '08', name: '중고차 교란 및 유통채널',       pages: 'P 21', locked: true  },
      { num: '09', name: '규제 및 정책 환경',             pages: 'P 24', locked: true  },
      { num: '10', name: 'AI가 EV 경제에 미치는 영향',    pages: 'P 26', locked: true  },
      { num: '11', name: '5년 전망 및 예측',              pages: 'P 28', locked: true  },
      { num: '12', name: '방법론 후기',                   pages: 'P 29', locked: true  },
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
