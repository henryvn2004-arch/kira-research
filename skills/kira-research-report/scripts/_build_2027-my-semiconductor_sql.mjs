// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-my-semiconductor (Malaysia semiconductor / manufacturing 2027).
// Modeled on _build_2027-th-ev_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_2027-my-semiconductor_sql.mjs > /tmp/insert_my_semi.sql`
// then feed to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL
// CTE from new_report.id — NOT a GitHub raw URL.

const SLUG     = 'manufacturing-malaysia-2027';
const COUNTRY  = 'Malaysia';
const INDUSTRY = 'Manufacturing';
const YEAR     = 2027;
const PAGES    = 23;
const PRICE    = 39;

// Exec chart — global chip sales trajectory, USD bn worldwide. 630 / 772 / 976. Max 976.
const chartBars = [
  { pct: 65,  label: '2024',  value: 630 },
  { pct: 79,  label: '2025',  value: 772 },
  { pct: 100, label: '2026F', value: 976 },
];

const META = {
  en: {
    title: "Malaysia's back-end semiconductor base moves up the value chain",
    eyebrow: 'MALAYSIA · SEMICONDUCTOR · MARKET ANALYSIS',
    preview: {
      lede: "Malaysia enters 2027 as the world's largest semiconductor back-end node outside Taiwan and China — roughly 13% of global assembly, test and packaging (ATP) and about 7% of world semiconductor trade routed through its plants [MIDA]. After the 2023–24 downturn cut OSAT utilisation hard, AI accelerators, rising automotive silicon content and inventory normalisation have turned demand back up through 2025–27 [WSTS]. The strategic move now is qualitative: shifting the value mix toward advanced packaging.",
      paragraphs: [
        "The position to defend is that ~13% ATP share, and the prize is advanced packaging — 2.5D/3D integration, fan-out and system-in-package — the fastest-growing slice of the value chain [Kira estimates]. The National Semiconductor Strategy explicitly steers the northern corridor from commodity assembly toward higher-margin packaging, test and design, backed by an RM500 bn multi-year investment target [NSS].",
        "This report covers the macro backdrop, sector sizing across assembly, test and packaging, segment economics, the competitive landscape of OSAT operators and IDM anchors, the corridor investment pipeline from Penang to Kulim, the National Semiconductor Strategy and its 60,000-engineer talent gap, AI's impact on advanced packaging and test, and a base/bull/bear outlook to 2030. The binding constraint through the cycle is people, not demand.",
      ],
      chart: {
        title: 'Global chip sales trajectory',
        subtitle: 'USD bn · worldwide · 2024 → 2026 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',      pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',          pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector sizing',          pages: 'PG 08', locked: true  },
      { num: '06', name: 'Segment economics',      pages: 'PG 10', locked: true  },
      { num: '07', name: 'Competitive landscape',  pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand & investment',    pages: 'PG 17', locked: true  },
      { num: '09', name: 'Policy landscape',        pages: 'PG 19', locked: true  },
      { num: '10', name: 'AI impact',              pages: 'PG 20', locked: true  },
      { num: '11', name: 'Five-year outlook',      pages: 'PG 22', locked: true  },
      { num: '12', name: 'Methodology endnote',    pages: 'PG 23', locked: true  },
    ],
  },

  ja: {
    title: 'マレーシアの後工程半導体拠点が価値連鎖を上昇させる',
    eyebrow: 'マレーシア · 半導体 · マーケット分析',
    preview: {
      lede: 'マレーシアは2027年、台湾・中国以外では世界最大の半導体後工程ノードとして局面を迎えます。グローバルな組立・テスト・パッケージング(ATP)の約13%、世界半導体貿易の約7%が同国の工場を経由します[MIDA]。2023〜24年の低迷がOSAT稼働率を大きく押し下げた後、AIアクセラレーター、車載シリコン含有量の上昇、在庫正常化が2025〜27年にかけて需要を回復させています[WSTS]。いま重要なのは量的拡大ではなく、先端パッケージングへ価値構成を移す質的転換です。',
      paragraphs: [
        '守るべきは約13%のATPシェアであり、勝ち筋は先端パッケージング——2.5D/3D統合、ファンアウト、システムインパッケージ——というバリューチェーンで最も成長の速い領域です[Kira estimates]。国家半導体戦略(NSS)は北部コリドーをコモディティ組立から高付加価値のパッケージング・テスト・設計へと明確に誘導し、RM5,000億の複数年投資目標がこれを支えます[NSS]。',
        '本レポートはマクロ背景、組立・テスト・パッケージングにわたるセクター規模、セグメント経済性、OSAT事業者とIDMアンカーの競争環境、ペナンからクリムへ広がるコリドー投資パイプライン、国家半導体戦略と6万人のエンジニア不足、先端パッケージング・テストへのAIの影響、そして2030年までのベース/ブル/ベア見通しを扱います。サイクルを通じた制約条件は需要ではなく人材です。',
      ],
      chart: {
        title: '世界の半導体売上推移',
        subtitle: '10億USD · 世界 · 2024年 → 2026年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー', pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',             pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター規模',           pages: 'P 08', locked: true  },
      { num: '06', name: 'セグメント経済性',       pages: 'P 10', locked: true  },
      { num: '07', name: '競合ランドスケープ',     pages: 'P 12', locked: true  },
      { num: '08', name: '需要と投資',             pages: 'P 17', locked: true  },
      { num: '09', name: '政策環境',               pages: 'P 19', locked: true  },
      { num: '10', name: 'AIの影響',               pages: 'P 20', locked: true  },
      { num: '11', name: '5ヵ年見通し',            pages: 'P 22', locked: true  },
      { num: '12', name: '調査手法エンドノート',   pages: 'P 23', locked: true  },
    ],
  },

  ko: {
    title: '말레이시아 후공정 반도체 기지, 가치 사슬 상위로 이동',
    eyebrow: '말레이시아 · 반도체 · 시장 분석',
    preview: {
      lede: '말레이시아는 2027년 대만·중국 외 세계 최대 반도체 후공정 거점으로 국면을 맞이합니다. 세계 조립·테스트·패키징(ATP)의 약 13%, 세계 반도체 교역의 약 7%가 자국 공장을 경유합니다[MIDA]. 2023–24년 침체가 OSAT 가동률을 크게 끌어내린 이후, AI 가속기, 차량용 실리콘 함량 증가, 재고 정상화가 2025–27년에 걸쳐 수요를 회복시키고 있습니다[WSTS]. 지금 관건은 물량 확대가 아니라 첨단 패키징으로 가치 구성을 옮기는 질적 전환입니다.',
      paragraphs: [
        '방어해야 할 것은 약 13%의 ATP 점유율이며, 승부처는 첨단 패키징——2.5D/3D 이종 집적, 팬아웃, SiP——으로 가치 사슬에서 가장 빠르게 성장하는 영역입니다[Kira estimates]. 국가반도체전략(NSS)은 북부 회랑을 범용 조립에서 고마진 패키징·테스트·설계로 명시적으로 유도하며, RM5,000억 규모의 다년 투자 목표가 이를 뒷받침합니다[NSS].',
        '본 보고서는 거시 환경, 조립·테스트·패키징에 걸친 섹터 규모, 세그먼트 경제성, OSAT 사업자와 IDM 앵커의 경쟁 구도, 페낭에서 쿨림으로 이어지는 회랑 투자 파이프라인, 국가반도체전략과 6만 명 엔지니어 부족, 첨단 패키징·테스트에 대한 AI의 영향, 그리고 2030년까지의 기본/낙관/비관 전망을 다룹니다. 사이클 전반의 제약 조건은 수요가 아니라 인력입니다.',
      ],
      chart: {
        title: '세계 반도체 매출 추이',
        subtitle: '10억 USD · 세계 · 2024 → 2026 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',           pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',             pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 규모',             pages: 'P 08', locked: true  },
      { num: '06', name: '세그먼트 경제성',       pages: 'P 10', locked: true  },
      { num: '07', name: '경쟁 구도',             pages: 'P 12', locked: true  },
      { num: '08', name: '수요와 투자',           pages: 'P 17', locked: true  },
      { num: '09', name: '정책 환경',             pages: 'P 19', locked: true  },
      { num: '10', name: 'AI 영향',               pages: 'P 20', locked: true  },
      { num: '11', name: '5개년 전망',            pages: 'P 22', locked: true  },
      { num: '12', name: '방법론 엔드노트',       pages: 'P 23', locked: true  },
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
