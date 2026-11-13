// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-kr-pharma. Run:
//   node skills/kira-research-report/scripts/_build_2027-kr-pharma_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql (or PostgREST upsert if MCP down).
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'pharma-south-korea-2027';
const COUNTRY  = 'South Korea';
const INDUSTRY = 'Pharma';
const YEAR     = 2027;
const PAGES    = 15;
const PRICE    = 39;

// Korea medicine exports (USD bn). 2025 10.4, 2026F 11.5, 2027F 12.8. Max 12.8 → pct.
const chartBars = [
  { pct: 81,  label: '2025',  value: '10.4' },
  { pct: 90,  label: '2026F', value: '11.5' },
  { pct: 100, label: '2027F', value: '12.8' },
];

const META = {
  en: {
    title: 'Korea pharma 2027 — biosimilars go global, the CDMO capacity build compounds',
    eyebrow: 'SOUTH KOREA · PHARMA · MARKET ANALYSIS',
    preview: {
      lede: "South Korea's pharma story in 2027 sits in exports, not the home market. Medicine exports reached USD 10.4 bn in 2025, up 11.8%, with biologics at 62.6% of the total [KPBMA 2026]. Two biosimilar developers led the world with 5 of 18 US FDA approvals in 2025 [MDToday 2026], while Songdo's contract bioreactor base — 785k L at Samsung Biologics alone [SBL FY25] — fills with patent-cliff, GLP-1 and BIOSECURE-driven demand toward 2030.",
      paragraphs: [
        "Domestic pharma is a slow-growing base near USD 23 bn in 2025 on a ~2.4% trajectory [Korea Pharma Outlook 2025]. The story sits in exports: medicine exports reached USD 10.4 bn in 2025, up 11.8%, with biologics at 62.6% of the total [KPBMA 2026]. Korea sells capacity and molecules, not its home market.",
        "Biosimilars give Korea a pipeline edge — 5 of 18 US FDA biosimilar approvals in 2025, the most of any country, led by Celltrion and Samsung Bioepis [MDToday 2026]. CDMO gives it scale: Samsung Biologics cleared KRW 4.56 trn revenue and KRW 6 trn in new orders in 2025 [SBL FY25]. The BIOSECURE Act, signed into the FY26 NDAA, hands Korean plants the demand Chinese CDMOs vacate [Lawtimes 2026].",
      ],
      chart: {
        title: 'Korea medicine exports & bio share',
        subtitle: 'USD bn · 2021-2027F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'Executive summary',                  pages: 'PG 04', locked: false },
      { num: '05', name: 'Strategic implications',             pages: 'PG 05', locked: true  },
      { num: '06', name: 'Demand & the export engine',         pages: 'PG 06', locked: true  },
      { num: '07', name: 'Market size & the export mix',        pages: 'PG 07', locked: true  },
      { num: '08', name: "Korea's global biosimilar position",  pages: 'PG 08', locked: true  },
      { num: '09', name: 'CDMO capacity build',                 pages: 'PG 09', locked: true  },
      { num: '10', name: 'The Songdo capacity race',            pages: 'PG 10', locked: true  },
      { num: '11', name: 'What fills the new capacity',         pages: 'PG 11', locked: true  },
      { num: '12', name: 'Biosimilar global expansion',         pages: 'PG 12', locked: true  },
      { num: '13', name: 'Six patent-cliff windows',            pages: 'PG 13', locked: true  },
      { num: '14', name: 'Regulatory & policy ladder',          pages: 'PG 14', locked: true  },
      { num: '15', name: '2025-2030 forecast & sources',        pages: 'PG 15', locked: true  },
    ],
  },

  ja: {
    title: '韓国製薬 2027年展望：バイオシミラーの世界展開とCDMO増強',
    eyebrow: '韓国 · 製薬 · マーケット分析',
    preview: {
      lede: '韓国製薬の2027年の本質は国内市場ではなく輸出にあります。医薬品輸出は2025年にUSD 10.4 bn、前年比11.8%増に達し、バイオ製品が総額の62.6%を占めます[KPBMA 2026]。2社のバイオシミラー開発企業が2025年の米FDA承認18件中5件を占め[MDToday 2026]、松島の受託バイオリアクター基盤 — サムスンバイオロジクスだけで785k L[SBL FY25] — が特許切れ・GLP-1・BIOSECURE主導の需要で2030年に向けて埋まります。',
      paragraphs: [
        '国内製薬は約2.4%の軌道で2025年にUSD 23 bn近傍に位置する緩成長の基盤です[Korea Pharma Outlook 2025]。本質は輸出にあります。医薬品輸出は2025年にUSD 10.4 bn、前年比11.8%増に達し、バイオ製品が総額の62.6%を占めています[KPBMA 2026]。韓国は国内市場ではなく、能力と分子を売っています。',
        'バイオシミラーがパイプライン優位をもたらします — 2025年の米FDAバイオシミラー承認18件のうち5件が韓国企業発、セルトリオンとサムスンバイオエピスを中心に2年連続の首位[MDToday 2026]。CDMOがスケールを提供します。サムスンバイオロジクスは2025年にKRW 4.56兆の収益とKRW 6兆超の新規受注を計上[SBL FY25]。FY26 NDAAに署名されたBIOSECURE法は、中国CDMOが手放す需要を韓国工場に委ねます[Lawtimes 2026]。',
      ],
      chart: {
        title: '韓国の医薬品輸出とバイオ比率',
        subtitle: 'USD bn · 2021-2027F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'エグゼクティブ・サマリー',          pages: 'P 04', locked: false },
      { num: '05', name: '戦略的示唆',                        pages: 'P 05', locked: true  },
      { num: '06', name: '需要と輸出エンジン',                pages: 'P 06', locked: true  },
      { num: '07', name: '市場規模と輸出品目構成',            pages: 'P 07', locked: true  },
      { num: '08', name: '韓国のバイオシミラー国際的地位',    pages: 'P 08', locked: true  },
      { num: '09', name: 'CDMO能力増強',                      pages: 'P 09', locked: true  },
      { num: '10', name: '松島の能力増強競争',                pages: 'P 10', locked: true  },
      { num: '11', name: '新設能力を満たすもの',              pages: 'P 11', locked: true  },
      { num: '12', name: 'バイオシミラーの世界展開',          pages: 'P 12', locked: true  },
      { num: '13', name: '6つの特許切れの窓',                 pages: 'P 13', locked: true  },
      { num: '14', name: '規制・政策の梯子',                  pages: 'P 14', locked: true  },
      { num: '15', name: '2025〜2030年予測と出典',            pages: 'P 15', locked: true  },
    ],
  },

  ko: {
    title: '한국 제약 2027 전망: 바이오시밀러 글로벌 확장 & CDMO 생산 역량 확대',
    eyebrow: '대한민국 · 제약 · 시장 분석',
    preview: {
      lede: '한국 제약의 2027년 핵심은 내수가 아니라 수출입니다. 의약품 수출은 2025년 USD 104억, 전년比 11.8% 증가했으며 바이오의약품이 전체의 62.6%를 차지합니다[KPBMA 2026]. 바이오시밀러 개발사 2곳이 2025년 미국 FDA 승인 18건 중 5건을 차지했고[MDToday 2026], 송도의 위탁 바이오리액터 거점 — 삼성바이오로직스만 785k L[SBL FY25] — 이 특허 만료·GLP-1·BIOSECURE 주도 수요로 2030년을 향해 채워집니다.',
      paragraphs: [
        '국내 제약 시장은 2025년 USD 230억 규모로 연 ~2.4% 성장 경로에 있습니다[Korea Pharma Outlook 2025]. 핵심은 수출입니다: 의약품 수출은 2025년 USD 104억, 전년比 11.8% 증가했으며 바이오의약품이 전체의 62.6%를 차지합니다[KPBMA 2026]. 한국은 내수 처방전이 아니라 생산능력과 분자를 수출합니다.',
        '바이오시밀러는 한국에 파이프라인 우위를 부여합니다 — 2025년 미국 FDA 바이오시밀러 18건 중 5건이 한국 기업 산출로, 셀트리온과 삼성바이오에피스가 주도하며 2년 연속 단일국 최다 승인을 기록했습니다[MDToday 2026]. CDMO는 규모를 제공합니다: 삼성바이오로직스는 2025년 매출 KRW 4.56조, 신규 수주 KRW 6조 이상을 달성했습니다[SBL FY25]. FY26 국방수권법에 서명된 BIOSECURE법은 중국 CDMO가 비우는 수요를 한국 공장에 이전합니다[Lawtimes 2026].',
      ],
      chart: {
        title: '한국 의약품 수출 및 바이오 비중',
        subtitle: 'USD bn · 2021-2027F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: '경영진 요약',                       pages: 'P 04', locked: false },
      { num: '05', name: '전략적 시사점',                     pages: 'P 05', locked: true  },
      { num: '06', name: '수요 & 수출 엔진',                  pages: 'P 06', locked: true  },
      { num: '07', name: '시장 규모 & 수출 구성',             pages: 'P 07', locked: true  },
      { num: '08', name: '한국의 글로벌 바이오시밀러 포지션', pages: 'P 08', locked: true  },
      { num: '09', name: 'CDMO 생산 역량 확대',               pages: 'P 09', locked: true  },
      { num: '10', name: '송도 생산 역량 경쟁',               pages: 'P 10', locked: true  },
      { num: '11', name: '신규 생산능력을 채우는 것',         pages: 'P 11', locked: true  },
      { num: '12', name: '바이오시밀러 글로벌 확장',          pages: 'P 12', locked: true  },
      { num: '13', name: '6개 특허 만료 창',                  pages: 'P 13', locked: true  },
      { num: '14', name: '규제 & 정책 경로',                  pages: 'P 14', locked: true  },
      { num: '15', name: '2025-2030년 전망 & 출처',           pages: 'P 15', locked: true  },
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
