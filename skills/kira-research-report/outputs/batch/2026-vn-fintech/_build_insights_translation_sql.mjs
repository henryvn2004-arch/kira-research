// Generic insight translation SQL builder. Reads a JSON payload of translated
// rows (slug + title/excerpt/lede/body/read_time) and a target locale, emits
// the INSERT ... ON CONFLICT statement.
//
// Usage: node _build_insights_translation_sql.mjs <payload.json> <locale>
//   node _build_insights_translation_sql.mjs _insights_ja_payload.json ja
//   node _build_insights_translation_sql.mjs _insights_ko_payload.json ko

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const [payloadName, locale] = process.argv.slice(2);
if (!payloadName || !locale) {
  console.error('Usage: node _build_insights_translation_sql.mjs <payload.json> <locale>');
  process.exit(2);
}

const payload = JSON.parse(fs.readFileSync(path.join(dir, payloadName), 'utf8'));

function dq(v) {
  return `$kbat$${String(v == null ? '' : v)}$kbat$`;
}

const values = payload
  .map(r => `((SELECT id FROM insights WHERE slug = ${dq(r.slug)}), '${locale}', ${dq(r.title)}, ${dq(r.excerpt)}, ${dq(r.lede)}, ${dq(r.body)}, ${dq(r.read_time)}, 'published', now())`)
  .join(',\n  ');

const sql = `
INSERT INTO insight_translations (insight_id, locale, title, excerpt, lede, body, read_time, status, published_at)
VALUES
  ${values}
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
