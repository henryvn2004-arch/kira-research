// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-id-ecommerce. Run via Supabase MCP execute_sql.

const SLUG    = 'indonesia-e-commerce-2027';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'E-commerce';
const YEAR    = 2027;
const PAGES   = 28;
const PRICE   = 39;

// Chart bars: Indonesia e-commerce GMV (USD bn). 2024 actual, 2027F target year, 2030F horizon.
const chartBars = [
  { pct: 54,  label: '2024',  value: 65  },
  { pct: 75,  label: '2027F', value: 90  },
  { pct: 100, label: '2030F', value: 120 },
];

const META = {
  en: {
    title: "Indonesia's e-commerce market 2027: Social-commerce reset & the Tier-2 demand engine",
    eyebrow: 'INDONESIA · E-COMMERCE · MARKET ANALYSIS',
    preview: {
      lede: "Indonesia's e-commerce market entered 2027 anchored by a structural Permendag 31/2023 reshape (the October-2023 separation of social media and electronic transactions that closed TikTok Shop's in-app checkout, then routed live commerce back into a licensed e-commerce shell via Bytedance's December-2023 Tokopedia stake), GMV crossing USD 90bn on its way to a USD 120bn print by 2030, and a Tier-2 city demand pull that decides whether the next leg compounds value or just user count.",
      paragraphs: [
        "This report covers the macro setup (GDP, FX, regulatory floor, middle-class trajectory), platform economics across the GMV oligopoly (Shopee, TikTok-Tokopedia, Lazada, Blibli, Bukalapak), Tier-2 city demand geography (Surabaya, Bandung, Medan, Makassar, Semarang, Palembang, Balikpapan), social-commerce regulatory landscape (Permendag 31/2023, Bytedance-Tokopedia integration, OJK paylater tightening), AI impact on platform operations (search, fraud, ad pricing, warehouse routing), and a 5-year outlook 2026-2030.",
        "Jabodetabek e-commerce penetration is approaching saturation; Tier-2 city GMV runs ~USD 46bn in 2025 and heads to ~USD 77bn by 2030. Surabaya, Bandung, Medan and Makassar each grow their middle-class base at 7-8% annually, with Makassar leading at 8.5%. Warehouse rents in Tier-2 cities sit 45-60% below Jakarta; locking sites pre-2027 fixes the cost base ahead of the compounding window.",
      ],
      chart: {
        title: 'Indonesia e-commerce GMV (USD bn)',
        subtitle: '2024 actual · 2027 forecast · 2030 horizon',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                                pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                                   pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                          pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context: Indonesia 2027',              pages: 'PG 07', locked: true  },
      { num: '05', name: 'Sector overview & sizing',                   pages: 'PG 10', locked: true  },
      { num: '06', name: 'Segment economics',                          pages: 'PG 12', locked: true  },
      { num: '07', name: 'Competitive landscape',                      pages: 'PG 14', locked: true  },
      { num: '07a', name: 'Platform profile · Shopee Indonesia',       pages: 'PG 16', locked: true  },
      { num: '07b', name: 'Platform profile · Tokopedia (by TikTok)',  pages: 'PG 17', locked: true  },
      { num: '07c', name: 'Platform profile · Lazada Indonesia',       pages: 'PG 18', locked: true  },
      { num: '07d', name: 'Platform profile · Blibli + Bukalapak',     pages: 'PG 19', locked: true  },
      { num: '08', name: 'Demand drivers & channels',                  pages: 'PG 21', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',              pages: 'PG 24', locked: true  },
      { num: '10', name: 'AI impact on e-commerce',                    pages: 'PG 26', locked: true  },
      { num: '11', name: '5-year outlook & forecast',                  pages: 'PG 27', locked: true  },
      { num: '12', name: 'Methodology endnote',                        pages: 'PG 28', locked: true  },
    ],
  },

  ja: {
    title: 'インドネシアEC市場 2027:ソーシャルコマース再編と地方都市の需要エンジン',
    eyebrow: 'インドネシア · EC市場 · マーケット分析',
    preview: {
      lede: 'インドネシアのEC市場は2027年、Permendag 31/2023による構造的再編(2023年10月にソーシャルメディアと電子取引を分離しTikTok Shopのアプリ内決済を停止、Bytedanceによる2023年12月のTokopedia支配権取得を経てライセンス付きECシェル内側にライブコマースを再配置)を基軸とし、GMVはUSD 90bn規模を突破し2030年までにUSD 120bnへ向かう軌道に乗っています。Tier-2都市の需要牽引が、次の成長局面でGMV価値を複利で伸ばすか単に利用者数だけが伸びるかを決定づけます。',
      paragraphs: [
        '本レポートはマクロ環境(GDP・為替・規制フロア・中間層拡大経路)、GMVオリゴポリーのプラットフォーム経済性(Shopee、TikTok-Tokopedia、Lazada、Blibli、Bukalapak)、Tier-2都市の需要地理(スラバヤ、バンドン、メダン、マカッサル、スマラン、パレンバン、バリックパパン)、ソーシャルコマース規制環境(Permendag 31/2023、Bytedance-Tokopedia統合、OJKの後払い規制強化)、プラットフォーム運用へのAI影響(検索、不正検知、広告プライシング、倉庫ルーティング)、そして2026-2030年の5年展望を取り上げます。',
        'ジャボデタベックのEC浸透率は飽和に近づきつつあり、Tier-2都市のGMVは2025年で約USD 46bn規模、2030年までにUSD 77bn程度へ拡大する見通しです。スラバヤ、バンドン、メダン、マカッサルはいずれも中間層を年率7-8%で拡大させ、マカッサルが8.5%で先導します。Tier-2都市の倉庫賃料はジャカルタ比45-60%安価で、2027年前にサイトを確保することで複利成長局面に向けたコストベースが固定できます。',
      ],
      chart: {
        title: 'インドネシアEC GMV (USD bn)',
        subtitle: '2024年実績 · 2027年予測 · 2030年ホライズン',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                                    pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                        pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',                       pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境:インドネシア2027年',               pages: 'P 07', locked: true  },
      { num: '05', name: 'セクター概観と規模',                          pages: 'P 10', locked: true  },
      { num: '06', name: 'セグメント経済性',                            pages: 'P 12', locked: true  },
      { num: '07', name: '競争環境',                                    pages: 'P 14', locked: true  },
      { num: '07a', name: 'プラットフォームプロファイル · Shopee Indonesia',     pages: 'P 16', locked: true  },
      { num: '07b', name: 'プラットフォームプロファイル · Tokopedia (TikTok資本)', pages: 'P 17', locked: true  },
      { num: '07c', name: 'プラットフォームプロファイル · Lazada Indonesia',     pages: 'P 18', locked: true  },
      { num: '07d', name: 'プラットフォームプロファイル · Blibli + Bukalapak',  pages: 'P 19', locked: true  },
      { num: '08', name: '需要ドライバーとチャネル',                    pages: 'P 21', locked: true  },
      { num: '09', name: '規制と政策環境',                              pages: 'P 24', locked: true  },
      { num: '10', name: 'ECにおけるAIの影響',                          pages: 'P 26', locked: true  },
      { num: '11', name: '5年展望と予測',                               pages: 'P 27', locked: true  },
      { num: '12', name: '調査手法エンドノート',                         pages: 'P 28', locked: true  },
    ],
  },

  ko: {
    title: '인도네시아 이커머스 시장 2027: 소셜커머스 재편과 2급 도시 수요 엔진',
    eyebrow: '인도네시아 · 이커머스 · 시장 분석',
    preview: {
      lede: '인도네시아 이커머스 시장은 2027년에 Permendag 31/2023 구조 재편(2023년 10월 소셜 미디어와 전자 거래의 분리로 TikTok Shop의 인앱 결제가 폐쇄되었고, Bytedance의 2023년 12월 Tokopedia 지배지분 인수로 라이브 커머스가 라이선스 보유 이커머스 셸 내부에 재배치됨), GMV가 USD 90bn을 돌파해 2030년까지 USD 120bn 인쇄로 향하는 경로, 그리고 다음 성장 구간에서 GMV 가치를 복리로 키울지 단지 사용자 수만 늘릴지를 가르는 2급 도시 수요 견인을 기반으로 진입했습니다.',
      paragraphs: [
        '본 보고서는 거시 환경(GDP·환율·규제 플로어·중산층 확대 경로), GMV 과점 구조의 플랫폼 경제성(Shopee, TikTok-Tokopedia, Lazada, Blibli, Bukalapak), 2급 도시 수요 지리(수라바야·반둥·메단·마카사르·스마랑·팔렘방·발릭파판), 소셜커머스 규제 환경(Permendag 31/2023, Bytedance-Tokopedia 통합, OJK 후불결제 규제 강화), 플랫폼 운영에 대한 AI 영향(검색·사기 감지·광고 가격 산정·창고 라우팅), 그리고 2026-2030년 5년 전망을 다룹니다.',
        '자카르타 광역(Jabodetabek) 이커머스 침투율은 포화에 근접하고 있으며, 2급 도시 GMV는 2025년 약 USD 46bn이며 2030년까지 약 USD 77bn으로 향합니다. 수라바야·반둥·메단·마카사르는 각각 중산층 기반을 연 7-8%씩 확대하고 있으며, 마카사르가 8.5%로 선두입니다. 2급 도시 창고 임대료는 자카르타 대비 45-60% 저렴해, 2027년 전에 사이트를 확보하면 복리 성장 구간에 진입하기 전 비용 베이스를 고정할 수 있습니다.',
      ],
      chart: {
        title: '인도네시아 이커머스 GMV (USD bn)',
        subtitle: '2024 실적 · 2027 예측 · 2030 호라이즌',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법론',                                 pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                        pages: 'P 03', locked: false },
      { num: '03', name: '요약(Executive summary)',                     pages: 'P 04', locked: false },
      { num: '04', name: '매크로 맥락: 인도네시아 2027',                 pages: 'P 07', locked: true  },
      { num: '05', name: '섹터 개요 및 시장 규모',                      pages: 'P 10', locked: true  },
      { num: '06', name: '세그먼트 경제성',                              pages: 'P 12', locked: true  },
      { num: '07', name: '경쟁 구도',                                    pages: 'P 14', locked: true  },
      { num: '07a', name: '플랫폼 프로필 · Shopee Indonesia',            pages: 'P 16', locked: true  },
      { num: '07b', name: '플랫폼 프로필 · Tokopedia (by TikTok)',       pages: 'P 17', locked: true  },
      { num: '07c', name: '플랫폼 프로필 · Lazada Indonesia',            pages: 'P 18', locked: true  },
      { num: '07d', name: '플랫폼 프로필 · Blibli + Bukalapak',          pages: 'P 19', locked: true  },
      { num: '08', name: '수요 동인 및 채널',                            pages: 'P 21', locked: true  },
      { num: '09', name: '규제 및 정책 환경',                            pages: 'P 24', locked: true  },
      { num: '10', name: '이커머스에 대한 AI 영향',                       pages: 'P 26', locked: true  },
      { num: '11', name: '5년 전망 및 시나리오',                          pages: 'P 27', locked: true  },
      { num: '12', name: '방법론 보론',                                  pages: 'P 28', locked: true  },
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
