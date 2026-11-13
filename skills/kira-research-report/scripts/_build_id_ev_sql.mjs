// One-off helper for 2027-id-ev.
// Run: `node skills/kira-research-report/scripts/_build_id_ev_sql.mjs > /tmp/insert.sql`
// then feed to Supabase MCP execute_sql.

const SLUG    = 'ev-indonesia-2027';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'EV';
const YEAR    = 2027;
const PAGES   = 26;
const PRICE   = 39;

// Indonesia BEV sales trajectory · '000 units · 2023-2030F
// axis top = 400; chartBars use 3 milestone years: 2025=114, 2026=175, 2030F=365
// pct = round(value/400*100): 114/400=29; 175/400=44; 365/400=91
const chartBars = [
  { pct: 29, label: '2025',  value: 114 },
  { pct: 44, label: '2026',  value: 175 },
  { pct: 91, label: '2030F', value: 365 },
];

const META = {
  en: {
    title: "Indonesia's EV market — 2027 nickel-to-cell vertical play",
    eyebrow: 'INDONESIA · ELECTRIC VEHICLES · MARKET ANALYSIS',
    preview: {
      lede: "Indonesia's EV market enters 2027 with 114k BEV units sold in 2025 (+103.6% YoY [Gaikindo 2026]) and a nickel-to-cell vertical that is reshaping segment economics. The 18-month window from mid-2026 to end-2027, bounded by the PPN DTP nickel-tilted incentive (June 2026) and the 60% TKDN step-up (Jan 2027), decides which OEMs lock in local-content compliance and which slide to import-tariff exposure.",
      paragraphs: [
        "This report covers the macro backdrop for 2027 EV demand, sector sizing and 4W vs 2W split, the nickel-to-cell value chain economics, four operator profiles (BYD Indonesia, Wuling Motors, Hyundai-LG IBI JV, CATL-IBC Karawang), demand drivers and channel mix, the regulatory landscape across Perpres 79 / TKDN 40-60-80 / PPN DTP, AI's impact on EV economics, and a 5-year base/bull/bear outlook to 2030.",
        "The nickel-to-cell vertical — not retail demand alone — is the dominant 2027 story. Indonesia produced 2.2 Mt of nickel in 2024 (59% global share [ESDM 2025]) and is on track for ~32 GWh of domestic cell capacity by 2027F (LG 10 + CATL 6.9 + ramp [Kira estimates]). The chemistry-shift to NMC following June 2026's PPN DTP nickel-tilted incentive structurally favours operators with co-located cell plants over LFP-default Chinese imports.",
      ],
      chart: {
        title: 'Indonesia BEV sales trajectory',
        subtitle: "Units '000 · 2025-2030F",
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                          pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                             pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                    pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context: Indonesia 2027',        pages: 'PG 07', locked: true  },
      { num: '05', name: 'Sector overview & sizing',             pages: 'PG 10', locked: true  },
      { num: '06', name: 'Segment economics',                    pages: 'PG 12', locked: true  },
      { num: '07', name: 'Competitive landscape',                pages: 'PG 14', locked: true  },
      { num: '08', name: 'Demand drivers & channels',            pages: 'PG 21', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',        pages: 'PG 24', locked: true  },
      { num: '10', name: 'AI impact on EV economics',            pages: 'PG 26', locked: true  },
      { num: '11', name: '5-year outlook & forecast',            pages: 'PG 28', locked: true  },
      { num: '12', name: 'Methodology endnote',                  pages: 'PG 29', locked: true  },
    ],
  },

  ja: {
    title: 'インドネシアEV市場 — 2027年ニッケルからセルへの垂直統合',
    eyebrow: 'インドネシア · 電気自動車 · マーケット分析',
    preview: {
      lede: 'インドネシアEV市場は2027年、2025年BEV販売11.4万台(前年比+103.6% [Gaikindo 2026])と、セグメント経済性を塗り替えるニッケル/セル垂直連鎖を起点に始まります。2026年6月のPPN DTPニッケル傾斜インセンティブと、2027年1月のTKDN 60%への段階的引き上げに挟まれた18ヶ月が、OEM各社の現地調達適合と輸入関税エクスポージャーを分けます。',
      paragraphs: [
        '本レポートは2027年EV需要のマクロ背景、セクター規模と4輪/2輪構成、ニッケル/セル価値連鎖の経済性、4社プロファイル(BYD Indonesia、Wuling Motors、Hyundai-LG IBI JV、CATL-IBC Karawang)、需要要因とチャネル構成、Perpres 79・TKDN 40-60-80・PPN DTPを横断する規制環境、AIがEV経済性に与える影響、そして2030年までのベース/ブル/ベアによる5年見通しを扱います。',
        '2027年の主役は、小売需要単独ではなく、ニッケル/セル垂直連鎖です。インドネシアは2024年に220万トンのニッケルを産出(世界シェア59% [ESDM 2025])し、2027年予測でLG 10 + CATL 6.9 + ramp [Kira estimates]の合計約32 GWhの国内セル能力に到達する軌道です。2026年6月PPN DTPニッケル傾斜インセンティブに伴うNMCへの化学組成シフトは、LFPデフォルトの中国製輸入よりもセル工場併設のOEMを構造的に優位に置きます。',
      ],
      chart: {
        title: 'インドネシアBEV販売推移',
        subtitle: '千台 · 2025-2030年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                  pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',                pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境:インドネシア2027',          pages: 'P 07', locked: true  },
      { num: '05', name: 'セクター概観と市場規模',                pages: 'P 10', locked: true  },
      { num: '06', name: 'セグメント別経済性',                    pages: 'P 12', locked: true  },
      { num: '07', name: '競争環境',                              pages: 'P 14', locked: true  },
      { num: '08', name: '需要要因とチャネル',                    pages: 'P 21', locked: true  },
      { num: '09', name: '規制および政策環境',                    pages: 'P 24', locked: true  },
      { num: '10', name: 'AIがEV経済性に与える影響',              pages: 'P 26', locked: true  },
      { num: '11', name: '5年見通しと予測',                       pages: 'P 28', locked: true  },
      { num: '12', name: '調査手法エンドノート',                  pages: 'P 29', locked: true  },
    ],
  },

  ko: {
    title: '인도네시아 EV 시장 — 2027년 니켈에서 셀까지 수직 통합',
    eyebrow: '인도네시아 · 전기차 · 시장 분석',
    preview: {
      lede: '인도네시아 EV 시장은 2027년 2025년 BEV 11.4만 대 판매(전년 대비 +103.6% [Gaikindo 2026])와 세그먼트 경제성을 재편하는 니켈에서 셀까지의 수직 통합을 출발점으로 합니다. 2026년 6월 PPN DTP 니켈 가중 인센티브와 2027년 1월 TKDN 60% 단계 상향 사이의 18개월이 OEM 각 사의 현지 조달 충족과 수입 관세 노출을 좌우합니다.',
      paragraphs: [
        '본 보고서는 2027년 EV 수요의 거시 배경, 섹터 규모 및 4W vs 2W 분할, 니켈에서 셀까지의 가치사슬 경제성, 4개 사업자 프로파일(BYD Indonesia, Wuling Motors, Hyundai-LG IBI JV, CATL-IBC Karawang), 수요 동인 및 채널 구성, Perpres 79 · TKDN 40-60-80 · PPN DTP를 가로지르는 규제 환경, AI가 EV 경제성에 미치는 영향, 그리고 2030년까지의 베이스/불/베어 5년 전망을 다룹니다.',
        '2027년의 주역은 소매 수요 단독이 아닌, 니켈에서 셀까지의 수직 통합입니다. 인도네시아는 2024년 220만 톤의 니켈을 생산(글로벌 점유율 59% [ESDM 2025])했고, 2027년 예측 기준 LG 10 + CATL 6.9 + ramp [Kira estimates]로 합산 약 32 GWh의 국내 셀 능력에 도달하는 궤도에 있습니다. 2026년 6월 PPN DTP 니켈 가중 인센티브에 따른 NMC 화학 조성 전환은 LFP 기본 중국 수입 대비 셀 공장을 함께 갖춘 OEM을 구조적으로 유리하게 만듭니다.',
      ],
      chart: {
        title: '인도네시아 BEV 판매 추이',
        subtitle: '천 대 · 2025-2030년 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법론',                            pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                   pages: 'P 03', locked: false },
      { num: '03', name: '요약',                                   pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경: 인도네시아 2027',             pages: 'P 07', locked: true  },
      { num: '05', name: '섹터 개관 및 시장 규모',                 pages: 'P 10', locked: true  },
      { num: '06', name: '세그먼트별 경제성',                      pages: 'P 12', locked: true  },
      { num: '07', name: '경쟁 구도',                              pages: 'P 14', locked: true  },
      { num: '08', name: '수요 동인 및 채널',                      pages: 'P 21', locked: true  },
      { num: '09', name: '규제 및 정책 환경',                      pages: 'P 24', locked: true  },
      { num: '10', name: 'EV 경제성에 대한 AI 영향',               pages: 'P 26', locked: true  },
      { num: '11', name: '5년 전망 및 예측',                       pages: 'P 28', locked: true  },
      { num: '12', name: '방법론 부록',                            pages: 'P 29', locked: true  },
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
