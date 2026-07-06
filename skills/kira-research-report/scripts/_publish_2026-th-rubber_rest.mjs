// Publish 2026-th-rubber via PostgREST (cron sessions lack the Supabase
// execute_sql MCP — see memory feedback_insight_cron_no_supabase_mcp).
// 1) upsert living_reports (on_conflict=slug) -> report_id
// 2) upsert 3 report_translations (on_conflict=report_id,locale), pdf_url = <id>/<locale>.pdf
import { PUBLISH } from './_build_2026-th-rubber_sql.mjs';

const BASE = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) { console.error('missing SUPABASE env'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const { SLUG, COUNTRY, INDUSTRY, YEAR, PAGES, PRICE, META } = PUBLISH;

async function main() {
  // 1) upsert living_reports
  const lrBody = [{
    slug: SLUG, country: COUNTRY, industry: INDUSTRY, year: YEAR,
    pages: PAGES, price: PRICE, currency: 'USD', status: 'published',
    published_at: new Date().toISOString(),
  }];
  let r = await fetch(BASE + '/rest/v1/living_reports?on_conflict=slug', {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(lrBody),
  });
  if (!r.ok) { console.error('living_reports upsert failed', r.status, await r.text()); process.exit(2); }
  const lr = await r.json();
  const reportId = lr[0].id;
  console.log('living_reports upserted id=' + reportId);

  // 2) upsert report_translations x3
  const trBody = ['en', 'ja', 'ko'].map((loc) => {
    const m = META[loc];
    return {
      report_id: reportId,
      locale: loc,
      title: m.title,
      eyebrow: m.eyebrow,
      preview: m.preview,
      toc: m.toc,
      pdf_url: reportId + '/' + loc + '.pdf',
      status: 'published',
      published_at: new Date().toISOString(),
    };
  });
  r = await fetch(BASE + '/rest/v1/report_translations?on_conflict=report_id,locale', {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(trBody),
  });
  if (!r.ok) { console.error('report_translations upsert failed', r.status, await r.text()); process.exit(3); }
  const tr = await r.json();
  console.log('report_translations upserted locales=' + tr.map((x) => x.locale).sort().join(','));
  console.log('REPORT_ID=' + reportId);
}
main();
