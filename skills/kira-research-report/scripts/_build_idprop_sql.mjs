// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-id-property-development. Mirrors _build_vn_coffee_sql.mjs.
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG    = 'property-development-indonesia-2027';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'Property Development';
const YEAR    = 2027;
const PAGES   = 26;   // top-level page count from EN HTML (regex <div class="page[" ])
const PRICE   = 39;

// Headline chart — Indonesia residential market value trajectory (USD bn).
// Full series 45.7,47.9,49.0,50.0F,50.9F,51.4F,51.8F (2024-2030F). 3-bar preview.
const chartBars = [
  { pct: 88,  label: '2024',  value: '45.7' },
  { pct: 95,  label: '2026',  value: '49.0' },
  { pct: 100, label: '2030F', value: '51.8' },
];

const META = {
  en: {
    title: 'Indonesia property 2027 outlook: the MRT corridor and Nusantara reset',
    eyebrow: 'INDONESIA · PROPERTY DEVELOPMENT · MARKET ANALYSIS',
    preview: {
      lede: "Indonesia's residential property market — USD 47.9bn in 2025 [Property Outlook 2025] — enters 2027 at a supply-led inflection rather than a demand-led one. Sales contracted 25.7% YoY in Q1 2026 [BI SHPR 2026], yet the demand floor holds on a housing backlog near 15 million units [Property Outlook 2025]. Two structural forces define the story: a Jakarta apartment supply crunch — new completions falling from ~1,095 units in 2026 to ~434 in 2027 [Brokerage 2026] — meeting a recovering buyer, and the twin spatial resets of the MRT corridor and the Nusantara capital relocation.",
      paragraphs: [
        "Residential sales contracted 25.67% YoY in Q1 2026 [BI SHPR 2026] and secondary prices slipped 0.4% YoY in February 2026 [Rumah123 2026], but the demand floor is intact — a housing backlog near 15 million units [Property Outlook 2025] and household consumption past half of GDP [BPS 2026]. The cycle is at a trough, not in structural decline; the swing factor is mortgage cost, with the extended VAT-borne-by-government incentive pulling buyers back in.",
        "The collision of recovering demand against stalled supply lifts occupancy, rents and eventually secondary prices from mid-2026 [Brokerage 2026]. Transit-linked stock reprices first — TOD units near new MRT stations command a 15-26% premium [Kira estimates]. The report covers macro context, sector sizing, segment economics, the competitive landscape with four developer profiles (BSD/Sinar Mas, Ciputra, Summarecon, Pakuwon), demand corridors, the regulatory ladder, AI's impact on property economics, and a base/bull/bear outlook to 2030.",
      ],
      chart: {
        title: 'Residential market value trajectory',
        subtitle: 'USD bn · 2024-2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',               pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context: Indonesia 2027',   pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',        pages: 'PG 09', locked: true  },
      { num: '06', name: 'Segment economics',               pages: 'PG 11', locked: true  },
      { num: '07', name: 'Competitive landscape',           pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand drivers & corridors',      pages: 'PG 19', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',   pages: 'PG 22', locked: true  },
      { num: '10', name: 'AI impact on property economics',  pages: 'PG 24', locked: true  },
      { num: '11', name: '5-year outlook & forecast',        pages: 'PG 25', locked: true  },
      { num: '12', name: 'Methodology endnote',             pages: 'PG 25', locked: true  },
    ],
  },

  ja: {
    title: 'インドネシア不動産2027年見通し:MRTコリドーとヌサンタラの再編',
    eyebrow: 'インドネシア · 不動産開発 · マーケット分析',
    preview: {
      lede: 'インドネシアの住宅不動産市場(2025年でUSD 479億[Property Outlook 2025])は2027年、需要主導ではなく供給主導の転換局面を迎えます。販売はQ1 2026に前年同期比25.7%縮小しました[BI SHPR 2026]が、約1,500万戸の住宅バックログ[Property Outlook 2025]が需要の下限を支えています。2027年の物語を規定するのは2つの構造的力です:ジャカルタのアパート供給不足(新規完工が2026年の約1,095戸から2027年の約434戸へ減少[Brokerage 2026])が回復する購買層と衝突する局面、そしてMRTコリドーとヌサンタラ首都移転という二重の空間的再編です。',
      paragraphs: [
        'BI調査によれば住宅販売はQ1 2026に前年同期比25.67%縮小し[BI SHPR 2026]、中古価格も2026年2月に前年同期比0.4%下落しました[Rumah123 2026]。しかし需要の下限は維持されています — 住宅バックログは約1,500万戸[Property Outlook 2025]、家計消費はGDPの過半を超えています[BPS 2026]。サイクルは底値にあるのであって、構造的衰退ではありません。転換の決め手は住宅ローンコストです。',
        '政府負担VAT優遇と回復する需要が購買層を引き戻す中、ジャカルタの新規アパート完工戸数は2026年に約1,095戸、2027年にはわずか約434戸まで落ち込みます[Brokerage 2026]。需要回復と供給停滞の衝突が、2026年半ばから稼働率・賃料、そして最終的には中古価格を押し上げます[Brokerage 2026]。本レポートはマクロ環境、市場規模、セグメント経済性、4社のデベロッパープロファイル(BSD/Sinar Mas、Ciputra、Summarecon、Pakuwon)を含む競争環境、需要コリドー、規制環境、不動産経済へのAI影響、そして2030年までのベース/ブル/ベア展望を扱います。',
      ],
      chart: {
        title: '住宅市場価値の軌道',
        subtitle: 'USD bn · 2024-2030年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',          pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境:インドネシア2027',     pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観 & 市場規模',          pages: 'P 09', locked: true  },
      { num: '06', name: 'セグメント経済性',                pages: 'P 11', locked: true  },
      { num: '07', name: '競争環境',                        pages: 'P 12', locked: true  },
      { num: '08', name: '需要ドライバー & コリドー',         pages: 'P 19', locked: true  },
      { num: '09', name: '規制・政策環境',                  pages: 'P 22', locked: true  },
      { num: '10', name: '不動産経済へのAI影響',             pages: 'P 24', locked: true  },
      { num: '11', name: '5年展望 & 予測',                  pages: 'P 25', locked: true  },
      { num: '12', name: '調査手法巻末注',                   pages: 'P 25', locked: true  },
    ],
  },

  ko: {
    title: '인도네시아 부동산 2027 전망: MRT 회랑과 누산타라 리셋',
    eyebrow: '인도네시아 · 부동산 개발 · 시장 분석',
    preview: {
      lede: '인도네시아 주거용 부동산 시장(2025년 USD 479억[Property Outlook 2025])은 2027년 수요 주도가 아닌 공급 주도의 변곡점에 진입합니다. 판매는 2026년 1분기에 전년比 25.7% 감소했으나[BI SHPR 2026], 약 1,500만 호의 주택 부족분[Property Outlook 2025]이 수요 하방을 지지합니다. 2027년을 정의하는 것은 두 가지 구조적 힘입니다: 자카르타 아파트 공급 부족(신규 준공이 2026년 ~1,095세대에서 2027년 ~434세대로 감소[Brokerage 2026])이 회복하는 매수자와 맞닥뜨리는 상황, 그리고 MRT 회랑과 누산타라 수도 이전이라는 이중의 공간적 재편입니다.',
      paragraphs: [
        '주거용 판매는 BI 조사 기준 2026년 1분기에 전년比 25.67% 감소했으며[BI SHPR 2026], 2026년 2월 중고가격도 전년比 0.4% 하락했습니다[Rumah123 2026]. 그러나 수요 하방은 견고합니다 — 주택 부족분은 약 1,500만 호[Property Outlook 2025], 가계 소비는 GDP의 절반을 넘어섰습니다[BPS 2026]. 이 사이클은 저점에 있는 것이지 구조적 쇠퇴가 아닙니다. 회복의 핵심 변수는 주담대 금리입니다.',
        '자카르타 신규 아파트 준공은 2026년 ~1,095세대, 2027년 ~434세대로 급감하는 반면[Brokerage 2026], 정부 부담 VAT 인센티브 연장과 수요 회복이 매수자를 끌어들입니다. 회복하는 수요가 정체된 공급과 충돌하면서 2026년 중반부터 점유율, 임대료, 최종적으로 중고가격이 상승합니다[Brokerage 2026]. 본 보고서는 거시 환경, 시장 규모, 세그먼트별 경제성, 4개 시행사 프로파일(BSD/Sinar Mas, Ciputra, Summarecon, Pakuwon)을 포함한 경쟁 환경, 수요 회랑, 규제 환경, 부동산 경제의 AI 영향, 그리고 2030년까지의 베이스/불/베어 전망을 다룹니다.',
      ],
      chart: {
        title: '주거용 시장 가치 궤적',
        subtitle: 'USD bn · 2024-2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '요약',                            pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경: 인도네시아 2027',        pages: 'P 06', locked: true  },
      { num: '05', name: '산업 개관 & 규모',                 pages: 'P 09', locked: true  },
      { num: '06', name: '세그먼트별 경제성',                pages: 'P 11', locked: true  },
      { num: '07', name: '경쟁 환경',                        pages: 'P 12', locked: true  },
      { num: '08', name: '수요 견인 요인 & 회랑',            pages: 'P 19', locked: true  },
      { num: '09', name: '규제·정책 환경',                   pages: 'P 22', locked: true  },
      { num: '10', name: '부동산 경제의 AI 영향',            pages: 'P 24', locked: true  },
      { num: '11', name: '5개년 전망 & 예측',                pages: 'P 25', locked: true  },
      { num: '12', name: '방법론 권말주',                    pages: 'P 25', locked: true  },
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
