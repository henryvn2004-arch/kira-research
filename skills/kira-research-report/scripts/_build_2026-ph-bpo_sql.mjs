// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-ph-bpo. Run via Supabase MCP execute_sql.

const SLUG    = 'philippines-bpo-2026';
const COUNTRY = 'Philippines';
const INDUSTRY= 'Business Process Outsourcing';
const YEAR    = 2026;
const PAGES   = 16;
const PRICE   = 39;

// Chart bars: Philippines IT-BPM revenue (US$B). 2023 actual, 2024 actual, 2028 target.
// Tallest bar (59.0) = 100%. 35.4/59.0 ≈ 60%, 38.0/59.0 ≈ 64%.
const chartBars = [
  { pct: 60,  label: '2023 revenue', value: '$35.4B' },
  { pct: 64,  label: '2024 revenue', value: '$38.0B' },
  { pct: 100, label: '2028 target',  value: '$59.0B' },
];

const META = {
  en: {
    title: 'Philippines BPO 2026',
    eyebrow: 'PHILIPPINES · BUSINESS PROCESS OUTSOURCING · MARKET ANALYSIS',
    preview: {
      lede: "The Philippine IT-BPM sector enters 2026 as the country's most strategic export industry and one of its largest private employers. Revenue reached US$38 billion in 2024 — annual growth of roughly 7% — while direct headcount climbed to 1.82 million. Yet generative automation now puts a question mark on the low-complexity voice and transactional work that built the industry. The sector's response is migration up the value chain into finance, healthcare, analytics, and software.",
      paragraphs: [
        "For two decades the Philippine value proposition was straightforward: a large, English-fluent, culturally Western-aligned workforce delivering voice and back-office services at a fraction of onshore cost. That proposition made the country the global leader in contact-center delivery and the world's second-largest IT-BPM destination after India. The sector now accounts for an estimated 10–15% of the global BPO market and contributes roughly 7–8% of national GDP.",
        "The Roadmap 2028 target of US$59 billion implies a CAGR of approximately 9% from the 2024 base — achievable only if higher-value mandates carry the load as commodity voice plateaus. This report maps the automation exposure, captive-center wave, talent economics, and three scenarios to 2028 for operators, multinationals, and investors across the Philippine BPO landscape.",
      ],
      chart: {
        title: 'Philippines IT-BPM revenue (US$)',
        subtitle: '2023 actual · 2024 actual · 2028 Roadmap target',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',                  pages: 'PG 002', locked: false },
      { num: '02', name: 'From cost arbitrage to capability',  pages: 'PG 003', locked: true  },
      { num: '03', name: 'The trajectory to 2028',             pages: 'PG 004', locked: true  },
      { num: '04', name: 'Where the value sits',               pages: 'PG 005', locked: true  },
      { num: '05', name: 'What pulls work to the Philippines', pages: 'PG 006', locked: true  },
      { num: '06', name: 'The global field',                   pages: 'PG 007', locked: true  },
      { num: '07', name: 'Automation as augmentation',         pages: 'PG 008', locked: true  },
      { num: '08', name: 'The workforce and where it lives',   pages: 'PG 009', locked: true  },
      { num: '09', name: 'The incentives question',            pages: 'PG 010', locked: true  },
      { num: '10', name: 'What could break the thesis',        pages: 'PG 011', locked: true  },
      { num: '11', name: 'Three paths to 2028',                pages: 'PG 012', locked: true  },
      { num: '12', name: 'What it means for participants',     pages: 'PG 013', locked: true  },
      { num: '13', name: 'Where to focus',                     pages: 'PG 014', locked: true  },
      { num: '14', name: 'Methodology & sources',              pages: 'PG 015', locked: true  },
    ],
  },

  ja: {
    title: 'フィリピン BPO 2026',
    eyebrow: 'フィリピン · ビジネスプロセスアウトソーシング · 市場分析',
    preview: {
      lede: 'フィリピンのIT-BPM産業は2026年、同国最重要の輸出産業かつ最大規模の民間雇用源として臨界点を迎えています。売上高は2024年にUS$38Bに達し、年率約7%の成長を実現する一方、直接雇用者数は182万人へと増加しました。しかし生成的自動化が、産業を支えてきた低複雑度の音声対応・定型業務の相当部分を吸収できる段階に達しています。産業の対応は退却ではなく、金融・医療・分析・ソフトウェアへの高付加価値移行です。',
      paragraphs: [
        '20年間、フィリピンの価値提案は明快でした。大規模かつ英語流暢で西洋文化に親和する労働力が、音声対応とバックオフィス業務をオンショアの何分の一かのコストで提供するというものです。この提案が同国をコンタクトセンター分野の世界的リーダーとし、インドに次ぐ世界第2位のIT-BPMデスティネーションとしました。現在、この産業は世界BPO市場の推定10〜15%を占め、国家GDPの約7〜8%を生み出しています。',
        'ロードマップ2028の目標であるUS$59Bは、2024年基準で年率約9%のCAGRを意味します。これはコモディティ音声需要が頭打ちになる中、高付加価値領域が成長を牽引した場合のみ達成可能です。本レポートは、自動化リスク、キャプティブセンターの波、人材経済、そして2028年への3つのシナリオをオペレーター・多国籍企業・投資家の視点でマッピングします。',
      ],
      chart: {
        title: 'フィリピンIT-BPM売上高 (米ドル)',
        subtitle: '2023年実績 · 2024年実績 · 2028年ロードマップ目標',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',             pages: 'P 002', locked: false },
      { num: '02', name: 'コスト裁定からケイパビリティへ',     pages: 'P 003', locked: true  },
      { num: '03', name: '2028年への軌道',                     pages: 'P 004', locked: true  },
      { num: '04', name: '価値の所在',                         pages: 'P 005', locked: true  },
      { num: '05', name: 'フィリピンに業務が集まる理由',       pages: 'P 006', locked: true  },
      { num: '06', name: 'グローバルの競争地図',               pages: 'P 007', locked: true  },
      { num: '07', name: '自動化は代替ではなく拡張',           pages: 'P 008', locked: true  },
      { num: '08', name: '労働力とその地理',                   pages: 'P 009', locked: true  },
      { num: '09', name: 'インセンティブという問い',           pages: 'P 010', locked: true  },
      { num: '10', name: '論旨を崩しうる要因',                 pages: 'P 011', locked: true  },
      { num: '11', name: '2028年への3つの経路',                pages: 'P 012', locked: true  },
      { num: '12', name: '市場参加者にとっての意味',           pages: 'P 013', locked: true  },
      { num: '13', name: '注力すべき領域',                     pages: 'P 014', locked: true  },
      { num: '14', name: '調査手法と出典',                     pages: 'P 015', locked: true  },
    ],
  },

  ko: {
    title: '필리핀 BPO 2026',
    eyebrow: '필리핀 · 비즈니스 프로세스 아웃소싱 · 시장 분석',
    preview: {
      lede: '필리핀 IT-BPM 부문은 2026년을 맞아 국가 최대 전략 수출 산업이자 최대 민간 고용 주체로서의 위상을 공고히 하고 있습니다. 2024년 매출은 USD 380억으로 연간 약 7% 성장했으며, 직접 고용 인원은 182만 명으로 증가했습니다. 그러나 생성형 자동화는 저복잡도 음성 응대 및 거래 처리 업무의 상당 부분을 흡수할 수 있습니다. 업계의 대응은 후퇴가 아니라 금융·의료·분석·소프트웨어 등 가치 사슬 상위로의 이행입니다.',
      paragraphs: [
        '20년간 필리핀의 가치 제안은 명확했습니다. 대규모의 영어 유창, 서구 문화 친화적 노동력이 음성 응대 및 백오피스 업무를 온쇼어 대비 훨씬 낮은 비용으로 제공하는 것이었습니다. 이 제안은 필리핀을 컨택트센터 분야의 세계 최강자, 인도에 이은 세계 2위 IT-BPM 거점으로 만들었습니다. 현재 이 산업은 세계 BPO 시장의 추정 10~15%를 차지하며 국가 GDP의 약 7~8%를 창출합니다.',
        '로드맵 2028의 목표인 USD 590억은 2024년 기준 연간 약 9% CAGR을 의미합니다. 이는 콘택트센터 등 범용 음성 업무가 정체되는 가운데 고부가가치 영역이 성장을 이끌어야만 달성 가능합니다. 본 보고서는 자동화 리스크, 캡티브 센터 물결, 인재 경제, 2028년으로의 세 가지 시나리오를 운영사·다국적 기업·투자자 시각에서 분석합니다.',
      ],
      chart: {
        title: '필리핀 IT-BPM 매출 (USD)',
        subtitle: '2023 실적 · 2024 실적 · 2028 로드맵 목표',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영 요약',                          pages: 'P 002', locked: false },
      { num: '02', name: '비용 차익에서 역량으로',             pages: 'P 003', locked: true  },
      { num: '03', name: '2028년을 향한 성장 궤적',            pages: 'P 004', locked: true  },
      { num: '04', name: '가치가 집중된 곳',                   pages: 'P 005', locked: true  },
      { num: '05', name: '필리핀으로 업무가 집중되는 이유',    pages: 'P 006', locked: true  },
      { num: '06', name: '글로벌 경쟁 구도',                   pages: 'P 007', locked: true  },
      { num: '07', name: '자동화: 대체가 아닌 증강',           pages: 'P 008', locked: true  },
      { num: '08', name: '인력과 그 분포',                     pages: 'P 009', locked: true  },
      { num: '09', name: '인센티브 문제',                      pages: 'P 010', locked: true  },
      { num: '10', name: '명제를 무너뜨릴 수 있는 것들',       pages: 'P 011', locked: true  },
      { num: '11', name: '2028년을 향한 세 가지 경로',         pages: 'P 012', locked: true  },
      { num: '12', name: '시장 참여자별 시사점',               pages: 'P 013', locked: true  },
      { num: '13', name: '집중해야 할 영역',                   pages: 'P 014', locked: true  },
      { num: '14', name: '방법론 & 출처',                      pages: 'P 015', locked: true  },
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
