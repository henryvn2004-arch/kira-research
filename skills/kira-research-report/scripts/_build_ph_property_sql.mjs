// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-ph-property. Run: `node skills/kira-research-report/scripts/_build_ph_property_sql.mjs > /tmp/insert.sql`
// then feed to Supabase MCP execute_sql. pdf_url emits a STORAGE PATH computed in the CTE.

const SLUG    = 'property-philippines-2026';   // industry-country-year (matches recent batch convention)
const COUNTRY = 'Philippines';
const INDUSTRY= 'Property';
const YEAR    = 2026;
const PAGES   = 17;
const PRICE   = 39;

// Exec-summary chart — Metro Manila office vs condo vacancy (% vacancy). Max 25.6 → pct relative.
const chartBars = [
  { pct: 77,  label: "'24 Office", value: 19.8 },
  { pct: 74,  label: "'26 Office", value: 19.0 },
  { pct: 96,  label: "'25 Condo",  value: 24.7 },
  { pct: 100, label: "'26 Condo",  value: 25.6 },
];
const chartBarsJa = chartBars.map((b, i) => ({ ...b, label: ["'24 オフィス","'26 オフィス","'25 コンド","'26 コンド"][i] }));
const chartBarsKo = chartBars.map((b, i) => ({ ...b, label: ["'24 오피스","'26 오피스","'25 콘도","'26 콘도"][i] }));

