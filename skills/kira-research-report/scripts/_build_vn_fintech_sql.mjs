// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-vn-fintech. Patterned on _build_vn_coffee_sql.mjs.

const SLUG    = 'vietnam-fintech-2026';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'Fintech';
const YEAR    = 2026;
const PAGES   = 29;
const PRICE   = 39;

const chartBars = [
  { pct: 81,  label: '2024',  value: 3.5 },
  { pct: 91,  label: '2025',  value: 3.9 },
  { pct: 100, label: '2026F', value: 4.3 },
];

const META = {
  en: {
    title: 'Vietnam fintech 2026: e-wallet consolidation and super-app monetization',
    eyebrow: 'VIETNAM · FINTECH · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's fintech market entered 2026 anchored by an 87% banked adult base, 84.4% smartphone penetration, and 18 billion cashless transactions cleared in the first nine months of 2025 alone. A USD 4.3 bn fintech revenue pool now runs through three dominant e-wallets (MoMo, ZaloPay, VNPay) intermediating ~88% of e-wallet volume. The July 2025 sandbox under Decree 94/2025/ND-CP opens a two-year regulatory window for P2P lending, eKYC, credit scoring, and Open API testing.",
      paragraphs: [
        "This report covers the macro context (GDP, smartphone reach, inflation backdrop, policy floor), the full fintech revenue pool decomposition across payments, lending, and wealth, the segment economics of e-wallets, BNPL, and digital banks, the competitive structure across top operators (MoMo, ZaloPay, VNPay, Cake by VPBank, Grab and Shopee super-app finserv), demand drivers via super-apps and QR rails, the Decree 52 and Decree 94 sandbox regulatory landscape, and a 5-year outlook to 2031.",
        "The 2026 AI impact on Vietnamese fintech is operational rather than peripheral. VIB and Trusting Social cut credit-card approval to 15-30 minutes via AI scoring; MoMo deploys ML on alt-data for thin-file decisioning; major operators apply AI to fraud detection and underwriting opex. Six distinct AI use cases are profiled in Section 10, framed on payback rather than vision.",
      ],
      chart: {
        title: 'Vietnam fintech revenue pool (USD bn)',
        subtitle: '2024 actual · 2025 actual · 2026 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                          pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                             pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                    pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                        pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',             pages: 'PG 08', locked: true  },
      { num: '06', name: 'Segment economics',                    pages: 'PG 10', locked: true  },
      { num: '07', name: 'Competitive landscape',                pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand drivers & channels',            pages: 'PG 18', locked: true  },
      { num: '09', name: 'Regulatory landscape',                 pages: 'PG 20', locked: true  },
      { num: '10', name: 'AI impact on fintech',                 pages: 'PG 21', locked: true  },
      { num: '11', name: 'Outlook & forecast 2026-2031',         pages: 'PG 24', locked: true  },
      { num: '12', name: 'Methodology endnote',                  pages: 'PG 29', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム・フィンテック 2026:電子ウォレットの集約とスーパーアプリの収益化',
    eyebrow: 'ベトナム · フィンテック · マーケット分析',
    preview: {
      lede: 'ベトナムのフィンテック市場は2026年、成人の87%が銀行口座を保有し、スマートフォン普及率84.4%、2025年1-9月だけで180億件のキャッシュレス決済が成立した基盤上にあります。USD 43億規模のフィンテック収益プールが3大電子ウォレット(MoMo、ZaloPay、VNPay)を軸に動き、電子ウォレット取引量の約88%を媒介しています。2025年7月施行の議定書94/2025/ND-CPに基づくサンドボックスは、P2P、eKYC、信用スコアリング、Open APIの試験運用に向けた2年間の規制窓口を開きました。',
      paragraphs: [
        '本レポートはマクロ環境(GDP・スマートフォン浸透・インフレ背景・政策フロア)、決済・与信・資産運用にまたがるフィンテック収益プール全体の分解、電子ウォレット/BNPL/デジタル銀行のセグメント経済性、主要事業者(MoMo、ZaloPay、VNPay、Cake by VPBank、Grab・Shopeeのスーパーアプリ金融サービス)の競合構造、スーパーアプリ・QRレールを通じた需要要因、議定書52号および94号サンドボックスを含む規制環境、そして2031年までの5年見通しを扱います。',
        '2026年のベトナム・フィンテックへのAIインパクトは周縁的ではなく実務的です。VIBとTrusting Socialがクレジットカード審査をAIスコアリングで15-30分まで短縮、MoMoはMLを代替データに適用してシン・ファイル与信判断を実装、主要事業者は不正検知および与信オペコストにAIを適用しています。第10章で6つの具体的活用事例を、ビジョンではなくペイバックの観点から取り上げます。',
      ],
      chart: {
        title: 'ベトナム・フィンテック収益プール(USD bn)',
        subtitle: '2024年実績 · 2025年実績 · 2026年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査方法',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                  pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブ・サマリー',              pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                            pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観・市場規模',                pages: 'P 08', locked: true  },
      { num: '06', name: 'セグメント経済性',                      pages: 'P 10', locked: true  },
      { num: '07', name: '競合状況',                              pages: 'P 12', locked: true  },
      { num: '08', name: '需要要因とチャネル',                    pages: 'P 18', locked: true  },
      { num: '09', name: '規制環境',                              pages: 'P 20', locked: true  },
      { num: '10', name: 'フィンテックにおけるAIの影響',          pages: 'P 21', locked: true  },
      { num: '11', name: '見通し・予測 2026-2031',                pages: 'P 24', locked: true  },
      { num: '12', name: '方法論巻末注',                          pages: 'P 29', locked: true  },
    ],
  },

  ko: {
    title: '베트남 핀테크 2026: 전자지갑 집중화와 슈퍼앱 수익화',
    eyebrow: '베트남 · 핀테크 · 시장 분석',
    preview: {
      lede: '베트남 핀테크 시장은 2026년에 성인 87% 은행 계좌 보유, 스마트폰 보급률 84.4%, 2025년 1-9월에만 180억 건의 캐시리스 거래가 성사된 기반 위에 진입했습니다. USD 4.3 bn 규모 핀테크 매출 풀이 3대 전자지갑(MoMo, ZaloPay, VNPay)을 축으로 형성되어 전자지갑 거래량의 약 88%를 매개하고 있습니다. 2025년 7월 시행된 시행령 94/2025/ND-CP 기반 샌드박스는 P2P, eKYC, 신용 스코어링, Open API 시험에 대한 2년 규제 창구를 열었습니다.',
      paragraphs: [
        '본 보고서는 거시 환경(GDP, 스마트폰 도달률, 인플레이션 배경, 정책 플로어), 결제·대출·자산관리를 가로지르는 핀테크 매출 풀 전반의 분해, 전자지갑/BNPL/디지털뱅크의 세그먼트 경제성, 주요 사업자(MoMo, ZaloPay, VNPay, Cake by VPBank, Grab·Shopee 슈퍼앱 금융서비스)의 경쟁 구도, 슈퍼앱과 QR 레일을 통한 수요 동인, 시행령 52호와 94호 샌드박스를 포함한 규제 지형, 그리고 2031년까지의 5년 전망을 다룹니다.',
        '2026년 베트남 핀테크에 대한 AI 영향은 주변적이지 않고 운영적입니다. VIB와 Trusting Social은 신용카드 승인을 AI 스코어링으로 15-30분까지 단축했으며, MoMo는 대체 데이터에 ML을 적용해 신파일 의사결정을 구현하고 있고, 주요 사업자들은 사기 탐지와 인수 오펙스에 AI를 적용하고 있습니다. 제10장에서 6대 AI 활용 사례를 비전이 아닌 페이백 관점에서 다룹니다.',
      ],
      chart: {
        title: '베트남 핀테크 매출 풀 (USD bn)',
        subtitle: '2024 실적 · 2025 실적 · 2026 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법',                            pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                 pages: 'P 03', locked: false },
      { num: '03', name: '요약',                                 pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',                            pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개관 & 사이징',                   pages: 'P 08', locked: true  },
      { num: '06', name: '세그먼트 경제성',                      pages: 'P 10', locked: true  },
      { num: '07', name: '경쟁 구도',                            pages: 'P 12', locked: true  },
      { num: '08', name: '수요 동인 & 채널',                     pages: 'P 18', locked: true  },
      { num: '09', name: '규제 지형',                            pages: 'P 20', locked: true  },
      { num: '10', name: '핀테크에서의 AI 영향',                 pages: 'P 21', locked: true  },
      { num: '11', name: '전망 & 예측 2026-2031',                pages: 'P 24', locked: true  },
      { num: '12', name: '권말 방법론 주석',                     pages: 'P 29', locked: true  },
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
