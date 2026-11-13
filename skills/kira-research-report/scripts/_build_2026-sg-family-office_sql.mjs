// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-sg-family-office (Singapore family office 2026).
// Modeled on _build_2026-sg-legal-services_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_2026-sg-family-office_sql.mjs > /tmp/insert_sg_fo.sql`
// then feed to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL
// CTE from new_report.id — NOT a GitHub raw URL.

const SLUG     = 'family-office-singapore-2026';
const COUNTRY  = 'Singapore';
const INDUSTRY = 'Family Office';
const YEAR     = 2026;
const PAGES    = 14;
const PRICE    = 39;

// Exec chart — SG single-family office count (MAS S13O/13U incentive base). Max 2350 (2026E).
const chartBars = [
  { pct: 30,  label: '2020',  value: 700 },
  { pct: 85,  label: '2025',  value: 2000 },
  { pct: 100, label: '2026E', value: 2350 },
];

const META = {
  en: {
    title: 'Singapore family office 2026',
    eyebrow: 'SINGAPORE · FAMILY OFFICE · MARKET ANALYSIS',
    preview: {
      lede: "Singapore's single-family office base passed 2,000 in 2025 [MAS SFO 2025], roughly tripling since 2020, against a managed-asset pool of SGD 6.07 trn [MAS AMS 2024] — up 12% on a SGD 290 bn net inflow. With 77% of AUM sourced offshore, the franchise runs on imported capital. The strategic question is no longer how much, but whose capital sets the next leg — and the Japanese and Korean high-net-worth wedge is the fastest-growing answer.",
      paragraphs: [
        "Singapore's single-family office base passed 2,000 in 2025 [MAS SFO 2025], roughly tripling since 2020, against a managed-asset pool of SGD 6.07 trn [MAS AMS 2024] — up 12% in a year on a SGD 290 bn net inflow. With 77% of AUM sourced offshore [MAS AMS 2024], the franchise runs on imported capital. The strategic question is no longer how much, but whose capital sets the next leg.",
        "The Variable Capital Company framework, live since January 2020, now anchors 1,200+ vehicles and 2,695 sub-funds [MAS AMS 2024]. Private equity and venture is the dominant VCC strategy at 40%, with external-asset-manager and multi-family-office mandates a further 22% [MAS AMS 2024]. For a North Asian principal, the VCC compresses launch to weeks and clears S13O/13U eligibility in one structure.",
      ],
      chart: {
        title: 'Singapore single-family office count',
        subtitle: 'Singapore · Offices · 2020–2026E',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary — formation past inflection', pages: 'PG 04', locked: false },
      { num: '02', name: 'Strategic implications for market participants',  pages: 'PG 05', locked: true  },
      { num: '03', name: 'Family office scale and AUM trajectory',          pages: 'PG 07', locked: true  },
      { num: '04', name: 'VCC structure — the default chassis',             pages: 'PG 08', locked: true  },
      { num: '05', name: 'Japan and Korea: the North Asian capital wedge',  pages: 'PG 10', locked: true  },
      { num: '06', name: 'Regulatory regime — tax, AML, source of wealth',  pages: 'PG 11', locked: true  },
      { num: '07', name: 'Singapore vs Hong Kong: the structural contest',  pages: 'PG 12', locked: true  },
      { num: '08', name: 'Five-year outlook and risk scenarios',           pages: 'PG 13', locked: true  },
      { num: '09', name: 'Source key and disclosures',                     pages: 'PG 14', locked: true  },
    ],
  },

  ja: {
    title: 'シンガポール ファミリーオフィス 2026',
    eyebrow: 'シンガポール · ファミリーオフィス · マーケット分析',
    preview: {
      lede: 'シンガポールのシングルファミリーオフィス基盤は2025年に2,000件を突破し[MAS SFO 2025]、2020年比で約3倍に達しました。運用資産プールはSGD 6.07兆[MAS AMS 2024]、SGD 2,900億の純流入を受けて前年比12%増。AUMの77%がオフショア起源であり、このフランチャイズは輸入資本で成り立っています。戦略的問いは「いくら」ではなく「誰の資本が次の局面を担うか」——その最速の答えが日本・韓国の富裕層という楔です。',
      paragraphs: [
        'シンガポールのシングルファミリーオフィス基盤は2025年に2,000件を突破し[MAS SFO 2025]、2020年比で約3倍に達した。運用資産プールはSGD 6.07兆[MAS AMS 2024]と、SGD 2,900億の純流入を受けて前年比12%増。AUMの77%がオフショア起源である[MAS AMS 2024]以上、このフランチャイズは輸入資本で成り立っている。戦略的問いは「いくら」ではなく、「誰の資本が次の局面を担うか」に移っています。',
        '2020年1月に施行されたVCC（変動資本会社）枠組みは、現在1,200超のビークルと2,695本のサブファンドを抱える[MAS AMS 2024]。主要戦略はPE・VCで40%を占め、外部資産運用・マルチファミリーオフィスが22%を加える[MAS AMS 2024]。北東アジア系委託者にとってVCCは、設立を数週間に圧縮しS13O/13U適格性を一構造内で確保できる手段です。',
      ],
      chart: {
        title: 'シンガポール シングルファミリーオフィス件数',
        subtitle: 'シンガポール · 件数 · 2020–2026E',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー — 転換点を超えた形成局面', pages: 'P 04', locked: false },
      { num: '02', name: '市場参加者に向けた5つの戦略的示唆',             pages: 'P 05', locked: true  },
      { num: '03', name: 'ファミリーオフィスの規模とAUM動向',            pages: 'P 07', locked: true  },
      { num: '04', name: 'VCC構造 — 標準的な組成基盤',                   pages: 'P 08', locked: true  },
      { num: '05', name: '日本・韓国：北東アジア資本の楔',               pages: 'P 10', locked: true  },
      { num: '06', name: '規制制度 — 税制・AML・財産形成証明',           pages: 'P 11', locked: true  },
      { num: '07', name: 'シンガポール対香港：構造的競争の構図',         pages: 'P 12', locked: true  },
      { num: '08', name: '5年間の見通しとリスクシナリオ',               pages: 'P 13', locked: true  },
      { num: '09', name: '出典凡例および開示事項',                       pages: 'P 14', locked: true  },
    ],
  },

  ko: {
    title: '싱가포르 패밀리 오피스 2026',
    eyebrow: '싱가포르 · 패밀리 오피스 · 시장 분석',
    preview: {
      lede: '싱가포르 단독 패밀리 오피스 기반은 2025년 2,000개를 돌파했으며[MAS SFO 2025], 2020년 대비 약 3배 성장했습니다. 운용자산 규모는 SGD 6.07조[MAS AMS 2024]로 SGD 2,900억의 순유입에 힘입어 12% 증가했습니다. 운용자산의 77%가 해외에서 유입되어 이 플랫폼은 수입 자본에 의존합니다. 전략적 쟁점은 더 이상 규모가 아니라 다음 국면을 이끌 자본의 출처이며, 가장 빠르게 성장하는 답은 일본·한국 고액자산가 유입입니다.',
      paragraphs: [
        '싱가포르 단독 패밀리 오피스 기반은 2025년 2,000개를 돌파했으며[MAS SFO 2025], 2020년 대비 약 3배 성장했습니다. 운용자산 규모는 SGD 6.07조[MAS AMS 2024]로 연간 SGD 2,900억의 순유입에 힘입어 12% 증가했습니다. 운용자산의 77%가 해외에서 유입되는 구조로[MAS AMS 2024], 이 플랫폼은 수입 자본에 의존합니다. 전략적 쟁점은 더 이상 규모가 아니라 다음 국면을 이끌 자본의 출처입니다.',
        '2020년 1월 도입된 변동자본회사(VCC) 체계는 현재 1,200개 이상의 비히클과 2,695개 서브펀드를 확보했습니다[MAS AMS 2024]. 사모주식·벤처가 40%로 지배적 전략이며, 외부자산운용사·멀티패밀리오피스 위임이 추가로 22%를 차지합니다[MAS AMS 2024]. 동아시아 설립자에게 VCC는 설립 기간을 수 주로 단축하고 하나의 구조 안에서 S13O/13U 자격 요건을 충족합니다.',
      ],
      chart: {
        title: '싱가포르 단독 패밀리 오피스 수',
        subtitle: '싱가포르 · 오피스 수 · 2020–2026E',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약 — 변곡점을 넘어선 형성',        pages: 'P 04', locked: false },
      { num: '02', name: '시장 참여자를 위한 5가지 전략적 시사점',     pages: 'P 05', locked: true  },
      { num: '03', name: '패밀리 오피스 규모 및 운용자산 궤적',        pages: 'P 07', locked: true  },
      { num: '04', name: 'VCC 구조 — 표준 플랫폼',                     pages: 'P 08', locked: true  },
      { num: '05', name: '일본·한국: 동아시아 자본 유입',             pages: 'P 10', locked: true  },
      { num: '06', name: '규제 체계 — 세제, AML, 자금 출처',          pages: 'P 11', locked: true  },
      { num: '07', name: '싱가포르 vs 홍콩: 구조적 경쟁',             pages: 'P 12', locked: true  },
      { num: '08', name: '5개년 전망 및 리스크 시나리오',             pages: 'P 13', locked: true  },
      { num: '09', name: '출처 범례 및 공시',                         pages: 'P 14', locked: true  },
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