const META = {
  en: {
    title: 'The Philippine property split — BPO pulls the CBD back as the condo glut lingers',
    eyebrow: 'PHILIPPINES · PROPERTY · MARKET ANALYSIS',
    preview: {
      lede: "Philippine property enters 2026 split in two: a BPO- and GCC-led CBD office recovery that turns Makati and BGC into landlords' markets, against a Metro Manila condominium glut of ~79,200 unsold units. Affordable demand and a 4.5% policy rate set the pace, not foreign flows.",
      paragraphs: [
        "A BPO- and GCC-led office recovery is tightening prime CBDs even as ~79,200 unsold Metro Manila condominium units keep residential vacancy at a record high. The two halves of the market are moving in opposite directions.",
        "Five forces govern who captures the Philippine property recovery through 2028 — each anchored to documented data and KIRA synthesis, across macro and policy, the office and BPO recovery, the condominium oversupply, the developers managing through it, and a scenario read to 2028.",
      ],
      chart: { title: 'Two-speed market — office vs condo vacancy', subtitle: 'Metro Manila · % vacancy · 2024–2026F', bars: chartBars },
    },
    toc: [
      { num: '03', name: 'Executive summary',        pages: 'PG 04', locked: false },
      { num: '03', name: 'Strategic implications',    pages: 'PG 05', locked: false },
      { num: '04', name: 'Macro & policy backdrop',   pages: 'PG 07', locked: true  },
      { num: '05', name: 'Office & BPO recovery',     pages: 'PG 09', locked: true  },
      { num: '06', name: 'Condo size & trajectory',   pages: 'PG 11', locked: true  },
      { num: '06', name: 'The residential oversupply',pages: 'PG 12', locked: true  },
      { num: '07', name: 'Competitive structure',     pages: 'PG 14', locked: true  },
      { num: '10', name: 'Technology in the channel', pages: 'PG 15', locked: true  },
      { num: '11', name: '2028 outlook & scenarios',  pages: 'PG 16', locked: true  },
      { num: '12', name: 'Methodology & sources',     pages: 'PG 17', locked: true  },
    ],
  },

  ja: {
    title: 'フィリピン不動産の二極化 — BPOがCBDを牽引し、コンドミニアム過剰在庫は長引く',
    eyebrow: 'フィリピン · 不動産 · マーケット分析',
    preview: {
      lede: 'フィリピン不動産は2026年を二分化して迎えた：BPO・GCC主導のCBDオフィス回復がマカティとBGCを貸し手市場に変える一方、メトロマニラのコンドミニアム供給過剰（未販売約79,200戸）が住宅側に重くのしかかる。国内の手頃な価格帯の需要と4.5%の政策金利がペースを決定し、外国資金の流入ではない。',
      paragraphs: [
        'BPO・GCC主導のオフィス回復がプライムCBDを引き締める一方、メトロマニラの未販売コンドミニアム約79,200戸が住宅空室率を過去最高水準に押し留める。市場の二つの側面は逆方向に動いている。',
        'フィリピン不動産の回復を2028年にかけて享受できる主体を決定する5つの構造的力。いずれも文書化されたデータとKIRA合成に裏打ちされ、マクロ・政策、オフィス・BPO回復、コンドミニアム供給過剰、それを乗り切る開発業者、そして2028年までのシナリオを横断する。',
      ],
      chart: { title: '二速市場 — オフィスとコンドミニアムの空室率', subtitle: 'メトロマニラ · 空室率% · 2024–2026F', bars: chartBarsJa },
    },
    toc: [
      { num: '03', name: 'エグゼクティブ・サマリー',     pages: 'P 04', locked: false },
      { num: '03', name: '戦略的示唆',                  pages: 'P 05', locked: false },
      { num: '04', name: 'マクロ・政策環境',             pages: 'P 07', locked: true  },
      { num: '05', name: 'オフィス・BPO回復',           pages: 'P 09', locked: true  },
      { num: '06', name: 'コンドミニアム規模と動向',     pages: 'P 11', locked: true  },
      { num: '06', name: '住宅の供給過剰',              pages: 'P 12', locked: true  },
      { num: '07', name: '競争構造',                    pages: 'P 14', locked: true  },
      { num: '10', name: 'チャネルのテクノロジー',       pages: 'P 15', locked: true  },
      { num: '11', name: '2028年アウトルック・シナリオ', pages: 'P 16', locked: true  },
      { num: '12', name: '調査手法・出典',              pages: 'P 17', locked: true  },
    ],
  },

  ko: {
    title: '필리핀 부동산의 분열 — BPO가 CBD를 끌어올리는 동안 콘도 공급과잉은 지속된다',
    eyebrow: '필리핀 · 부동산 · 시장 분석',
    preview: {
      lede: '필리핀 부동산은 2026년 두 가지 방향으로 분열됩니다: BPO·GCC 주도의 CBD 오피스 회복이 마카티와 BGC를 임대인 우위 시장으로 전환하는 반면, 메트로 마닐라 미분양 콘도미니엄은 약 79,200세대에 달합니다. 해외 수요가 아닌 국내 실수요와 4.5% 기준금리가 시장의 속도를 결정합니다.',
      paragraphs: [
        'BPO·GCC 주도의 오피스 회복이 핵심 CBD를 타이트하게 조이는 반면, 메트로 마닐라 미분양 콘도미니엄 약 79,200세대로 인해 주거 공실률은 사상 최고치를 유지하고 있습니다. 시장의 두 축은 정반대 방향으로 움직이고 있습니다.',
        '2028년까지 필리핀 부동산 회복의 수혜를 결정짓는 5가지 동인 — 각각 공개 데이터와 KIRA 분석에 근거하며, 거시·정책, 오피스·BPO 회복, 콘도미니엄 공급과잉, 이를 헤쳐나가는 디벨로퍼, 그리고 2028년까지의 시나리오를 아우릅니다.',
      ],
      chart: { title: '두 속도의 시장 — 오피스 vs 콘도 공실률', subtitle: '메트로 마닐라 · % 공실률 · 2024–2026F', bars: chartBarsKo },
    },
    toc: [
      { num: '03', name: '경영진 요약',              pages: 'P 04', locked: false },
      { num: '03', name: '전략적 시사점',            pages: 'P 05', locked: false },
      { num: '04', name: '거시 및 정책 여건',        pages: 'P 07', locked: true  },
      { num: '05', name: '오피스 및 BPO 회복',       pages: 'P 09', locked: true  },
      { num: '06', name: '콘도 규모 및 추세',        pages: 'P 11', locked: true  },
      { num: '06', name: '주거 공급과잉',            pages: 'P 12', locked: true  },
      { num: '07', name: '경쟁 구조',                pages: 'P 14', locked: true  },
      { num: '10', name: '유통 채널의 기술',         pages: 'P 15', locked: true  },
      { num: '11', name: '2028년 전망 및 시나리오',  pages: 'P 16', locked: true  },
      { num: '12', name: '방법론 및 출처',           pages: 'P 17', locked: true  },
    ],
  },
};

function dq(s, tag = 'kbat') { return `$${tag}$${s}$${tag}$`; }

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
