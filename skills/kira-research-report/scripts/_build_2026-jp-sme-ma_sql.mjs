// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-jp-sme-ma. Run via Supabase MCP execute_sql.
// pdf_url emits a STORAGE PATH computed inside the SQL CTE from new_report.id.

const SLUG     = 'japan-sme-ma-2026';
const COUNTRY  = 'Japan';
const INDUSTRY = 'M&A';
const YEAR     = 2026;
const PAGES    = 15;
const PRICE    = 39;

// Exec chart (page 004): "Succession-driven M&A deal count" — deals/yr.
// 3 representative points from the report SVG: 2020=620, 2025=1,028, 2030F=1,550.
// Max 1,550 → pct relative.
const chartBars = {
  en: [
    { pct: 40,  label: '2020',  value: '620' },
    { pct: 66,  label: '2025',  value: '1,028' },
    { pct: 100, label: '2030F', value: '1,550' },
  ],
  ja: [
    { pct: 40,  label: '2020',  value: '620' },
    { pct: 66,  label: '2025',  value: '1,028' },
    { pct: 100, label: '2030F', value: '1,550' },
  ],
  ko: [
    { pct: 40,  label: '2020',  value: '620' },
    { pct: 66,  label: '2025',  value: '1,028' },
    { pct: 100, label: '2030F', value: '1,550' },
  ],
};

