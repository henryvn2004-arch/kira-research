// One-off helper: builds SQL to insert living_reports + 3 report_translations
// for 2026-id-palm-oil. Parses each locale HTML for title/lede/paragraphs/toc
// so the DB text matches the rendered report exactly. eyebrow + preview chart are
// constructed per-locale (canonical COUNTRY · INDUSTRY · MARKET ANALYSIS eyebrow,
// simplified 3-bar palm-oil output chart from the exec-chart on page 4).
// Run: node skills/kira-research-report/scripts/_build_2026-id-palm-oil_sql.mjs > /tmp/idpalm.sql
import fs from 'node:fs';

const SLUG     = 'indonesia-palm-oil-2026';
const COUNTRY  = 'Indonesia';
const INDUSTRY = 'Palm Oil';
const YEAR     = 2026;
const PAGES    = 12;
const PRICE    = 39;
const DIR      = 'skills/kira-research-report/outputs/batch/2026-id-palm-oil';

// Shared preview chart bars — Indonesia total palm oil output (CPO+PKO, million tonnes).
// Pulled from the page-4 exec chart: 2024 52.8 / 2025 56.6 / 2026F ~57.5. Max 57.5 → pct.
const chartBars = [
  { pct: 92,  label: '2024',  value: 52.8 },
  { pct: 98,  label: '2025',  value: 56.6 },
  { pct: 100, label: '2026F', value: 57.5 },
];

// Per-locale eyebrow + chart title/subtitle (everything else is parsed from HTML).
const FIXED = {
  en: {
    eyebrow: 'INDONESIA · PALM OIL · MARKET ANALYSIS',
    chart: { title: 'Indonesia palm oil output (Mt)', subtitle: '2024 actual · 2025 actual · 2026 forecast', bars: chartBars },
  },
  ja: {
    eyebrow: 'インドネシア · パーム油 · マーケット分析',
    chart: { title: 'インドネシアのパーム油生産量(百万トン)', subtitle: '2024年実績 · 2025年実績 · 2026年予測', bars: chartBars },
  },
  ko: {
    eyebrow: '인도네시아 · 팜유 · 시장 분석',
    chart: { title: '인도네시아 팜유 생산량 (백만 톤)', subtitle: '2024 실적 · 2025 실적 · 2026 예측', bars: chartBars },
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

  const titleM = html.match(/<h1 class="cover-title">([\s\S]*?)<\/h1>/);
  if (!titleM) throw new Error(`${loc}: cover-title not found`);
  const title = clean(titleM[1]);

  const ledeM = html.match(/<p class="cover-subtitle">([\s\S]*?)<\/p>/);
  if (!ledeM) throw new Error(`${loc}: cover-subtitle not found`);
  const lede = clean(ledeM[1]);

  const narrM = html.match(/<div class="exec-narrative">([\s\S]*?)<\/div>/);
  if (!narrM) throw new Error(`${loc}: exec-narrative not found`);
  const paras = [...narrM[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => clean(m[1]));
  if (paras.length < 2) throw new Error(`${loc}: expected >=2 narrative paragraphs, got ${paras.length}`);

  const liRe = /<li><span class="toc-num">([^<]+)<\/span><span class="toc-title">([\s\S]*?)<span class="toc-sub">([\s\S]*?)<\/span><\/span><span class="toc-page">([^<]+)<\/span><\/li>/g;
  const toc = [...html.matchAll(liRe)].map((m) => ({
    num: clean(m[1]),
    name: clean(m[2]),
    pages: 'PG ' + clean(m[4]),
    locked: !['01', '02', '03'].includes(clean(m[1])),
  }));
  if (toc.length !== 12) throw new Error(`${loc}: expected 12 toc items, got ${toc.length}`);

  return {
    title,
    eyebrow: FIXED[loc].eyebrow,
    preview: { lede, paragraphs: paras.slice(0, 2), chart: FIXED[loc].chart },
    toc,
  };
}

const META = { en: extract('en'), ja: extract('ja'), ko: extract('ko') };

// sanity log to stderr so it doesn't pollute the SQL stdout
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
