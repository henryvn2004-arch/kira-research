// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-sg-digital-assets. Run:
//   node skills/kira-research-report/scripts/_build_2027-sg-digital-assets_sql.mjs > /tmp/insert.sql
// then feed the file to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (e.g. "<report_id>/en.pdf"), NOT a full URL.
// Storage upload happens AFTER this SQL (batch_runner.md 5.3b) via scripts/upload-pdf.mjs.
//
// Structural reference: _build_vn_coffee_sql.mjs. This report's actual HTML does NOT
// use .cover-title/.cover-eyebrow class names that older template assumed — title
// pulled from <h1> inside .cover-main, eyebrow rebuilt per the
// "<COUNTRY> · <INDUSTRY> · MARKET ANALYSIS" convention confirmed live in prod for
// other Singapore reports (data-center-singapore-2027, singapore-ai-services-2027).

const SLUG    = 'digital-assets-singapore-2027';
const COUNTRY = 'Singapore';
const INDUSTRY= 'Digital Assets';
const YEAR    = 2027;
const PAGES   = 18;
const PRICE   = 39;

// Chart bars — licensed DPT provider population (Singapore, active MPI permissions).
// 3-point snapshot (past / current / forecast) picked from the 7-point 2021-2027F
// series on the exec-summary chart (page 4). Max = 44 (2027F) -> pct relative.
const chartBars = [
  { pct: 25,  label: '2022',  value: 11 },
  { pct: 84,  label: '2026',  value: 37 },
  { pct: 100, label: '2027F', value: 44 },
];

