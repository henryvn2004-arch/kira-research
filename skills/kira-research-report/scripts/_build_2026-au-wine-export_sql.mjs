// One-off helper: builds SQL to insert living_reports + 3 report_translations
// rows for 2026-au-wine-export. Run via Supabase MCP execute_sql.

const SLUG     = 'wine-australia-2026';
const COUNTRY  = 'Australia';
const INDUSTRY = 'Wine';
const YEAR     = 2026;
const PAGES    = 14;
const PRICE    = 39;

// Exec chart: Total wine export value, Australia, A$ bn, rolling 12-month.
// FY22 2.00, FY23 1.86, Mar25 2.64, Dec25 2.34. Tallest 2.64 (Mar25) = 100%.
const chartBars = [
  { pct: 60,  label: 'FY22',  value: 2.00 },
  { pct: 55,  label: 'FY23',  value: 1.86 },
  { pct: 100, label: 'Mar25', value: 2.64 },
  { pct: 83,  label: 'Dec25', value: 2.34 },
];

// TOC: flat list from .toc-row. First 2 rows (P.004-005, inside the free
// 5-page preview) unlocked; rest locked.
const tocRows = [
  { pg: '004', locked: false, en: 'Executive summary',          ja: 'エグゼクティブサマリー',           ko: '경영진 요약' },
  { pg: '005', locked: false, en: 'Strategic implications',     ja: '戦略的示唆',                       ko: '전략적 시사점' },
  { pg: '006', locked: true,  en: 'Export sizing & trajectory', ja: '輸出規模と推移',                   ko: '수출 규모 & 추세' },
  { pg: '007', locked: true,  en: 'The China rebound',          ja: '中国市場の回復',                   ko: '중국 시장 반등' },
  { pg: '008', locked: true,  en: 'Premium segment positioning',ja: 'プレミアムセグメントの位置づけ',   ko: '프리미엄 세그먼트 포지셔닝' },
  { pg: '009', locked: true,  en: 'Competitive structure',      ja: '競合構造',                         ko: '경쟁 구조' },
  { pg: '010', locked: true,  en: 'Treasury Wine Estates',      ja: 'Treasury Wine Estates',            ko: 'Treasury Wine Estates' },
  { pg: '011', locked: true,  en: 'Channel & distribution',     ja: 'チャネル・流通',                   ko: '채널 & 유통' },
  { pg: '012', locked: true,  en: 'Trade & policy landscape',   ja: '貿易・政策の状況',                 ko: '무역 & 정책 환경' },
  { pg: '013', locked: true,  en: '2030 outlook & scenarios',   ja: '2030年見通しとシナリオ',           ko: '2030 전망 & 시나리오' },
  { pg: '014', locked: true,  en: 'Methodology endnote',        ja: '調査方法論の補足',                 ko: '방법론 부록' },
];

function buildToc(loc, pgPrefix) {
  return tocRows.map((r, i) => ({
    num: String(i + 1).padStart(2, '0'),
    name: r[loc],
    pages: pgPrefix + r.pg,
    locked: r.locked,
  }));
}

