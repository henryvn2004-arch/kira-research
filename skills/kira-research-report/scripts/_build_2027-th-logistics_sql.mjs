// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-th-logistics. Run:
//   node skills/kira-research-report/scripts/_build_2027-th-logistics_sql.mjs
// then feed the output to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf) computed inside the SQL,
// NOT a full URL. Storage upload happens AFTER this SQL via scripts/upload-pdf.mjs.
//
// Slug convention: country-first (`thailand-logistics-2027`) — matches the direct
// industry precedent `vietnam-logistics-2026` and the five most recent Thailand
// publishes (thailand-cannabis-2026, thailand-modern-trade-2027, …).

const SLUG     = 'thailand-logistics-2027';
const COUNTRY  = 'Thailand';
const INDUSTRY = 'Logistics';
const YEAR     = 2027;
const PAGES    = 26;   // top-level <div class="page"> count in en.html
const PRICE    = 39;

// Exec-chart page 4: "Freight & logistics market trajectory", Thailand USD bn.
// Series 2024 50.4 · 2025 53.4 · 2026 56.6 · 2027 60.0 · 2028 63.5 · 2029 67.2 ·
// 2030 71.0 · 2031 74.5. Preview shows a 5-point subset; pct is relative to 74.5.
const chartBars = [
  { pct: 68,  label: '2024',  value: 50.4 },
  { pct: 76,  label: '2026',  value: 56.6 },
  { pct: 81,  label: '2027F', value: 60.0 },
  { pct: 90,  label: '2029F', value: 67.2 },
  { pct: 100, label: '2031F', value: 74.5 },
];

