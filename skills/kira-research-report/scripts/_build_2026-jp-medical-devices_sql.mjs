// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-jp-medical-devices. Run:
//   node skills/kira-research-report/scripts/_build_2026-jp-medical-devices_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql.
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'medical-devices-japan-2026';
const COUNTRY  = 'Japan';
const INDUSTRY = 'Medical Devices';
const YEAR     = 2026;
const PAGES    = 14;
const PRICE    = 39;

// JP medical device market sizing (USD bn). 2021=36, 2025E=42, 2030F=62. Max 62 → pct relative.
const chartBars = [
  { pct: 58,  label: '2021',  value: 36 },
  { pct: 68,  label: '2025E', value: 42 },
  { pct: 100, label: '2030F', value: 62 },
];

const META = {
  en: {
    title: 'Japan medical devices 2026: aging-cohort demand and the FY2026 reimbursement reform',
    eyebrow: 'JAPAN · MEDICAL DEVICES · MARKET ANALYSIS',
    preview: {
      lede: "Japan's medical devices market reached roughly JPY 6.0 trn (USD ~40 bn) in 2023 [MHLW 2024] — the world's third-largest — with demand structurally underwritten by the oldest population on earth: 36.3 million people aged 65+, 29.3% of the total [Govt stats 2024]. The FY2026 reimbursement reform pairs a +3.09% fee-body increase with the first-ever reverse-margin correction, redrawing device economics just as the aging cohort enters its highest-utilisation decade [Chuikyo 2025].",
      paragraphs: [
        "This report covers the macro and reimbursement context, market sizing and segment economics (imaging, cardiovascular, orthopedic, IVD), the aging-cohort demand structure, the FY2026 reimbursement reform and its reverse-margin correction, the 2021–2027 reimbursement policy timeline, device lag and the internal-external price gap, the competitive landscape, SaMD and AI devices, and a five-year forecast to 2030F with five strategic action vectors.",
        "Demand is demographically non-discretionary. The old-age dependency ratio is projected to climb from 39% in 2020 to 71% by 2040 [Govt stats 2024], anchoring the highest-utilisation device categories independent of the economic cycle. Import dependency reached 55% in 2023, with imports of JPY 3.32 trn up 13.8% YoY [Kira estimates] — a structural exposure the reform's supply-security pivot directly addresses.",
      ],
      chart: {
        title: 'Japan medical device market sizing',
        subtitle: 'USD bn · 2021 actual · 2025 estimate · 2030 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',            pages: 'PG 03', locked: false },
      { num: '02', name: 'Strategic implications',       pages: 'PG 04', locked: true  },
      { num: '03', name: 'Market sizing and segments',   pages: 'PG 05', locked: true  },
      { num: '04', name: 'Segment economics',            pages: 'PG 06', locked: true  },
      { num: '05', name: 'Aging-cohort demand structure', pages: 'PG 07', locked: true },
      { num: '06', name: 'FY2026 reimbursement reform',  pages: 'PG 08', locked: true  },
      { num: '07', name: 'Reimbursement policy timeline', pages: 'PG 09', locked: true },
      { num: '08', name: 'Device lag and price gap',     pages: 'PG 10', locked: true  },
      { num: '09', name: 'Competitive landscape',        pages: 'PG 11', locked: true  },
      { num: '10', name: 'SaMD and AI devices',          pages: 'PG 12', locked: true  },
      { num: '11', name: '5-year outlook and forecast',  pages: 'PG 13', locked: true  },
      { num: '12', name: 'Methodology and sources',      pages: 'PG 14', locked: true  },
    ],
  },

  ja: {
    title: '日本医療機器 2026：高齢コホート需要とFY2026診療報酬改定',
    eyebrow: '日本 · 医療機器 · マーケット分析',
    preview: {
      lede: '日本の医療機器市場は2023年に約JPY 6.0兆（USD 約400億）に達し[MHLW 2024]、世界第3位の規模を擁します。需要は世界で最も高齢化が進んだ人口——65歳以上3,630万人、総人口の29.3%[Govt stats 2024]——により構造的に下支えされています。FY2026診療報酬改定は本体部分+3.09%の引き上げと史上初の逆ざや補正を組み合わせ、高齢コホートが最高需要の10年に入るまさにそのタイミングで機器経済を塗り替えます[Chuikyo 2025]。',
      paragraphs: [
        '本レポートはマクロ・診療報酬環境、市場規模とセグメント経済（画像診断・循環器・整形外科・IVD）、高齢コホート需要構造、FY2026診療報酬改定と逆ざや補正、2021〜2027年の診療報酬政策タイムライン、デバイスラグと内外価格差、競争環境、SaMDとAI機器、そして2030年Fまでの5年間予測と5つの戦略的アクションベクトルを扱います。',
        '需要は人口動態的に非裁量的です。老年従属人口指数は2020年の39%から2040年には71%へ上昇する見通しで[Govt stats 2024]、経済サイクルに依存せず最高需要の機器カテゴリを下支えします。輸入依存度は2023年に55%へ達し、輸入額はJPY 3.32兆・前年比+13.8%[Kira estimates]——改定の供給安全保障シフトが直接対処する構造的エクスポージャーです。',
      ],
      chart: {
        title: '日本医療機器市場規模',
        subtitle: 'USD bn · 2021実績 · 2025推計 · 2030予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',        pages: 'P 03', locked: false },
      { num: '02', name: '戦略的示唆',                    pages: 'P 04', locked: true  },
      { num: '03', name: '市場規模とセグメント',          pages: 'P 05', locked: true  },
      { num: '04', name: 'セグメント経済',                pages: 'P 06', locked: true  },
      { num: '05', name: '高齢コホート需要構造',          pages: 'P 07', locked: true  },
      { num: '06', name: 'FY2026診療報酬改定',            pages: 'P 08', locked: true  },
      { num: '07', name: '診療報酬政策タイムライン',      pages: 'P 09', locked: true  },
      { num: '08', name: 'デバイスラグと価格格差',        pages: 'P 10', locked: true  },
      { num: '09', name: '競争環境',                      pages: 'P 11', locked: true  },
      { num: '10', name: 'SaMDとAI機器',                  pages: 'P 12', locked: true  },
      { num: '11', name: '5年間の見通しと予測',           pages: 'P 13', locked: true  },
      { num: '12', name: '調査方法と情報源',              pages: 'P 14', locked: true  },
    ],
  },

  ko: {
    title: '일본 의료기기 2026: 고령 코호트 수요와 FY2026 수가 개혁',
    eyebrow: '일본 · 의료기기 · 시장 분석',
    preview: {
      lede: '일본 의료기기 시장은 2023년 약 JPY 6.0조(USD 약 400억)에 도달하며[MHLW 2024] 세계 3위 규모를 형성합니다. 수요는 지구상에서 가장 고령화된 인구 — 65세 이상 3,630만 명, 전체의 29.3%[Govt stats 2024] — 에 의해 구조적으로 뒷받침됩니다. FY2026 수가 개혁은 +3.09% 수가 본체 인상과 사상 첫 역마진 시정을 결합해, 고령 코호트가 최고 이용의 10년에 진입하는 바로 그 시점에 기기 경제성을 재편합니다[Chuikyo 2025].',
      paragraphs: [
        '본 보고서는 거시·수가 환경, 시장 규모와 세그먼트 경제성(영상 진단·심혈관·정형외과·IVD), 고령 코호트 수요 구조, FY2026 수가 개혁과 역마진 시정, 2021–2027년 수가 정책 타임라인, 기기 도입 지연과 내외 가격 격차, 경쟁 구도, SaMD 및 AI 기기, 그리고 2030F까지의 5개년 전망과 다섯 가지 전략적 실행 방향을 다룹니다.',
        '수요는 인구구조적으로 비재량적입니다. 노년 부양비는 2020년 39%에서 2040년 71%까지 상승할 전망으로[Govt stats 2024], 경기 사이클과 무관하게 고이용 기기 범주를 떠받칩니다. 수입 의존도는 2023년 55%에 달했고 수입액은 JPY 3.32조·전년 대비 +13.8%[Kira estimates] — 개혁의 공급 안보 전환이 직접 대응하는 구조적 노출입니다.',
      ],
      chart: {
        title: '일본 의료기기 시장 규모',
        subtitle: 'USD bn · 2021 실적 · 2025 추정 · 2030 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',                   pages: 'P 03', locked: false },
      { num: '02', name: '전략적 시사점',                 pages: 'P 04', locked: true  },
      { num: '03', name: '시장 규모 및 세그먼트',         pages: 'P 05', locked: true  },
      { num: '04', name: '세그먼트 경제성',               pages: 'P 06', locked: true  },
      { num: '05', name: '고령 코호트 수요 구조',         pages: 'P 07', locked: true  },
      { num: '06', name: 'FY2026 수가 개혁',              pages: 'P 08', locked: true  },
      { num: '07', name: '수가 정책 타임라인',            pages: 'P 09', locked: true  },
      { num: '08', name: '기기 도입 지연 및 가격 격차',   pages: 'P 10', locked: true  },
      { num: '09', name: '경쟁 구도',                     pages: 'P 11', locked: true  },
      { num: '10', name: 'SaMD 및 AI 기기',               pages: 'P 12', locked: true  },
      { num: '11', name: '5개년 전망 및 예측',            pages: 'P 13', locked: true  },
      { num: '12', name: '방법론 및 출처',                pages: 'P 14', locked: true  },
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
