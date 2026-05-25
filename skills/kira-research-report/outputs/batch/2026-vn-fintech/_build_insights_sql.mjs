// One-off: read _insights_payload.json and emit SQL to UPSERT 3 insights +
// 3 EN insight_translations. Dollar-quoted with $kbat$...$kbat$ to survive
// apostrophes, em-dashes, JSON braces, raw HTML in the body.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(fs.readFileSync(path.join(dir, '_insights_payload.json'), 'utf8'));

const reportSlug = payload.report_slug;
const country    = payload.country;
const industry   = payload.industry;
const year       = payload.year;

function dq(v) {
  // Dollar-quoted SQL literal. $kbat$ tag is unique enough that the body
  // contents (HTML + JSON-LD) won't collide.
  return `$kbat$${String(v == null ? '' : v)}$kbat$`;
}

const rows = payload.insights.map(i => ({
  slug: `${industry}-${country}-${i.slug_key}-${year}`,
  title: i.title_en,
  excerpt: i.excerpt_en,
  lede: i.lede_en,
  body: i.body_en,
  read_time: i.read_time
}));

const insightsValues = rows
  .map(r => `(${dq(r.slug)}, 'data-explainer', ${dq(country)}, ${dq(industry)}, false, ARRAY[${dq(reportSlug)}], 'published', now())`)
  .join(',\n    ');

const transValues = rows
  .map(r => `(${dq(r.slug)}, ${dq(r.title)}, ${dq(r.excerpt)}, ${dq(r.lede)}, ${dq(r.body)}, ${dq(r.read_time)})`)
  .join(',\n    ');

const sql = `
WITH new_insights AS (
  INSERT INTO insights (slug, category, country, industry, featured, related_report_slugs, status, published_at)
  VALUES
    ${insightsValues}
  ON CONFLICT (slug) DO UPDATE SET
    updated_at = now(),
    published_at = now(),
    status = 'published',
    related_report_slugs = EXCLUDED.related_report_slugs,
    category = EXCLUDED.category,
    country = EXCLUDED.country,
    industry = EXCLUDED.industry
  RETURNING id, slug
)
INSERT INTO insight_translations (insight_id, locale, title, excerpt, lede, body, read_time, status, published_at)
SELECT ni.id, 'en', t.title, t.excerpt, t.lede, t.body, t.read_time, 'published', now()
FROM new_insights ni
JOIN (VALUES
    ${transValues}
) AS t(slug, title, excerpt, lede, body, read_time)
  ON ni.slug = t.slug
ON CONFLICT (insight_id, locale) DO UPDATE SET
  updated_at = now(),
  published_at = now(),
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  lede = EXCLUDED.lede,
  body = EXCLUDED.body,
  read_time = EXCLUDED.read_time,
  status = 'published'
RETURNING insight_id, locale, title;
`;

process.stdout.write(sql);