const META = {
  en: {
    title: 'Singapore digital assets and the hard perimeter',
    eyebrow: 'SINGAPORE · DIGITAL ASSETS · MARKET ANALYSIS',
    preview: {
      lede: "Singapore's 2027 digital-asset market rests on a deliberately narrow licensing perimeter: 37 firms held active DPT permissions in June 2026, retail ownership sits at 32%, and three licensees drew S$4.8m in AML penalties that same March. An incoming stablecoin statute and live wholesale CBDC settlement rails are converging with institutional demand, which we project reaching US$26bn in assets under custody by 2027, up from roughly US$14bn in 2026.",
      paragraphs: [
        "This report covers the regulatory perimeter (the DTSP regime, licensing outcomes, and the incoming stablecoin statute), the institutional custody build-out (provider structure, segregation rules, fee economics), demand across the tokenisation pipeline, and a 2027 outlook with named scenarios and a methodology endnote.",
        "Singapore's edge is structural, not singular: the regulator, the exchange, the three domestic banks, the variable capital company fund wrapper, the wholesale CBDC settlement rail, and MAS's Project Guardian standards work all point at the same institutional buyer — six load-bearing nodes covered in Section 07.",
      ],
      chart: {
        title: 'Licensed DPT provider population',
        subtitle: 'Singapore · active MPI permissions · 2021-2027F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'Executive summary',                       pages: 'PG 004', locked: false },
      { num: '05', name: 'The regulatory perimeter',                 pages: 'PG 007', locked: true  },
      { num: '05', name: 'Stablecoins and settlement',                pages: 'PG 009', locked: true  },
      { num: '06', name: 'Institutional custody build-out',           pages: 'PG 011', locked: true  },
      { num: '07', name: 'Demand and the tokenisation pipeline',      pages: 'PG 014', locked: true  },
      { num: '08', name: '2027 outlook',                              pages: 'PG 017', locked: true  },
    ],
  },

  ja: {
    title: 'シンガポールのデジタル資産と強固な規制境界',
    eyebrow: 'シンガポール · デジタル資産 · マーケット分析',
    preview: {
      lede: 'シンガポールの2027年デジタル資産市場は、意図的に狭く設計されたライセンス境界の上に成り立っています。2026年6月時点でDPT許可を保有する事業者は37社、個人の仮想通貨保有率は32%、そして2026年3月には3社のライセンス保有者がS$4.8mのAML関連制裁金を科されました。起草中のステーブルコイン法制と稼働中のホールセールCBDC決済レールが機関投資家需要と収斂しつつあり、当社はシンガポールの機関投資家向けカストディ資産が2026年の約US$14bnから2027年にはUS$26bnに達すると予測しています。',
      paragraphs: [
        '本レポートは、規制境界(DTSP規制、ライセンス動向、そして起草中のステーブルコイン法制)、機関投資家向けカストディ体制の構築(事業者構造、分別管理規則、手数料経済性)、トークン化パイプライン全体の需要動向、そして名称付きシナリオと調査手法注記を含む2027年アウトルックを取り上げます。',
        'シンガポールの強みは単一の要因ではなく構造にあります。規制当局、取引所、国内銀行3行、可変資本会社(VCC)というファンドの器、ホールセールCBDC決済レール、そしてMASのProject Guardian標準化の取り組みが、いずれも同じ機関投資家という顧客を志向しています——第07章で取り上げる6つの要衝です。',
      ],
      chart: {
        title: 'ライセンス取得済みDPT事業者数',
        subtitle: 'シンガポール・有効MPI許可数・2021〜2027年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'エグゼクティブサマリー',            pages: 'PG 004', locked: false },
      { num: '05', name: '規制境界',                          pages: 'PG 007', locked: true  },
      { num: '05', name: 'ステーブルコインと決済',            pages: 'PG 009', locked: true  },
      { num: '06', name: '機関投資家向けカストディ体制の構築', pages: 'PG 011', locked: true  },
      { num: '07', name: '需要とトークン化パイプライン',      pages: 'PG 014', locked: true  },
      { num: '08', name: '2027年アウトルック',                pages: 'PG 017', locked: true  },
    ],
  },

  ko: {
    title: '싱가포르 디지털자산과 그 단단한 경계선',
    eyebrow: '싱가포르 · 디지털자산 · 시장 분석',
    preview: {
      lede: '싱가포르의 2027년 디지털자산 시장은 의도적으로 좁게 설계된 라이선싱 경계선 위에 서 있습니다. 2026년 6월 기준 유효 DPT 인가를 보유한 업체는 37곳, 리테일 암호자산 보유율은 32%, 그리고 2026년 3월에는 인가업체 3곳이 S$4.8m의 AML 제재금을 부과받았습니다. 입법 초안 단계의 스테이블코인 법령과 이미 가동 중인 홀세일 CBDC 결제 레일이 기관 수요와 수렴하고 있으며, 당사는 싱가포르 기관 커스터디 자산이 2026년 약 US$14bn에서 2027년 US$26bn으로 증가할 것으로 전망합니다.',
      paragraphs: [
        '본 보고서는 규제 경계선(DTSP 체계, 라이선싱 동향, 입법 초안 단계의 스테이블코인 법령), 기관 커스터디 체제 구축(사업자 구조, 자산분리 규정, 수수료 경제학), 토큰화 파이프라인 전반의 수요 동인, 그리고 명명된 시나리오와 방법론 부록을 포함한 2027년 전망을 다룹니다.',
        '싱가포르의 강점은 단일 요소가 아니라 구조에 있습니다. 규제당국, 거래소, 국내 은행 3곳, 가변자본회사(VCC) 펀드 래퍼, 홀세일 CBDC 결제 레일, 그리고 MAS의 Project Guardian 표준화 작업이 모두 동일한 기관 구매자를 향하고 있습니다 — 제07장에서 다루는 6개 핵심 노드입니다.',
      ],
      chart: {
        title: '인가받은 DPT 사업자 수',
        subtitle: '싱가포르 · 유효 MPI 인가 · 2021-2027F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: '요약',                    pages: 'PG 004', locked: false },
      { num: '05', name: '규제 경계선',              pages: 'PG 007', locked: true  },
      { num: '05', name: '스테이블코인과 결제',      pages: 'PG 009', locked: true  },
      { num: '06', name: '기관 커스터디 구축',       pages: 'PG 011', locked: true  },
      { num: '07', name: '수요와 토큰화 파이프라인', pages: 'PG 014', locked: true  },
      { num: '08', name: '2027년 전망',              pages: 'PG 017', locked: true  },
    ],
  },
};

// SQL string-literal helper using dollar-quoting so we don't have to escape
// single quotes/apostrophes inside English/Japanese/Korean text or JSON.
function dq(s, tag = 'kbat') {
  return `$${tag}$${s}$${tag}$`;
}

const transValues = ['en', 'ja', 'ko'].map((loc) => {
  const m = META[loc];
  const previewJson = JSON.stringify(m.preview);
  const tocJson     = JSON.stringify(m.toc);
  // pdf_url omitted from VALUES — it's computed inside SELECT from new_report.id
  // as `<report_id>::text || '/' || locale || '.pdf'` (Supabase Storage path).
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
  new_report.id::text || '/' || t.locale || '.pdf',  -- storage path: <uuid>/<locale>.pdf
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
