// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-id-fmcg. Run via Supabase MCP execute_sql.

const SLUG    = 'indonesia-fmcg-2027';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'FMCG';
const YEAR    = 2027;
const PAGES   = 25;
const PRICE   = 39;

// Chart bars: Indonesia FMCG market value (USD bn). 2024 actual, 2027F target, 2030F horizon.
// From sizing page trajectory: 2024=100, 2027F=118, 2030F=138.
const chartBars = [
  { pct: 72,  label: '2024',  value: 100 },
  { pct: 86,  label: '2027F', value: 118 },
  { pct: 100, label: '2030F', value: 138 },
];

const META = {
  en: {
    title: "Indonesia's FMCG market 2027: Halal premiumization & the modern-trade build-out",
    eyebrow: 'INDONESIA · FMCG · MARKET ANALYSIS',
    preview: {
      lede: "Indonesia's FMCG market enters 2027 defined by two forces beyond retail demand alone: the October 2026 mandatory-halal reset that turns certification from a marketing differentiator into a market-access requirement, and the steady migration of value toward modern trade and premium SKUs. At USD 100bn-plus it is Southeast Asia's largest FMCG market, growing ~7.6% CAGR through 2025 and moderating to ~5.5% over 2026-2032 as the middle class contracts and demand bifurcates.",
      paragraphs: [
        "This report covers the macro setup (GDP, middle-class trajectory, the halal-policy ladder), total FMCG sizing and channel structure, segment economics across food, beverage and home & personal care, the competitive landscape with four player profiles (Indofood/ICBP, Unilever Indonesia, Mayora Indah, Wings Group), demand drivers across modern and traditional trade plus quick commerce, the regulatory landscape (mandatory halal, sugar tax, labeling), AI's impact on FMCG economics, and a base/bull/bear outlook to 2030.",
        "Modern trade and e-commerce lift from ~32% of value in 2024 toward ~40% by 2027, while general trade slips from ~68% but still anchors the basket. Household consumption carries 53-54% of GDP, yet the middle class contracted from 47.9m to 46.7m people — so value-tier shoppers stretch budgets while upper-middle households trade up selectively. From 17-18 October 2026, halal certification becomes mandatory for food, beverage and personal-care goods; compliance, not price, becomes the shelf filter.",
      ],
      chart: {
        title: 'Indonesia FMCG market value (USD bn)',
        subtitle: '2024 actual · 2027 forecast · 2030 horizon',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03',  name: 'Executive summary',              pages: 'PG 004', locked: false },
      { num: '04',  name: 'Macro context: Indonesia 2027',  pages: 'PG 006', locked: true  },
      { num: '05',  name: 'Sector overview & sizing',       pages: 'PG 009', locked: true  },
      { num: '06',  name: 'Segment economics',              pages: 'PG 011', locked: true  },
      { num: '07',  name: 'Competitive landscape',          pages: 'PG 012', locked: true  },
      { num: '07a', name: 'Player profile · Indofood / ICBP', pages: 'PG 014', locked: true },
      { num: '07b', name: 'Player profile · Unilever Indonesia', pages: 'PG 015', locked: true },
      { num: '07c', name: 'Player profile · Mayora Indah',  pages: 'PG 016', locked: true  },
      { num: '07d', name: 'Player profile · Wings Group',   pages: 'PG 017', locked: true  },
      { num: '08',  name: 'Demand drivers & channels',      pages: 'PG 019', locked: true  },
      { num: '09',  name: 'Regulatory & policy landscape',  pages: 'PG 022', locked: true  },
      { num: '10',  name: 'AI impact on FMCG economics',    pages: 'PG 024', locked: true  },
      { num: '11',  name: '5-year outlook & forecast',      pages: 'PG 025', locked: true  },
      { num: '12',  name: 'Methodology endnote',            pages: 'PG 025', locked: true  },
    ],
  },

  ja: {
    title: 'インドネシアFMCG市場 2027:ハラール高付加価値化とモダントレード拡大',
    eyebrow: 'インドネシア · FMCG · マーケット分析',
    preview: {
      lede: 'インドネシアのFMCG市場は2027年、小売需要だけではない2つの構造的な力に規定されます。すなわち、認証をマーケティング上の差別化要因から市場アクセス要件へと変える2026年10月の義務的ハラール規制と、価値のモダントレード・プレミアムSKUへの着実な移行です。市場規模はUSD 100bn超で東南アジア最大であり、2025年まで約7.6%のCAGRで成長した後、中間層の縮小と需要の二極化を背景に2026-2032年は約5.5%へ減速します。',
      paragraphs: [
        '本レポートはマクロ環境(GDP、中間層の推移、ハラール政策の段階的進展)、FMCG総額の規模とチャネル構造、食品・飲料・ホーム&パーソナルケアにわたるセグメント経済性、4社のプロファイル(Indofood/ICBP、Unilever Indonesia、Mayora Indah、Wings Group)を含む競争環境、モダントレード・一般流通・クイックコマースにまたがる需要ドライバー、規制環境(義務的ハラール、砂糖税、表示規制)、FMCG経済性へのAIの影響、そして2030年までの基本・強気・弱気シナリオを取り上げます。',
        'モダントレードとEコマースは2024年の価値ベース約32%から2027年には約40%へ上昇し、一般流通は約68%から低下しつつも依然として購買バスケットの中核を担います。家計消費はGDPの53-54%を占めますが、中間層は4,790万人から4,670万人へ縮小しており、価値志向の買い物客が予算を切り詰める一方、上位中間層は選択的にトレードアップします。2026年10月17-18日より、食品・飲料・パーソナルケア製品にハラール認証が義務化され、価格ではなくコンプライアンスが棚のフィルターとなります。',
      ],
      chart: {
        title: 'インドネシアFMCG市場規模 (USD bn)',
        subtitle: '2024年実績 · 2027年予測 · 2030年ホライズン',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03',  name: 'エグゼクティブサマリー',           pages: 'P 004', locked: false },
      { num: '04',  name: 'マクロ環境:インドネシア2027年',    pages: 'P 006', locked: true  },
      { num: '05',  name: 'セクター概況と市場規模',           pages: 'P 009', locked: true  },
      { num: '06',  name: 'セグメント経済性',                 pages: 'P 011', locked: true  },
      { num: '07',  name: '競争環境',                         pages: 'P 012', locked: true  },
      { num: '07a', name: '事業者プロファイル · Indofood / ICBP', pages: 'P 014', locked: true },
      { num: '07b', name: '事業者プロファイル · Unilever Indonesia', pages: 'P 015', locked: true },
      { num: '07c', name: '事業者プロファイル · Mayora Indah', pages: 'P 016', locked: true  },
      { num: '07d', name: '事業者プロファイル · Wings Group',  pages: 'P 017', locked: true  },
      { num: '08',  name: '需要ドライバーとチャネル',         pages: 'P 019', locked: true  },
      { num: '09',  name: '規制・政策環境',                   pages: 'P 022', locked: true  },
      { num: '10',  name: 'AIがFMCG経済性に与える影響',       pages: 'P 024', locked: true  },
      { num: '11',  name: '5年間の見通しと予測',              pages: 'P 025', locked: true  },
      { num: '12',  name: '調査方法補足',                     pages: 'P 025', locked: true  },
    ],
  },

  ko: {
    title: '인도네시아 FMCG 시장 2027: 할랄 프리미엄화와 현대 유통 확장',
    eyebrow: '인도네시아 · FMCG · 시장 분석',
    preview: {
      lede: '인도네시아 FMCG 시장은 2027년에 단순한 소매 수요가 아닌 두 가지 구조적 힘에 의해 규정됩니다. 인증을 마케팅 차별화 요인에서 시장 진입 요건으로 전환하는 2026년 10월 의무 할랄 인증, 그리고 현대 유통·프리미엄 SKU로의 꾸준한 가치 이동입니다. USD 100bn을 넘는 규모로 동남아시아 최대 FMCG 시장이며, 2025년까지 약 7.6% CAGR로 성장한 뒤 중산층 축소와 수요 양극화를 배경으로 2026-2032년에는 약 5.5%로 둔화합니다.',
      paragraphs: [
        '본 보고서는 거시 여건(GDP, 중산층 추이, 할랄 정책 단계), FMCG 총가치 규모와 채널 구조, 식품·음료·홈케어 및 퍼스널케어에 걸친 세그먼트 경제학, 4개 사업자 프로파일(Indofood/ICBP, Unilever Indonesia, Mayora Indah, Wings Group)을 포함한 경쟁 구도, 현대 유통·전통 유통·퀵커머스를 아우르는 수요 동인, 규제 환경(의무 할랄, 당류세, 라벨링), FMCG 경제학에 대한 AI 영향, 그리고 2030년까지의 기본·낙관·비관 시나리오를 다룹니다.',
        '현대 유통과 이커머스는 2024년 가치 기준 약 32%에서 2027년 약 40%로 상승하고, 전통 유통은 약 68%에서 하락하지만 여전히 장바구니의 중심을 차지합니다. 가계 소비는 GDP의 53-54%를 담당하지만 중산층은 4,790만 명에서 4,670만 명으로 축소되어, 가치 계층 소비자는 예산을 줄이는 반면 상위 중산층은 선택적으로 상위 제품으로 이동합니다. 2026년 10월 17-18일부터 식품·음료·퍼스널케어 제품에 할랄 인증이 의무화되며, 가격이 아닌 컴플라이언스가 매대의 필터가 됩니다.',
      ],
      chart: {
        title: '인도네시아 FMCG 시장 규모 (USD bn)',
        subtitle: '2024 실적 · 2027 예측 · 2030 호라이즌',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03',  name: '경영진 요약',                     pages: 'P 004', locked: false },
      { num: '04',  name: '거시 여건: 인도네시아 2027',      pages: 'P 006', locked: true  },
      { num: '05',  name: '섹터 개요 & 시장 규모',           pages: 'P 009', locked: true  },
      { num: '06',  name: '세그먼트 경제학',                 pages: 'P 011', locked: true  },
      { num: '07',  name: '경쟁 구도',                       pages: 'P 012', locked: true  },
      { num: '07a', name: '사업자 프로파일 · Indofood / ICBP', pages: 'P 014', locked: true },
      { num: '07b', name: '사업자 프로파일 · Unilever Indonesia', pages: 'P 015', locked: true },
      { num: '07c', name: '사업자 프로파일 · Mayora Indah',  pages: 'P 016', locked: true  },
      { num: '07d', name: '사업자 프로파일 · Wings Group',   pages: 'P 017', locked: true  },
      { num: '08',  name: '수요 동인 & 채널',                pages: 'P 019', locked: true  },
      { num: '09',  name: '규제 & 정책 환경',                pages: 'P 022', locked: true  },
      { num: '10',  name: 'AI가 FMCG 경제학에 미치는 영향',  pages: 'P 024', locked: true  },
      { num: '11',  name: '5개년 전망 & 예측',               pages: 'P 025', locked: true  },
      { num: '12',  name: '방법론 부기',                     pages: 'P 025', locked: true  },
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
