// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-jp-eldercare. Run:
//   node skills/kira-research-report/scripts/_build_2027-jp-eldercare_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql.
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'eldercare-japan-2027';
const COUNTRY  = 'Japan';
const INDUSTRY = 'Eldercare';
const YEAR     = 2027;
const PAGES    = 18;
const PRICE    = 39;

// JP care workers needed (millions). 2022 2.15, 2026F 2.40, 2040F 2.72.
// Max 2.72 → pct relative.
const chartBars = [
  { pct: 79,  label: '2022',  value: 2.15 },
  { pct: 88,  label: '2026F', value: 2.40 },
  { pct: 100, label: '2040F', value: 2.72 },
];

const META = {
  en: {
    title: 'Japan eldercare 2027: care robotics and home-care subscriptions at the labour cliff',
    eyebrow: 'JAPAN · ELDERCARE · MARKET ANALYSIS',
    preview: {
      lede: "Japan's eldercare market is no longer growing on demand — demand is guaranteed. The USD 91 bn system is now gated by two ceilings: a 570,000-worker shortfall by 2040 and a long-term-care budget the 2027 Reiwa-9 reform is built to contain [MRI 2025]. Both push the same answer — do more care with fewer hands, through institutional care robotics and home-care subscription models.",
      paragraphs: [
        "Demand is locked in; supply is the constraint. The 65-plus cohort reaches 36.6 million in 2025 and peaks near 38.8 million in 2042 [MHLW 2025]. The workforce need climbs to 2.72 million by FY2040 against 2.15 million today [MHLW 9th Plan 2024], with a job-to-applicant ratio already at 3.9x [JILPT 2025]. The binding scarcity is hands, not patients.",
        "The Reiwa-9 (2027) long-term-care revision moves toward a wider 20% copayment and asset-based eligibility [MRI 2025], holding the public envelope flat in real terms. Operators cannot price their way out; they must lift output per caregiver — and care robotics and home-care subscriptions are the two scaled responses, one inside the facility, one in the home.",
      ],
      chart: {
        title: 'The care-labour gap widens to 2040',
        subtitle: 'Japan · care workers, millions',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04',    name: 'Executive summary',                    pages: 'PG 004', locked: false },
      { num: '05',    name: 'Strategic implications',               pages: 'PG 005', locked: true  },
      { num: '06',    name: 'The demand profile',                   pages: 'PG 006', locked: true  },
      { num: '07—08', name: 'Demand drivers & the LTCI envelope',   pages: 'PG 007', locked: true  },
      { num: '09—11', name: 'Two models: robotics & subscription',  pages: 'PG 009', locked: true  },
      { num: '12—14', name: 'Operator & vendor landscape',          pages: 'PG 012', locked: true  },
      { num: '15—16', name: 'AI in the care workflow',              pages: 'PG 015', locked: true  },
      { num: '17',    name: '2027 outlook & scenarios',             pages: 'PG 017', locked: true  },
      { num: '18',    name: 'Methodology & sources',                pages: 'PG 018', locked: true  },
    ],
  },

  ja: {
    title: '日本の介護市場 2027：介護労働力の崖に直面する施設向けロボティクスと在宅ケア定額モデル',
    eyebrow: '日本 · 介護 · マーケット分析',
    preview: {
      lede: '日本の介護市場はもはや需要側の成長を問う段階にありません——需要は保証されています。USD 910億規模の制度はいま2つの上限に律せられます：2040年までの57万人規模の人手不足と、2027年（令和9年）改革が抑制しようとしている介護保険財政枠[MRI 2025]。両者が指し示す答えは同じ——施設向け介護ロボットと在宅ケア定額サービスにより、より少ない人手でより多くのケアを提供することです。',
      paragraphs: [
        '需要は固定、供給が制約要因です。65歳以上人口は2025年に3,660万人に達し、2042年には3,880万人近くでピークを迎えます[MHLW 2025]。一方、必要な介護人材はFY2040までに272万人と推計されるのに対し現在は215万人にとどまり[MHLW 9th Plan 2024]、有効求人倍率はすでに3.9倍に達しています[JILPT 2025]。制約要因は患者数ではなく、人手です。',
        '令和9年（2027年）の介護保険制度改正は、2割負担の適用範囲拡大と資産勘案による利用者負担に向けて動いており[MRI 2025]、公的財政枠を実質横ばいに抑える設計です。事業者は価格転嫁で収益を確保できず、一人ひとりの介護職員の産出量を引き上げるしかありません。介護ロボットと在宅ケア定額サービスが、施設内と在宅という2つの次元でのスケール対応策です。',
      ],
      chart: {
        title: '介護労働力不足の拡大（〜2040年）',
        subtitle: '日本 · 介護職員数・百万人',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04',    name: 'エグゼクティブサマリー',              pages: 'P 004', locked: false },
      { num: '05',    name: '戦略的示唆',                          pages: 'P 005', locked: true  },
      { num: '06',    name: '需要プロファイル',                    pages: 'P 006', locked: true  },
      { num: '07—08', name: '需要ドライバーとLTCI財政枠',          pages: 'P 007', locked: true  },
      { num: '09—11', name: '2つのモデル：ロボティクスと定額制',   pages: 'P 009', locked: true  },
      { num: '12—14', name: '事業者・ベンダーの競合構造',          pages: 'P 012', locked: true  },
      { num: '15—16', name: '介護ワークフローにおけるAI',          pages: 'P 015', locked: true  },
      { num: '17',    name: '2027年展望とシナリオ分析',            pages: 'P 017', locked: true  },
      { num: '18',    name: '調査手法と出典一覧',                  pages: 'P 018', locked: true  },
    ],
  },

  ko: {
    title: '일본 노인돌봄 시장 2027: 인력 절벽에 직면한 시설형 돌봄 로봇공학과 재가돌봄 구독 모델',
    eyebrow: '일본 · 노인돌봄 · 시장 분석',
    preview: {
      lede: '일본 노인돌봄 시장은 더 이상 수요 창출에 의존하지 않습니다 — 수요는 보장되어 있습니다. USD 910억 규모의 시스템은 이제 두 가지 상한에 의해 제약됩니다: 2040년까지 57만 명의 인력 부족과 2027년 개혁이 억제하도록 설계된 장기요양 예산[MRI 2025]. 두 제약 모두 같은 해답을 가리킵니다: 시설형 돌봄 로봇공학과 재가돌봄 구독 모델을 통해 더 적은 인력으로 더 많은 돌봄을 제공하는 것.',
      paragraphs: [
        '수요는 확정되어 있고, 제약은 공급 측에 있습니다. 65세 이상 인구는 2025년 3,660만 명에 달하고 2042년경 3,880만 명으로 정점을 맞습니다[MHLW 2025]. 한편 필요 인력은 현재 215만 명에서 FY2040까지 272만 명으로 증가해야 하며[MHLW 9th Plan 2024], 구인배율은 이미 3.9배에 달합니다[JILPT 2025]. 결정적 희소 자원은 환자가 아니라 인력입니다.',
        '레이와 9년(2027) 장기요양보험 개정은 20% 본인부담 확대 및 자산 기반 수급 자격 도입으로 나아가며[MRI 2025], 공공 재정 규모를 실질적으로 동결합니다. 사업자는 요금 인상으로 돌파구를 찾을 수 없고, 요양사 1인당 산출을 높여야 합니다. 돌봄 로봇공학과 재가돌봄 구독이 시설 내부와 가정이라는 두 차원에서 규모 있는 대응책입니다.',
      ],
      chart: {
        title: '2040년까지 확대되는 돌봄인력 격차',
        subtitle: '일본 · 돌봄 인력, 백만 명',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04',    name: '경영진 요약',                       pages: 'P 004', locked: false },
      { num: '05',    name: '전략적 시사점',                     pages: 'P 005', locked: true  },
      { num: '06',    name: '수요 프로파일',                     pages: 'P 006', locked: true  },
      { num: '07—08', name: '수요 동인 & 장기요양보험 재정 한계', pages: 'P 007', locked: true  },
      { num: '09—11', name: '두 가지 모델: 로봇공학 & 구독',      pages: 'P 009', locked: true  },
      { num: '12—14', name: '사업자 & 벤더 구도',                pages: 'P 012', locked: true  },
      { num: '15—16', name: '돌봄 업무 흐름에서의 AI',           pages: 'P 015', locked: true  },
      { num: '17',    name: '2027년 전망 & 시나리오',            pages: 'P 017', locked: true  },
      { num: '18',    name: '방법론 & 출처',                     pages: 'P 018', locked: true  },
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
