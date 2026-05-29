// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-th-quick-service-restaurants. Modeled on _build_vn_coffee_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_th_qsr_sql.mjs > /tmp/insert.sql`
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG    = 'thailand-quick-service-restaurants-2026';
const COUNTRY = 'Thailand';
const INDUSTRY= 'Quick Service Restaurants';
const YEAR    = 2026;
const PAGES   = 28;
const PRICE   = 39;

// Chart bars — Thailand QSR market trajectory (THB bn). Max 71 → pct relative.
const chartBars = [
  { pct: 64,  label: '2023',  value: 45.4 },
  { pct: 67,  label: '2025',  value: 47.7 },
  { pct: 76,  label: '2027F', value: 54 },
  { pct: 100, label: '2030F', value: 71 },
];

const META = {
  en: {
    title: "Thailand's QSR market at an operating-margin inflection",
    eyebrow: 'THAILAND · QUICK SERVICE RESTAURANTS · MARKET ANALYSIS',
    preview: {
      lede: "Thailand's THB 47.7 bn quick-service market is growing faster than the broader economy — up 5.1% in 2025 against a 4.6% restaurant-and-beverage market — but the value is migrating. A value-for-money war compresses per-ticket profit while a LINE MAN–Grab delivery duopoly capturing ~84% of orders charges ~30% commission before VAT. Chain consolidation and owned-channel mix decide which operators keep the next leg of margin.",
      paragraphs: [
        "This report covers the macro context (growth, tourism recovery and the value-for-money squeeze), QSR's position within a THB 657 bn foodservice market, segment economics across fried chicken, burgers, pizza and beverage-led formats, the competitive landscape of chain groups and franchisee structures, demand drivers across dine-in, takeaway and the aggregator channel, the ETDA platform-rules and commission-fairness debate, and a five-year outlook to 2030.",
        "The 2026 AI impact on Thai QSR is operational. Operators are deploying AI for demand forecasting and kitchen throughput, dynamic delivery pricing and commission optimization across aggregators, menu and promotion personalization, and fraud detection in the delivery documentation chain. Section 10 profiles where AI moves QSR and delivery economics next, set against base, bull and bear scenarios to 2030.",
      ],
      chart: {
        title: 'QSR market trajectory',
        subtitle: 'Thailand · THB bn · 2023–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                 pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                    pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',           pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',               pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',    pages: 'PG 09', locked: true  },
      { num: '06', name: 'Segment economics',           pages: 'PG 11', locked: true  },
      { num: '07', name: 'Competitive landscape',       pages: 'PG 13', locked: true  },
      { num: '08', name: 'Demand drivers & channels',   pages: 'PG 19', locked: true  },
      { num: '09', name: 'Regulatory & policy',         pages: 'PG 22', locked: true  },
      { num: '10', name: 'AI impact',                   pages: 'PG 23', locked: true  },
      { num: '11', name: '5-year outlook',              pages: 'PG 26', locked: true  },
      { num: '12', name: 'Methodology endnote',         pages: 'PG 28', locked: true  },
    ],
  },

  ja: {
    title: 'タイQSR市場、営業利益率の転換点に立つ',
    eyebrow: 'タイ · クイックサービスレストラン · マーケット分析',
    preview: {
      lede: 'タイのTHB 477億規模のクイックサービス市場は、2025年に5.1%成長し、4.6%拡大した外食・飲料市場を上回ったが、価値の帰属先は移動している。コストパフォーマンス競争がチケット当たり利益を圧縮する一方、注文の約84%を握るLINE MAN–Grabのデリバリー二強がVAT前で約30%のコミッションを徴収する。チェーンの集約化と自社チャネル比率が、次の利益率を確保する事業者を決める。',
      paragraphs: [
        '本レポートはマクロ環境(成長率、観光回復、コストパフォーマンス重視の高まり)、THB 6,570億のフードサービス市場におけるQSRの位置づけ、フライドチキン・バーガー・ピザ・飲料主体フォーマットのセグメント経済性、チェーングループとフランチャイズ構造による競合環境、店内飲食・持ち帰り・アグリゲーターチャネルにわたる需要ドライバー、ETDAのプラットフォーム規制とコミッション公正性の論議、そして2030年までの5年間の展望を扱う。',
        '2026年のタイQSRへのAIインパクトは実務的である。事業者は需要予測とキッチンスループット、アグリゲーター横断のダイナミックなデリバリー価格設定とコミッション最適化、メニュー・販促のパーソナライゼーション、デリバリードキュメント連鎖の不正検知でAI実装を進めている。第10章ではAIがQSRとデリバリー経済性に与える次の変化を、2030年までのベース・強気・弱気シナリオとともに取り上げる。',
      ],
      chart: {
        title: 'QSR市場の推移',
        subtitle: 'タイ · THB bn · 2023–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                 pages: 'P 02', locked: false },
      { num: '02', name: '目次',                     pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',   pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',               pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概況 & 市場規模',  pages: 'P 09', locked: true  },
      { num: '06', name: 'セグメント経済性',         pages: 'P 11', locked: true  },
      { num: '07', name: '競合環境',                 pages: 'P 13', locked: true  },
      { num: '08', name: '需要ドライバー & チャネル', pages: 'P 19', locked: true  },
      { num: '09', name: '規制 & 政策',              pages: 'P 22', locked: true  },
      { num: '10', name: 'AIインパクト',             pages: 'P 23', locked: true  },
      { num: '11', name: '5年間の見通し',            pages: 'P 26', locked: true  },
      { num: '12', name: '方法論エンドノート',       pages: 'P 28', locked: true  },
    ],
  },

  ko: {
    title: '태국 QSR 시장, 영업이익률 변곡점에 진입',
    eyebrow: '태국 · 퀵서비스 레스토랑 · 시장 분석',
    preview: {
      lede: '태국의 THB 47.7 bn 규모 QSR 시장은 2025년 5.1% 성장하며 4.6% 성장한 외식·음료 시장을 앞섰으나, 가치는 이동 중입니다. 가성비 전쟁이 건당 이익을 압박하는 가운데, 주문의 약 84%를 점유한 LINE MAN–Grab 배달 양강이 VAT 제외 약 30%의 수수료를 부과합니다. 체인 집중화와 자사 채널 비중이 다음 이익률 구간을 확보할 사업자를 결정합니다.',
      paragraphs: [
        '본 보고서는 거시 환경(성장률, 관광 회복, 가성비 압박), THB 657 bn 외식 시장 내 QSR 위상, 프라이드치킨·버거·피자·음료 중심 포맷의 세그먼트 경제학, 체인 그룹과 프랜차이즈 구조의 경쟁 구도, 매장 식사·테이크아웃·애그리게이터 채널 전반의 수요 동인, ETDA 플랫폼 규제와 수수료 공정성 논쟁, 그리고 2030년까지의 5년 전망을 다룹니다.',
        '2026년 태국 QSR에 대한 AI 영향은 운영적입니다. 사업자들은 수요 예측과 주방 처리량, 애그리게이터 전반의 동적 배달 가격 책정과 수수료 최적화, 메뉴·프로모션 개인화, 배달 문서 체인의 사기 감지에 AI를 도입하고 있습니다. 제10장은 AI가 QSR과 배달 경제를 재편하는 방향을 2030년까지의 기본·낙관·비관 시나리오와 함께 다룹니다.',
      ],
      chart: {
        title: 'QSR 시장 추이',
        subtitle: 'Thailand · THB bn · 2023–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법론',              pages: 'P 02', locked: false },
      { num: '02', name: '목차',                     pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',              pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',                pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개요 & 시장 규모',    pages: 'P 09', locked: true  },
      { num: '06', name: '세그먼트 경제학',          pages: 'P 11', locked: true  },
      { num: '07', name: '경쟁 구도',                pages: 'P 13', locked: true  },
      { num: '08', name: '수요 동인 & 채널',         pages: 'P 19', locked: true  },
      { num: '09', name: '규제 & 정책',              pages: 'P 22', locked: true  },
      { num: '10', name: 'AI 영향',                  pages: 'P 23', locked: true  },
      { num: '11', name: '5년 전망',                 pages: 'P 26', locked: true  },
      { num: '12', name: '방법론 후기',              pages: 'P 28', locked: true  },
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
