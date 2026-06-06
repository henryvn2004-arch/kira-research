// One-off helper: builds SQL to insert living_reports + 3 report_translations
// for 2026-my-halal-food-export (Malaysia halal food export, design-mode report).
// Parses each locale HTML for title/eyebrow/lede/exec-paragraphs/section-TOC so the
// DB text matches the rendered (and translated) report exactly. Chart bars are fixed
// numeric values from the page-4 exec chart (locale-independent).
// Run: node skills/kira-research-report/scripts/_build_2026-my-halal-food-export_sql.mjs > /tmp/myhalal.sql
import fs from 'node:fs';

const SLUG     = 'malaysia-halal-food-2026';
const COUNTRY  = 'Malaysia';
const INDUSTRY = 'Halal Food';
const YEAR     = 2026;
const PAGES    = 29;
const PRICE    = 39;
const DIR      = 'skills/kira-research-report/outputs/batch/2026-my-halal-food-export';

// Exec chart "Halal export trajectory" (Malaysia · RM bn). Max ~75 → pct relative.
const chartBars = [
  { pct: 63,  label: '2022',  value: '47.0' },
  { pct: 82,  label: '2024',  value: '61.8' },
  { pct: 91,  label: '2025',  value: '68.5' },
  { pct: 100, label: '2030F', value: '~75'  },
];

// Content sections to surface in the preview TOC: EN section number → EN page number.
// Names are pulled per-locale from each report's own section tags (authentic translation).
// `idx` selects which label when a section number appears more than once.
// Section 03 carries "Table of Contents" (idx 0) then "Executive Summary" (idx 1) —
// we want the Executive Summary. Section 07 carries "Competitive Structure" (idx 0)
// then "Player Profile" — we want idx 0.
const TOC_SECTIONS = [
  { num: '03', page: '004', locked: false, idx: 1 },
  { num: '04', page: '007', locked: true  },
  { num: '05', page: '010', locked: true  },
  { num: '06', page: '013', locked: true  },
  { num: '07', page: '016', locked: true  },
  { num: '08', page: '022', locked: true  },
  { num: '09', page: '025', locked: true  },
  { num: '10', page: '027', locked: true  },
  { num: '11', page: '030', locked: true  },
];

function decode(s) {
  return s
    .replace(/<br\s*\/?>/g, ' ')
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
function clean(s) {
  // Convert <br> to a space BEFORE stripping tags so "food<br>export" → "food export".
  return decode(String(s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function body(loc) {
  const h = fs.readFileSync(`${DIR}/${loc}.html`, 'utf8');
  return h.slice(h.indexOf('</style>'));
}

function extract(loc) {
  const b = body(loc);

  const title   = clean((b.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || '');
  const eyebrow = clean((b.match(/cover-eyebrow">([\s\S]*?)<\/div>/) || [])[1] || '');
  const lede    = clean((b.match(/cover-subtitle">([\s\S]*?)<\/p>/) || [])[1] || '');
  if (!title)   throw new Error(`${loc}: cover h1 not found`);
  if (!eyebrow) throw new Error(`${loc}: cover-eyebrow not found`);
  if (!lede)    throw new Error(`${loc}: cover-subtitle not found`);

  const narr  = (b.match(/exec-narrative">([\s\S]*?)<\/div>\s*<div class="exec-chart/) || [])[1] || '';
  const paras = [...narr.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => clean(m[1]));
  if (paras.length < 2) throw new Error(`${loc}: expected >=2 exec paragraphs, got ${paras.length}`);

  const chartTitle    = clean((b.match(/chart-title">([\s\S]*?)<\/div>/) || [])[1] || '');
  const chartSubtitle = clean((b.match(/chart-subtitle">([\s\S]*?)<\/div>/) || [])[1] || '');
  if (!chartTitle) throw new Error(`${loc}: chart-title not found`);

  // Map EN section number → this locale's first label for that number.
  const tagRe = /page-section-tag">([\s\S]*?)<\/div>/g;
  const labelsByNum = {};
  let m;
  while ((m = tagRe.exec(b))) {
    const tag = clean(m[1]);
    const nm  = tag.match(/Section (\d+)/);
    if (!nm) continue;
    const label = tag.split('·').slice(1).join('·').trim();
    (labelsByNum[nm[1]] ||= []).push(label);
  }

  const toc = TOC_SECTIONS.map((s) => {
    const arr = labelsByNum[s.num] || [];
    const name = arr[s.idx || 0];
    if (!name) throw new Error(`${loc}: no section label for num ${s.num} idx ${s.idx || 0}`);
    return { num: s.num, name, pages: 'PG ' + s.page, locked: s.locked };
  });

  return {
    title,
    eyebrow,
    preview: {
      lede,
      paragraphs: paras.slice(0, 2),
      chart: { title: chartTitle, subtitle: chartSubtitle, bars: chartBars },
    },
    toc,
  };
}

const META = { en: extract('en'), ja: extract('ja'), ko: extract('ko') };

for (const loc of ['en', 'ja', 'ko']) {
  const m = META[loc];
  process.stderr.write(`[${loc}] title="${m.title}" eyebrow="${m.eyebrow}" lede=${m.preview.lede.length}ch paras=${m.preview.paragraphs.map((p) => p.length).join('/')} toc=${m.toc.length} chart="${m.preview.chart.title}"\n`);
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
