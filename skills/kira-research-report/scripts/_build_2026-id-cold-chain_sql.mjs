// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-id-cold-chain. Run:
//   node skills/kira-research-report/scripts/_build_2026-id-cold-chain_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql (or PostgREST upsert if MCP down).
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'cold-chain-indonesia-2026';
const COUNTRY  = 'Indonesia';
const INDUSTRY = 'Cold Chain';
const YEAR     = 2026;
const PAGES    = 25;
const PRICE    = 39;

// Exec chart (page 4): cold chain market value trajectory (USD bn). Max 9.4 → pct.
const chartBarsEn = [
  { pct: 53,  label: '2024',  value: '5.0' },
  { pct: 67,  label: '2026',  value: '6.3' },
  { pct: 100, label: '2031F', value: '9.4' },
];
const chartBarsJa = chartBarsEn;
const chartBarsKo = chartBarsEn;

const META = {
  en: {
    title: 'Indonesia cold chain at an archipelagic inflection',
    eyebrow: 'INDONESIA · COLD CHAIN · MARKET ANALYSIS',
    preview: {
      lede: "Across 17,000 islands, Indonesia's temperature-controlled logistics is shifting from a storage business to a delivery business. A USD 1.5 tn economy growing above 5%, a protein-deficit nutrition agenda, and a digitalizing regulatory backbone are pulling cold chain toward delivery [Kira estimates]. The next 24 months decide which operators capture the inter-island leg.",
      paragraphs: [
        "Indonesia grew 5.11% in 2025 and 5.61% in Q1 2026 [BPS 2026], lifting a middle class that eats more frozen protein and dairy. Yet 20–35% of capture fish is lost post-harvest [FAO 2024] — value equal to the daily protein needs of 2.7–4.4 million children. Cold chain is now a nutrition-security agenda, not just a logistics line.",
        "National installed cold storage stands near 12.5 million m³ [Kira estimates], but the binding constraint has moved downstream. The association projects refrigerated delivery growing 20–24% in 2026 against storage at 10–12% [ARPI 2025], as quick-commerce and modern retail reroute long-tail perishable demand to the last mile.",
      ],
      chart: {
        title: 'Cold chain market — value trajectory',
        subtitle: 'Indonesia · USD bn · 2024–2031F',
        bars: chartBarsEn,
      },
    },
    toc: [
      { num: '03',   name: 'Executive summary',            pages: 'PG 04', locked: false },
      { num: '04',   name: 'Macro context 2026',           pages: 'PG 06', locked: true  },
      { num: '05',   name: 'Sector overview & sizing',      pages: 'PG 09', locked: true  },
      { num: '06',   name: 'Segment economics',            pages: 'PG 11', locked: true  },
      { num: '07',   name: 'Competitive landscape',        pages: 'PG 12', locked: true  },
      { num: '07.3', name: 'Player profiles',              pages: 'PG 14', locked: true  },
      { num: '08',   name: 'Demand drivers & channels',    pages: 'PG 18', locked: true  },
      { num: '09',   name: 'Regulatory & policy landscape', pages: 'PG 19', locked: true  },
      { num: '10',   name: 'AI impact',                    pages: 'PG 21', locked: true  },
      { num: '11',   name: 'Five-year outlook & forecast', pages: 'PG 23', locked: true  },
      { num: '12',   name: 'Methodology endnote',          pages: 'PG 24', locked: true  },
    ],
  },

  ja: {
    title: '群島の転換点に立つインドネシアのコールドチェーン',
    eyebrow: 'インドネシア · コールドチェーン · マーケット分析',
    preview: {
      lede: '17,000の島々にまたがる温度管理物流は、保管事業から配送事業へと転換しつつあります。5%超の成長を続けるGDP USD 1.5兆の経済、タンパク質不足を解消する栄養政策、そしてデジタル化する規制インフラが、コールドチェーンを保管から配送へと引き寄せています[Kira estimates]。次の24ヶ月で、島間輸送の主導権を握る事業者が決まります。',
      paragraphs: [
        'インドネシアは2025年に5.11%成長し、2026年第1四半期には前年比5.61%を記録しました[BPS 2026]。中間層の拡大が冷凍タンパク質・乳製品への消費を押し上げています。一方、水産物の収穫後損失は20〜35%に達し[FAO 2024]、これは270万〜440万人の子どもたちの1日分のタンパク質摂取量に相当する価値の喪失です。コールドチェーンは今や栄養安全保障の政策課題です。',
        '国内の冷蔵倉庫設備は約1,250万m³に達していますが[Kira estimates]、制約の焦点はすでに川下へ移っています。業界団体は、冷蔵配送が2026年に20〜24%成長する一方、冷蔵保管は10〜12%にとどまると予測しています[ARPI 2025]。クイックコマースと近代小売の拡張がラストマイルへの需要を引き寄せているためです。',
      ],
      chart: {
        title: 'コールドチェーン市場 — 価値推移',
        subtitle: 'インドネシア · USD bn · 2024–2031F',
        bars: chartBarsJa,
      },
    },
    toc: [
      { num: '03',   name: 'エグゼクティブサマリー',     pages: 'P 04', locked: false },
      { num: '04',   name: 'マクロ文脈 2026',            pages: 'P 06', locked: true  },
      { num: '05',   name: 'セクター概観と規模',         pages: 'P 09', locked: true  },
      { num: '06',   name: 'セグメント経済',             pages: 'P 11', locked: true  },
      { num: '07',   name: '競争環境',                   pages: 'P 12', locked: true  },
      { num: '07.3', name: '事業者プロファイル',         pages: 'P 14', locked: true  },
      { num: '08',   name: '需要ドライバーとチャネル',   pages: 'P 18', locked: true  },
      { num: '09',   name: '規制・政策環境',             pages: 'P 19', locked: true  },
      { num: '10',   name: 'AIの影響',                   pages: 'P 21', locked: true  },
      { num: '11',   name: '5カ年展望と予測',            pages: 'P 23', locked: true  },
      { num: '12',   name: '方法論後注',                 pages: 'P 24', locked: true  },
    ],
  },

  ko: {
    title: '군도적 변곡점에 선 인도네시아 콜드체인',
    eyebrow: '인도네시아 · 콜드체인 · 시장 분석',
    preview: {
      lede: '17,000개 섬 전역에서 온도 관리 물류가 보관 사업에서 배송 사업으로 전환되고 있습니다. 5% 이상 성장하는 USD 1.5조 경제, 단백질 영양 결핍 해소 의제, 그리고 디지털화하는 규제 인프라가 콜드체인을 보관에서 배송으로 끌어당기고 있습니다[Kira estimates]. 향후 24개월이 어느 사업자가 도서 간 구간을 선점할지를 결정합니다.',
      paragraphs: [
        '인도네시아는 2025년 5.11% 성장하였고 2026년 Q1에는 전년 대비 5.61% 성장했습니다[BPS 2026]. 이는 냉동 단백질과 유제품 소비를 늘리는 중산층을 뒷받침합니다. 그러나 포획 어류의 20–35%가 수확 후 손실되고 있으며[FAO 2024] — 이는 270만~440만 명 아동의 일일 단백질 필요량에 해당하는 가치입니다. 콜드체인은 이제 식량 안보 의제입니다.',
        '국가 전체 냉장 창고 용량은 1,250만 m³에 달하지만[Kira estimates], 핵심 제약 요인은 하류로 이동했습니다. 협회는 냉장 배송이 보관(10–12%)의 두 배인 2026년 20–24% 성장할 것으로 전망합니다[ARPI 2025]. 퀵커머스와 현대적 소매 유통이 라스트마일로 장기 냉장 수요를 재편하고 있기 때문입니다.',
      ],
      chart: {
        title: '콜드체인 시장 — 가치 추이',
        subtitle: '인도네시아 · USD bn · 2024–2031F',
        bars: chartBarsKo,
      },
    },
    toc: [
      { num: '03',   name: '경영진 요약',             pages: 'P 04', locked: false },
      { num: '04',   name: '거시 맥락 2026',          pages: 'P 06', locked: true  },
      { num: '05',   name: '섹터 개요 및 규모',       pages: 'P 09', locked: true  },
      { num: '06',   name: '세그먼트 경제성',         pages: 'P 11', locked: true  },
      { num: '07',   name: '경쟁 구도',               pages: 'P 12', locked: true  },
      { num: '07.3', name: '사업자 프로파일',         pages: 'P 14', locked: true  },
      { num: '08',   name: '수요 동인 및 채널',       pages: 'P 18', locked: true  },
      { num: '09',   name: '규제 및 정책 환경',       pages: 'P 19', locked: true  },
      { num: '10',   name: 'AI 영향',                 pages: 'P 21', locked: true  },
      { num: '11',   name: '5개년 전망 및 예측',      pages: 'P 23', locked: true  },
      { num: '12',   name: '방법론 부록',             pages: 'P 24', locked: true  },
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
