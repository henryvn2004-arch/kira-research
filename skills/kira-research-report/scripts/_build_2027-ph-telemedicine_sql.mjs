// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-ph-telemedicine. Run via Supabase MCP execute_sql.

export const SLUG    = 'telemedicine-philippines-2027';
export const COUNTRY = 'Philippines';
export const INDUSTRY= 'Telemedicine';
export const YEAR    = 2027;
export const PAGES   = 25;
export const PRICE   = 39;

// Chart bars: Philippines telemedicine market size (US$B). 2022 / 2025 actual / 2027F.
// Tallest bar (2.8) = 100%. 1.0/2.8 ≈ 36%, 2.0/2.8 ≈ 71%.
const chartBars = [
  { pct: 36,  label: '2022',  value: '$1.0B' },
  { pct: 71,  label: '2025',  value: '$2.0B' },
  { pct: 100, label: '2027F', value: '$2.8B' },
];

const TOC = {
  en: [
    ['03', 'Executive summary',            '004'],
    ['04', 'Macro context: Philippines 2027', '006'],
    ['05', 'Sector overview & sizing',     '009'],
    ['06', 'Segment economics',            '011'],
    ['07', 'Competitive landscape',        '012'],
    ['07a','Player profile · mWell',       '014'],
    ['07b','Player profile · KonsultaMD',  '015'],
    ['07c','Player profile · Medgate',     '016'],
    ['07d','Player profile · HealthNow',   '017'],
    ['08', 'Demand drivers & channels',    '018'],
    ['09', 'Regulatory & policy landscape','019'],
    ['10', 'AI impact on telemedicine',    '020'],
    ['11', '5-year outlook & forecast',    '022'],
    ['12', 'Methodology endnote',          '023'],
  ],
  ja: [
    ['03', 'エグゼクティブサマリー',          '004'],
    ['04', 'マクロ環境：フィリピン2027',      '006'],
    ['05', 'セクター概要と市場規模',          '009'],
    ['06', 'セグメント経済性',                '011'],
    ['07', '競合環境',                        '012'],
    ['07a','プレイヤープロファイル · mWell',  '014'],
    ['07b','プレイヤープロファイル · KonsultaMD','015'],
    ['07c','プレイヤープロファイル · Medgate','016'],
    ['07d','プレイヤープロファイル · HealthNow','017'],
    ['08', '需要ドライバーとチャネル',        '018'],
    ['09', '規制・政策環境',                  '019'],
    ['10', '遠隔医療へのAI影響',              '020'],
    ['11', '5年間展望と予測',                 '022'],
    ['12', '方法論補足',                      '023'],
  ],
  ko: [
    ['03', '경영진 요약',                     '004'],
    ['04', '거시 환경: 필리핀 2027',          '006'],
    ['05', '섹터 개요 및 규모',               '009'],
    ['06', '세그먼트 경제성',                 '011'],
    ['07', '경쟁 구도',                       '012'],
    ['07a','사업자 프로필 · mWell',           '014'],
    ['07b','사업자 프로필 · KonsultaMD',      '015'],
    ['07c','사업자 프로필 · Medgate',         '016'],
    ['07d','사업자 프로필 · HealthNow',       '017'],
    ['08', '수요 동인 및 채널',               '018'],
    ['09', '규제 및 정책 환경',               '019'],
    ['10', 'AI의 원격의료 영향',              '020'],
    ['11', '5개년 전망 및 예측',              '022'],
    ['12', '방법론 후기',                     '023'],
  ],
};

function toc(loc) {
  return TOC[loc].map(([num, name, pages], i) => ({
    num, name, pages: 'PG ' + pages, locked: i !== 0,
  }));
}

