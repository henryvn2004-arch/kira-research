// One-off helper: builds SQL to insert living_reports + 3 report_translations
// rows for 2027-ph-renewable-energy. Modeled on _build_2026-ph-mining_sql.mjs.
// pdf_url emits a STORAGE PATH (computed inside SQL from new_report.id).

const SLUG     = 'renewable-energy-philippines-2027';
const COUNTRY  = 'Philippines';
const INDUSTRY = 'Renewable Energy';
const YEAR     = 2027;
const PAGES    = 21;
const PRICE    = 39;

// Exec chart — Paper pipeline vs installed reality (GW, 2025). 3-bar preview
// subset of the 4-bar exec chart. Max = RE contracts 154 → pct.
const chartBarsEN = [
  { pct: 5,   label: 'Installed',    value: '7.1' },
  { pct: 43,  label: 'OSW pipeline', value: '66'  },
  { pct: 100, label: 'RE contracts', value: '154' },
];
const chartBarsJA = [
  { pct: 5,   label: '導入済み',   value: '7.1' },
  { pct: 43,  label: '洋上風力PL', value: '66'  },
  { pct: 100, label: 'RE契約',     value: '154' },
];
const chartBarsKO = [
  { pct: 5,   label: '설치',       value: '7.1' },
  { pct: 43,  label: '해상풍력PL', value: '66'  },
  { pct: 100, label: 'RE 계약',    value: '154' },
];

function stripTags(s) {
  return s.replace(/\s*\[[^\]]+\]/g, '').replace(/\s+/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
}

