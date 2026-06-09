// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-sg-green-finance. Run via Supabase MCP execute_sql.

const SLUG     = 'green-finance-singapore-2027';
const COUNTRY  = 'Singapore';
const INDUSTRY = 'Green Finance';
const YEAR     = 2027;
const PAGES    = 14;
const PRICE    = 39;

// Exec chart: Singapore outstanding sustainable bonds (US$ bn). 2021-2027F.
// Full series: 18.1, 21.3, 24.9, 28.0, 32.6, 38(F), 45(F). Tallest 45 = 100%.
const chartBars = [
  { pct: 40,  label: '2021',  value: 18.1 },
  { pct: 55,  label: '2023',  value: 24.9 },
  { pct: 72,  label: '2025',  value: 32.6 },
  { pct: 84,  label: '2026F', value: 38   },
  { pct: 100, label: '2027F', value: 45   },
];

const META = {
  en: {
    title: "Singapore's green finance market — 2027: taxonomy stack, sustainable-bond rebound & transition capital",
    eyebrow: 'SINGAPORE · GREEN FINANCE · MARKET ANALYSIS',
    preview: {
      lede: "Singapore's green, social and sustainability bond market has moved past its trough: GSSSL issuance rebounded to S$13.3 bn in 2024 (up roughly 80%) and outstanding sustainable bonds reached US$32.6 bn by end-2025. The republic intermediates more than half of ASEAN's labelled-debt market. The decisive question for 2027 is whether Singapore converts its arranging hub into a transition-finance hub as the Singapore-Asia and ASEAN taxonomies turn operational.",
      paragraphs: [
        "Issuance is recovering on structural foundations — a sovereign green-bond programme targeting S$35 bn by 2030, a deepening private pipeline, and an outstanding stock compounding toward a forecast US$45 bn by 2027. This is not a one-year cyclical bounce but a re-anchoring of the labelled-debt market.",
        "The qualitative shift matters more than the volume. With the Singapore-Asia Taxonomy's transition category live and FAST-P targeting US$5 bn of blended capital, the market's centre of gravity moves from financing the unambiguously green toward the hard-to-abate — where ASEAN's US$1.5 trn-by-2030 gap actually sits. This report maps issuance, the taxonomy stack, the ecosystem, and base/bull/bear scenarios to 2027.",
      ],
      chart: {
        title: 'Sustainable bond market trajectory',
        subtitle: 'Singapore · outstanding US$ bn · 2021-2027F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'Executive summary',     pages: 'PG 004', locked: false },
      { num: '05', name: 'Market sizing',         pages: 'PG 007', locked: true  },
      { num: '05', name: 'Issuance composition',  pages: 'PG 008', locked: true  },
      { num: '06', name: 'The taxonomy stack',    pages: 'PG 010', locked: true  },
      { num: '07', name: 'Ecosystem map',         pages: 'PG 011', locked: true  },
      { num: '08', name: '2027 outlook',          pages: 'PG 013', locked: true  },
    ],
  },

  ja: {
    title: 'シンガポール グリーンファイナンス市場 — 2027年展望：タクソノミー体系、サステナブル債の回復、トランジション資本',
    eyebrow: 'シンガポール · グリーンファイナンス · マーケット分析',
    preview: {
      lede: 'シンガポールのグリーン・ソーシャル・サステナビリティ債市場は底を打ちました。GSSSL発行額は2024年にS$133億（前年比約80%増）へ回復し、サステナブル債の残高は2025年末までにUS$326億に達しました。同国はASEANのラベル債務市場の過半を仲介しています。2027年に向けた決定的な問いは、シンガポール・アジアおよびASEANタクソノミーが稼働するなか、シンガポールがアレンジハブをトランジションファイナンスハブへ転換できるかどうかです。',
      paragraphs: [
        '発行の回復は構造的な基盤に支えられています。2030年までにS$350億を目指す国債グリーンボンドプログラム、厚みを増す民間パイプライン、そして2027年にUS$450億へと予測される残高の積み上がりです。これは単年の循環的な反発ではなく、ラベル債市場の再アンカリングです。',
        '数量以上に質的な転換が重要です。シンガポール・アジアタクソノミーのトランジションカテゴリーが稼働し、FAST-PがUS$50億のブレンデッド資本を目標とするなか、市場の重心は明確にグリーンな案件の資金調達から、脱炭素が難しい分野へと移ります。そこにこそASEANの2030年までのUS$1.5兆のギャップが存在します。本レポートは発行動向、タクソノミー体系、エコシステム、2027年までの基本・強気・弱気シナリオを網羅します。',
      ],
      chart: {
        title: 'サステナブル債券市場の推移',
        subtitle: 'シンガポール · 残高 US$ bn · 2021-2027F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'エグゼクティブサマリー',   pages: 'P 004', locked: false },
      { num: '05', name: '市場規模',                 pages: 'P 007', locked: true  },
      { num: '05', name: '発行構成',                 pages: 'P 008', locked: true  },
      { num: '06', name: 'タクソノミー体系',         pages: 'P 010', locked: true  },
      { num: '07', name: 'エコシステム・マップ',     pages: 'P 011', locked: true  },
      { num: '08', name: '2027年展望',               pages: 'P 013', locked: true  },
    ],
  },

  ko: {
    title: '싱가포르 그린 파이낸스 2027 전망: 택소노미 체계, 지속가능채권 회복과 전환 자본',
    eyebrow: '싱가포르 · 그린 파이낸스 · 시장 분석',
    preview: {
      lede: '싱가포르의 그린·소셜·지속가능채권 시장은 저점을 지났습니다. GSSSL 발행액은 2024년 S$133억으로 약 80% 반등했고, 지속가능채권 잔액은 2025년 말 US$326억에 도달했습니다. 싱가포르는 ASEAN 레이블드 채무 시장의 절반 이상을 중개합니다. 2027년을 향한 결정적 질문은 싱가포르-아시아 및 ASEAN 택소노미가 가동되는 가운데 싱가포르가 주선 허브를 전환금융 허브로 전환할 수 있는지입니다.',
      paragraphs: [
        '발행 회복은 구조적 기반 위에 있습니다. 2030년까지 S$350억을 목표로 하는 국채 그린본드 프로그램, 두터워지는 민간 파이프라인, 그리고 2027년 US$450억으로 전망되는 잔액 누적이 그것입니다. 이는 단년의 경기순환적 반등이 아니라 레이블드 채무 시장의 재정착입니다.',
        '물량보다 질적 전환이 더 중요합니다. 싱가포르-아시아 택소노미의 전환 카테고리가 가동되고 FAST-P가 US$50억의 혼합금융 자본을 목표로 하면서, 시장의 무게중심은 명백히 친환경적인 자금조달에서 탈탄소가 어려운 분야로 이동합니다. 바로 그곳에 ASEAN의 2030년까지 US$1.5조 격차가 존재합니다. 본 보고서는 발행 동향, 택소노미 체계, 생태계, 2027년까지의 기본·낙관·비관 시나리오를 다룹니다.',
      ],
      chart: {
        title: '지속가능채권 시장 궤적',
        subtitle: '싱가포르 · 잔액 US$ bn · 2021-2027F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: '경영진 요약',       pages: 'P 004', locked: false },
      { num: '05', name: '시장 규모',         pages: 'P 007', locked: true  },
      { num: '05', name: '발행 구성',         pages: 'P 008', locked: true  },
      { num: '06', name: '택소노미 체계',     pages: 'P 010', locked: true  },
      { num: '07', name: '생태계 지도',       pages: 'P 011', locked: true  },
      { num: '08', name: '2027 전망',         pages: 'P 013', locked: true  },
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
