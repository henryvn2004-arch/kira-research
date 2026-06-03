// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-vn-banking-strategic. Run:
//   node skills/kira-research-report/scripts/_build_2026-vn-banking-strategic_sql.mjs > /tmp/insert.sql
// then feed the SQL to Supabase MCP execute_sql.
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL.

const SLUG     = 'banking-vietnam-2026';
const COUNTRY  = 'Vietnam';
const INDUSTRY = 'Banking';
const YEAR     = 2026;
const PAGES    = 17;
const PRICE    = 39;

// System credit growth % YoY: 2023 14, 2024 18, 2025 18, 2026F 15. Max 18 -> pct relative.
const chartBarsEN = [
  { pct: 78,  label: '2023',  value: 14 },
  { pct: 100, label: '2024',  value: 18 },
  { pct: 100, label: '2025',  value: 18 },
  { pct: 83,  label: '2026F', value: 15 },
];

const tocEN = [
  { num: '01', name: 'Executive summary',                 pages: 'PG 04', locked: false },
  { num: '02', name: 'Strategic implications',            pages: 'PG 05', locked: true  },
  { num: '03', name: 'The 2026 banking landscape',        pages: 'PG 06', locked: true  },
  { num: '04', name: 'Sector size, credit and profit',    pages: 'PG 07', locked: true  },
  { num: '05', name: 'Market structure: state vs private', pages: 'PG 08', locked: true },
  { num: '06', name: 'Japanese strategic capital',        pages: 'PG 09', locked: true  },
  { num: '07', name: 'The USD 6 bn stake map',            pages: 'PG 10', locked: true  },
  { num: '08', name: 'Six Japanese bank stakes profiled', pages: 'PG 11', locked: true  },
  { num: '09', name: 'Digital transformation',            pages: 'PG 12', locked: true  },
  { num: '10', name: 'Cashless scale and funding',        pages: 'PG 13', locked: true  },
  { num: '11', name: 'Six AI applications in banking',    pages: 'PG 14', locked: true  },
  { num: '12', name: 'Regulatory frame and ownership',    pages: 'PG 15', locked: true  },
  { num: '13', name: 'Five-year outlook',                 pages: 'PG 16', locked: true  },
  { num: '14', name: 'Methodology and sources',           pages: 'PG 17', locked: true  },
];

const tocJA = [
  { num: '01', name: 'エグゼクティブサマリー',            pages: 'P 04', locked: false },
  { num: '02', name: '戦略的示唆',                        pages: 'P 05', locked: true  },
  { num: '03', name: '2026年の銀行業の全体像',           pages: 'P 06', locked: true  },
  { num: '04', name: 'セクター規模・信用・収益',         pages: 'P 07', locked: true  },
  { num: '05', name: '市場構造：国有行 vs 民間行',       pages: 'P 08', locked: true  },
  { num: '06', name: '日本の戦略的資本',                 pages: 'P 09', locked: true  },
  { num: '07', name: 'USD60億出資マップ',                pages: 'P 10', locked: true  },
  { num: '08', name: '日系6出資ポジション詳細',          pages: 'P 11', locked: true  },
  { num: '09', name: 'デジタルトランスフォーメーション', pages: 'P 12', locked: true  },
  { num: '10', name: 'キャッシュレス規模と調達',         pages: 'P 13', locked: true  },
  { num: '11', name: '銀行業におけるAI活用6事例',        pages: 'P 14', locked: true  },
  { num: '12', name: '規制枠組みと所有構造',             pages: 'P 15', locked: true  },
  { num: '13', name: '5カ年見通し',                      pages: 'P 16', locked: true  },
  { num: '14', name: '調査手法と出典',                   pages: 'P 17', locked: true  },
];

const tocKO = [
  { num: '01', name: '경영진 요약',                      pages: 'P 04', locked: false },
  { num: '02', name: '전략적 시사점',                    pages: 'P 05', locked: true  },
  { num: '03', name: '2026년 은행업 현황',               pages: 'P 06', locked: true  },
  { num: '04', name: '섹터 규모, 신용 및 수익',          pages: 'P 07', locked: true  },
  { num: '05', name: '시장 구조: 국영 대 민간',          pages: 'P 08', locked: true  },
  { num: '06', name: '일본계 전략 자본',                 pages: 'P 09', locked: true  },
  { num: '07', name: 'USD 60억 지분 현황도',             pages: 'P 10', locked: true  },
  { num: '08', name: '일본계 은행 6개 지분 프로파일',    pages: 'P 11', locked: true  },
  { num: '09', name: '디지털 전환',                      pages: 'P 12', locked: true  },
  { num: '10', name: '비현금 결제 규모와 자금조달',      pages: 'P 13', locked: true  },
  { num: '11', name: '은행업의 AI 활용 사례 6가지',      pages: 'P 14', locked: true  },
  { num: '12', name: '규제 프레임과 소유 구조',          pages: 'P 15', locked: true  },
  { num: '13', name: '5개년 전망',                       pages: 'P 16', locked: true  },
  { num: '14', name: '방법론과 출처',                    pages: 'P 17', locked: true  },
];

