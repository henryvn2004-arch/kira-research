// One-off helper for 2026-vn-logistics. Mirrors _build_vn_ecommerce_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_vn_logistics_sql.mjs > /tmp/insert.sql`
// then feed to Supabase MCP execute_sql.

const SLUG    = 'vietnam-logistics-2026';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'Logistics';
const YEAR    = 2026;
const PAGES   = 24;
const PRICE   = 39;

// Freight market trajectory · USD bn · 2024-2031F
// bars in HTML: 2024=49, 2025=52, 2026=55.5, 2027=59, 2028=63, 2029=67, 2030=71.9, 2031=76.4 (max 80)
// keep 3 representative bars for preview
const chartBars = [
  { pct: 65, label: '2024',  value: 49.0 },
  { pct: 69, label: '2025',  value: 52.1 },
  { pct: 96, label: '2031F', value: 76.4 },
];

const META = {
  en: {
    title: 'Vietnam logistics 2026: cold chain expansion and last-mile competitive landscape',
    eyebrow: 'VIETNAM · LOGISTICS · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's logistics market enters 2026 at a USD 52 bn freight envelope, advancing to USD 55.5 bn next year and on track for USD 76 bn by 2031. Three forces are converging at once: cold-chain capacity catching up to demand at an 11-13% CAGR, last-mile share consolidating around Viettel Post (22.3%) and SPX Express (15.7%), and Decision 2229 anchoring the 2025-2035 national strategy with a 12-15% logistics-cost-to-GDP target. The next 24 months decide which operators capture the next leg of growth.",
      paragraphs: [
        "This report covers macro context (GDP, urbanization, middle-class trajectory, e-commerce GMV at USD 16.4 bn), full sector sizing and segment economics across freight modes, the competitive landscape across Viettel Post, SPX Express, J&T, Ninja Van's exit and ABA Cooltrans in cold chain, demand drivers across modern trade and parcel channels, the Decision 2229 + Law 44/2024 regulatory architecture, and an AI-impact section profiling six distinct deployments.",
        "The 2026-2028 window is the build-out window — automated cold-storage commitments, last-mile routing investments and AI deployment decisions made now lock cost positions through 2030. The 5-year forecast section presents base/bull/bear scenarios with sensitivity to oil prices, FDI inflows and the Decision 2229 implementation tempo. Two deep operator profiles (VTP and ABA Cooltrans) round out the competitive section.",
      ],
      chart: {
        title: 'Vietnam freight market trajectory (USD bn)',
        subtitle: '2024 actual · 2025 actual · 2031 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                          pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                             pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                    pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                        pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',             pages: 'PG 09', locked: true  },
      { num: '06', name: 'Segment economics',                    pages: 'PG 12', locked: true  },
      { num: '07', name: 'Competitive landscape',                pages: 'PG 13', locked: true  },
      { num: '08', name: 'Demand drivers & channels',            pages: 'PG 18', locked: true  },
      { num: '09', name: 'Regulatory & policy',                  pages: 'PG 20', locked: true  },
      { num: '10', name: 'AI impact on logistics',               pages: 'PG 21', locked: true  },
      { num: '11', name: '5-year outlook & forecast',            pages: 'PG 23', locked: true  },
      { num: '12', name: 'Methodology endnote & sources',        pages: 'PG 24', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム物流 2026: コールドチェーン拡張とラストマイル競争環境',
    eyebrow: 'ベトナム · 物流 · マーケット分析',
    preview: {
      lede: 'ベトナム物流市場は2026年、USD 520億の貨物市場規模で出発し、翌年には USD 555億 へ、2031年までに USD 760億 規模に達する軌道にあります。3つの力が同時に収束しています — コールドチェーン能力が11-13%のCAGRで需要に追いつき、ラストマイルシェアは Viettel Post(22.3%)とSPX Express(15.7%)を中心に集約化、そして決定2229号が2025-2035年国家戦略を物流コスト対GDP比12-15%という目標で確立しました。今後24ヶ月で次の成長局面を捉える事業者が決まります。',
      paragraphs: [
        '本レポートはマクロ環境(GDP、都市化、中間層の軌道、EC GMV USD 164億)、貨物モード別の市場規模とセグメント経済性、Viettel Post・SPX Express・J&T、Ninja Vanの撤退、コールドチェーンのABA Cooltransを軸とする競争環境、近代小売とパーセルチャネルにわたる需要ドライバー、決定2229号・法律44/2024の規制構造、そして6つの具体的な展開事例を扱うAIインパクト章を収録します。',
        '2026-2028年は構築期間 — 今行う自動倉庫投資、ラストマイル経路最適化投資、AI導入判断が2030年までのコスト構造を固定します。5年予測章は石油価格、FDI流入、決定2229号実装テンポへの感応度を持つベース・ブル・ベアシナリオを提示。Viettel PostとABA Cooltransの詳細プロファイル2社が競争章を補完します。',
      ],
      chart: {
        title: 'ベトナム貨物市場の推移(USD bn)',
        subtitle: '2024年実績 · 2025年実績 · 2031年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '方法論',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',              pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                          pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観と市場規模',              pages: 'P 09', locked: true  },
      { num: '06', name: 'セグメント経済性',                    pages: 'P 12', locked: true  },
      { num: '07', name: '競争環境',                            pages: 'P 13', locked: true  },
      { num: '08', name: '需要ドライバーとチャネル',            pages: 'P 18', locked: true  },
      { num: '09', name: '規制と政策',                          pages: 'P 20', locked: true  },
      { num: '10', name: '物流業界へのAIインパクト',            pages: 'P 21', locked: true  },
      { num: '11', name: '5年見通しと予測',                     pages: 'P 23', locked: true  },
      { num: '12', name: '方法論補遺と出典',                    pages: 'P 24', locked: true  },
    ],
  },

  ko: {
    title: '베트남 물류 2026: 콜드체인 확장과 라스트마일 경쟁 환경',
    eyebrow: '베트남 · 물류 · 시장 분석',
    preview: {
      lede: '베트남 물류 시장은 2026년 USD 520억 규모의 화물 시장에서 출발해, 내년 USD 555억, 2031년까지 USD 760억 규모를 향한 궤적에 있습니다. 세 가지 동인이 동시에 수렴하고 있습니다 — 콜드체인 용량이 11-13% CAGR로 수요를 따라잡고, 라스트마일 점유율이 Viettel Post(22.3%)와 SPX Express(15.7%)를 중심으로 집중되며, 결정 2229호가 2025-2035 국가 전략을 물류 비용 GDP 비중 12-15% 목표로 정립했습니다. 향후 24개월 동안 다음 성장 국면을 차지할 사업자가 결정됩니다.',
      paragraphs: [
        '본 보고서는 거시 환경(GDP, 도시화, 중산층 궤적, 전자상거래 GMV USD 164억), 화물 모드별 시장 규모와 세그먼트 경제성, Viettel Post · SPX Express · J&T, Ninja Van 철수, 콜드체인의 ABA Cooltrans를 중심으로 한 경쟁 환경, 모던 트레이드와 택배 채널 전반의 수요 동인, 결정 2229호 · 법률 44/2024의 규제 구조, 그리고 6가지 구체적 전개 사례를 다루는 AI 영향 장을 다룹니다.',
        '2026-2028년은 구축 시기입니다 — 지금의 자동 창고 투자, 라스트마일 경로 최적화 투자, AI 도입 결정이 2030년까지의 비용 구조를 고정시킵니다. 5개년 예측 장은 유가, FDI 유입, 결정 2229호 실행 속도에 대한 민감도를 반영한 베이스 · 강세 · 약세 시나리오를 제시합니다. Viettel Post와 ABA Cooltrans 심층 프로파일 2건이 경쟁 환경 장을 보완합니다.',
      ],
      chart: {
        title: '베트남 화물 시장 궤적 (USD bn)',
        subtitle: '2024 실적 · 2025 실적 · 2031 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                              pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',                         pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',                           pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개관 및 시장 규모',              pages: 'P 09', locked: true  },
      { num: '06', name: '세그먼트 경제성',                     pages: 'P 12', locked: true  },
      { num: '07', name: '경쟁 환경',                           pages: 'P 13', locked: true  },
      { num: '08', name: '수요 동인 및 채널',                   pages: 'P 18', locked: true  },
      { num: '09', name: '규제 및 정책',                        pages: 'P 20', locked: true  },
      { num: '10', name: '물류 산업 AI 영향',                   pages: 'P 21', locked: true  },
      { num: '11', name: '5개년 전망 및 예측',                  pages: 'P 23', locked: true  },
      { num: '12', name: '방법론 보주 및 출처',                 pages: 'P 24', locked: true  },
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
