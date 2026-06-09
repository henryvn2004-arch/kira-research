// One-off helper: builds SQL to insert living_reports + 3 report_translations
// rows for 2026-ph-food-manufacturing. Modeled on _build_2026-ph-mining_sql.mjs.
// pdf_url emits a STORAGE PATH (computed inside SQL from new_report.id).

const SLUG    = 'food-manufacturing-philippines-2026';
const COUNTRY = 'Philippines';
const INDUSTRY= 'Food Manufacturing';
const YEAR    = 2026;
const PAGES   = 23;
const PRICE   = 39;

// Exec chart — food-mfg growth lead, YoY % Q4 2025. Max 7.3 -> pct.
// Food products +6.2, all mfg +1.6, pkg-food CAGR +7.3 ('24-28 fcst).
const chartBars = [
  { pct: 85,  label: 'Food products', value: 6.2 },
  { pct: 22,  label: 'All mfg',       value: 1.6 },
  { pct: 100, label: 'Pkg CAGR',      value: 7.3 },
];

// Strip inline source tags like [PSA MISSI 2026] from teaser copy (preview is a
// marketing teaser; source keys live in the full report, not the blurb).
function stripTags(s) {
  return s.replace(/\s*\[[^\]]+\]/g, '').replace(/\s+/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
}