const META = {
  en: {
    title: 'Thailand logistics 2027: EEC corridor activation & ASEAN cross-border trucking',
    eyebrow: 'THAILAND · LOGISTICS · MARKET ANALYSIS',
    preview: {
      lede: "Thailand's USD 57 bn freight envelope is being reshaped by three forces converging at once: EEC mega-infrastructure moving from planning to operations, an overland China–Laos–Thailand corridor rewiring trade lanes, and a parcel market consolidating after five years of price war. The freight market runs USD 56.6 bn in 2026 toward ~USD 60 bn in 2027 [Kira estimates], while logistics cost sits at 12.8% of GDP against a 9.5% target by 2029 [MOT 2025]. The next 24 months decide which operators own the new geography.",
      paragraphs: [
        "This report covers the macro context and policy floor, sector overview and sizing, EEC corridor activation (Laem Chabang Phase 3 Terminal F1 toward an 18 m TEU ceiling and the THB 271.8 bn three-airports high-speed rail), ASEAN cross-border trucking, the competitive landscape across couriers and freight forwarders, demand drivers and channels, the regulatory landscape, AI impact on logistics, and a 5-year outlook to 2031.",
        "The competitive reset is already visible: Flash Express has overtaken Kerry to become the #1 private courier and #2 overall behind Thailand Post [Bangkok Post 2025], posting THB 24.7 bn revenue in 2024 (+23%) and returning to profit [Flash 2025]. China+1 demand is the pull — BOI applications hit THB 1.37 trn in Jan–Sep 2025, up 94% YoY [BOI 2025]. ASEAN cross-border road freight compounds at 7.1% toward USD 61 bn by 2030 [Kira estimates].",
      ],
      chart: {
        title: 'Freight & logistics market trajectory',
        subtitle: 'Thailand · USD bn · 2024–2031F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                    pages: 'PG 002', locked: false },
      { num: '02', name: 'Contents',                       pages: 'PG 003', locked: false },
      { num: '03', name: 'Executive summary',              pages: 'PG 004', locked: false },
      { num: '04', name: 'Macro context & policy',         pages: 'PG 006', locked: true  },
      { num: '05', name: 'Sector overview & sizing',       pages: 'PG 009', locked: true  },
      { num: '06', name: 'EEC corridor activation',        pages: 'PG 012', locked: true  },
      { num: '07', name: 'ASEAN cross-border trucking',    pages: 'PG 015', locked: true  },
      { num: '08', name: 'Competitive landscape',          pages: 'PG 017', locked: true  },
      { num: '09', name: 'Demand drivers & channels',      pages: 'PG 021', locked: true  },
      { num: '10', name: 'Regulatory & policy',            pages: 'PG 022', locked: true  },
      { num: '11', name: 'AI impact on logistics',         pages: 'PG 023', locked: true  },
      { num: '12', name: '5-year outlook & forecast',      pages: 'PG 025', locked: true  },
      { num: '13', name: 'Methodology endnote & sources',  pages: 'PG 026', locked: true  },
    ],
  },

  ja: {
    title: 'タイ物流市場2027年：EEC回廊の稼働本格化とASEAN越境トラック輸送',
    eyebrow: 'タイ · 物流 · マーケット分析',
    preview: {
      lede: 'タイのUSD 57 bn規模の貨物市場は、同時に収束しつつある3つの力によって再構築されています。計画から運用段階へ移行するEECメガインフラ、貿易ルートを再編する中国・ラオス・タイ陸路回廊、そして5年間の価格競争を経て集約化に向かう宅配便市場です。貨物市場は2026年のUSD 56.6 bnから2027年には~USD 60 bnへ推移し[Kira estimates]、物流コストは対GDP比12.8%と、2029年までの9.5%目標に対して高止まりしています[MOT 2025]。今後24ヶ月が、新たな地理を制する事業者を決定づけます。',
      paragraphs: [
        '本レポートはマクロ環境と政策フロア、セクター概観と市場規模、EEC回廊の稼働本格化(18 m TEU上限へ向かうレムチャバン港フェーズ3ターミナルF1、およびTHB 271.8 bn規模の三空港連結高速鉄道)、ASEAN越境トラック輸送、宅配業者およびフレイトフォワーダーの競争環境、需要ドライバーとチャネル、規制環境、物流分野へのAIインパクト、そして2031年までの5年間の展望を扱います。',
        '競争構造の再編はすでに顕在化しています。Flash ExpressはKerryを追い抜き、民間宅配業者第1位、Thailand Postに次ぐ総合第2位となり[Bangkok Post 2025]、2024年の売上高THB 24.7 bn(前年比+23%)を計上して黒字に復帰しました[Flash 2025]。China+1需要がその牽引力です — 投資委員会(BOI)への申請額は2025年1〜9月にTHB 1.37 trn、前年比94%増に達しました[BOI 2025]。ASEAN越境道路貨物はCAGR 7.1%で成長し、2030年までにUSD 61 bnに達する見通しです[Kira estimates]。',
      ],
      chart: {
        title: '貨物・物流市場の推移',
        subtitle: 'タイ · USD bn · 2024〜2031年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                       pages: 'P 002', locked: false },
      { num: '02', name: '目次',                           pages: 'P 003', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',          pages: 'P 004', locked: false },
      { num: '04', name: 'マクロ環境と政策',                pages: 'P 006', locked: true  },
      { num: '05', name: 'セクター概観と市場規模',          pages: 'P 009', locked: true  },
      { num: '06', name: 'EEC回廊の稼働本格化',             pages: 'P 012', locked: true  },
      { num: '07', name: 'ASEAN越境トラック輸送',           pages: 'P 015', locked: true  },
      { num: '08', name: '競争環境',                       pages: 'P 017', locked: true  },
      { num: '09', name: '需要ドライバーとチャネル',        pages: 'P 021', locked: true  },
      { num: '10', name: '規制と政策',                     pages: 'P 022', locked: true  },
      { num: '11', name: '物流分野へのAIインパクト',        pages: 'P 023', locked: true  },
      { num: '12', name: '5年展望と予測',                   pages: 'P 025', locked: true  },
      { num: '13', name: '調査手法エンドノートと出典',      pages: 'P 026', locked: true  },
    ],
  },

  ko: {
    title: '태국 물류 2027: EEC 회랑 가동 및 아세안 국경 간 트럭 운송',
    eyebrow: '태국 · 물류 · 시장 분석',
    preview: {
      lede: '태국의 USD 57 bn 규모 화물 시장이 동시에 수렴하는 세 가지 힘에 의해 재편되고 있습니다: 계획 단계에서 운영 단계로 이행하는 EEC 메가 인프라, 무역 노선을 재배선하는 육상 중국–라오스–태국 회랑, 그리고 5년간의 가격 경쟁 이후 통합 국면에 접어든 소포 시장입니다. 화물 시장은 2026년 USD 56.6 bn에서 2027년 약 USD 60 bn으로 이동하며[Kira estimates], 물류비는 GDP 대비 12.8%로 2029년 목표 9.5%를 크게 웃돌고 있습니다[MOT 2025]. 향후 24개월이 새로운 지형을 누가 차지할지 결정합니다.',
      paragraphs: [
        '본 보고서는 거시 환경과 정책 기반, 부문 개관과 규모 산정, EEC 회랑 가동(18 m TEU 처리능력을 향한 램차방 3단계 F1 터미널 및 THB 271.8 bn 규모의 삼공항 고속철도), 아세안 국경 간 트럭 운송, 택배사와 포워더 전반의 경쟁 구도, 수요 동인과 채널, 규제 환경, 물류 산업 내 AI 영향, 그리고 2031년까지의 5개년 전망을 다룹니다.',
        '경쟁 구도의 재편은 이미 가시화되었습니다. Flash Express가 Kerry를 제치고 1위 민간 택배사이자 Thailand Post에 이은 2위 사업자로 올라섰으며[Bangkok Post 2025], 2024년 매출 THB 24.7 bn(+23%)을 기록하며 흑자로 전환했습니다[Flash 2025]. China+1 수요가 견인력입니다 — BOI 신청 건이 2025년 1–9월 THB 1.37 trn으로 전년 대비 94% 증가했습니다[BOI 2025]. 아세안 국경 간 도로 화물은 CAGR 7.1%로 성장해 2030년까지 USD 61 bn에 이를 전망입니다[Kira estimates].',
      ],
      chart: {
        title: '화물 · 물류 시장 추이',
        subtitle: '태국 · USD bn · 2024–2031F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                      pages: 'P 002', locked: false },
      { num: '02', name: '목차',                        pages: 'P 003', locked: false },
      { num: '03', name: '요약',                        pages: 'P 004', locked: false },
      { num: '04', name: '거시 환경 & 정책',            pages: 'P 006', locked: true  },
      { num: '05', name: '부문 개관 & 규모 산정',        pages: 'P 009', locked: true  },
      { num: '06', name: 'EEC 회랑 가동',               pages: 'P 012', locked: true  },
      { num: '07', name: '아세안 국경 간 트럭 운송',     pages: 'P 015', locked: true  },
      { num: '08', name: '경쟁 구도',                   pages: 'P 017', locked: true  },
      { num: '09', name: '수요 동인 & 채널',            pages: 'P 021', locked: true  },
      { num: '10', name: '규제 & 정책',                 pages: 'P 022', locked: true  },
      { num: '11', name: '물류 산업 내 AI 영향',         pages: 'P 023', locked: true  },
      { num: '12', name: '5개년 전망 & 예측',            pages: 'P 025', locked: true  },
      { num: '13', name: '방법론 후주 & 출처',           pages: 'P 026', locked: true  },
    ],
  },
};

// SQL string-literal helper using dollar-quoting so we don't have to escape
// single quotes inside Japanese/Korean/English text.
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