export const META = {
  en: {
    title: 'Philippines telemedicine 2027',
    eyebrow: 'PHILIPPINES · TELEMEDICINE · MARKET ANALYSIS',
    preview: {
      lede: "Teleconsultation has proven product-market fit in an archipelago where 53% of people sit beyond a 30-minute rural-health-unit trip. The 2026-2028 window — defined by the mWell–KonsultaMD merger and PhilHealth reimbursement — decides whether the Philippine telemedicine market scales on subsidized public demand or stalls as a paid urban convenience. The market reached roughly US$2.0 billion in 2025 on a ~16-17% CAGR, with teleconsultation the single largest revenue segment.",
      paragraphs: [
        "The Philippines spans 7,641 islands and 114m+ people, with doctors heavily concentrated in Metro Manila. With 53% of the population beyond a 30-minute trip to a rural health unit and nearly half of those units reachable only by water, telemedicine substitutes for physical access rather than competing with it. Monthly teleconsultations grew 42% year-on-year in 2024, fastest in Mindanao and Eastern Visayas.",
        "In February 2025, Metro Pacific Health Tech (mWell) acquired KonsultaMD from the Ayala group, combining 3.1m and 2.7m users into a 5.8m-subscriber leader. The deal links the country's largest private hospital network to its largest telehealth front door — the structural event that defines the next three years for operators, HMOs, and investors.",
      ],
      chart: {
        title: 'Philippines telemedicine market size',
        subtitle: 'USD bn · 2022 · 2025 · 2027F',
        bars: chartBars,
      },
    },
    toc: toc('en'),
  },

  ja: {
    title: 'フィリピン遠隔医療 2027',
    eyebrow: 'フィリピン · 遠隔医療 · 市場分析',
    preview: {
      lede: '遠隔診療は、人口の53%が農村保健センターまで30分超の距離にある群島国家でプロダクト・マーケット・フィットを実証しました。mWell–KonsultaMD統合とPhilHealth償還が規定する2026-2028年の窓が、フィリピン遠隔医療市場が公的補助需要で拡大するか、都市部の有料利便性に留まるかを決定づけます。市場規模は2025年に約US$2.0bn、年率16-17%成長に達し、遠隔診療が最大の収益セグメントです。',
      paragraphs: [
        'フィリピンは7,641の島々と1億1,400万人以上を抱え、医師はメトロマニラに集中しています。人口の53%が農村保健センターまで30分超の距離にあり、そのほぼ半数は水路でしかアクセスできない環境にあるため、遠隔医療は既存医療との競合ではなく物理的アクセスの代替として機能しています。月次遠隔診療件数は2024年に前年比42%増加し、ミンダナオ島・東ビサヤ地方での伸びが最大でした。',
        '2025年2月、Metro Pacific Health Tech（mWell）がアヤラグループからKonsultaMDを買収し、3.1mと2.7mのユーザーを合算して5.8m規模のリーダーが誕生しました。本件は国内最大の民間病院ネットワークと最大の遠隔ヘルスケアの入口を結びつける構造的事象であり、オペレーター・HMO・投資家にとって今後3年間を規定します。',
      ],
      chart: {
        title: 'フィリピン遠隔医療市場規模',
        subtitle: 'USD bn · 2022 · 2025 · 2027F',
        bars: chartBars,
      },
    },
    toc: toc('ja'),
  },

  ko: {
    title: '필리핀 원격의료 2027',
    eyebrow: '필리핀 · 원격의료 · 시장 분석',
    preview: {
      lede: '원격상담은 인구의 53%가 지방 보건소에서 30분 이상 떨어진 곳에 거주하는 군도 국가에서 제품-시장 적합성을 입증했습니다. mWell–KonsultaMD 합병과 PhilHealth 급여 적용이 규정하는 2026-2028년의 창은 필리핀 원격의료 시장이 공적 보조 수요로 확장될지, 아니면 도시형 유료 편의 서비스에 머물지를 결정합니다. 시장 규모는 2025년 약 USD 20억, 연 16-17% 성장에 도달했으며 원격상담이 최대 매출 세그먼트입니다.',
      paragraphs: [
        '필리핀은 7,641개 섬과 1억 1,400만 명 이상의 인구를 보유하며, 의사는 메트로 마닐라에 집중되어 있습니다. 인구의 53%가 지방 보건소에서 30분 이상 떨어진 곳에 거주하고 그 절반에 가까운 보건소가 수로로만 접근 가능한 환경에서, 원격의료는 기존 의료와 경쟁하기보다 물리적 접근의 대체재로 기능합니다. 월간 원격상담은 2024년 전년 대비 42% 성장했으며 민다나오와 동부 비사야스에서 가장 빠른 증가세를 보였습니다.',
        '2025년 2월, Metro Pacific Health Tech(mWell)가 Ayala 그룹으로부터 KonsultaMD를 인수하여 3.1m과 2.7m 사용자를 통합한 5.8m 구독자 선두 사업자가 탄생했습니다. 이 거래는 국내 최대 민간 병원 네트워크와 최대 원격의료 전면 창구를 연결하는 구조적 사건으로, 운영사·HMO·투자자에게 향후 3년을 규정합니다.',
      ],
      chart: {
        title: '필리핀 원격의료 시장 규모',
        subtitle: 'USD bn · 2022 · 2025 · 2027F',
        bars: chartBars,
      },
    },
    toc: toc('ko'),
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

export { sql };

// Only print when run directly (not when imported by the publish helper).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('_build_2027-ph-telemedicine_sql.mjs')) {
  process.stdout.write(sql);
}
