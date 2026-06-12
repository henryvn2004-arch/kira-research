// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-kr-eldercare. Run:
//   node skills/kira-research-report/scripts/_build_2027-kr-eldercare_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql.
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'eldercare-south-korea-2027';
const COUNTRY  = 'South Korea';
const INDUSTRY = 'Eldercare';
const YEAR     = 2027;
const PAGES    = 14;
const PRICE    = 39;

// Korea LTC benefit spend (₩ trillion). 2019 7.7, 2023 13.2, 2024 14.8. Max 14.8 → pct.
const chartBars = [
  { pct: 52,  label: '2019', value: '7.7'  },
  { pct: 89,  label: '2023', value: '13.2' },
  { pct: 100, label: '2024', value: '14.8' },
];

const META = {
  en: {
    title: "Korea's silver economy meets a funding wall",
    eyebrow: 'SOUTH KOREA · ELDERCARE · MARKET ANALYSIS',
    preview: {
      lede: "Korea's eldercare demand is locked in by demographics — the country turned super-aged in 2024, and the 65-plus cohort reached 10.8 million in 2025, 21.2% of the population [Statistics Korea 2025]. Long-term care benefit spend has nearly doubled in five years to ₩14.8 trillion [NHIS 2025], and the silver economy heads toward ₩168 tn (≈ USD 128 bn) by 2030 [KHIDI 2024]. The 2027 question is not size but who pays and who staffs it: the LTCI fund slides toward deficit and the sector is short ~100,000 workers by 2027 [MOHW 2025].",
      paragraphs: [
        "Demand is guaranteed; the binding scarcities are the fund and the workforce. The 65-plus cohort reached 10.8 million in 2025 — 21.2% of the population — and rises toward 30.9% by 2036 [Statistics Korea 2025]. Long-term care benefit spend has nearly doubled in five years to ₩14.8 trillion [NHIS 2025], while the LTCI fund is projected to run a ₩3.8 trillion deficit by 2030 [NABO 2025].",
        "With reserves thinning, the policy lever shifts from expansion to premium increases, integrated home-and-medical care, and care-tech subsidy [MOHW 2025]. Operators cannot price their way out of a nationally set fee schedule; they must lift output per caregiver. Care robotics and digital monitoring are the scaled responses — and a private silver-economy layer is forming beside the public system.",
      ],
      chart: {
        title: 'LTC spend has nearly doubled in five years',
        subtitle: 'Korea · ₩ trillion · 2019-2024',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'Executive summary',              pages: 'PG 04', locked: false },
      { num: '05', name: 'Strategic implications',         pages: 'PG 05', locked: true  },
      { num: '06', name: 'The demand profile',             pages: 'PG 06', locked: true  },
      { num: '07', name: 'LTCI spend & the 2027 reform',   pages: 'PG 07', locked: true  },
      { num: '09', name: 'Capacity, workforce & operators',pages: 'PG 09', locked: true  },
      { num: '12', name: 'Digital health & care robotics', pages: 'PG 12', locked: true  },
      { num: '13', name: '2027 outlook & scenarios',       pages: 'PG 13', locked: true  },
      { num: '14', name: 'Methodology & sources',          pages: 'PG 14', locked: true  },
    ],
  },

  ja: {
    title: '韓国のシルバーエコノミーが財政の壁に衝突する',
    eyebrow: '韓国 · 高齢者ケア · マーケット分析',
    preview: {
      lede: '韓国の介護需要は人口構造により固定されています — 同国は2024年に超高齢社会へ移行し、65歳以上人口は2025年に1,080万人、総人口の21.2%に達しました[Statistics Korea 2025]。介護給付費支出は5年で₩14.8兆にほぼ倍増し[NHIS 2025]、シルバーエコノミーは2030年に₩168兆（≈ USD 1,280億）へ向かいます[KHIDI 2024]。2027年の論点は規模ではなく、誰が負担し誰が支えるか——介護保険基金は赤字に陥り、2027年までに約10万人の人材不足が生じます[MOHW 2025]。',
      paragraphs: [
        '65歳以上の人口は2025年に1,080万人（総人口の21.2%）に達し[Statistics Korea 2025]、2036年には30.9%へと上昇する見通しです[Statistics Korea 2025]。介護給付費支出は5年で₩14.8兆にほぼ倍増し[NHIS 2025]、介護保険基金は2030年までに₩3.8兆の赤字に陥ると予測されています[NABO 2025]。需要は確実——拘束的な不足は基金と労働力です。',
        '準備金が減少するなか、政策の焦点は拡充から保険料引き上げ、在宅医療統合、ケアテック補助へと移行します[MOHW 2025]。国が設定する報酬体系のもと、事業者は価格転嫁で対応できず、介護者1人当たりの生産性向上を迫られます。ケアロボティクスとデジタルモニタリングがその主要な対応策であり、公的制度の隣に民間シルバーエコノミー層が形成されつつあります。',
      ],
      chart: {
        title: '介護給付費支出は5年で約2倍に',
        subtitle: '韓国 · ₩兆 · 2019-2024',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: 'エグゼクティブサマリー',            pages: 'P 04', locked: false },
      { num: '05', name: '戦略的示唆',                        pages: 'P 05', locked: true  },
      { num: '06', name: '需要プロファイル',                  pages: 'P 06', locked: true  },
      { num: '07', name: '介護保険支出と2027年改革',          pages: 'P 07', locked: true  },
      { num: '09', name: '供給能力・人材・事業者',            pages: 'P 09', locked: true  },
      { num: '12', name: 'デジタルヘルスとケアロボティクス',  pages: 'P 12', locked: true  },
      { num: '13', name: '2027年展望とシナリオ',              pages: 'P 13', locked: true  },
      { num: '14', name: '調査方法と出典',                    pages: 'P 14', locked: true  },
    ],
  },

  ko: {
    title: '한국의 실버 경제, 재정 한계에 직면하다',
    eyebrow: '대한민국 · 고령자 케어 · 시장 분석',
    preview: {
      lede: '한국의 요양 수요는 인구 구조에 의해 고정되어 있습니다 — 한국은 2024년 초고령 사회에 진입했고, 65세 이상 인구는 2025년 1,080만 명으로 전체 인구의 21.2%에 달했습니다[Statistics Korea 2025]. 장기 요양 급여 지출은 5년간 거의 두 배로 증가해 ₩14.8조에 이르렀고[NHIS 2025], 실버 경제는 2030년까지 ₩168조(≈ USD 128 bn)를 향합니다[KHIDI 2024]. 2027년의 핵심은 규모가 아니라 누가 부담하고 누가 인력을 공급하느냐입니다: 장기 요양 보험 기금은 적자로 향하고 2027년까지 약 10만 명의 인력이 부족합니다[MOHW 2025].',
      paragraphs: [
        '65세 이상 인구는 2025년 1,080만 명으로 전체 인구의 21.2%에 달했으며[Statistics Korea 2025], 2036년까지 30.9%[Statistics Korea 2025]로 상승합니다. 장기 요양 급여 지출은 5년간 거의 두 배로 증가해 ₩14.8조에 이르렀고[NHIS 2025], 장기 요양 보험 기금은 2030년까지 ₩3.8조 적자를 기록할 것으로 전망됩니다[NABO 2025]. 수요는 보장되어 있으며, 구조적 희소 요인은 기금과 인력입니다.',
        '적립금이 줄어듦에 따라 정책 레버는 확대에서 보험료 인상, 의료-요양 통합 재가서비스, 케어 테크 보조금으로 이동하고 있습니다[MOHW 2025]. 사업자는 국가가 정한 수가 체계에서 가격을 올릴 수 없으므로 요양보호사 1인당 서비스 산출량을 높여야 합니다. 케어 로보틱스와 디지털 모니터링이 규모 있는 대응책이며, 공공 시스템 옆에 민간 실버 경제 계층이 형성되고 있습니다.',
      ],
      chart: {
        title: '장기 요양 지출, 5년간 거의 두 배로 증가',
        subtitle: '한국 · ₩ 조 · 2019-2024',
        bars: chartBars,
      },
    },
    toc: [
      { num: '04', name: '경영진 요약',                    pages: 'P 04', locked: false },
      { num: '05', name: '전략적 시사점',                  pages: 'P 05', locked: true  },
      { num: '06', name: '수요 프로파일',                  pages: 'P 06', locked: true  },
      { num: '07', name: '장기 요양 지출 & 2027년 개혁',   pages: 'P 07', locked: true  },
      { num: '09', name: '공급 용량, 인력 & 사업자',       pages: 'P 09', locked: true  },
      { num: '12', name: '디지털 헬스 & 케어 로보틱스',    pages: 'P 12', locked: true  },
      { num: '13', name: '2027년 전망 & 시나리오',         pages: 'P 13', locked: true  },
      { num: '14', name: '방법론 & 출처',                  pages: 'P 14', locked: true  },
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