const META = {
  en: {
    title: 'Philippine food manufacturing at an export-hub inflection',
    eyebrow: 'PHILIPPINES · FOOD MANUFACTURING · MARKET ANALYSIS',
    preview: {
      lede: stripTags("Food products are the single largest contributor to Philippine manufacturing growth, expanding 6.2% in Q4 2025 even as headline manufacturing grew just 1.6% [PSA MISSI 2026]. A population near 115 million and a young median age put a structural floor under volume, and packaged-food value is forecast to grow 7.3% a year to 2028 [Agri-Canada PH 2025]. Japanese partners are quietly taking control of the branded core — the next 24 months decide whether the country graduates from a domestic-demand story to a regional export platform."),
      paragraphs: [
        stripTags("Japan's strategic stake is shifting from passive trade to control. Nissin raised its NURC holding to 70% from 49% [Just-Food 2026]; Ajinomoto, Kewpie and the trading houses anchor seasonings, dressings and inputs. The branded centre is being de-risked into a regional supply node, not just a domestic sales line."),
        "This report covers the macro backdrop, sector sizing and segment economics, the competitive landscape with Japanese strategic stakes, demand drivers and distribution channels, the export-hub thesis and regulation, AI's impact on the industry, and a five-year outlook to 2030.",
      ],
      chart: {
        title: 'Food manufacturing growth lead',
        subtitle: 'Philippines · YoY % · Q4 2025',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',           pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',               pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',    pages: 'PG 08', locked: true  },
      { num: '07', name: 'Competitive landscape',       pages: 'PG 11', locked: true  },
      { num: '08', name: 'Demand drivers & channels',   pages: 'PG 16', locked: true  },
      { num: '10', name: 'AI impact',                   pages: 'PG 19', locked: true  },
      { num: '11', name: 'Five-year outlook & forecast', pages: 'PG 22', locked: true  },
    ],
  },

  ja: {
    title: 'フィリピン食品製造業、輸出拠点化の転換点へ',
    eyebrow: 'フィリピン · 食品製造 · マーケット分析',
    preview: {
      lede: stripTags("食品は、フィリピンの製造業成長に最も大きく寄与するセクターであり、2025年第4四半期には製造業全体が1.6%成長にとどまるなか6.2%拡大しました[PSA MISSI 2026]。約1億1,500万人の人口と若い年齢構成が数量の構造的な下支えとなり、パッケージ食品の価値は2028年まで年率7.3%で成長すると予測されています[Agri-Canada PH 2025]。日本のパートナーが静かにブランド中核を掌握しつつあり、今後24ヶ月が、同国が内需依存の物語から地域輸出プラットフォームへ脱皮できるかを左右します。"),
      paragraphs: [
        stripTags("日本の戦略的関与は、受動的な貿易から支配へと移行しつつあります。日清はNURC持分を49%から70%へ引き上げ[Just-Food 2026]、味の素・キユーピー・商社が調味料・ドレッシング・原材料を押さえています。ブランド中核は、単なる国内販売ラインではなく、地域供給ノードとしてデリスク化されつつあります。"),
        "本レポートは、マクロ環境、セクター規模とセグメント経済性、日本の戦略的出資を含む競争環境、需要ドライバーと流通チャネル、輸出拠点化の論拠と規制、AIが業界に与える影響、そして2030年までの5ヶ年見通しを扱います。",
      ],
      chart: {
        title: '食品製造業の成長優位性',
        subtitle: 'Philippines · YoY % · Q4 2025',
        bars: [
          { pct: 85,  label: '食品製品',       value: 6.2 },
          { pct: 22,  label: '製造業全体',     value: 1.6 },
          { pct: 100, label: 'パッケージ食品', value: 7.3 },
        ],
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',     pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                 pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概況と市場規模',     pages: 'P 08', locked: true  },
      { num: '07', name: '競合環境',                   pages: 'P 11', locked: true  },
      { num: '08', name: '需要ドライバーと流通チャネル', pages: 'P 16', locked: true  },
      { num: '10', name: 'AI影響',                     pages: 'P 19', locked: true  },
      { num: '11', name: '5ヶ年見通しと予測',          pages: 'P 22', locked: true  },
    ],
  },

  ko: {
    title: '변곡점에 선 필리핀 식품 제조 — 수출 거점으로의 전환',
    eyebrow: '필리핀 · 식품 제조 · 시장 분석',
    preview: {
      lede: stripTags("식품은 필리핀 제조업 성장에 가장 크게 기여하는 부문으로, 2025년 4분기 전체 제조업이 1.6% 성장에 그친 가운데 6.2% 확대되었습니다[PSA MISSI 2026]. 약 1억 1,500만 명의 인구와 젊은 중위연령이 물량에 구조적 하방 지지를 제공하며, 포장식품 가치는 2028년까지 연 7.3% 성장할 것으로 전망됩니다[Agri-Canada PH 2025]. 일본 파트너들이 조용히 브랜드 핵심부를 장악해 가고 있으며, 향후 24개월이 필리핀이 내수 의존 서사에서 역내 수출 플랫폼으로 도약할 수 있을지를 좌우합니다."),
      paragraphs: [
        stripTags("일본의 전략적 관여는 수동적 교역에서 지배로 이동하고 있습니다. 닛신은 NURC 지분을 49%에서 70%로 확대했고[Just-Food 2026], 아지노모토·큐피·종합상사가 조미료·드레싱·원료를 장악하고 있습니다. 브랜드 핵심부는 단순한 내수 판매 라인이 아니라 역내 공급 노드로 디리스크화되고 있습니다."),
        "본 보고서는 거시 환경, 섹터 규모와 세그먼트 경제성, 일본의 전략적 지분을 포함한 경쟁 구도, 수요 동인과 유통 채널, 수출 거점 테제와 규제, AI의 산업 영향, 그리고 2030년까지의 5개년 전망을 다룹니다.",
      ],
      chart: {
        title: '식품 제조업 성장 우위',
        subtitle: 'Philippines · 전년比 % · 2025년 4분기',
        bars: [
          { pct: 85,  label: '식품 제품',   value: 6.2 },
          { pct: 22,  label: '제조업 전체', value: 1.6 },
          { pct: 100, label: '포장식품',    value: 7.3 },
        ],
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',           pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',             pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개요 & 규모',      pages: 'P 08', locked: true  },
      { num: '07', name: '경쟁 구도',             pages: 'P 11', locked: true  },
      { num: '08', name: '수요 동인 & 채널',      pages: 'P 16', locked: true  },
      { num: '10', name: 'AI 영향',               pages: 'P 19', locked: true  },
      { num: '11', name: '5개년 전망 & 예측',     pages: 'P 22', locked: true  },
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
