// One-off helper for 2027-vn-ev. Mirrors _build_vn_ecommerce_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_vn_ev_sql.mjs > /tmp/insert.sql`
// then feed to Supabase MCP execute_sql.

const SLUG     = 'vietnam-ev-2027';
const COUNTRY  = 'Vietnam';
const INDUSTRY = 'EV';
const YEAR     = 2027;
const PAGES    = 29;
const PRICE    = 39;

// Vietnam EV market trajectory (USD bn): 2024=2.6, 2025=3.1, 2026=3.7, 2027=4.4 (forecast year)
const chartBars = [
  { pct: 59,  label: '2024',  value: 2.6 },
  { pct: 70,  label: '2025',  value: 3.1 },
  { pct: 84,  label: '2026',  value: 3.7 },
  { pct: 100, label: '2027F', value: 4.4 },
];

const META = {
  en: {
    title: "Vietnam's EV market — 2027 two-wheeler tipping point",
    eyebrow: 'VIETNAM · ELECTRIC VEHICLES · 2027',
    preview: {
      lede: "Vietnam's EV market hit USD 3.7 bn in 2026, up 19.6% year-on-year [MarqStats 2026]. Two-wheeler electrification, not four-wheeler adoption, is the dominant story: VinFast shipped 406k electric motorbikes in 2025 (+473% YoY) [VinFast IR 2026], lifting electric share of total two-wheeler volume from ~6% in 2023 to ~16% in 2025. V-Green's 150k-port network across all 63 provinces is already ASEAN's densest [V-Green 2026]. The 24 months from mid-2026 to mid-2028 — bounded by Hanoi's Ring-Road-1 ICE ban and the 2028 charging-network completion — decide which operators capture the next leg of demand.",
      paragraphs: [
        "This report covers the macro context (GDP, urbanization, mobility policy), the EV value chain (two-wheeler vs four-wheeler economics, segment splits, OEM vs aftermarket), competitive structure across VinFast, Honda Vietnam, Pega and Selex, demand drivers across charging density and dealer + e-commerce mix, the regulatory landscape (Decision 876, Hanoi Ring-Road-1 ban, tariff regime), and a 5-year outlook to 2030.",
        "AI impact on Vietnamese EV economics is operational. Operators have begun deploying AI for battery management system optimization, predictive maintenance on fleet vehicles, demand sensing across dealer floors, charging-port utilization forecasting, and credit-attach scoring for the FE Credit zero-down installment programs. Six AI use cases are profiled in Section 10.",
      ],
      chart: {
        title: 'Vietnam EV market trajectory (USD bn)',
        subtitle: '2024 · 2025 · 2026 actual · 2027 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                       pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                          pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                 pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context: Vietnam 2027',       pages: 'PG 07', locked: true  },
      { num: '05', name: 'Sector overview & sizing',          pages: 'PG 10', locked: true  },
      { num: '06', name: 'Segment economics',                 pages: 'PG 12', locked: true  },
      { num: '07', name: 'Competitive landscape',             pages: 'PG 14', locked: true  },
      { num: '08', name: 'Demand drivers & channels',         pages: 'PG 21', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',     pages: 'PG 24', locked: true  },
      { num: '10', name: 'AI impact on EV economics',         pages: 'PG 26', locked: true  },
      { num: '11', name: '5-year outlook & forecast',         pages: 'PG 28', locked: true  },
      { num: '12', name: 'Methodology endnote',               pages: 'PG 29', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナムEV市場 — 2027 二輪の転換点',
    eyebrow: 'ベトナム · 電気自動車 · 2027',
    preview: {
      lede: 'ベトナムのEV市場は2026年にUSD 37億規模に到達し、前年比19.6%増となりました[MarqStats 2026]。主役は四輪ではなく二輪電動化です:VinFastは2025年に電動バイク406千台を出荷し前年比+473%を記録[VinFast IR 2026]、二輪総台数に占める電動比率は2023年の約6%から2025年には約16%まで上昇しました。V-Greenの150千ポート充電網は全63省にわたりASEAN最密度を達成しています[V-Green 2026]。2026年央から2028年央までの24ヶ月 — ハノイ環状1号線のICE禁止と2028年の充電網完成に挟まれた期間 — が、次の需要局面を取るプレイヤーを決定づけます。',
      paragraphs: [
        '本レポートはマクロ環境(GDP・都市化・モビリティ政策)、EV価値連鎖(二輪・四輪の経済性、セグメント別の構造、OEMとアフターマーケット)、VinFast・Honda Vietnam・Pega・Selexによる競争構造、充電密度およびディーラー・EC混合チャネルにわたる需要ドライバー、規制環境(政府決定876、ハノイ環状1号線禁止、関税体系)、そして2030年までの5年間の展望を扱います。',
        '2026年のベトナムEV経済性に対するAIインパクトは運用面です。事業者は、バッテリーマネジメントシステムの最適化、フリート車両の予知保全、ディーラーフロアにわたる需要センシング、充電ポート稼働率の予測、FE Creditのゼロダウン分割プログラム向けクレジット連動スコアリングなどでAI実装を開始しています。第10章で6つの具体的活用事例を取り上げます。',
      ],
      chart: {
        title: 'ベトナムEV市場推移(USD bn)',
        subtitle: '2024 · 2025 · 2026年実績 · 2027年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '方法論',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',              pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境:ベトナム 2027',          pages: 'P 07', locked: true  },
      { num: '05', name: 'セクター概観・市場規模',              pages: 'P 10', locked: true  },
      { num: '06', name: 'セグメント経済性',                    pages: 'P 12', locked: true  },
      { num: '07', name: '競争環境',                            pages: 'P 14', locked: true  },
      { num: '08', name: '需要ドライバーとチャネル',            pages: 'P 21', locked: true  },
      { num: '09', name: '規制・政策環境',                      pages: 'P 24', locked: true  },
      { num: '10', name: 'EV経済性に対するAIインパクト',        pages: 'P 26', locked: true  },
      { num: '11', name: '5年展望・予測',                       pages: 'P 28', locked: true  },
      { num: '12', name: '方法論補注',                          pages: 'P 29', locked: true  },
    ],
  },

  ko: {
    title: '베트남 EV 시장 — 2027 이륜차의 변곡점',
    eyebrow: '베트남 · 전기자동차 · 2027',
    preview: {
      lede: '베트남 EV 시장은 2026년 USD 37억 규모에 도달했으며 전년 대비 19.6% 성장했습니다[MarqStats 2026]. 주역은 사륜이 아닌 이륜 전동화입니다: VinFast는 2025년 전동 모터바이크 40만 6천 대를 출하해 전년 대비 +473%를 기록[VinFast IR 2026], 이륜 전체 대수에서 전동의 비중은 2023년 약 6%에서 2025년 약 16%로 상승했습니다. V-Green의 15만 포트 충전망은 전체 63개 성에 걸쳐 ASEAN 최고 밀도를 달성했습니다[V-Green 2026]. 2026년 중반에서 2028년 중반까지의 24개월 — 하노이 1순환로 ICE 금지와 2028년 충전망 완성 사이에 끼인 기간 — 이 다음 수요 국면을 차지할 플레이어를 결정짓습니다.',
      paragraphs: [
        '본 보고서는 거시 환경(GDP·도시화·모빌리티 정책), EV 가치 사슬(이륜·사륜 경제성, 세그먼트별 구조, OEM과 애프터마켓), VinFast·Honda Vietnam·Pega·Selex의 경쟁 구조, 충전 밀도와 딜러·이커머스 혼합 채널에 걸친 수요 견인 요인, 규제 환경(정부결정 876, 하노이 1순환로 금지, 관세 체계), 그리고 2030년까지의 5년 전망을 다룹니다.',
        '2026년 베트남 EV 경제성에 미치는 AI 영향은 운영적입니다. 사업자들은 배터리 관리 시스템 최적화, 플릿 차량의 예지 보전, 딜러 플로어 수요 센싱, 충전 포트 가동률 예측, FE Credit 무이자 할부 프로그램용 신용 연계 스코어링 등에 AI 도입을 시작했습니다. 제10장에서 6가지 활용 사례를 다룹니다.',
      ],
      chart: {
        title: '베트남 EV 시장 추이 (USD bn)',
        subtitle: '2024 · 2025 · 2026 실적 · 2027 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                                pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                  pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',                           pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경: 베트남 2027',                pages: 'P 07', locked: true  },
      { num: '05', name: '섹터 개관 & 시장 규모',                 pages: 'P 10', locked: true  },
      { num: '06', name: '세그먼트 경제성',                       pages: 'P 12', locked: true  },
      { num: '07', name: '경쟁 환경',                             pages: 'P 14', locked: true  },
      { num: '08', name: '수요 동인 & 채널',                      pages: 'P 21', locked: true  },
      { num: '09', name: '규제 & 정책 환경',                      pages: 'P 24', locked: true  },
      { num: '10', name: 'EV 경제성에 미치는 AI 영향',            pages: 'P 26', locked: true  },
      { num: '11', name: '5년 전망 & 예측',                       pages: 'P 28', locked: true  },
      { num: '12', name: '방법론 결어',                           pages: 'P 29', locked: true  },
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
