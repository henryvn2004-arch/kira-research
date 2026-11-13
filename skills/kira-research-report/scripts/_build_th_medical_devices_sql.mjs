// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-th-medical-devices. Run:
//   node skills/kira-research-report/scripts/_build_th_medical_devices_sql.mjs > /tmp/insert.sql
// then feed to Supabase MCP execute_sql.
//
// pdf_url is computed INSIDE the SQL as a Storage path (<report_id>/<locale>.pdf).
// Storage upload happens AFTER this SQL via scripts/upload-pdf.mjs.

const SLUG    = 'thailand-medical-devices-2027';
const COUNTRY = 'Thailand';
const INDUSTRY= 'Medical Devices';
const YEAR    = 2027;
const PAGES   = 14;
const PRICE   = 39;

// Exec-summary chart — Thai domestic medical-device market (USD bn). Max bar 3.15 → pct relative.
const chartBars = [
  { pct: 71,  label: '2024',  value: 2.23 },
  { pct: 81,  label: '2026E', value: 2.55 },
  { pct: 90,  label: '2028F', value: 2.85 },
  { pct: 100, label: '2030F', value: 3.15 },
];

// TOC (11 sections). 01-02 visible in the first-5-page preview → locked:false; rest locked:true.
const tocPages = ['PG 04','PG 05','PG 07','PG 09','PG 11','PG 12','PG 13','PG 13','PG 14','PG 14','PG 14'];
const tocLocked = [false, false, true, true, true, true, true, true, true, true, true];
const tocNames = {
  en: ['Executive summary','Strategic implications','Market sizing and export structure','Aging-cohort demand structure','The Asia-hub strategy','Japanese manufacturer tie-ups','Competitive landscape','Regulatory and policy landscape','AI and digital health frontier','5-year outlook and forecast','Methodology and sources'],
  ja: ['エグゼクティブサマリー','戦略的示唆','市場規模と輸出構造','高齢化コーホートの需要構造','アジアハブ戦略','日系メーカーとの提携','競合環境','規制・政策環境','AIとデジタルヘルスの最前線','5カ年見通しと予測','調査手法と出典'],
  ko: ['핵심 요약','전략적 시사점','시장 규모 및 수출 구조','고령화 수요 구조','아시아 허브 전략','일본 제조사 제휴','경쟁 구도','규제 및 정책 환경','AI 및 디지털 헬스 최전선','5개년 전망 및 예측','방법론 및 출처'],
};
function buildToc(loc) {
  return tocNames[loc].map((name, i) => ({
    num: String(i + 1).padStart(2, '0'),
    name,
    pages: tocPages[i],
    locked: tocLocked[i],
  }));
}

