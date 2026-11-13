// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-vn-edtech. Run:
//   node skills/kira-research-report/scripts/_build_2027-vn-edtech_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql (or PostgREST upsert if MCP down).
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'edtech-vietnam-2027';
const COUNTRY  = 'Vietnam';
const INDUSTRY = 'Edtech';
const YEAR     = 2027;
const PAGES    = 18;
const PRICE    = 39;

// Exec chart (page 4): online education revenue USD m, 2024-2029F. 355/398/446/500/560/627.
// Preview shows 4 key points; pct relative to 2029F peak (627).
const chartBarsEn = [
  { pct: 57,  label: '2024',  value: '355' },
  { pct: 71,  label: '2026',  value: '446' },
  { pct: 80,  label: '2027',  value: '500' },
  { pct: 100, label: '2029F', value: '627' },
];

const META = {
  en: {
    title: 'Vietnam edtech at an enforced inflection — K-12 supplementary tutoring and English-language training, 2027 outlook',
    eyebrow: 'VIETNAM · EDTECH · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's tutoring and English-language training market hits a 2027 inflection. A regulatory reset (Circular 29/2024) and an English-as-second-language mandate (Decision 2371) are converting discretionary household spend into structural demand — and consolidating supply from informal teachers toward licensed, branded, AI-augmented operators. Online education revenue reaches ~USD 500m in 2027 [Statista 2025].",
      paragraphs: [
        "Demand is becoming structural. Decision 2371/QĐ-TTg targets English as a second language for 100% of K-12 students by 2035, compulsory from grade one by 2030 [Decision 2371 2025]. IELTS exemptions for the high-school exit exam rose from 28,600 in 2021 to 67,000 in 2024 [VNN 2025]. Tutoring already absorbs 43% of secondary-grade household education spend [BMI 2024].",
        "Supply is consolidating. Circular 29/2024 bans primary academic tutoring, bars teachers from tutoring their own pupils, and mandates business registration [MoET Circular 29 2024]. Informal teacher-led supply contracts; licensed, branded center chains and online platforms absorb the redirected demand. The first profitable scaled operators have emerged [Galaxy Education 2025].",
      ],
      chart: {
        title: 'Online education revenue trajectory',
        subtitle: 'Vietnam · USD m · 2024–2029F',
        bars: chartBarsEn,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary & strategic implications', pages: 'PG 04', locked: false },
      { num: '02', name: 'Macro context: demand backdrop for 2027',    pages: 'PG 06', locked: true  },
      { num: '03', name: 'Market size & growth trajectory',            pages: 'PG 07', locked: true  },
      { num: '04', name: 'Segment economics: tutoring vs ELT',          pages: 'PG 08', locked: true  },
      { num: '05', name: 'Regulatory reset: Circular 29 & Decision 2371',pages: 'PG 09', locked: true  },
      { num: '06', name: 'Competitive structure',                       pages: 'PG 10', locked: true  },
      { num: '07', name: 'Player profile: Galaxy Education',            pages: 'PG 11', locked: true  },
      { num: '08', name: 'AI in tutoring & English delivery',           pages: 'PG 12', locked: true  },
      { num: '09', name: '2027–2031 outlook & forecast',               pages: 'PG 13', locked: true  },
      { num: '10', name: 'Methodology endnote & source mix',            pages: 'PG 14', locked: true  },
    ],
  },

  ja: {
    title: '強制的な転換点に立つベトナムEdtech — K-12補習授業・英語教育、2027年展望',
    eyebrow: 'Vietnam · エドテック · 市場分析',
    preview: {
      lede: 'ベトナムの補習授業・英語教育市場は2027年に転換点を迎えます。規制リセット（通達29/2024号）と英語の第二言語化義務付け（決定2371号）が、任意の家計支出を構造的需要へと転換しつつあります。供給はインフォーマルな教師からライセンス取得済みのブランド・AI活用型事業者へと集約されていきます。オンライン教育売上は2027年に約USD 500百万に達します[Statista 2025]。',
      paragraphs: [
        '需要は構造的になりつつあります。決定2371/QĐ-TTg号は、2035年までに全K-12学習者を対象とした英語の第二言語化、2030年までに1年生から必修化を目標としています[Decision 2371 2025]。大学入学共通試験のIELTS免除者数は2021年の28,600人から2024年に67,000人へと増加しました[VNN 2025]。補習授業はすでに中等学校段階の家計教育支出の43%を占めています[BMI 2024]。',
        '供給は集約化しています。通達29/2024号は小学校段階の学科補習を禁止し、教師による自クラス生徒への有料補習を禁じ、事業者登録を義務付けています[MoET Circular 29 2024]。インフォーマルな教師主導型の供給は縮小し、ライセンス取得済みのブランドセンターチェーンとオンライン事業者が転換需要を吸収します。初の収益化済み大規模事業者がすでに登場しています[Galaxy Education 2025]。',
      ],
      chart: {
        title: 'オンライン教育売上の軌道',
        subtitle: 'ベトナム · USD m · 2024〜2029年予測',
        bars: chartBarsEn,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー & 戦略的示唆', pages: 'P 04', locked: false },
      { num: '02', name: 'マクロ環境：2027年の需要背景',       pages: 'P 06', locked: true  },
      { num: '03', name: '市場規模 & 成長軌道',               pages: 'P 07', locked: true  },
      { num: '04', name: 'セグメント経済性：補習 vs ELT',       pages: 'P 08', locked: true  },
      { num: '05', name: '規制リセット：通達29号 & 決定2371号', pages: 'P 09', locked: true  },
      { num: '06', name: '競争構造',                           pages: 'P 10', locked: true  },
      { num: '07', name: 'プレーヤープロファイル：Galaxy Education', pages: 'P 11', locked: true  },
      { num: '08', name: 'AI活用：補習・英語配信領域',         pages: 'P 12', locked: true  },
      { num: '09', name: '2027〜2031年展望 & 予測',           pages: 'P 13', locked: true  },
      { num: '10', name: '調査方法補注 & 出典構成',           pages: 'P 14', locked: true  },
    ],
  },

  ko: {
    title: '규제 주도의 변곡점에 선 베트남 에듀테크 — K-12 보충 학습 및 영어 교육, 2027년 전망',
    eyebrow: 'Vietnam · 에듀테크 · 시장 분석',
    preview: {
      lede: '베트남의 보충 학습·영어 교육 시장이 2027년 변곡점을 맞습니다. 규제 재편(Circular 29/2024)과 영어 제2외국어 의무화(Decision 2371)가 가계의 재량 지출을 구조적 수요로 전환시키고 있습니다. 공급은 비공식 교사에서 인가·브랜드·AI 기반 사업자를 중심으로 집중화됩니다. 온라인 교육 매출은 2027년 약 USD 500m에 도달합니다[Statista 2025].',
      paragraphs: [
        '수요가 구조화되고 있습니다. Decision 2371/QĐ-TTg는 2035년까지 K-12 학생 100%를 대상으로 영어를 제2외국어로 지정하고, 2030년부터 1학년부터 의무화합니다[Decision 2371 2025]. 고교 졸업시험 IELTS 면제자는 2021년 28,600명에서 2024년 67,000명으로 증가했습니다[VNN 2025]. 보충 학습은 이미 중학교 가계 교육 지출의 43%를 차지합니다[BMI 2024].',
        '공급이 집중화되고 있습니다. Circular 29/2024는 초등 학업 보충 학습을 금지하고, 교사가 자신의 수업 학생을 유료로 지도하는 것을 차단하며, 사업자 등록을 의무화합니다[MoET Circular 29 2024]. 비공식 교사 주도 공급이 위축되면서, 인가된 브랜드 센터 체인과 온라인 플랫폼이 전환된 수요를 흡수합니다. 수익성을 달성한 규모 있는 첫 사업자도 등장했습니다[Galaxy Education 2025].',
      ],
      chart: {
        title: '온라인 교육 매출 궤적',
        subtitle: '베트남 · USD m · 2024–2029F',
        bars: chartBarsEn,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약 & 전략적 시사점', pages: 'P 04', locked: false },
      { num: '02', name: '거시 맥락: 2027년 수요 배경',  pages: 'P 06', locked: true  },
      { num: '03', name: '시장 규모 & 성장 궤적',        pages: 'P 07', locked: true  },
      { num: '04', name: '세그먼트 경제학: 보충 학습 vs ELT', pages: 'P 08', locked: true  },
      { num: '05', name: '규제 재편: Circular 29 & Decision 2371', pages: 'P 09', locked: true  },
      { num: '06', name: '경쟁 구조',                     pages: 'P 10', locked: true  },
      { num: '07', name: '사업자 프로필: Galaxy Education', pages: 'P 11', locked: true  },
      { num: '08', name: '보충 학습 & 영어 교육의 AI 활용', pages: 'P 12', locked: true  },
      { num: '09', name: '2027–2031년 전망 & 예측',      pages: 'P 13', locked: true  },
      { num: '10', name: '방법론 후기 & 출처 구성',      pages: 'P 14', locked: true  },
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
