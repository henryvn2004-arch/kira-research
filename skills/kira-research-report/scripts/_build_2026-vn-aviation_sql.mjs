// One-off helper: builds SQL to insert living_reports + 3 report_translations
// for 2026-vn-aviation. Parses each locale HTML for title/lede/paragraphs/toc.
// This report uses the "cover-main / comp-stat-row Contents" template variant
// (plain <h1> cover title, eyebrow rebuilt per-locale, TOC rows are
// comp-stat-row "NN · Title" + mono page number).
// Run: node skills/kira-research-report/scripts/_build_2026-vn-aviation_sql.mjs > /tmp/vnav.sql
import fs from 'node:fs';

const SLUG     = 'vietnam-aviation-2026';
const COUNTRY  = 'Vietnam';
const INDUSTRY = 'Aviation';
const YEAR     = 2026;
const PAGES    = 17;
const PRICE    = 39;
const DIR      = 'skills/kira-research-report/outputs/batch/2026-vn-aviation';

// Shared preview chart bars — passenger traffic (M PAX). Max 95 → pct.
const chartBars = [
  { pct: 79,  label: '2024',  value: 75 },
  { pct: 88,  label: '2025',  value: 83.5 },
  { pct: 100, label: '2026F', value: 95 },
];

const FIXED = {
  en: {
    eyebrow: 'VIETNAM · AVIATION · MARKET ANALYSIS',
    chart: { title: 'Passenger traffic trajectory', subtitle: 'Vietnam · million passengers · 2024–2026F', bars: chartBars },
  },
  ja: {
    eyebrow: 'ベトナム · 航空 · マーケット分析',
    chart: { title: '旅客数の推移', subtitle: 'ベトナム · 百万人 · 2024〜2026年予測', bars: chartBars },
  },
  ko: {
    eyebrow: '베트남 · 항공 · 시장 분석',
    chart: { title: '여객 수 추이', subtitle: '베트남 · 백만 명 · 2024~2026 예측', bars: chartBars },
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

  // Cover title: plain <h1> inside .cover-main (may contain <span class="accent">)
  const mainM = html.match(/<div class="cover-main">([\s\S]*?)<\/div>\s*<\/div>/);
  if (!mainM) throw new Error(`${loc}: cover-main not found`);
  const titleM = mainM[1].match(/<h1>([\s\S]*?)<\/h1>/);
  if (!titleM) throw new Error(`${loc}: cover <h1> not found`);
  const title = clean(titleM[1]);

  const ledeM = html.match(/<div class="cover-subtitle">([\s\S]*?)<\/div>/);
  if (!ledeM) throw new Error(`${loc}: cover-subtitle not found`);
  const lede = clean(ledeM[1]);

  const narrM = html.match(/<div class="exec-narrative">([\s\S]*?)<\/div>/);
  if (!narrM) throw new Error(`${loc}: exec-narrative not found`);
  const paras = [...narrM[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => clean(m[1]));
  if (paras.length < 2) throw new Error(`${loc}: expected >=2 narrative paragraphs, got ${paras.length}`);

  // TOC: comp-stat-row "NN · Title" + mono page number. Methodology comp-stat-rows
  // don't match the "two-digit · ... + mono pagenum" shape, so this scopes to Contents.
  const liRe = /<div class="comp-stat-row"><span>(\d{2})\s*·\s*([\s\S]*?)<\/span><span class="val mono">(\d+)<\/span><\/div>/g;
  const toc = [...html.matchAll(liRe)].map((m) => ({
    num: clean(m[1]),
    name: clean(m[2]),
    pages: 'PG ' + clean(m[3]),
    locked: !['01', '02', '03'].includes(clean(m[1])),
  }));
  if (toc.length !== 14) throw new Error(`${loc}: expected 14 toc items, got ${toc.length}`);

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
