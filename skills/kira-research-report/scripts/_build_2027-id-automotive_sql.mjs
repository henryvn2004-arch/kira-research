// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-id-automotive. Extracts title/eyebrow/lede/paragraphs/toc directly
// from the rendered en/ja/ko HTML so the DB preview matches the published report.
// Run via: node _build_2027-id-automotive_sql.mjs  →  pipe into Supabase MCP execute_sql.

import fs from 'fs';
import path from 'path';

const DIR     = path.resolve('skills/kira-research-report/outputs/batch/2027-id-automotive');
const SLUG    = 'automotive-indonesia-2027';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'Automotive';
const YEAR    = 2027;
const PAGES   = 25;
const PRICE   = 39;

// Preview chart: Indonesia vehicle market (units, k) recovery trajectory.
// From the exec "Total market vs EV penetration" chart: 2025=804, 2026=850, 2027F=905.
const chartBars = [
  { pct: 89,  label: '2025',  value: 804 },
  { pct: 94,  label: '2026',  value: 850 },
  { pct: 100, label: '2027F', value: 905 },
];
const chartMeta = {
  en: { title: 'Indonesia vehicle market (units, k)', subtitle: '2025 actual · 2026 · 2027 forecast' },
  ja: { title: 'インドネシア自動車市場(千台)',        subtitle: '2025年実績 · 2026年 · 2027年予測' },
  ko: { title: '인도네시아 자동차 시장 (천 대)',        subtitle: '2025 실적 · 2026 · 2027 예측' },
};

function stripTags(s) {
  return s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extract(loc) {
  const html = fs.readFileSync(path.join(DIR, `${loc}.html`), 'utf8');

  // Cover title — the <h1> inside cover-main
  const titleM = html.match(/<div class="cover-main">[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = stripTags(titleM[1]);

  // Eyebrow
  const eyebrowM = html.match(/<div class="cover-eyebrow">([\s\S]*?)<\/div>/);
  const eyebrow = stripTags(eyebrowM[1]);

  // Cover subtitle (used as first preview paragraph)
  const subM = html.match(/<p class="cover-subtitle">([\s\S]*?)<\/p>/);
  const coverSub = stripTags(subM[1]);

  // page-subhead elements in document order: [0] = methodology page (002),
  // [1] = exec-summary hook (004), [2] = strategic-implications subhead (005).
  // Use the exec-summary hook as the teaser lede and the implications subhead as the closing paragraph.
  const subheads = [...html.matchAll(/<p class="page-subhead">([\s\S]*?)<\/p>/g)].map((m) => stripTags(m[1]));
  const lede  = subheads[1];
  const para1 = subheads[2];

  // TOC rows: each contents-grid row carries `grid-template-columns: 60px 1fr 80px`
  const rowRe = /letter-spacing: 0\.1em;">([^<]+)<\/div>\s*<div><div style="font-family: 'Satoshi'[^>]*>([\s\S]*?)<\/div>[\s\S]*?text-align: right;">([^<]+)<\/div>/g;
  const toc = [];
  let r;
  while ((r = rowRe.exec(html)) !== null) {
    const num  = stripTags(r[1]);
    const name = stripTags(r[2]);
    const pages = stripTags(r[3]);
    toc.push({ num, name, pages, locked: toc.length !== 0 }); // first row (exec summary) unlocked
  }

  const preview = {
    lede,
    paragraphs: [coverSub, para1],
    chart: { title: chartMeta[loc].title, subtitle: chartMeta[loc].subtitle, bars: chartBars },
  };

  return { title, eyebrow, preview, toc };
}

const META = { en: extract('en'), ja: extract('ja'), ko: extract('ko') };

// Sanity to stderr (does not pollute the SQL on stdout)
for (const loc of ['en', 'ja', 'ko']) {
  const m = META[loc];
  process.stderr.write(`[${loc}] title="${m.title}" | eyebrow="${m.eyebrow}" | toc_rows=${m.toc.length} | lede_len=${m.preview.lede.length} | p0_len=${m.preview.paragraphs[0].length} | p1_len=${m.preview.paragraphs[1].length}\n`);
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
