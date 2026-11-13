// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-sg-private-equity (Singapore private equity 2026).
// Modeled on _build_2026-sg-private-credit_sql.mjs.
//
// Unlike prior _build_*_sql.mjs scripts, the locale text below is NOT hand-typed —
// it's read from _extracted.json (produced by a one-off Node extraction pass over
// en/ja/ko.html) to avoid manual CJK transcription errors.
//
// Run: `node skills/kira-research-report/scripts/_build_2026-sg-private-equity_sql.mjs > /tmp/insert_sg_pe.sql`
// then feed to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL
// CTE from new_report.id — NOT a GitHub raw URL.

import fs from 'fs';

const SLUG     = 'private-equity-singapore-2026';
const COUNTRY  = 'Singapore';
const INDUSTRY = 'Private Equity';
const YEAR     = 2026;
const PAGES    = 19;
const PRICE    = 39;

const DATA_DIR = 'skills/kira-research-report/outputs/batch/2026-sg-private-equity';
const extracted = JSON.parse(fs.readFileSync(`${DATA_DIR}/_extracted.json`, 'utf8'));

// Exec chart — SEA PE deployment, USD bn. 2024=16.0, 2025=9.1, 2026F range 22-26 (bar height reflects 26).
const chartBars = [
  { pct: 62,  label: '2024',  value: 16.0 },
  { pct: 35,  label: '2025',  value: 9.1 },
  { pct: 100, label: '2026F', value: '22–26' },
];

// TOC titles/eyebrows built from extracted cover data. Skip Methodology(01)/Contents(02)
// in-doc entries per the established convention (see sibling _build_2026-sg-private-credit_sql.mjs) —
// preview.toc starts at Executive summary, renumbered 01..N, sub-labels dropped,
// locked=false only on the first entry.
const titleShort = {
  en: 'Singapore private equity 2026',
  ja: 'シンガポール プライベートエクイティ 2026',
  ko: '싱가포르 사모펀드 2026',
};
const eyebrowShort = {
  en: 'SINGAPORE · PRIVATE EQUITY · MARKET ANALYSIS',
  ja: 'シンガポール · プライベートエクイティ · マーケット分析',
  ko: '싱가포르 · 사모펀드 · 시장 분석',
};

const META = {};
for (const loc of ['en', 'ja', 'ko']) {
  const ex = extracted[loc];
  const toc = ex.toc
    .filter((item) => Number(item.num) >= 3) // drop Methodology(01) + Contents(02)
    .map((item, i) => ({
      num: String(i + 1).padStart(2, '0'),
      name: item.title,
      pages: `PG ${item.page}`,
      locked: i !== 0,
    }));

  META[loc] = {
    title: titleShort[loc],
    eyebrow: eyebrowShort[loc],
    preview: {
      lede: ex.lede,
      paragraphs: ex.paragraphs,
      chart: {
        title: ex.chartTitle,
        subtitle: ex.chartSubtitle,
        bars: chartBars,
      },
    },
    toc,
  };
}

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
