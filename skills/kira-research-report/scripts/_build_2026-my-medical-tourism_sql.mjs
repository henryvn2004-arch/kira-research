// One-off helper: builds SQL to insert living_reports + 3 report_translations
// for 2026-my-medical-tourism. UC2 design-mode template: cover h1 (plain),
// cover-subtitle = lede, first exec-narrative <p>×2 = preview paragraphs,
// 15 toc-row entries. Canonical eyebrow + simplified 3-bar revenue chart
// (RM bn healthcare-travel revenue: 2024 / 2025 / 2030F, max 12).
// Run: node skills/kira-research-report/scripts/_build_2026-my-medical-tourism_sql.mjs > /tmp/mymt.sql
import fs from 'node:fs';

const SLUG     = 'malaysia-medical-tourism-2026';
const COUNTRY  = 'Malaysia';
const INDUSTRY = 'Medical Tourism';
const YEAR     = 2026;
const PAGES    = 18;
const PRICE    = 39;
const DIR      = 'skills/kira-research-report/outputs/batch/2026-my-medical-tourism';

// Shared preview chart bars — Malaysia healthcare-travel revenue (RM bn). Max 12.
// From the page-4 exec chart "Malaysia healthcare-travel revenue":
// 2024 actual 2.72 · 2025 actual 3.34 · 2030F target 12.0.
const chartBars = [
  { pct: 23,  label: '2024',  value: 2.72 },
  { pct: 28,  label: '2025',  value: 3.34 },
  { pct: 100, label: '2030F', value: 12.0 },
];

// Per-locale eyebrow + chart title/subtitle (everything else parsed from HTML).
const FIXED = {
  en: {
    eyebrow: 'MALAYSIA · MEDICAL TOURISM · MARKET ANALYSIS',
    chart: { title: 'Malaysia healthcare-travel revenue (RM bn)', subtitle: '2024 actual · 2025 actual · 2030 target', bars: chartBars },
  },
  ja: {
    eyebrow: 'マレーシア · 医療ツーリズム · マーケット分析',
    chart: { title: 'マレーシアの医療ツーリズム収入(RM 十億)', subtitle: '2024年実績 · 2025年実績 · 2030年目標', bars: chartBars },
  },
  ko: {
    eyebrow: '말레이시아 · 의료관광 · 시장 분석',
    chart: { title: '말레이시아 의료관광 수입 (RM 십억)', subtitle: '2024 실적 · 2025 실적 · 2030 목표', bars: chartBars },
  },
};

function decode(s) {
  return s
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&middot;/g, '·')
    .replace(/&sup2;/g, '²')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
function stripTags(s) { return s.replace(/<[^>]+>/g, ''); }
function clean(s) { return decode(stripTags(s)).replace(/\s+/g, ' ').trim(); }

function extract(loc) {
  const html = fs.readFileSync(`${DIR}/${loc}.html`, 'utf8');

  // Cover title = the single plain <h1> (no class). page-h1 headers carry a class.
  const titleM = html.match(/<h1>([\s\S]*?)<\/h1>/);
  if (!titleM) throw new Error(`${loc}: cover <h1> not found`);
  const title = clean(titleM[1]);

  const ledeM = html.match(/<p class="cover-subtitle">([\s\S]*?)<\/p>/);
  if (!ledeM) throw new Error(`${loc}: cover-subtitle not found`);
  const lede = clean(ledeM[1]);

  // First exec-narrative block holds the 2 preview paragraphs.
  const narrM = html.match(/<div class="exec-narrative">([\s\S]*?)<\/div>/);
  if (!narrM) throw new Error(`${loc}: exec-narrative not found`);
  const paras = [...narrM[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => clean(m[1]));
  if (paras.length < 2) throw new Error(`${loc}: expected >=2 narrative paragraphs, got ${paras.length}`);

  // TOC rows: <div class="toc-row"><span class="tnum">NN</span><span class="ttitle">..</span><span class="tpage">NNN</span></div>
  const rowRe = /<div class="toc-row"><span class="tnum">([^<]+)<\/span><span class="ttitle">([\s\S]*?)<\/span><span class="tpage">([^<]+)<\/span><\/div>/g;
  const toc = [...html.matchAll(rowRe)].map((m) => ({
    num: clean(m[1]),
    name: clean(m[2]),
    pages: 'PG ' + clean(m[3]),
    locked: !['01', '02', '03'].includes(clean(m[1])),
  }));
  if (toc.length !== 15) throw new Error(`${loc}: expected 15 toc items, got ${toc.length}`);

  return {
    title,
    eyebrow: FIXED[loc].eyebrow,
    preview: { lede, paragraphs: paras.slice(0, 2), chart: FIXED[loc].chart },
    toc,
  };
}

const META = { en: extract('en'), ja: extract('ja'), ko: extract('ko') };

for (const loc of ['en', 'ja', 'ko']) {
  process.stderr.write(`[${loc}] title="${META[loc].title}" lede=${META[loc].preview.lede.length}ch paras=${META[loc].preview.paragraphs.map((p) => p.length).join('/')} toc=${META[loc].toc.length}\n`);
}

function dq(s, tag = 'kbat') { return `$${tag}$${s}$${tag}$`; }

const transValues = ['en', 'ja', 'ko'].map((loc) => {
  const m = META[loc];
  return `('${loc}', ${dq(m.title)}, ${dq(m.eyebrow)}, ${dq(JSON.stringify(m.preview))}, ${dq(JSON.stringify(m.toc))})`;
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
