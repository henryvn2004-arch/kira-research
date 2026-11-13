// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-vn-textile-apparel. Run:
//   node skills/kira-research-report/scripts/_build_2026-vn-textile-apparel_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql (or PostgREST upsert if MCP down).
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'textile-vietnam-2026';
const COUNTRY  = 'Vietnam';
const INDUSTRY = 'Textile';
const YEAR     = 2026;
const PAGES    = 14;
const PRICE    = 39;

// Exec chart (page 4): T&A exports USD bn, axis 0-80. 35/40.3/46/64.5.
const chartBarsEn = [
  { pct: 44,  label: '2020',  value: '35'   },
  { pct: 50,  label: '2023',  value: '40.3' },
  { pct: 58,  label: '2025',  value: '46'   },
  { pct: 81,  label: '2030F', value: '64.5' },
];
const chartBarsJa = chartBarsEn;
const chartBarsKo = chartBarsEn;

const META = {
  en: {
    title: 'Top-3 exporter, missing middle — Vietnam’s fabric base finally moves upstream',
    eyebrow: 'VIETNAM · TEXTILE & APPAREL · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam exported ~USD 46 bn of textiles and apparel in 2025 [VITAS 2025], the world's #2–3 supplier — yet it still imports ~USD 17 bn of fabric a year [Cong Thuong 2025] because spinning, weaving and dyeing never scaled with the sewing floor. The 2026 inflection is upstream: Korean mills relocating from China to capture the EVFTA Korea-cumulation clause and CPTPP yarn-forward gains.",
      paragraphs: [
        "Vietnam runs the world's #2–3 apparel export engine at ~USD 46 bn in 2025 and a USD 21 bn trade surplus [VITAS 2025]. But the chain is thin at the top: of 7,000+ firms, only ~12% spin yarn and ~18% make fabric while ~68% do garment assembly [B-Company 2025], so the country buys ~60% of fabric abroad, China first [B-Company 2025].",
        "Korea is the largest textile-FDI source at ~25% of the total, registered capital of ~USD 4.8 bn [Cong Thuong 2025]. Hyosung alone has invested USD 4 bn+ and pledged a further USD 4 bn [TheInvestor 2025]. The bet is structural: EVFTA lets fabric of Korean origin count toward Vietnamese origin [MOIT 2025].",
      ],
      chart: {
        title: 'Vietnam textile & apparel exports',
        subtitle: 'Vietnam · USD bn · 2020–2030F',
        bars: chartBarsEn,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',                pages: 'PG 04', locked: false },
      { num: '02', name: 'Strategic implications',            pages: 'PG 05', locked: true  },
      { num: '03', name: 'Market sizing and FTA structure',   pages: 'PG 06', locked: true  },
      { num: '04', name: 'The fabric gap and Korea cumulation',pages: 'PG 07', locked: true  },
      { num: '05', name: 'Korean relocation and FDI build-out',pages: 'PG 09', locked: true  },
      { num: '06', name: 'Competitive landscape',             pages: 'PG 10', locked: true  },
      { num: '07', name: 'AI and operations',                 pages: 'PG 11', locked: true  },
      { num: '08', name: '5-year outlook and forecast',       pages: 'PG 12', locked: true  },
      { num: '09', name: 'Methodology and sources',           pages: 'PG 14', locked: true  },
    ],
  },

  ja: {
    title: '輸出大国、欠けた中間工程 — 生地調達基盤がついに上流へ動く',
    eyebrow: 'Vietnam · 繊維・アパレル · 市場分析',
    preview: {
      lede: 'ベトナムは2025年に繊維・アパレルを約USD 460億輸出し[VITAS 2025]、世界第2〜3位の供給国です。しかし依然として年間約USD 170億の生地を輸入しています[Cong Thuong 2025]。紡績・製織・染色が縫製工程に見合う規模に達してこなかったからです。2026年の転換点は上流にあります：EVFTAの韓国累積条項とCPTPPヤーンフォワードの恩恵を捉えるため、韓国系工場が中国から移転しています。',
      paragraphs: [
        'ベトナムは2025年に約USD 460億、USD 210億の貿易黒字を計上し、世界第2〜3位の衣料輸出エンジンを稼働させています[VITAS 2025]。7,000社超のうち約１２%しか糸を紡がず、約18%しか生地を製造せず、約68%が縫製組み立てに従事しています[B-Company 2025]。このため生地の約60%を海外から、主に中国から調達しています[B-Company 2025]。',
        '韓国は繊維FDIの最大供給国で全体の約25%、登録資本約USD 48億を占めています[Cong Thuong 2025]。ヒョスンだけでUSD 40億超を投資し、さらにUSD 40億を誓約しています[TheInvestor 2025]。この賭けは構造的なものです：EVFTAでは韓国原産の生地をベトナム原産としてカウントできます[MOIT 2025]。',
      ],
      chart: {
        title: 'ベトナム繊維・アパレル輸出額',
        subtitle: 'Vietnam · USD bn · 2020–2030F',
        bars: chartBarsJa,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー', pages: 'P 04', locked: false },
      { num: '02', name: '戦略的示唆',               pages: 'P 05', locked: true  },
      { num: '03', name: '市場規模とFTA構造',   pages: 'P 06', locked: true  },
      { num: '04', name: '生地ギャップと韓国累積条項', pages: 'P 07', locked: true  },
      { num: '05', name: '韓国の移転とFDI拡大', pages: 'P 09', locked: true  },
      { num: '06', name: '競争環境',                       pages: 'P 10', locked: true  },
      { num: '07', name: 'AIと生産オペレーション', pages: 'P 11', locked: true  },
      { num: '08', name: '5年間見通しと予測', pages: 'P 12', locked: true  },
      { num: '09', name: '調査手法と出典',       pages: 'P 14', locked: true  },
    ],
  },

  ko: {
    title: '세계 3위 수출국, 취약한 중간 고리 — 원단 기반이 드디어 업스트림으로 이동한다',
    eyebrow: 'Vietnam · 섬유·의류 · 시장 분석',
    preview: {
      lede: '베트남은 2025년 섬유·의류를 ~USD 46 bn 수출한[VITAS 2025] 세계 2~3위 공급국입니다. 그러나 여전히 연간 ~USD 17 bn의 원단을 수입합니다[Cong Thuong 2025]. 방적·직조·염색이 봉제 공정에 맞는 규모로 성장하지 못했기 때문입니다. 2026년 변곡점은 업스트림입니다: EVFTA 한국 누적 조항과 CPTPP 얀 포워드 혜택을 포착하기 위해 한국계 공장이 중국에서 이전하고 있습니다.',
      paragraphs: [
        '베트남은 2025년 ~USD 46 bn, USD 21 bn 무역 흑자로 세계 2~3위 의류 수출 엔진을 운영합니다[VITAS 2025]. 그러나 공급망은 상단이 얇습니다: 7,000개 이상 기업 중 ~12%만이 사를 방적하고 ~18%만이 원단을 제조하며, ~68%는 의류 봉제에 집중합니다[B-Company 2025]. 결과적으로 원단의 ~60%를 해외에서 조달하며, 중국이 최대 공급국입니다[B-Company 2025].',
        '한국은 전체 섬유 FDI의 ~25%를 차지하는 최대 투자국으로, 등록 자본은 ~USD 4.8 bn입니다[Cong Thuong 2025]. 효성 단독으로도 USD 4 bn+를 투자하였으며 추가 USD 4 bn을 공언했습니다[TheInvestor 2025]. 이 투자의 구조적 근거는 분명합니다: EVFTA는 한국산 원단을 베트남산 원산지로 인정합니다[MOIT 2025].',
      ],
      chart: {
        title: '베트남 섬유·의류 수출',
        subtitle: 'Vietnam · USD bn · 2020–2030F',
        bars: chartBarsKo,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',           pages: 'P 04', locked: false },
      { num: '02', name: '전략적 시사점',       pages: 'P 05', locked: true  },
      { num: '03', name: '시장 규모 및 FTA 구조', pages: 'P 06', locked: true  },
      { num: '04', name: '원단 격차와 한국 누적 조항', pages: 'P 07', locked: true  },
      { num: '05', name: '한국 이전 및 FDI 구축', pages: 'P 09', locked: true  },
      { num: '06', name: '경쟁 구도',                 pages: 'P 10', locked: true  },
      { num: '07', name: 'AI와 운영',                     pages: 'P 11', locked: true  },
      { num: '08', name: '5년 전망 및 예측',   pages: 'P 12', locked: true  },
      { num: '09', name: '방법론 및 출처',     pages: 'P 14', locked: true  },
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
