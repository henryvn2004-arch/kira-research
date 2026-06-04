// One-off: builds SQL to upsert living_reports + 3 report_translations for
// 2026-id-nickel-battery. Extracts title/eyebrow/lede/paragraphs/toc per locale
// straight from the rendered HTML so the three previews stay faithful to copy.
// Run: node skills/kira-research-report/scripts/_build_id_nickel_battery_sql.mjs > /tmp/nb.sql
import { readFileSync } from 'node:fs';

const DIR     = 'skills/kira-research-report/outputs/batch/2026-id-nickel-battery';
const SLUG    = 'indonesia-nickel-battery-2026';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'Nickel-Battery';
const YEAR    = 2026;
const PAGES   = 28;
const PRICE   = 39;

// Shared chart bars — domestic cell capacity build-out (GWh). Max 140 = 100%.
// Subset of the exec SVG series (10,10,17,32,55,85,140) chosen to show the ramp.
const chartBars = [
  { pct: 7,   label: '2024',  value: 10  },
  { pct: 12,  label: '2026F', value: 17  },
  { pct: 39,  label: '2028F', value: 55  },
  { pct: 100, label: '2030T', value: 140 },
];

function decode(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}
// strip tags, decode entities, collapse whitespace
function clean(html) {
  return decode(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}
// drop inline [Source 2025] citation tags from preview prose
function dropSrc(s) { return s.replace(/\s*\[[^\]]+\]/g, '').replace(/\s+/g, ' ').trim(); }

function extract(loc) {
  const html = readFileSync(`${DIR}/${loc}.html`, 'utf8');
  const h1      = clean((html.match(/<div class="page cover">[\s\S]*?<h1>([\s\S]*?)<\/h1>/) || [])[1] || '');
  const eyebrow = clean((html.match(/<div class="cover-eyebrow">([\s\S]*?)<\/div>/) || [])[1] || '');
  const subtitle= clean((html.match(/<p class="cover-subtitle">([\s\S]*?)<\/p>/) || [])[1] || '');
  // exec narrative paragraphs (first exec-narrative block)
  const narrBlock = (html.match(/<div class="exec-narrative">([\s\S]*?)<\/div>/) || [])[1] || '';
  const narrParas = [...narrBlock.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => dropSrc(clean(m[1])));
  // first exec-chart title + subtitle (localized)
  const chartTitle    = clean((html.match(/<div class="chart-title">([\s\S]*?)<\/div>/) || [])[1] || '');
  const chartSubtitle = clean((html.match(/<div class="chart-subtitle">([\s\S]*?)<\/div>/) || [])[1] || '');
  // TOC rows: <span class="tn">NN</span><span class="tt">NAME<span class="sub">..</span></span><span class="tp">PPP</span>
  const toc = [...html.matchAll(/<div class="toc-row">\s*<span class="tn">([\s\S]*?)<\/span>\s*<span class="tt">([\s\S]*?)<\/span>\s*<span class="tp">([\s\S]*?)<\/span>/g)]
    .map(m => {
      const num  = clean(m[1]);
      const name = clean(m[2].replace(/<span class="sub">[\s\S]*?<\/span>/g, ''));
      const pg   = clean(m[3]);
      return { num, name, pages: `PG ${pg}`, locked: !(num === '01' || num === '02' || num === '03') };
    });
  const lede = narrParas[0] || subtitle;
  const paragraphs = [narrParas[1] || subtitle, subtitle].slice(0, 2);
  return {
    title: h1,
    eyebrow,
    preview: {
      lede,
      paragraphs,
      chart: { title: chartTitle, subtitle: chartSubtitle, bars: chartBars },
    },
    toc,
  };
}

const META = { en: extract('en'), ja: extract('ja'), ko: extract('ko') };

// sanity to stderr
for (const loc of ['en', 'ja', 'ko']) {
  const m = META[loc];
  process.stderr.write(`[${loc}] title="${m.title.slice(0,50)}..." toc=${m.toc.length} ledeLen=${m.preview.lede.length} paras=${m.preview.paragraphs.length}\n`);
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
