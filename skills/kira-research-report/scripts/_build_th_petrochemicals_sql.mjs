// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-th-petrochemicals. Run:
//   node skills/kira-research-report/scripts/_build_th_petrochemicals_sql.mjs > /tmp/insert.sql
// then feed to Supabase MCP execute_sql.
//
// pdf_url is computed INSIDE the SQL as a Storage path (<report_id>/<locale>.pdf).
// Storage upload happens AFTER this SQL via scripts/upload-pdf.mjs.

const SLUG    = 'petrochemicals-thailand-2026';
const COUNTRY = 'Thailand';
const INDUSTRY= 'Petrochemicals';
const YEAR    = 2026;
const PAGES   = 22;
const PRICE   = 39;

// Exec-summary chart — Thai petrochemical sector sales value (USD bn). Max 22.0 → pct relative.
const chartBars = [
  { pct: 93,  label: '2023',  value: 20.5 },
  { pct: 69,  label: '2025',  value: 15.2 },
  { pct: 81,  label: '2027F', value: 17.8 },
  { pct: 100, label: '2030F', value: 22.0 },
];

const META = {
  en: {
    title: 'Thailand petrochemicals at the consolidation pivot',
    eyebrow: 'Thailand · Petrochemicals · 2026',
    preview: {
      lede: "A region-wide oversupply trough has pushed Thailand's two integrated majors from competing to combining. The next 18 months decide whether the SCGC–GC olefins merger and the specialty pivot reset the sector's margin floor.",
      paragraphs: [
        "Global ethylene capacity added ~40 Mt over 2020–2025 against ~27 Mt of demand, roughly 70% of it in China [S&P 2026]. NE Asia cracker spreads sit near USD 219/t, under the ~USD 250/t integrated breakeven [S&P 2026]. Thai sector sales value compressed to an estimated USD 15–16 bn in 2025 from ~USD 20 bn in 2023 [Kira estimates]. Scale, not survival, is now the strategic question — hence the April 2026 SCGC–GC olefins MoU.",
        "PTT Global Chemical and SCGC are deliberately shifting from commodity olefins toward high-value-added lines — MMA, propylene oxide, acrylonitrile, performance polyolefins and recycled resin [GC-SCGC 2026]. GC's allnex integration lifted performance-chemicals EBITDA margin ~15 pp by 2025 [Kira estimates]. The specialty pivot is the margin story; consolidation is the cost story.",
      ],
      chart: {
        title: 'Thai petrochemical sector sales value',
        subtitle: 'Thailand · USD bn · 2023–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                          pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                             pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                    pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                        pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',             pages: 'PG 08', locked: true  },
      { num: '06', name: 'Competitive structure',                pages: 'PG 10', locked: true  },
      { num: '07', name: 'Player profiles',                      pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand, exports & the specialty pivot', pages: 'PG 16', locked: true  },
      { num: '09', name: 'Regulatory & corridor landscape',      pages: 'PG 17', locked: true  },
      { num: '10', name: 'AI impact',                            pages: 'PG 19', locked: true  },
      { num: '11', name: '5-year outlook',                       pages: 'PG 21', locked: true  },
      { num: '12', name: 'Methodology & sources',                pages: 'PG 22', locked: true  },
    ],
  },

  ja: {
    title: 'タイ石油化学産業、集約化の転換点へ',
    eyebrow: 'タイ · 石油化学 · 2026',
    preview: {
      lede: '地域規模の供給過剰が谷底に達し、タイの2大統合事業者は競争から統合へと方向を転じた。今後18ヶ月が決め手となる — SCGC–GCオレフィン合併とスペシャルティ転換がセクターの利益率フロアを再設定できるかどうか。',
      paragraphs: [
        '世界のエチレン設備能力は2020–2025年に約40 Mt増加した一方、需要増は約27 Mt — その約70%が中国によるものです[S&P 2026]。北東アジアのクラッカースプレッドはUSD 219/t近辺にあり、統合型損益分岐点の約USD 250/tを下回っています[S&P 2026]。タイのセクター売上高は2023年の約USD 20 bnから2025年は推計USD 15–16 bn程度に圧縮されました[Kira estimates]。問題はもはや生存ではなく規模 — だからこそ2026年4月にSCGC–GCオレフィンMoUが締結されたのです。',
        'PTT Global ChemicalとSCGCはコモディティオレフィンから高付加価値ライン — MMA・プロピレンオキシド・アクリロニトリル・高性能ポリオレフィン・リサイクル樹脂 — へ意図的にシフトしています[GC-SCGC 2026]。GCのallnex統合は2025年までに性能化学品のEBITDAマージンを約15 pp押し上げました[Kira estimates]。スペシャルティ転換が利益率の物語であり、集約化はコストの物語です。',
      ],
      chart: {
        title: 'タイ石油化学セクター売上高',
        subtitle: 'Thailand · USD bn · 2023–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                    pages: 'P 02', locked: false },
      { num: '02', name: '目次',                        pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',      pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ文脈',                  pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観と規模感',        pages: 'P 08', locked: true  },
      { num: '06', name: '競争構造',                    pages: 'P 10', locked: true  },
      { num: '07', name: '事業者プロファイル',          pages: 'P 12', locked: true  },
      { num: '08', name: '需要・輸出とスペシャルティ転換', pages: 'P 16', locked: true  },
      { num: '09', name: '規制・コリドー環境',          pages: 'P 17', locked: true  },
      { num: '10', name: 'AIの影響',                    pages: 'P 19', locked: true  },
      { num: '11', name: '5年間見通し',                 pages: 'P 21', locked: true  },
      { num: '12', name: '調査手法と情報源',            pages: 'P 22', locked: true  },
    ],
  },

  ko: {
    title: '태국 석유화학, 통합 전환점에 서다',
    eyebrow: '태국 · 석유화학 · 2026',
    preview: {
      lede: '역내 전반의 공급 과잉 저점이 태국 2대 통합 메이저를 경쟁에서 결합으로 밀어붙이고 있습니다. 향후 18개월이 결정적입니다 — SCGC–GC 올레핀 합병과 스페셜티 전환이 섹터의 마진 바닥을 재설정할 수 있는지 판가름 납니다.',
      paragraphs: [
        '2020–2025년 전 세계 에틸렌 설비 용량은 약 27 Mt의 수요 대비 약 40 Mt 증가했으며, 그 중 약 70%가 중국에서 발생했습니다[S&P 2026]. 동북아 크래커 스프레드는 USD 219/t 수준으로, 통합 손익분기점 약 USD 250/t를 하회합니다[S&P 2026]. 태국 섹터 매출액은 2023년 약 USD 200억에서 2025년 USD 150~160억으로 압축된 것으로 추정됩니다[Kira estimates]. 이제 전략적 화두는 생존이 아니라 규모이며, 이것이 2026년 4월 SCGC–GC 올레핀 MoU의 배경입니다.',
        'PTT Global Chemical과 SCGC는 범용 올레핀에서 고부가가치 라인 — MMA, 프로필렌 옥사이드, 아크릴로니트릴, 퍼포먼스 폴리올레핀, 재활용 수지 — 으로 의도적으로 전환 중입니다[GC-SCGC 2026]. GC의 allnex 통합은 2025년까지 퍼포먼스 케미칼 EBITDA 마진을 약 15 pp 끌어올렸습니다[Kira estimates]. 스페셜티 전환이 마진의 핵심이며, 통합은 비용의 핵심입니다.',
      ],
      chart: {
        title: '태국 석유화학 섹터 매출액',
        subtitle: '태국 · USD bn · 2023–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법론',               pages: 'P 02', locked: false },
      { num: '02', name: '목차',                      pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',               pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',                 pages: 'P 06', locked: true  },
      { num: '05', name: '섹터 개요 & 규모',          pages: 'P 08', locked: true  },
      { num: '06', name: '경쟁 구조',                 pages: 'P 10', locked: true  },
      { num: '07', name: '사업자 프로파일',           pages: 'P 12', locked: true  },
      { num: '08', name: '수요, 수출 & 스페셜티 전환', pages: 'P 16', locked: true  },
      { num: '09', name: '규제 & 경제특구 환경',       pages: 'P 17', locked: true  },
      { num: '10', name: 'AI 영향',                   pages: 'P 19', locked: true  },
      { num: '11', name: '5개년 전망',                pages: 'P 21', locked: true  },
      { num: '12', name: '조사 방법론 & 출처',         pages: 'P 22', locked: true  },
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