const META = {
  en: {
    title: 'Philippines renewable energy 2027 outlook — the offshore wind pipeline and the grid bottleneck',
    eyebrow: 'PHILIPPINES · RENEWABLE ENERGY · 2027',
    preview: {
      lede: stripTags("By February 2025 the Philippines had awarded more than 1,400 renewable service contracts representing roughly 154 GW of potential capacity, of which 66 GW is offshore wind across 92 service contracts. Set against just ~7.1 GW of renewable capacity actually installed, the gap between paper and steel is the whole story. The binding constraint is no longer ambition or capital — it is transmission. Connection, not allocation, now gates the build."),
      paragraphs: [
        stripTags("The energy department has opened the sector to full foreign ownership and launched Southeast Asia's first offshore wind auction — GEA-5, tendering 3,300 MW for delivery 2028–2030. Yet roughly 30% of committed projects still lack a system impact study, and the grid adds only ~23 GVA of capacity by 2034. A firm grid-connection agreement is now worth more than another service contract."),
        "This report covers demand and the supply gap, the offshore wind pipeline — service contracts, the GEA-5 auction, project economics and the developer field — the grid bottleneck across connection queue, transmission investment and the regulatory frame, and a 2027 outlook with three scenarios and five moves for market participants.",
      ],
      chart: {
        title: 'Paper pipeline vs installed reality',
        subtitle: 'Philippines · GW · 2025',
        bars: chartBarsEN,
      },
    },
    toc: [
      { num: '04', name: 'Executive summary',                            pages: 'PG 04', locked: false },
      { num: '06', name: 'Demand and the supply gap',                    pages: 'PG 06', locked: true  },
      { num: '10', name: 'The offshore wind pipeline',                   pages: 'PG 10', locked: true  },
      { num: '14', name: 'The grid bottleneck',                          pages: 'PG 14', locked: true  },
      { num: '18', name: 'Outlook to 2027 and strategic implications',   pages: 'PG 18', locked: true  },
      { num: '21', name: 'Methodology and sources',                      pages: 'PG 21', locked: true  },
    ],
  },

  ja: {
    title: 'フィリピン再生可能エネルギー 2027年展望 — 洋上風力パイプラインと系統接続の制約',
    eyebrow: 'フィリピン · 再生可能エネルギー · 2027',
    preview: {
      lede: stripTags("2025年2月までにフィリピンは1,400件超の再生可能エネルギー・サービス契約を付与し、潜在容量はおよそ154GWに達した。このうち66GWが92件の契約による洋上風力である。実際に導入済みの再エネ容量はわずか約7.1GW — 紙上の計画と現実の設備との乖離こそが本質である。制約はもはや野心でも資本でもなく、送電網にある。割り当てではなく接続が、今や建設の鍵を握る。"),
      paragraphs: [
        stripTags("エネルギー省はセクターを外資100%出資に開放し、東南アジア初の洋上風力入札GEA-5を開始した。同入札は2028〜2030年の供給に向けて3,300MWを募る。しかし契約済みプロジェクトの約30%は依然としてシステム影響評価を欠き、送電網が2034年までに増強するのは約23GVAにとどまる。確定した系統接続契約は、もう一件のサービス契約よりも価値が高い。"),
        "本レポートは、需要と供給ギャップ、サービス契約・GEA-5入札・プロジェクト経済性・開発事業者を含む洋上風力パイプライン、接続キュー・送電投資・規制枠組みにわたる系統制約、そして3つのシナリオと市場参加者への5つの行動指針を伴う2027年展望を扱う。",
      ],
      chart: {
        title: '紙上のパイプライン対導入済みの現実',
        subtitle: 'フィリピン · GW · 2025',
        bars: chartBarsJA,
      },
    },
    toc: [
      { num: '04', name: 'エグゼクティブサマリー',          pages: 'P 04', locked: false },
      { num: '06', name: '需要と供給ギャップ',              pages: 'P 06', locked: true  },
      { num: '10', name: '洋上風力パイプライン',            pages: 'P 10', locked: true  },
      { num: '14', name: '系統接続の制約',                  pages: 'P 14', locked: true  },
      { num: '18', name: '2027年展望と戦略的示唆',          pages: 'P 18', locked: true  },
      { num: '21', name: '調査手法と出典',                  pages: 'P 21', locked: true  },
    ],
  },

  ko: {
    title: '필리핀 재생에너지 2027년 전망 — 해상풍력 파이프라인과 송전망 병목',
    eyebrow: '필리핀 · 재생에너지 · 2027',
    preview: {
      lede: stripTags("2025년 2월까지 필리핀은 1,400건이 넘는 재생에너지 서비스 계약을 부여했으며, 잠재 용량은 약 154GW에 달한다. 이 가운데 66GW가 92건의 계약을 통한 해상풍력이다. 실제 설치된 재생에너지 용량은 약 7.1GW에 불과하다 — 지면 위 계획과 실제 설비 사이의 격차가 핵심이다. 제약은 더 이상 야심도 자본도 아닌 송전망이다. 할당이 아니라 접속이 이제 건설을 좌우한다."),
      paragraphs: [
        stripTags("에너지부는 이 부문을 외국인 100% 지분 소유에 개방하고 동남아시아 최초의 해상풍력 경매 GEA-5를 시작했다. 이 경매는 2028~2030년 공급을 위해 3,300MW를 모집한다. 그러나 계약된 프로젝트의 약 30%는 여전히 계통영향평가가 없으며, 송전망은 2034년까지 약 23GVA만 증설된다. 확정된 계통 접속 계약은 또 하나의 서비스 계약보다 더 가치가 있다."),
        "본 보고서는 수요와 공급 격차, 서비스 계약·GEA-5 경매·프로젝트 경제성·개발사를 포함한 해상풍력 파이프라인, 접속 대기 현황·송전 투자·규제 체계에 걸친 송전망 병목, 그리고 세 가지 시나리오와 시장 참여자를 위한 다섯 가지 행동을 담은 2027년 전망을 다룬다.",
      ],
      chart: {
        title: '지면 위 파이프라인 대 설치된 현실',
        subtitle: '필리핀 · GW · 2025',
        bars: chartBarsKO,
      },
    },
    toc: [
      { num: '04', name: '경영진 요약',                      pages: 'P 04', locked: false },
      { num: '06', name: '수요와 공급 격차',                 pages: 'P 06', locked: true  },
      { num: '10', name: '해상풍력 파이프라인',              pages: 'P 10', locked: true  },
      { num: '14', name: '송전망 병목',                      pages: 'P 14', locked: true  },
      { num: '18', name: '2027년까지의 전망과 전략적 시사점', pages: 'P 18', locked: true  },
      { num: '21', name: '방법론 및 출처',                   pages: 'P 21', locked: true  },
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
