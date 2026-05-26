// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-vn-aquaculture. Run: `node skills/kira-research-report/scripts/_build_vn_aquaculture_sql.mjs > /tmp/insert.sql`

const SLUG    = 'vietnam-aquaculture-2027';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'Aquaculture';
const YEAR    = 2027;
const PAGES   = 23;
const PRICE   = 39;

// Chart bars — Vietnam seafood export value (USD bn). Max 12.0 → pct relative.
const chartBars = [
  { pct: 74,  label: '2023',  value: 8.9 },
  { pct: 94,  label: '2025',  value: 11.3 },
  { pct: 100, label: '2027F', value: 12.0 },
];

const META = {
  en: {
    title: 'Vietnam aquaculture 2027: shrimp export resilience & feed cost shifts',
    eyebrow: 'VIETNAM · AQUACULTURE · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's aquaculture sector entered 2027 anchored by a USD 11.3 billion seafood export franchise (record 2025 value, +14% YoY) with shrimp at USD 4.6 bn (+19%) and pangasius at USD 2.2 bn (+8%). A China rotation now anchors growth (shrimp to China + Hong Kong reached USD 1.3 bn, +55%), even as a US DOC POR19 cash-deposit rate of 25.46% reshapes the US shrimp channel and a structural feed-cost reset reframes pond economics through 2031.",
      paragraphs: [
        "This report covers the macro context (GDP, Mekong salinity, FX, policy floor), the full aquaculture value chain (shrimp, pangasius, marine cage segment economics), competitive structure across top exporters (Minh Phu, Sao Ta, Vinh Hoan, Nam Viet, Camimex) and feed-mill multinationals (De Heus, Skretting, Cargill, Charoen Pokphand), demand drivers across the China-US-EU-Japan rotation, the DOC AD/CVD + IUU yellow card + EUDR regulatory landscape, and a 5-year outlook through 2031.",
        "The 2027 AI impact on Vietnamese aquaculture is operational rather than peripheral. Major operators have begun deploying AI for AIoT pond monitoring (water quality, oxygen, salinity), disease early-warning (EHP, AHPND, WSSV), feed-conversion optimization at the pond cluster, EUDR traceability-block reconciliation, and cold-chain logistics routing. Six distinct AI use cases are profiled in Section 10.",
      ],
      chart: {
        title: 'Vietnam seafood export value (USD bn)',
        subtitle: '2023 actual · 2025 actual · 2027 forecast',
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
      { num: '08', name: 'Demand drivers & channels',                pages: 'PG 17', locked: true  },
      { num: '09', name: 'Regulatory landscape',                     pages: 'PG 19', locked: true  },
      { num: '10', name: 'AI impact on aquaculture',                 pages: 'PG 20', locked: true  },
      { num: '11', name: 'Outlook & forecast 2027–2031',             pages: 'PG 21', locked: true  },
      { num: '12', name: 'Methodology endnote',                      pages: 'PG 22', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム養殖業 2027:エビ輸出のレジリエンスと飼料コストのリセット',
    eyebrow: 'ベトナム · 養殖業 · マーケット分析',
    preview: {
      lede: 'ベトナムの養殖業セクターは2027年、USD 113億規模の水産物輸出フランチャイズ(2025年実績で過去最高、前年比+14%)を基盤とし、エビがUSD 46億(+19%)、パンガシウスがUSD 22億(+8%)で成長を牽引しています。中国ローテーションが拡大の支柱となり(エビの対中国+香港向け出荷はUSD 13億、+55%に到達)、一方で米国DOC POR19の現金預託率25.46%が米国向けエビチャネルを再構築し、構造的な飼料コストのリセットが2031年までの養殖池経済性を再定義しています。',
      paragraphs: [
        '本レポートはマクロ環境(GDP・メコン塩水化・為替・政策基盤)、養殖業価値連鎖全体(エビ・パンガシウス・海面養殖の各セグメント経済性)、主要輸出業者(Minh Phu、Sao Ta、Vinh Hoan、Nam Viet、Camimex)と飼料メーカー多国籍事業者(De Heus、Skretting、Cargill、Charoen Pokphand)による競争構造、中国・米国・EU・日本のローテーションを軸とした需要ドライバー、DOC AD/CVDおよびIUUイエローカードおよびEUDRを含む規制環境、そして2031年までの5年間の展望を扱います。',
        '2027年のベトナム養殖業へのAIインパクトは周縁的ではなく実務的です。主要事業者はAIoT養殖池モニタリング(水質、酸素、塩分)、疾病早期警報(EHP、AHPND、WSSV)、養殖クラスターでの飼料転換最適化、EUDR対応のトレーサビリティブロック照合、コールドチェーン物流ルーティングでAI実装を開始しています。第10章で6つの具体的活用事例を取り上げます。',
      ],
      chart: {
        title: 'ベトナム水産物輸出金額(USD bn)',
        subtitle: '2023年実績 · 2025年実績 · 2027年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                                pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                    pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',                  pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                              pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観 & 市場規模',                 pages: 'P 08', locked: true  },
      { num: '06', name: 'セグメント経済性',                        pages: 'P 10', locked: true  },
      { num: '07', name: '競争環境',                                pages: 'P 12', locked: true  },
      { num: '08', name: '需要ドライバー & チャネル',                pages: 'P 17', locked: true  },
      { num: '09', name: '規制環境',                                pages: 'P 19', locked: true  },
      { num: '10', name: '養殖業へのAIインパクト',                  pages: 'P 20', locked: true  },
      { num: '11', name: '展望 & 予測 2027-2031',                   pages: 'P 21', locked: true  },
      { num: '12', name: '調査手法巻末注',                          pages: 'P 22', locked: true  },
    ],
  },

  ko: {
    title: '베트남 양식업 2027: 새우 수출 회복력과 사료비 구조 재편',
    eyebrow: '베트남 · 양식업 · 시장 분석',
    preview: {
      lede: '베트남 양식업 부문은 2027년에 USD 113억 규모의 수산물 수출 프랜차이즈(2025년 사상 최고치, 전년 대비 +14%)를 기반으로 하며 새우는 USD 46억(+19%), 팡가시우스는 USD 22억(+8%)으로 성장을 견인합니다. 중국 재편이 성장의 축으로 자리잡으면서(중국+홍콩향 새우 출하 USD 13억, +55% 도달), 미국 DOC POR19 현금예치율 25.46%가 미국 새우 채널을 재편하고 구조적 사료비 리셋이 2031년까지 양식장 경제성을 재정의하고 있습니다.',
      paragraphs: [
        '본 보고서는 거시 환경(GDP·메콩델타 염수 침투·환율·정책 기반), 양식업 밸류 체인 전반(새우·팡가시우스·해상 가두리 세그먼트별 경제성), 주요 수출업체(Minh Phu, Sao Ta, Vinh Hoan, Nam Viet, Camimex) 및 사료 다국적 사업자(De Heus, Skretting, Cargill, Charoen Pokphand)의 경쟁 구조, 중국·미국·EU·일본 재편을 중심으로 한 수요 동인, DOC AD/CVD 및 IUU 옐로카드 및 EUDR을 포함한 규제 환경, 그리고 2031년까지의 5년 전망을 다룹니다.',
        '2027년 베트남 양식업에 대한 AI 영향은 주변적이 아닌 운영적입니다. 주요 사업자들은 AIoT 양식장 모니터링(수질, 산소, 염분), 질병 조기 경보(EHP, AHPND, WSSV), 양식 클러스터의 사료 전환 최적화, EUDR 대응 트레이서빌리티 블록 조정, 콜드체인 물류 라우팅에 AI를 도입하기 시작했습니다. 제10장에서 6가지 활용 사례를 다룹니다.',
      ],
      chart: {
        title: '베트남 수산물 수출 금액 (USD bn)',
        subtitle: '2023 실적 · 2025 실적 · 2027 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                                  pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                    pages: 'P 03', locked: false },
      { num: '03', name: '요약',                                    pages: 'P 04', locked: false },
      { num: '04', name: '매크로 환경',                             pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개요 및 규모',                       pages: 'P 08', locked: true  },
      { num: '06', name: '세그먼트 경제학',                         pages: 'P 10', locked: true  },
      { num: '07', name: '경쟁 구도',                               pages: 'P 12', locked: true  },
      { num: '08', name: '수요 동인 및 채널',                       pages: 'P 17', locked: true  },
      { num: '09', name: '규제 환경',                               pages: 'P 19', locked: true  },
      { num: '10', name: '양식업에 대한 AI 영향',                   pages: 'P 20', locked: true  },
      { num: '11', name: '전망 및 예측 2027-2031',                  pages: 'P 21', locked: true  },
      { num: '12', name: '방법론 미주',                             pages: 'P 22', locked: true  },
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