const META = {
  en: {
    title: 'Australia wine export 2026: the China windfall and the premium-segment test',
    eyebrow: 'AUSTRALIA · WINE · MARKET ANALYSIS',
    preview: {
      lede: "China's tariff removal restored a billion-dollar export channel in a single year. The 2026 question is no longer access — it is which exporters convert the windfall into durable premium value as the re-stocking surge normalizes. Tariff removal in March 2024 reopened a market worth over a billion dollars within twelve months, pulling the national average export price to a near two-decade high.",
      paragraphs: [
        "Total exports rose 41% in value to A$2.64 bn in the 12 months to March 2025, but only 6% in volume to 647 ML [Wine Australia 2025]. The gap is the story: nearly all the recaptured value sits in packaged premium bottles bound for mainland China, where Australian wine had built a luxury franchise before the 2020 duties. The re-entry rebuilt that franchise faster than re-stocking the value tiers below it.",
        "The surge is moderating. The full year to December 2025 fell 8% in value to A$2.34 bn as the initial pipeline re-fill completed and global consumption softened [Wine Australia Dec 2025]. China is plateauing into a durable but smaller run-rate [Kira estimates]. Exporters who treated 2024–25 as a permanent baseline rather than a one-off catch-up now face an inventory and pricing reset.",
      ],
      chart: {
        title: 'Total wine export value',
        subtitle: 'Australia · A$ bn · rolling 12-month',
        bars: chartBars,
      },
    },
    toc: buildToc('en', 'PG '),
  },

  ja: {
    title: 'オーストラリアワイン輸出 2026:中国の恩恵とプレミアムセグメントの試練',
    eyebrow: 'AUSTRALIA · WINE · 市場分析',
    preview: {
      lede: '中国の関税撤廃により、億ドル規模の輸出チャネルがわずか1年で復活しました。2026年の課題はアクセスの回復ではなく、再入荷急増が正常化していく中で、どの輸出事業者が一時的な収益増を持続的なプレミアム価値へと転換できるかにあります。2024年3月の関税撤廃は12ヶ月以内に10億ドル超の市場を再開し、全国平均輸出価格を約20年ぶりの高水準へと押し上げました。',
      paragraphs: [
        '2025年3月までの12ヶ月で総輸出は金額ベース41%増のA$24億6,400万となりましたが、数量ベースの増加は6%にとどまり647ML [Wine Australia 2025]。このギャップが本質です——回復した価値のほぼすべては、中国向けのボトル入りプレミアムワインに集中しており、2020年の課税以前にラグジュアリー市場として構築していたフランチャイズに、価値ティア以上のスピードで再参入したことを示しています。',
        '急増は鈍化しています。2025年12月通年では金額ベース8%減のA$23億4,000万となり、当初のパイプライン再充填が完了し、世界的な消費が軟化したことが主因です [Wine Australia Dec 2025]。中国は持続的ではあるも規模が縮小した安定した推移に移行しつつあります [Kira estimates]。2024〜25年を恒久的なベースラインと捉えた輸出事業者は、在庫と価格設定の見直しを迫られる状況です。',
      ],
      chart: {
        title: '総ワイン輸出金額',
        subtitle: 'Australia · A$ bn · 直近12ヶ月',
        bars: chartBars,
      },
    },
    toc: buildToc('ja', 'P '),
  },

  ko: {
    title: '호주 와인 수출 2026: 중국 특수와 프리미엄 세그먼트 검증',
    eyebrow: 'AUSTRALIA · WINE · 시장 분석',
    preview: {
      lede: '중국의 관세 철폐는 단 1년 만에 10억 달러 규모의 수출 채널을 복원했습니다. 2026년의 핵심 질문은 더 이상 접근성이 아닙니다 — 재고 확충 급증이 정상화되는 과정에서, 어떤 수출업자가 이 일시적 수혜를 지속 가능한 프리미엄 가치로 전환하는가입니다. 2024년 3월 관세 철폐는 12개월 이내에 10억 달러 이상 규모의 시장을 재개방하며 전국 평균 수출 단가를 약 20년 만의 최고치로 끌어올렸습니다.',
      paragraphs: [
        '2025년 3월까지 12개월간 총 수출액은 41% 증가하여 A$2.64 bn에 달했지만, 물량 증가는 647 ML로 6%에 그쳤습니다 [Wine Australia 2025]. 이 격차가 핵심입니다. 회복된 가치의 거의 전부는 중국 본토로 향하는 프리미엄 패키지 와인에 집중되어 있으며, 2020년 관세 부과 이전 호주 와인이 구축했던 럭셔리 프랜차이즈가 빠르게 복원된 결과입니다. 재진입은 저가 티어보다 프리미엄 프랜차이즈를 훨씬 빠르게 되살렸습니다.',
        '급증세는 둔화되고 있습니다. 2025년 12월까지 전체 연도 수출액은 초기 파이프라인 재충전 완료와 글로벌 소비 위축으로 8% 감소하여 A$2.34 bn을 기록했습니다 [Wine Australia Dec 2025]. 중국은 지속 가능하지만 규모가 축소된 안정적 수준으로 수렴하고 있습니다 [Kira estimates]. 2024~25년을 영구적 기준선이 아닌 일회성 따라잡기로 인식하지 못한 수출업자는 재고·가격 조정 압박에 직면합니다.',
      ],
      chart: {
        title: '총 와인 수출액',
        subtitle: '호주 · A$ bn · 롤링 12개월',
        bars: chartBars,
      },
    },
    toc: buildToc('ko', 'P '),
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