const META = {
  en: {
    title: 'Japan SME M&A 2026: succession-driven deal pipeline & the PE rollup playbook',
    eyebrow: 'JAPAN · SME M&A · MARKET ANALYSIS',
    preview: {
      lede: "Succession-driven M&A reached an all-time high of 1,028 deals in 2025, +11.6% year on year and 20.1% of all Japanese M&A, while buyout capital surpassed JPY 3 trn for a fourth straight year. The structural seller — an aging owner with no heir — meets an unusually deep pool of domestic and foreign acquirers, repricing how Japan's smaller companies change hands.",
      paragraphs: [
        "This report covers the succession-driven deal pipeline (deal counts, succession share, trajectory), owner demographics and the successor-absence cliff, record private-equity and buyout capital, the M&A intermediary and matching infrastructure, the PE rollup playbook, government policy and guardrails, and a 5-year outlook to 2030.",
        "The seller is demographic, not cyclical: the peak owner age has risen to roughly 66–67 years, and about 1.27 million owners aged 70 or older — a third of all firms — lack a successor by 2025. More than half of the SMEs that closed in 2023 were profitable — a supply of viable assets created by demography, not distress, that does not turn with the economic cycle.",
      ],
      chart: {
        title: 'Succession-driven M&A deal count',
        subtitle: 'Japan · deals/yr · 2020–2030F',
        bars: chartBars.en,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',                     pages: 'PG 004', locked: false },
      { num: '02', name: 'Strategic implications',                pages: 'PG 005', locked: true  },
      { num: '03', name: 'Succession-driven deal pipeline',       pages: 'PG 006', locked: true  },
      { num: '04', name: 'Owner demographics & the cliff',        pages: 'PG 007', locked: true  },
      { num: '05', name: 'Private-equity & buyout capital',       pages: 'PG 008', locked: true  },
      { num: '06', name: 'Intermediary & matching infrastructure', pages: 'PG 010', locked: true },
      { num: '07', name: 'The PE rollup playbook',                pages: 'PG 011', locked: true  },
      { num: '08', name: 'Policy, subsidy & guardrails',          pages: 'PG 013', locked: true  },
      { num: '09', name: '5-year outlook & forecast',             pages: 'PG 014', locked: true  },
      { num: '10', name: 'Methodology and sources',               pages: 'PG 015', locked: true  },
    ],
  },

  ja: {
    title: '日本の中小企業M&A 2026:事業承継主導の案件パイプラインとPEロールアップ戦略',
    eyebrow: '日本 · 中小企業M&A · マーケット分析',
    preview: {
      lede: '事業承継型M&Aは2025年に過去最高の1,028件、前年比+11.6%・日本全体のM&Aの20.1%に達し、バイアウト資本は4年連続でJPY 3兆超を記録しました。後継者不在の高齢オーナーという構造的な売主が、国内外の異例に厚い買手層と相対し、中小企業の所有権移転の価格構造を塗り替えています。',
      paragraphs: [
        '本レポートは事業承継主導の案件パイプライン(件数・承継シェア・推移)、オーナーの人口動態と後継者不在の崖、過去最高水準のプライベートエクイティ・バイアウト資本、M&A仲介・マッチング基盤、PEロールアップ戦略、政府の政策とガードレール、そして2030年までの5年間の展望を扱います。',
        '売主は景気循環ではなく人口動態によって生まれます。経営者の最頻年齢は66〜67歳まで上昇し、2025年時点で70歳以上の経営者約127万人——全事業者の3分の1——が後継者不在です。2023年に廃業した中小企業の半数超は黒字であり、これは経営不振ではなく人口動態が生み出す優良資産の供給で、景気循環では反転しません。',
      ],
      chart: {
        title: '事業承継型M&A件数の推移',
        subtitle: '日本 · 件数/年 · 2020–2030F',
        bars: chartBars.ja,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',           pages: 'P 004', locked: false },
      { num: '02', name: '戦略的示唆',                       pages: 'P 005', locked: true  },
      { num: '03', name: '事業承継主導の案件パイプライン',    pages: 'P 006', locked: true  },
      { num: '04', name: 'オーナーの人口動態と崖',           pages: 'P 007', locked: true  },
      { num: '05', name: 'プライベートエクイティ & バイアウト資本', pages: 'P 008', locked: true },
      { num: '06', name: '仲介 & マッチング基盤',            pages: 'P 010', locked: true  },
      { num: '07', name: 'PEロールアップ戦略',               pages: 'P 011', locked: true  },
      { num: '08', name: '政策・補助金 & ガードレール',       pages: 'P 013', locked: true  },
      { num: '09', name: '5年間の展望 & 予測',               pages: 'P 014', locked: true  },
      { num: '10', name: '調査手法と出典',                   pages: 'P 015', locked: true  },
    ],
  },

  ko: {
    title: '일본 중소기업 M&A 2026: 승계 기반 딜 파이프라인과 PE 롤업 플레이북',
    eyebrow: '일본 · 중소기업 M&A · 시장 분석',
    preview: {
      lede: '승계 기반 M&A는 2025년 역대 최고치인 1,028건 — 전년 대비 +11.6%, 일본 전체 M&A의 20.1%에 달했으며, 바이아웃 자본은 4년 연속 JPY 3조를 상회했습니다. 후계자 없는 고령 오너라는 구조적 매도자가, 유례없이 풍부한 국내외 인수 자본과 마주하면서 일본 중소기업 거래 방식의 가격 재편이 진행 중입니다.',
      paragraphs: [
        '본 보고서는 승계 기반 딜 파이프라인(딜 건수·승계 비중·추이), 오너 인구구조와 후계자 부재 절벽, 기록적인 사모펀드·바이아웃 자본, M&A 중개·매칭 인프라, PE 롤업 플레이북, 정부 정책과 가드레일, 그리고 2030년까지의 5년 전망을 다룹니다.',
        '매도자는 경기 순환이 아닌 인구구조에서 나옵니다. 사업주 최빈 연령은 66~67세까지 상승했고, 2025년 기준 70세 이상 오너 약 127만 명 — 전체 기업의 1/3 — 이 후계자가 없습니다. 2023년 폐업한 중소기업의 절반 이상이 흑자였으며, 이는 경기 부진이 아닌 인구구조가 만들어낸 우량 자산의 공급으로 경기 사이클에 따라 반전하지 않습니다.',
      ],
      chart: {
        title: '승계 기반 M&A 딜 건수',
        subtitle: '일본 · 건수/년 · 2020–2030F',
        bars: chartBars.ko,
      },
    },
    toc: [
      { num: '01', name: '핵심 요약',                    pages: 'P 004', locked: false },
      { num: '02', name: '전략적 시사점',                pages: 'P 005', locked: true  },
      { num: '03', name: '승계 기반 딜 파이프라인',      pages: 'P 006', locked: true  },
      { num: '04', name: '오너 인구구조와 절벽',         pages: 'P 007', locked: true  },
      { num: '05', name: '사모펀드 & 바이아웃 자본',     pages: 'P 008', locked: true  },
      { num: '06', name: '중개 & 매칭 인프라',           pages: 'P 010', locked: true  },
      { num: '07', name: 'PE 롤업 플레이북',             pages: 'P 011', locked: true  },
      { num: '08', name: '정책·보조금 & 가드레일',       pages: 'P 013', locked: true  },
      { num: '09', name: '5년 전망 & 예측',              pages: 'P 014', locked: true  },
      { num: '10', name: '조사 방법론과 출처',           pages: 'P 015', locked: true  },
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
