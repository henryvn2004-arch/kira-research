// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-id-renewable-energy. Run:
//   node skills/kira-research-report/scripts/_build_2026-id-renewable-energy_sql.mjs > /tmp/insert_idn_renew.sql
// then feed the file to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH ("<report_id>/<locale>.pdf"), computed inside SQL.

const SLUG     = 'renewable-energy-indonesia-2026';
const COUNTRY  = 'Indonesia';
const INDUSTRY = 'Renewable Energy';
const YEAR     = 2026;
const PAGES    = 29;
const PRICE    = 39;

// Geothermal installed-capacity trajectory (GW). Max 7.9 → pct relative.
const chartBars = [
  { pct: 27,  label: '2020',  value: 2.13 },
  { pct: 35,  label: '2025',  value: 2.74 },
  { pct: 63,  label: '2030T', value: 5.0  },
  { pct: 100, label: '2034T', value: 7.9  },
];

const META = {
  en: {
    title: 'Indonesia renewable energy 2026: the geothermal pipeline and the procurement reset',
    eyebrow: 'INDONESIA · RENEWABLE ENERGY · MARKET ANALYSIS',
    preview: {
      lede: "Indonesia's 2.74 GW geothermal fleet ranks second worldwide yet taps barely 12% of the resource. RUPTL 2025-2034 asks for 52.9 GW of renewables and storage through 2034 — 73% of it private-built — while MEMR Regulation 5/2025 rebuilds the PLN procurement clock. The next 24 months separate the developers that clear the new gate from those stuck at exploration risk. Strategic outlook through 2030.",
      paragraphs: [
        "RUPTL 2025-2034 lifts planned renewable capacity from 20.9 GW to 52.9 GW including storage, with 42.6 GW of generation split across solar (17.1 GW), hydro (11.7 GW), wind (7.2 GW) and geothermal (5.2 GW). Yet the 2025 geothermal add was just 112.7 MW — roughly a fifth of the 500-600 MW per year the pathway implies. Demand is structural: MEMR forecasts 4.8-5.2% annual electricity-demand growth.",
        "MEMR Regulation 5/2025 replaces the PPA provisions of the 2017 regime, adds a 30-year build-own-operate structure, sharpens risk allocation, and caps the procurement clock at 180 days for direct selection and 90 days for direct appointment. The reform attacks the binding constraint — not resource, but the time and bankability gap between award and financial close. This report covers macro context, sector sizing, segment economics, the operator landscape, demand and offtake, the regulatory reset, AI across the geothermal lifecycle, and a five-year outlook to 2030.",
      ],
      chart: {
        title: 'Geothermal installed capacity trajectory (GW)',
        subtitle: '2020 actual · 2025 actual · 2030 & 2034 RUPTL targets',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                  pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                     pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',            pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',     pages: 'PG 09', locked: true  },
      { num: '06', name: 'Segment economics',            pages: 'PG 12', locked: true  },
      { num: '07', name: 'Competitive landscape',        pages: 'PG 14', locked: true  },
      { num: '08', name: 'Demand drivers & offtake',     pages: 'PG 20', locked: true  },
      { num: '09', name: 'Regulatory & procurement',     pages: 'PG 23', locked: true  },
      { num: '10', name: 'AI impact',                    pages: 'PG 24', locked: true  },
      { num: '11', name: '5-year outlook & forecast',    pages: 'PG 27', locked: true  },
      { num: '12', name: 'Methodology endnote',          pages: 'PG 30', locked: true  },
    ],
  },

  ja: {
    title: 'インドネシア再生可能エネルギー2026:地熱パイプラインと調達体制の刷新',
    eyebrow: 'インドネシア · 再生可能エネルギー · マーケット分析',
    preview: {
      lede: '設備容量2.74 GWの地熱フリートは世界第2位でありながら、ポテンシャルのわずか12%しか開発されていません。RUPTL 2025-2034は2034年までに52.9 GWの再生可能エネルギーと蓄電を求め、その73%は民間が整備します。MEMR規則5/2025はPLNの調達クロックを再構築しました。今後24か月が、新たなゲートを通過する開発事業者と探査リスクで足踏みする事業者を分けます。2030年までの戦略的見通しを提示します。',
      paragraphs: [
        'RUPTL 2025-2034は計画再生可能容量を20.9 GWから蓄電含む52.9 GWへ引き上げ、発電42.6 GWの内訳は太陽光17.1 GW・水力11.7 GW・風力7.2 GW・地熱5.2 GWです。しかし2025年の地熱追加は112.7 MWにとどまり、パスウェイが示す年間500-600 MWの約5分の1に過ぎません。需要は構造的で、MEMRは年間4.8-5.2%の電力需要成長を予測しています。',
        'MEMR規則5/2025はMEMR 10/2017のPPA条項を刷新し、30年間のBOO方式、リスク配分の明確化、調達期限を直接選定180日・直接指名90日に上限設定しました。本改革は拘束制約 — 資源ではなく、権益付与からファイナンシャルクローズまでの時間と銀行融資適格性のギャップ — に直接対処します。本レポートはマクロ環境、市場規模、セグメント経済性、事業者環境、需要と引取構造、規制刷新、地熱ライフサイクル全体へのAI活用、そして2030年までの5カ年見通しを扱います。',
      ],
      chart: {
        title: '地熱設備容量の推移（GW）',
        subtitle: '2020年実績 · 2025年実績 · 2030年・2034年RUPTL目標',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査方法',                  pages: 'P 02', locked: false },
      { num: '02', name: '目次',                      pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブ・サマリー',  pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概要・市場規模',     pages: 'P 09', locked: true  },
      { num: '06', name: 'セグメント経済性',          pages: 'P 12', locked: true  },
      { num: '07', name: '競争環境',                  pages: 'P 14', locked: true  },
      { num: '08', name: '需要ドライバー・引取構造',   pages: 'P 20', locked: true  },
      { num: '09', name: '規制・調達',                pages: 'P 23', locked: true  },
      { num: '10', name: 'AI活用事例',                pages: 'P 24', locked: true  },
      { num: '11', name: '5カ年見通し・予測',          pages: 'P 27', locked: true  },
      { num: '12', name: '方法論エンドノート',         pages: 'P 30', locked: true  },
    ],
  },

  ko: {
    title: '인도네시아 재생에너지 2026: 지열 파이프라인과 조달 체계 개편',
    eyebrow: '인도네시아 · 재생에너지 · 시장 분석',
    preview: {
      lede: '설치 용량 2.74 GW의 인도네시아 지열 발전단지는 세계 2위 규모이나 자원의 약 12%만 활용되고 있습니다. RUPTL 2025-2034은 2034년까지 52.9 GW의 재생에너지와 저장장치를 요구하며 그 중 73%는 민간이 구축합니다. MEMR Reg 5/2025는 PLN의 조달 체계를 개편했습니다. 향후 24개월이 새 관문을 통과하는 개발사와 탐사 리스크에 머무는 개발사를 가릅니다. 2030년까지의 전략적 전망을 제시합니다.',
      paragraphs: [
        'RUPTL 2025-2034은 계획 재생에너지 용량을 20.9 GW에서 저장장치 포함 52.9 GW로 확대하며, 발전 용량 42.6 GW는 태양광 17.1 GW, 수력 11.7 GW, 풍력 7.2 GW, 지열 5.2 GW로 구성됩니다. 그러나 2025년 지열 추가분은 112.7 MW에 그쳐 목표 경로가 시사하는 연 500-600 MW의 약 5분의 1 수준입니다. 수요는 구조적이며 MEMR는 연 4.8-5.2% 전력 수요 성장을 전망합니다.',
        'MEMR Reg 5/2025는 2017년 PPA 조항을 대체하고 30년 Build-Own-Operate 구조를 추가하며 리스크 배분을 명확히 하고, 조달 기한을 직접 선정 180일, 직접 지정 90일로 상한 설정합니다. 이 개혁이 공략하는 핵심 제약은 자원이 아니라 낙찰에서 재무 완결까지의 시간과 파이낸싱 갭입니다. 본 보고서는 거시 환경, 섹터 규모, 세그먼트 경제성, 사업자 구도, 수요와 판매처, 규제 개편, 지열 라이프사이클 전반의 AI 영향, 그리고 2030년까지의 5개년 전망을 다룹니다.',
      ],
      chart: {
        title: '지열 설치 용량 추이 (GW)',
        subtitle: '2020 실적 · 2025 실적 · 2030 및 2034 RUPTL 목표',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                pages: 'P 02', locked: false },
      { num: '02', name: '목차',                  pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',           pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',             pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개요 및 규모',     pages: 'P 09', locked: true  },
      { num: '06', name: '세그먼트 경제성',       pages: 'P 12', locked: true  },
      { num: '07', name: '경쟁 구도',             pages: 'P 14', locked: true  },
      { num: '08', name: '수요 동인 및 판매처',   pages: 'P 20', locked: true  },
      { num: '09', name: '규제 및 조달',          pages: 'P 23', locked: true  },
      { num: '10', name: 'AI 영향',               pages: 'P 24', locked: true  },
      { num: '11', name: '5개년 전망 및 예측',    pages: 'P 27', locked: true  },
      { num: '12', name: '방법론 미주',           pages: 'P 30', locked: true  },
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
