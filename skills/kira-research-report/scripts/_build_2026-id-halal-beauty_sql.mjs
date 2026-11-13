// One-off: builds living_reports + 3 report_translations SQL for 2026-id-halal-beauty.
// Extracts preview fields directly from each locale HTML so JA/KO copy is accurate.
// Run via Supabase MCP execute_sql.
import { readFileSync } from 'node:fs';

const DIR     = 'skills/kira-research-report/outputs/batch/2026-id-halal-beauty';
const SLUG    = 'halal-beauty-indonesia-2026';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'Halal Beauty';
const YEAR    = 2026;
const PAGES   = 12;
const PRICE   = 39;

function decode(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&middot;/g, '·')
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}
function m1(html, re) { const m = html.match(re); return m ? decode(m[1]) : null; }

// Chart bars: demand anchors. Values from exec chart text labels; pct vs 10.1 max.
const barLabelsByLoc = {
  en: ["BPC '24", "BPC '25", 'Skincare', 'Halal cos.'],
  ja: ["BPC '24", "BPC '25", 'スキンケア', 'ハラール化粧品'],
  ko: ["BPC '24", "BPC '25", '스킨케어', '할랄 화장품'],
};
const barVals = [9.2, 10.1, 3.1, 4.0];
const barPct  = [91, 100, 31, 40];

const chartTitleByLoc = {
  en: 'Where the buyer sits — demand anchors',
  ja: '買い手の所在 — 需要の起点',
  ko: '구매자의 위치 — 수요 거점',
};
const chartSubByLoc = {
  en: 'BPC USD bn · skincare USD bn · 2024-25',
  ja: 'BPC USD bn · スキンケア USD bn · 2024-25',
  ko: 'BPC USD bn · 스킨케어 USD bn · 2024-25',
};

function extract(loc) {
  const html = readFileSync(`${DIR}/${loc}.html`, 'utf8');
  const title   = m1(html, /<h1 class="cover-title">([\s\S]*?)<\/h1>/);
  const eyebrow = m1(html, /<[^>]*class="cover-meta-pre"[^>]*>([\s\S]*?)<\/[^>]*>/);

  // exec narrative paragraphs (first 3)
  const ni = html.indexOf('exec-narrative');
  const after = ni >= 0 ? html.slice(ni) : html;
  const paras = [...after.matchAll(/<p>([\s\S]*?)<\/p>/g)].slice(0, 3).map((x) => decode(x[1]));

  // TOC: num + main title (strip nested toc-sub) + page
  const nums  = [...html.matchAll(/<span class="toc-num">([\s\S]*?)<\/span>/g)].map((x) => decode(x[1]));
  const pages = [...html.matchAll(/<span class="toc-page">([\s\S]*?)<\/span>/g)].map((x) => decode(x[1]));
  const titlesRaw = [...html.matchAll(/<span class="toc-title">([\s\S]*?)<\/span>\s*<\/li>/g)].map((x) => x[1]);
  const titles = titlesRaw.map((t) => {
    const subIdx = t.indexOf('<span class="toc-sub"');
    return decode(subIdx >= 0 ? t.slice(0, subIdx) : t);
  });

  const toc = nums.map((num, i) => ({
    num,
    name: titles[i] || '',
    pages: 'PG ' + (pages[i] || '').padStart(3, '0'),
    locked: !(titles[i] || '').toLowerCase().match(/executive summary|エグゼクティブ|경영진|요약/) && i > 2 ? true : i > 2,
  }));
  // simpler lock rule: exec summary row (num 03) unlocked, rest locked
  toc.forEach((r) => { r.locked = r.num !== '03'; });

  const chart = {
    title: chartTitleByLoc[loc],
    subtitle: chartSubByLoc[loc],
    bars: barLabelsByLoc[loc].map((label, i) => ({ pct: barPct[i], label, value: barVals[i] })),
  };

  return {
    title,
    eyebrow,
    preview: { lede: paras[0], paragraphs: [paras[1], paras[2]].filter(Boolean), chart },
    toc,
  };
}

const META = { en: extract('en'), ja: extract('ja'), ko: extract('ko') };

// Eyeball dump to stderr
for (const loc of ['en', 'ja', 'ko']) {
  const m = META[loc];
  process.stderr.write(`\n=== ${loc} ===\n`);
  process.stderr.write(`title(${m.title?.length}): ${m.title}\n`);
  process.stderr.write(`eyebrow: ${m.eyebrow}\n`);
  process.stderr.write(`lede(${m.preview.lede?.length}): ${m.preview.lede}\n`);
  process.stderr.write(`para0(${m.preview.paragraphs[0]?.length}): ${m.preview.paragraphs[0]}\n`);
  process.stderr.write(`para1(${m.preview.paragraphs[1]?.length}): ${m.preview.paragraphs[1]}\n`);
  process.stderr.write(`toc rows: ${m.toc.length}; first: ${JSON.stringify(m.toc[0])}; last: ${JSON.stringify(m.toc[m.toc.length-1])}\n`);
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
  new_report.id, t.locale, t.title, t.eyebrow, t.preview::jsonb, t.toc::jsonb,
  new_report.id::text || '/' || t.locale || '.pdf',
  'published', now()
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
