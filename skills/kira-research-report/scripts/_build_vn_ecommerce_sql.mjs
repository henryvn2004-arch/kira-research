// One-off helper for 2026-vn-ecommerce. Mirrors _build_vn_coffee_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_vn_ecommerce_sql.mjs > /tmp/insert.sql`
// then feed to Supabase MCP execute_sql.

const SLUG    = 'vietnam-e-commerce-2026';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'E-commerce';
const YEAR    = 2026;
const PAGES   = 22;
const PRICE   = 39;

// Vietnam e-commerce GMV trajectory (USD bn): 2023=15, 2024=22, 2025=31, 2026F=~38
const chartBars = [
  { pct: 39,  label: '2023',  value: 15 },
  { pct: 58,  label: '2024',  value: 22 },
  { pct: 82,  label: '2025',  value: 31 },
  { pct: 100, label: '2026F', value: 38 },
];

const META = {
  en: {
    title: 'Vietnam e-commerce 2026 — live commerce and the TikTok Shop overtake',
    eyebrow: 'VIETNAM · E-COMMERCE · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's online retail market reached USD 31 billion in 2025, up 25.5% year-on-year, with the four-platform franchise (Shopee, TikTok Shop, Lazada, Tiki) recording USD 16.4 bn GMV. TikTok Shop's H1 GMV growth of 148% lifted its share to 50% by Q4 — displacing Shopee at the top. Live commerce moved from novelty to mainline channel: 30% livestream conversion versus 3% on classic e-commerce, with ~40% of platform sessions livestream-touched. The new Law on E-Commerce (effective 1 July 2026) plus PDP Law 91/2025 reset cross-border compliance and seller traceability.",
      paragraphs: [
        "This report covers the macro context (GDP, internet base, digital wallets), the full e-commerce value chain (live commerce, social commerce, marketplace economics), competitive structure across Shopee, TikTok Shop, Lazada, Tiki and the cross-border adjacencies, demand drivers across shopper segments and payment rails, the new E-Commerce Law and PDP regulatory landscape, and a 5-year outlook to 2030.",
        "The 2026 AI impact on Vietnamese e-commerce is operational. Major platforms have begun deploying AI for live-commerce host optimization, inventory forecasting at fulfillment hubs, fraud detection across the new cross-border seller verification chain, personalized recommendation engines in social commerce surfaces, and PDP Law compliance tooling for data subject requests. Six distinct AI use cases are profiled in Section 10.",
      ],
      chart: {
        title: 'Vietnam e-commerce GMV (USD bn)',
        subtitle: '2023 · 2024 · 2025 actual · 2026 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                              pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                                 pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                        pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                            pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',                 pages: 'PG 08', locked: true  },
      { num: '06', name: 'Segment economics',                        pages: 'PG 10', locked: true  },
      { num: '07', name: 'Competitive landscape',                    pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand drivers & channels',                pages: 'PG 16', locked: true  },
      { num: '09', name: 'Regulatory landscape',                     pages: 'PG 18', locked: true  },
      { num: '10', name: 'AI impact on e-commerce',                  pages: 'PG 19', locked: true  },
      { num: '11', name: 'Outlook & forecast 2026-2030',             pages: 'PG 21', locked: true  },
      { num: '12', name: 'Methodology endnote',                      pages: 'PG 22', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナムEC市場 2026 — ライブコマースとTikTok Shopによるシェア逆転',
    eyebrow: 'ベトナム · EC · マーケット分析',
    preview: {
      lede: 'ベトナムのオンライン小売市場は2025年にUSD 310億規模に到達し、前年比25.5%増となりました。主要4プラットフォーム(Shopee、TikTok Shop、Lazada、Tiki)のGMVはUSD 164億を記録。TikTok ShopはH1 GMV成長率148%を背景にQ4までにシェア50%まで上昇し、首位のShopeeを追い抜きました。ライブコマースは新奇性から主力チャネルへ移行 — ライブ配信のコンバージョン率は30%(従来型EC 3%との対比)、プラットフォームセッションの約40%にライブストリーム接点が発生。新しい電子商取引法(2026年7月1日施行)とPDP法91/2025が越境コンプライアンスと販売者トレーサビリティを再定義します。',
      paragraphs: [
        '本レポートはマクロ環境(GDP・インターネット基盤・電子ウォレット)、EC全体の価値連鎖(ライブコマース・ソーシャル・マーケットプレイス各セグメントの経済性)、Shopee・TikTok Shop・Lazada・Tiki及び越境隣接事業者による競争構造、買い物客セグメントおよび決済レールにわたる需要ドライバー、新電子商取引法とPDPを含む規制環境、そして2030年までの5年間の展望を扱います。',
        '2026年のベトナムECに対するAIインパクトは運用面です。主要プラットフォームはライブコマース配信者の最適化、フルフィルメントハブにおける在庫予測、越境セラー認証連鎖の不正検知、ソーシャルコマース面の個別化レコメンドエンジン、PDP法対応のデータ主体請求ツール群でAI実装を開始しています。第10章で6つの具体的活用事例を取り上げます。',
      ],
      chart: {
        title: 'ベトナムEC GMV(USD bn)',
        subtitle: '2023 · 2024 · 2025年実績 · 2026年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '方法論',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',              pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                          pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観・市場規模',              pages: 'P 08', locked: true  },
      { num: '06', name: 'セグメント経済性',                    pages: 'P 10', locked: true  },
      { num: '07', name: '競争環境',                            pages: 'P 12', locked: true  },
      { num: '08', name: '需要ドライバーとチャネル',            pages: 'P 16', locked: true  },
      { num: '09', name: '規制環境',                            pages: 'P 18', locked: true  },
      { num: '10', name: 'ECに対するAIの影響',                  pages: 'P 19', locked: true  },
      { num: '11', name: '展望・予測 2026-2030',                pages: 'P 21', locked: true  },
      { num: '12', name: '方法論補注',                          pages: 'P 22', locked: true  },
    ],
  },

  ko: {
    title: '베트남 이커머스 2026 — 라이브 커머스와 TikTok Shop의 추월',
    eyebrow: '베트남 · 이커머스 · 시장 분석',
    preview: {
      lede: '베트남 온라인 소매 시장은 2025년 USD 310억 규모에 도달했으며 전년 대비 25.5% 성장했습니다. 주요 4개 플랫폼(Shopee, TikTok Shop, Lazada, Tiki)의 GMV는 USD 164억을 기록. TikTok Shop은 H1 GMV 성장률 148%에 힘입어 Q4까지 점유율 50%로 상승하며 1위 Shopee를 추월했습니다. 라이브 커머스는 보조 채널에서 메인 채널로 전환 — 라이브 스트림 전환율 30%(기존 이커머스 3% 대비), 플랫폼 세션의 약 40%가 라이브 스트림 접점을 경험합니다. 새 전자상거래법(2026년 7월 1일 시행)과 PDP법 91/2025가 크로스보더 규제 준수와 셀러 추적성을 재정의합니다.',
      paragraphs: [
        '본 보고서는 거시 환경(GDP·인터넷 기반·디지털 지갑), 이커머스 가치 사슬 전반(라이브 커머스·소셜 커머스·마켓플레이스 세그먼트별 경제성), Shopee·TikTok Shop·Lazada·Tiki 및 크로스보더 인접 사업자의 경쟁 구조, 쇼퍼 세그먼트와 결제 레일을 통한 수요 견인 요인, 새 전자상거래법과 PDP를 포함한 규제 환경, 그리고 2030년까지의 5년 전망을 다룹니다.',
        '2026년 베트남 이커머스에 대한 AI 영향은 운영적입니다. 주요 플랫폼은 라이브 커머스 호스트 최적화, 풀필먼트 허브의 재고 예측, 신규 크로스보더 셀러 인증 체인의 사기 감지, 소셜 커머스 표면의 개인화 추천 엔진, PDP법 대응 데이터 주체 요청 도구에 AI를 도입하기 시작했습니다. 제10장에서 6가지 활용 사례를 다룹니다.',
      ],
      chart: {
        title: '베트남 이커머스 GMV (USD bn)',
        subtitle: '2023 · 2024 · 2025 실적 · 2026 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                              pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',                         pages: 'P 04', locked: false },
      { num: '04', name: '매크로 컨텍스트',                     pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개관 & 시장 규모',               pages: 'P 08', locked: true  },
      { num: '06', name: '세그먼트 경제성',                     pages: 'P 10', locked: true  },
      { num: '07', name: '경쟁 환경',                           pages: 'P 12', locked: true  },
      { num: '08', name: '수요 동인 & 채널',                    pages: 'P 16', locked: true  },
      { num: '09', name: '규제 환경',                           pages: 'P 18', locked: true  },
      { num: '10', name: '이커머스에 미치는 AI 영향',           pages: 'P 19', locked: true  },
      { num: '11', name: '전망 & 예측 2026-2030',               pages: 'P 21', locked: true  },
      { num: '12', name: '방법론 결어',                         pages: 'P 22', locked: true  },
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
