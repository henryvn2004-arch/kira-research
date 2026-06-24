// Publish 2026-vn-cosmetics to Supabase via PostgREST (cron fires lack the
// Supabase execute_sql MCP — see feedback_insight_cron_no_supabase_mcp.md).
// Upserts living_reports (on_conflict=slug) then report_translations
// (on_conflict=report_id,locale). Prints REPORT_ID=<uuid> on success.
import { SLUG, COUNTRY, INDUSTRY, YEAR, PAGES, PRICE, META } from './_build_2026-vn-cosmetics_sql.mjs';

const BASE = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) { console.error('missing SUPABASE_URL / SUPABASE_SERVICE_KEY'); process.exit(2); }

const H = {
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function req(path, opts) {
  const r = await fetch(`${BASE}/rest/v1/${path}`, opts);
  const text = await r.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!r.ok) { throw new Error(`${opts.method} ${path} -> ${r.status}: ${text}`); }
  return body;
}

// 1) Upsert the living_reports row, return representation to capture id.
const nowIso = new Date().toISOString();
const reportRow = {
  slug: SLUG, country: COUNTRY, industry: INDUSTRY, year: YEAR,
  pages: PAGES, price: PRICE, currency: 'USD', status: 'published',
  published_at: nowIso, updated_at: nowIso,
};
const upserted = await req('living_reports?on_conflict=slug', {
  method: 'POST',
  headers: { ...H, 'Prefer': 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify(reportRow),
});
const REPORT_ID = Array.isArray(upserted) ? upserted[0]?.id : upserted?.id;
if (!REPORT_ID) throw new Error('no report id returned: ' + JSON.stringify(upserted));

// 2) Upsert the 3 translation rows.
const transRows = ['en', 'ja', 'ko'].map((loc) => {
  const m = META[loc];
  return {
    report_id: REPORT_ID,
    locale: loc,
    title: m.title,
    eyebrow: m.eyebrow,
    preview: m.preview,
    toc: m.toc,
    pdf_url: `${REPORT_ID}/${loc}.pdf`,
    status: 'published',
    published_at: nowIso,
  };
});
const tres = await req('report_translations?on_conflict=report_id,locale', {
  method: 'POST',
  headers: { ...H, 'Prefer': 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify(transRows),
});

console.log('REPORT_ID=' + REPORT_ID);
console.log('translations=' + (Array.isArray(tres) ? tres.length : 0));
console.log('locales=' + (Array.isArray(tres) ? tres.map(t => t.locale).join(',') : '?'));
