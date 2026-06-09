// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-sg-fintech-payments. Run via Supabase MCP execute_sql.

const SLUG     = 'singapore-fintech-payments-2026';
const COUNTRY  = 'Singapore';
const INDUSTRY = 'Fintech Payments';
const YEAR     = 2026;
const PAGES    = 18;
const PRICE    = 39;

// Exec chart (page 004): "Where Singapore payments value migrates" — qualitative
// growth-contribution mix. Bar heights mirror the report SVG; values are the
// report's qualitative labels (Low / High / Emerging).
const chartBars = {
  en: [
    { pct: 36,  label: 'Domestic core',   value: 'Low' },
    { pct: 81,  label: 'Cross-border QR',  value: 'High' },
    { pct: 100, label: 'Stablecoin',       value: 'Emerging' },
  ],
  ja: [
    { pct: 36,  label: '国内中核',          value: '低' },
    { pct: 81,  label: 'クロスボーダーQR',  value: '高' },
    { pct: 100, label: 'ステーブルコイン',  value: '新興' },
  ],
  ko: [
    { pct: 36,  label: '국내 핵심',         value: '낮음' },
    { pct: 81,  label: '국경 간 QR',        value: '높음' },
    { pct: 100, label: '스테이블코인',      value: '신흥' },
  ],
};

const META = {
  en: {
    title: 'Singapore payments at the settlement turn — 2026: cross-border QR linkage & the regulated stablecoin layer',
    eyebrow: 'SINGAPORE · FINTECH PAYMENTS · MARKET ANALYSIS',
    preview: {
      lede: "Singapore's domestic payment core is near-saturated — digital adoption reached 92% in 2025 and the consumer-wallet contest is largely settled. The next leg of value sits in the rails: cross-border QR linkage scaling from bilateral pilots toward a regional default, and a finalised single-currency stablecoin framework that moves Singapore from wallet reach to wholesale settlement for tokenised payments.",
      paragraphs: [
        "Digital payment adoption reached 92% in 2025, with PayNow, FAST and SGQR carrying everyday volume. Card-and-payments value sits near USD 24 bn; growth has migrated from raw acceptance to two faster edges — cross-border linkage and tokenised settlement.",
        "Singapore runs live bilateral QR links with Malaysia and Indonesia and joins a five-economy multilateral rail under Project Nexus, targeted for 2026. In parallel, MAS's single-currency stablecoin framework takes full effect, with named issuers already operating under licence.",
      ],
      chart: {
        title: 'Where payments value migrates',
        subtitle: 'Singapore · growth contribution · illustrative',
        bars: chartBars.en,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',            pages: 'PG 004', locked: false },
      { num: '03', name: 'The payments landscape',       pages: 'PG 006', locked: true  },
      { num: '04', name: 'Market sizing & mix',          pages: 'PG 007', locked: true  },
      { num: '06', name: 'Cross-border QR linkage',      pages: 'PG 009', locked: true  },
      { num: '09', name: 'The stablecoin layer',         pages: 'PG 012', locked: true  },
      { num: '12', name: 'AI impact & 2026-2030 outlook', pages: 'PG 015', locked: true  },
    ],
  },

  ja: {
    title: 'シンガポール決済：決済インフラの転換点 — 2026年：クロスボーダーQR連携と規制下のステーブルコイン層',
    eyebrow: 'シンガポール · フィンテック決済 · マーケット分析',
    preview: {
      lede: 'シンガポールの国内決済の中核はほぼ飽和し、2025年のデジタル決済普及率は92%に達しました。次の価値はレールにあります。クロスボーダーQR連携が二国間パイロットから地域標準へ拡張し、単一通貨ステーブルコインの枠組み策定により、シンガポールはウォレット・リーチからトークン化決済のホールセール決済ハブへと移行します。',
      paragraphs: [
        'デジタル決済普及率は2025年に92%に達し、PayNow・FAST・SGQRが日常的な取引量を担っています。カード・決済の市場規模はUSD 24 bn付近で推移しており、成長の主軸は純粋な受付普及から、クロスボーダー連携とトークン化決済という二つの加速領域へ移行しています。',
        'シンガポールはマレーシアおよびインドネシアとのQRライブ連携を持ち、2026年稼働を目標とするProject Nexusのもとで五か国の多国間レールにも参加します。並行してMASの単一通貨ステーブルコインの枠組みが全面施行され、ライセンスを取得した発行体がすでに稼働しています。',
      ],
      chart: {
        title: '決済価値の移行先',
        subtitle: 'シンガポール · 成長寄与度 · 例示',
        bars: chartBars.ja,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',          pages: 'P 004', locked: false },
      { num: '03', name: '決済の全体像',                    pages: 'P 006', locked: true  },
      { num: '04', name: '市場規模と構成比',                pages: 'P 007', locked: true  },
      { num: '06', name: 'クロスボーダーQR連携',            pages: 'P 009', locked: true  },
      { num: '09', name: 'ステーブルコイン層',              pages: 'P 012', locked: true  },
      { num: '12', name: 'AIの影響と2026-2030年の見通し',   pages: 'P 015', locked: true  },
    ],
  },

  ko: {
    title: '결제 인프라의 청산 전환점에 선 싱가포르 — 2026: 국경 간 QR 연계와 규제 스테이블코인 레이어',
    eyebrow: '싱가포르 · 핀테크 결제 · 시장 분석',
    preview: {
      lede: '싱가포르의 국내 결제 핵심 시장은 포화 상태에 가깝습니다. 2025년 디지털 결제 도입률은 92%에 도달했고 소비자 지갑 경쟁은 사실상 마무리됐습니다. 다음 가치는 결제망에 있습니다. 국경 간 QR 연계가 양자 파일럿에서 지역 기본 결제망으로 확장되고, 단일 통화 스테이블코인 프레임워크 완비로 싱가포르는 지갑 보급에서 토큰화 결제의 도매 결제 허브로 이행합니다.',
      paragraphs: [
        '디지털 결제 도입률은 2025년 92%에 도달했으며, PayNow·FAST·SGQR가 일상 거래량을 담당합니다. 카드·결제 거래액은 USD 24 bn 수준이고, 성장 동력은 단순 수용 확대에서 국경 간 연계와 토큰화 결제라는 두 가지 고속 성장 축으로 이동했습니다.',
        '싱가포르는 말레이시아·인도네시아와 QR 양자 연계를 가동 중이며, Project Nexus를 통해 2026년 가동을 목표로 5개국 다자간 결제망에도 참여합니다. 병행하여 MAS 단일 통화 스테이블코인 프레임워크가 전면 발효되며, 지정 발행사들이 이미 인가 하에 운영 중입니다.',
      ],
      chart: {
        title: '결제 가치의 이동 방향',
        subtitle: '싱가포르 · 성장 기여도 · 예시',
        bars: chartBars.ko,
      },
    },
    toc: [
      { num: '01', name: '핵심 요약',                  pages: 'P 004', locked: false },
      { num: '03', name: '결제 시장 현황',             pages: 'P 006', locked: true  },
      { num: '04', name: '시장 규모 & 결제 믹스',      pages: 'P 007', locked: true  },
      { num: '06', name: '국경 간 QR 연계',            pages: 'P 009', locked: true  },
      { num: '09', name: '스테이블코인 레이어',        pages: 'P 012', locked: true  },
      { num: '12', name: 'AI 영향 & 2026-2030 전망',   pages: 'P 015', locked: true  },
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