const META = {
  en: {
    title: "ASEAN's export leader, climbing the value chain",
    eyebrow: 'Thailand · Medical Devices · 2027',
    preview: {
      lede: "Thailand's domestic medical-device market reached USD 2.23 bn in 2024 [Statista 2024], but the strategic story sits at the border: as ASEAN's largest device exporter — third in the bloc, sixth in Asia — Thailand now uses a complete-aged society at home and a Japanese-tie-up pipeline through the EEC to move beyond single-use consumables.",
      paragraphs: [
        "The home market is pulled by a complete-aged society — roughly 20% of the population, near 13 million people, is aged 60 or over [DOP 2024], heading toward super-aged status above 30% by 2033. Layered on top is medical tourism, which contributed about USD 9 bn to the healthcare sector in 2023 [Bangkok Post 2023]. Together they underwrite private-hospital capex in imaging and interventional devices regardless of the macro cycle.",
        "Export value reached THB 118 bn in 2023 [Krungsri 2025], but 86.3% is single-use product where Thailand competes on rubber, not technology. The upgrade path runs through Japanese partners: the EEC Office and JETRO signed a collaboration memorandum in January 2024 targeting health among priority sectors [JETRO 2024], and producers such as Nipro already run their first overseas base here [Post Today 2025].",
      ],
      chart: {
        title: 'Thailand device market trajectory',
        subtitle: 'Domestic market · USD bn · 2022–2030F',
        bars: chartBars,
      },
    },
    toc: buildToc('en'),
  },

  ja: {
    title: 'ASEANの輸出リーダーが、価値連鎖の高度化へ向かう',
    eyebrow: 'タイ · 医療機器 · 2027',
    preview: {
      lede: 'タイの国内医療機器市場は2024年にUSD 2.23 bnに達しました[Statista 2024]が、戦略的な核心は国境の先にあります。ASEANで最大の機器輸出国 — 域内3位、アジア6位 — であるタイは、国内での高度高齢社会化とEECを通じた日系企業パイプラインを活用し、単回使用消耗品を超えた高度化を図っています。',
      paragraphs: [
        '国内市場は高度高齢社会によって牽引されています。人口の約20%、約1,300万人が60歳以上であり[DOP 2024]、2033年には30%超の超高齢社会へ移行する見通しです。これに加え、医療観光が2023年に医療セクターへ約USD 9 bnをもたらしています[Bangkok Post 2023]。この2つの需要エンジンが、マクロサイクルに左右されない形で民間病院の画像診断・インターベンション機器への設備投資を下支えしています。',
        '輸出額は2023年にTHB 118 bnに達しましたが[Krungsri 2025]、そのうち86.3%は技術ではなく天然ゴムで競合する単回使用品です。高度化への経路は日系パートナーを通じます。EECオフィスとJETROは2024年1月、ヘルスケアを優先分野に含む協力覚書に署名し[JETRO 2024]、Nipro のような事業者はすでに最初の海外拠点をここに置いています[Post Today 2025]。',
      ],
      chart: {
        title: 'タイ機器市場の推移',
        subtitle: '国内市場 · USD bn · 2022–2030F',
        bars: chartBars,
      },
    },
    toc: buildToc('ja'),
  },

  ko: {
    title: 'ASEAN 최대 수출국으로서 가치 사슬 고도화를 추진 중이다',
    eyebrow: '태국 · 의료기기 · 2027',
    preview: {
      lede: '태국 내수 의료기기 시장은 2024년 USD 2.23 bn에 달했습니다[Statista 2024]. 그러나 전략적 핵심은 국경 너머에 있습니다. ASEAN 최대 기기 수출국으로서 — 역내 3위, 아시아 6위 — 태국은 국내 완전고령사회 진입과 EEC를 통한 일본 기업 제휴 파이프라인을 활용해 일회용 소모품을 넘어서고자 합니다.',
      paragraphs: [
        '내수 시장은 완전고령사회가 견인합니다 — 인구의 약 20%, 약 1,300만 명이 60세 이상이며[DOP 2024], 2033년까지 30%를 넘어 초고령사회로 진입할 전망입니다. 여기에 의료관광이 더해집니다. 의료관광은 2023년 의료 부문에 약 USD 9 bn을 기여했습니다[Bangkok Post 2023]. 두 요인이 함께 영상·중재 기기 분야의 민간 병원 투자를 경기 사이클과 무관하게 뒷받침합니다.',
        '수출액은 2023년 THB 118 bn에 달했지만[Krungsri 2025], 86.3%가 기술이 아닌 천연고무로 경쟁하는 일회용 제품입니다. 가치 사슬 고도화의 경로는 일본 파트너를 통해 열립니다. EEC 사무국과 JETRO는 2024년 1월 보건을 우선 분야로 명시한 협력 양해각서에 서명했으며[JETRO 2024], Nipro 등은 이미 태국에 최초 해외 생산 거점을 운영하고 있습니다[Post Today 2025].',
      ],
      chart: {
        title: '태국 의료기기 시장 성장 궤적',
        subtitle: '내수 시장 · USD bn · 2022–2030F',
        bars: chartBars,
      },
    },
    toc: buildToc('ko'),
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