const META = {
  en: {
    title: 'Vietnam banking 2026: Japanese strategic capital and the digital pivot at top-tier lenders',
    eyebrow: 'VIETNAM · BANKING · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's banking system credit rose ~18% in 2025 — the fastest in five years — lifting outstanding credit past USD 670 bn, with the central bank steering toward ~15% for 2026 [SBV 2025]. But margins are compressing: sector NIM fell to ~2.9% from 3.5% and stays below 3% in 2026 [FiinRatings 2026], so the funding base now decides the winners.",
      paragraphs: [
        "Low-cost deposit franchises defend margin best — MB at 37% CASA and Techcombank at ~35% [Techcombank 9M25] convert digital ecosystems into cheap funding, while the rest absorb a cost-of-funds drag. Japanese institutions have deployed ~USD 6 bn across five banks and their finance arms [Kira estimates], anchoring the top tier as patient, multi-decade strategic capital.",
        "This report maps sector size, credit and profit; the state-versus-private structure; the USD 6 bn Japanese stake map and six positions profiled; cashless scale as a funding engine; six AI applications reshaping lenders; the regulatory frame including the Decree 69/2025 49% restructuring window; and a five-year outlook to 2030 of penetration-led growth and margin-led dispersion.",
      ],
      chart: {
        title: 'System credit and profit trajectory',
        subtitle: 'Vietnam · credit growth % YoY · 2023–2026F',
        bars: chartBarsEN,
      },
    },
    toc: tocEN,
  },

  ja: {
    title: 'ベトナム銀行業 2026年：日本の戦略的資本とトップ行のデジタル転換',
    eyebrow: 'ベトナム · 銀行業 · マーケット分析',
    preview: {
      lede: 'ベトナムの銀行システム信用は2025年に~18%伸び、5年来最速となり、残高は約USD6,700億を突破しました。中央銀行は2026年の目標を~15%に設定しています[SBV 2025]。一方で利益率は圧縮しており、セクターNIMは3.5%から~2.9%へ低下し2026年も3%を下回る見通しで[FiinRatings 2026]、勝者は調達基盤で決まります。',
      paragraphs: [
        '低コスト預金基盤の厚い行が利益率を最もよく防衛します——MB（CASA比率37%）、Techcombank（~35%）[Techcombank 9M25]はデジタルエコシステムを安価な調達へ転換し、それ以外の行は資金調達コスト上昇の重荷を受け続けます。日本の金融機関は5行とその金融子会社に~USD60億を投じ[Kira estimates]、忍耐強い数十年単位の戦略的資本としてトップ層に根を下ろしています。',
        '本レポートはセクター規模・信用・収益、国有行対民間行の構造、USD60億の日系出資マップと6つのポジション詳細、調達エンジンとしてのキャッシュレス規模、銀行を変える6つのAI活用、政令69/2025号の49%再編枠を含む規制枠組み、そして2030年に向けた浸透主導の成長と利益率主導の格差拡大という5カ年見通しを扱います。',
      ],
      chart: {
        title: 'システム信用と収益の推移',
        subtitle: 'Vietnam · 信用成長率 % YoY · 2023–2026F',
        bars: chartBarsEN,
      },
    },
    toc: tocJA,
  },

  ko: {
    title: '베트남 은행업 2026: 일본계 전략 자본과 주요 은행의 디지털 전환',
    eyebrow: '베트남 · 은행업 · 시장 분석',
    preview: {
      lede: '베트남 은행 시스템 신용은 2025년 ~18% 증가해 5년래 최고 속도를 기록하며 여신 잔액이 약 USD 6,700억을 돌파했고, 중앙은행은 2026년 목표를 ~15%로 제시합니다[SBV 2025]. 그러나 마진은 압축되고 있습니다. 섹터 NIM은 3.5%에서 ~2.9%로 하락해 2026년에도 3% 미만을 유지하며[FiinRatings 2026], 이제 자금조달 기반이 승자를 가릅니다.',
      paragraphs: [
        'CASA 비율이 높은 은행이 마진을 가장 효과적으로 방어합니다 — MB 37%, Techcombank ~35%[Techcombank 9M25]는 디지털 생태계를 저비용 자금조달로 전환하며, 나머지 은행은 조달비용 부담을 흡수합니다. 일본계 기관은 5개 은행과 금융 자회사에 ~USD 60억을 투입해[Kira estimates] 수십 년 단위의 인내 자본으로 최상위 계층에 자리잡았습니다.',
        '본 보고서는 섹터 규모·신용·수익, 국영 대 민간 구조, USD 60억 일본계 지분 현황도와 6개 포지션 프로파일, 자금조달 엔진으로서의 비현금 결제 규모, 은행을 재편하는 6가지 AI 활용, 시행령 69/2025호의 49% 구조조정 창구를 포함한 규제 프레임, 그리고 2030년까지 침투 주도 성장과 마진 주도 분화의 5개년 전망을 다룹니다.',
      ],
      chart: {
        title: '시스템 신용 및 수익 추이',
        subtitle: 'Vietnam · 신용 성장률 % YoY · 2023–2026F',
        bars: chartBarsEN,
      },
    },
    toc: tocKO,
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
