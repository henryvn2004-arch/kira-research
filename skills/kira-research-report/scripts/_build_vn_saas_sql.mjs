// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-vn-saas. Patterned on _build_vn_pharma_sql.mjs.

const SLUG    = 'vietnam-saas-2026';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'SaaS';
const YEAR    = 2026;
const PAGES   = 24;
const PRICE   = 39;

// Chart on page 4 (exec summary): Vietnam SaaS revenue pool · USD m · 2024-2031F
// Bars (USD m): 200, 240, 285, 340, 405, 480, 565, 660. Max scale ~700 (chart axis).
// Take 3 representative bars for the library card preview (2024 actual, 2025 actual, 2030F).
const chartBars = [
  { pct: 33, label: '2024',  value: 200 },
  { pct: 40, label: '2025',  value: 240 },
  { pct: 94, label: '2030F', value: 565 },
];

const META = {
  en: {
    title: 'Vietnam SaaS 2026: SMB digitalization and the vertical platform turn',
    eyebrow: 'VIETNAM · SAAS · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's SaaS market enters 2026 on a USD 240-280 m revenue pool growing 17-25% a year, anchored by two regulatory tailwinds — mandatory e-invoicing (live July 2022, tightened by Decree 70/2025) and Decision 1121/QĐ-TTg's cloud-first directive targeting 100% of state agencies and 70% of private businesses by 2030. Three local horizontals (MISA, KiotViet, Sapo) intermediate the SMB seat base while vertical operators win retail and F&B at 3-5x higher ARPA.",
      paragraphs: [
        "This report covers macro and policy backbone (GDP, enterprise base, digital economy 18.3% GDP target, e-invoice rollout), market sizing across horizontal/vertical/ERP layers, segment economics with ARPA bands, the competitive landscape with deep operator profiles for MISA, KiotViet, Sapo, and Base, plus demand drivers across SMB + reseller + cloud-marketplace channels.",
        "The next 24 months decide the SMB-attach race — capital should follow vertical depth (workflow + payments + e-invoice in one stack) rather than horizontal breadth. The report includes regulatory landscape (e-invoice + PDPL + cloud policy), AI use cases in vertical software with adoption curve, a base/bull/bear 2026-2031 forecast, and KIRA's methodology endnote with full source alias key.",
      ],
      chart: {
        title: 'Vietnam SaaS revenue pool (USD m)',
        subtitle: '2024 actual · 2025 actual · 2030 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                        pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                           pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                  pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                      pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',           pages: 'PG 08', locked: true  },
      { num: '06', name: 'Segment economics',                  pages: 'PG 10', locked: true  },
      { num: '07', name: 'Competitive landscape',              pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand drivers & channels',          pages: 'PG 16', locked: true  },
      { num: '09', name: 'Regulatory landscape',               pages: 'PG 18', locked: true  },
      { num: '10', name: 'AI in vertical software',            pages: 'PG 19', locked: true  },
      { num: '11', name: 'Forecast 2026-2031',                 pages: 'PG 21', locked: true  },
      { num: '12', name: 'Methodology endnote',                pages: 'PG 24', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナムSaaS 2026:SMBデジタル化と垂直プラットフォームへの転換',
    eyebrow: 'ベトナム · SaaS · マーケット分析',
    preview: {
      lede: 'ベトナムSaaS市場は2026年、USD 2.4〜2.8億ドルの年率17〜25%成長プールに乗り、2つの規制追い風に支えられます。電子インボイス義務化(2022年7月施行、2025年Decree 70/2025で強化)と、Decision 1121/QĐ-TTgのクラウドファースト指令(2030年までに国家機関100%・民間企業70%対象)です。国産ホリゾンタル3社(MISA、KiotViet、Sapo)がSMBシート基盤を仲介し、垂直事業者は小売・F&B領域でARPA 3〜5倍の経済性を獲得しています。',
      paragraphs: [
        '本レポートはマクロ・政策の構造的基盤(GDP、事業所基盤、デジタル経済GDP 18.3%目標、電子インボイス展開)、ホリゾンタル・垂直・ERP層を跨ぐ市場規模、ARPA帯別のセグメント経済性、MISA・KiotViet・Sapo・Baseの詳細プロファイルを含む競争環境、そしてSMB+再販店+クラウドマーケットプレイスの需要ドライバーを扱います。',
        '今後24か月でSMBアタッチ戦の勝敗が決まります。資本はホリゾンタルの広さではなく、垂直の深さ(ワークフロー+決済+電子インボイスを1スタックに統合)に従うべきです。本レポートは規制環境(電子インボイス+PDPL+クラウド政策)、垂直ソフトウェアにおけるAIユースケースと採用曲線、2026-2031年のベース・ブル・ベアシナリオ予測、KIRA方法論巻末注と完全な出典エイリアス凡例を含みます。',
      ],
      chart: {
        title: 'ベトナムSaaS収益プール(USD m)',
        subtitle: '2024年実績 · 2025年実績 · 2030年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '方法論',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',              pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ背景',                          pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観・市場規模',              pages: 'P 08', locked: true  },
      { num: '06', name: 'セグメント別経済性',                  pages: 'P 10', locked: true  },
      { num: '07', name: '競合状況',                            pages: 'P 12', locked: true  },
      { num: '08', name: '需要ドライバー・チャネル',            pages: 'P 16', locked: true  },
      { num: '09', name: '規制環境',                            pages: 'P 18', locked: true  },
      { num: '10', name: '垂直ソフトウェアにおけるAI',          pages: 'P 19', locked: true  },
      { num: '11', name: '予測 2026〜2031年',                    pages: 'P 21', locked: true  },
      { num: '12', name: '方法論巻末注',                        pages: 'P 24', locked: true  },
    ],
  },

  ko: {
    title: '베트남 SaaS 2026: 중소기업 디지털화와 버티컬 플랫폼 전환',
    eyebrow: '베트남 · SaaS · 시장 분석',
    preview: {
      lede: '베트남 SaaS 시장은 2026년 연 17~25% 성장하는 USD 2.4~2.8억 달러 매출 풀에 진입했으며, 두 가지 규제 순풍에 의해 견인됩니다. 전자세금계산서 의무화(2022년 7월 시행, 2025년 Decree 70/2025로 강화)와 Decision 1121/QĐ-TTg의 클라우드 우선 지침(2030년까지 국가기관 100%·민간기업 70% 대상)이 그것입니다. 국내 호리즌탈 3사(MISA·KiotViet·Sapo)가 중소기업 시트 기반을 중개하며, 버티컬 사업자는 리테일·F&B 영역에서 3~5배 높은 ARPA 경제성을 확보하고 있습니다.',
      paragraphs: [
        '본 보고서는 거시·정책 기반(GDP, 사업체 기반, 디지털 경제 GDP 18.3% 목표, 전자세금계산서 도입), 호리즌탈·버티컬·ERP 레이어 전반의 시장 규모, ARPA 대역별 세그먼트 경제성, MISA·KiotViet·Sapo·Base의 심층 프로필을 포함한 경쟁 구도, 그리고 중소기업+리셀러+클라우드 마켓플레이스의 수요 동인을 다룹니다.',
        '향후 24개월이 중소기업 어태치 경쟁의 승부처입니다. 자본은 호리즌탈의 넓이가 아니라 버티컬의 깊이(워크플로+결제+전자세금계산서를 단일 스택에 통합)에 따라 움직여야 합니다. 본 보고서는 규제 환경(전자세금계산서+PDPL+클라우드 정책), 버티컬 소프트웨어 내 AI 활용 사례와 도입 곡선, 2026-2031년 베이스·강세·약세 시나리오 전망, 그리고 KIRA 방법론 미주와 전체 출처 별칭 키를 담았습니다.',
      ],
      chart: {
        title: '베트남 SaaS 매출 풀 (USD m)',
        subtitle: '2024 실적 · 2025 실적 · 2030 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                              pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',                          pages: 'P 04', locked: false },
      { num: '04', name: '매크로 환경',                          pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개관 & 사이징',                   pages: 'P 08', locked: true  },
      { num: '06', name: '세그먼트 경제성',                      pages: 'P 10', locked: true  },
      { num: '07', name: '경쟁 구도',                            pages: 'P 12', locked: true  },
      { num: '08', name: '수요 동인 & 채널',                     pages: 'P 16', locked: true  },
      { num: '09', name: '규제 환경',                            pages: 'P 18', locked: true  },
      { num: '10', name: '버티컬 소프트웨어의 AI',               pages: 'P 19', locked: true  },
      { num: '11', name: '2026~2031 전망',                       pages: 'P 21', locked: true  },
      { num: '12', name: '방법론 미주',                          pages: 'P 24', locked: true  },
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
