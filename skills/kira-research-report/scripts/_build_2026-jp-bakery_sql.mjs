// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-jp-bakery. Run:
//   node skills/kira-research-report/scripts/_build_2026-jp-bakery_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql.
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'bakery-japan-2026';
const COUNTRY  = 'Japan';
const INDUSTRY = 'Bakery';
const YEAR     = 2026;
const PAGES    = 14;
const PRICE    = 39;

// JP bread market trajectory (JPY trn, manufacturer-shipment basis).
// FY2019 1.58, FY2023 1.66, FY2028F 1.90. Max 1.90 -> 100%.
const chartBars = [
  { pct: 83,  label: 'FY2019',  value: 1.58 },
  { pct: 87,  label: 'FY2023',  value: 1.66 },
  { pct: 100, label: 'FY2028F', value: 1.90 },
];

const META = {
  en: {
    title: 'Japan bakery 2026: convenience-store premiumization and the artisan-chain reset',
    eyebrow: 'JAPAN · BAKERY · MARKET ANALYSIS',
    preview: {
      lede: "Japan's bread market reached JPY 1.66 trn on a manufacturer-shipment basis in FY2023 [Yano 2025], its first return above the pre-2020 level. With population and per-capita volume both flat-to-declining, the next leg is a value story: convenience-store in-store baking and reformulated everyday bread are doing the work that the speculative high-end shokupan boom of 2018–2020 promised but failed to hold.",
      paragraphs: [
        "Per-capita bread volume runs near 99 kg a year and is structurally flat as the population ages and shrinks [Statista 2025]. Yet per-household bread spend hit a record JPY 34,609 in 2024, up 2.2% YoY [Stat Bureau 2024], and shokupan spend reached an eight-year high [Stat Bureau 2024]. The growth is price and mix — premium reformulation, savoury and sweet bread occasions, and bake-off freshness — not more loaves.",
        "Convenience operators rebuilt bakery as a freshness theatre. Seven & i's in-store bake-off program scaled to ~8,000 stores in FY2025 with a target near 18,000 in FY2026 [Ryutsu News 2025], and the in-store bakery line at the leading rival grew ~15% YoY [Ryutsu News 2025]. Convenience is the largest grocery channel for baked goods at roughly a quarter of value [Kira estimates].",
      ],
      chart: {
        title: 'Japan bread market trajectory',
        subtitle: 'Japan · JPY trn · FY2019–FY2028F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',            pages: 'PG 04', locked: false },
      { num: '02', name: 'Strategic implications',        pages: 'PG 05', locked: true  },
      { num: '03', name: 'Market sizing and segments',    pages: 'PG 06', locked: true  },
      { num: '04', name: 'Demand structure',              pages: 'PG 08', locked: true  },
      { num: '05', name: 'Channel structure',             pages: 'PG 09', locked: true  },
      { num: '06', name: 'Competitive landscape',         pages: 'PG 11', locked: true  },
      { num: '07', name: 'AI and operations',             pages: 'PG 12', locked: true  },
      { num: '08', name: '5-year outlook and forecast',   pages: 'PG 13', locked: true  },
      { num: '09', name: 'Methodology and sources',       pages: 'PG 14', locked: true  },
    ],
  },

  ja: {
    title: '日本ベーカリー市場 2026：コンビニ主導のプレミアム化とアルチザンチェーンの再編',
    eyebrow: '日本 · ベーカリー · マーケット分析',
    preview: {
      lede: '日本のパン市場はFY2023のメーカー出荷ベースでJPY 1.66兆円に達し[Yano 2025]、2020年以前の水準を初めて回復しました。人口と一人当たり数量がともに横ばいから減少傾向にある中、次の成長局面は価値の物語です。コンビニエンスストアの店内焙烤と日常パンのリフォーミュレーションが、2018〜2020年の高級食パンブームが約束しながら維持できなかった役割を担っています。',
      paragraphs: [
        '一人当たりパン消費量は年間約99kgで構造的に横ばいが続いており、人口の高齢化・縮小とともに推移しています[Statista 2025]。一方、世帯別パン支出は2024年に34,609円と前年比+2.2%で過去最高を更新し[Stat Bureau 2024]、食パン支出も8年ぶりの高水準に達しています[Stat Bureau 2024]。成長の源泉は価格とミックスの変化 — プレミアムリフォーミュレーション、惣菜パン・菓子パンの機会開拓、焙烤の鮮度 — であり、ローフの数量増ではありません。',
        'コンビニ各社は鮮度演出としてベーカリーを再構築しました。セブン&アイの店内焙烤プログラムはFY2025に約8,000店舗まで拡大し、FY2026には約18,000店舗を目標とする[Ryutsu News 2025]。主要競合の店内ベーカリー商品ラインもFY2025に約15%増を記録しています[Ryutsu News 2025]。コンビニは焼き菓子の食品グロサリー最大チャネルとして、価値ベースで約4分の1を占めています[Kira estimates]。',
      ],
      chart: {
        title: '日本パン市場の推移',
        subtitle: 'Japan · JPY兆円 · FY2019–FY2028F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',      pages: 'P 04', locked: false },
      { num: '02', name: '戦略的示唆',                  pages: 'P 05', locked: true  },
      { num: '03', name: '市場規模とセグメント',        pages: 'P 06', locked: true  },
      { num: '04', name: '需要構造',                    pages: 'P 08', locked: true  },
      { num: '05', name: 'チャネル構造',                pages: 'P 09', locked: true  },
      { num: '06', name: '競争環境',                    pages: 'P 11', locked: true  },
      { num: '07', name: 'AIと業務効率化',              pages: 'P 12', locked: true  },
      { num: '08', name: '5年間の見通しと予測',         pages: 'P 13', locked: true  },
      { num: '09', name: '調査手法と出典',              pages: 'P 14', locked: true  },
    ],
  },

  ko: {
    title: '일본 베이커리 2026: 편의점 주도 프리미엄화와 아르티장 체인 재편',
    eyebrow: '일본 · 베이커리 · 시장 분석',
    preview: {
      lede: '일본 빵 시장은 FY2023 제조사 출하 기준 JPY 1.66조를 기록하며[Yano 2025] 2020년 이전 수준을 회복했습니다. 인구와 1인당 물량이 모두 정체 내지 감소하는 구조에서, 다음 성장 국면은 가치 스토리입니다: 편의점 인스토어 베이킹과 리포뮬레이션 일상빵이 2018~2020년 프리미엄 식빵 붐이 약속했으나 실현하지 못한 성과를 이끌고 있습니다.',
      paragraphs: [
        '1인당 빵 물량은 연간 약 99 kg 수준에서 구조적으로 정체되어 있으며, 인구 고령화·감소에 따라 유지됩니다[Statista 2025]. 그러나 가계당 빵 지출은 2024년 JPY 34,609로 사상 최고치를 기록하며 전년比 +2.2%[Stat Bureau 2024], 식빵 지출은 8년 만의 최고 수준에 도달했습니다[Stat Bureau 2024]. 성장의 원천은 더 많은 빵이 아니라 가격과 믹스 — 프리미엄 리포뮬레이션, 조리빵·단과자빵 기회, 베이크오프 신선도 — 입니다.',
        '편의점 사업자들은 베이커리를 신선도 극장으로 재정의했습니다. Seven & i의 인스토어 베이크오프 프로그램은 FY2025에 약 8,000개 점포로 확대되었으며 FY2026 목표는 약 18,000개[Ryutsu News 2025]이고, 주요 경쟁사의 인스토어 베이커리 라인은 전년比 약 15% 성장했습니다[Ryutsu News 2025]. 편의점은 제과류 기준 약 4분의 1의 가치를 점유하며 최대 식품 채널로 자리합니다[Kira estimates].',
      ],
      chart: {
        title: '일본 빵 시장 추이',
        subtitle: 'Japan · JPY trn · FY2019–FY2028F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',                 pages: 'P 04', locked: false },
      { num: '02', name: '전략적 시사점',               pages: 'P 05', locked: true  },
      { num: '03', name: '시장 규모 및 세그먼트',       pages: 'P 06', locked: true  },
      { num: '04', name: '수요 구조',                   pages: 'P 08', locked: true  },
      { num: '05', name: '채널 구조',                   pages: 'P 09', locked: true  },
      { num: '06', name: '경쟁 구도',                   pages: 'P 11', locked: true  },
      { num: '07', name: 'AI와 운영',                   pages: 'P 12', locked: true  },
      { num: '08', name: '5개년 전망 및 예측',          pages: 'P 13', locked: true  },
      { num: '09', name: '방법론 및 출처',              pages: 'P 14', locked: true  },
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
