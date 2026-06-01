// Fallback publisher for 2027-ph-telemedicine when the Supabase MCP transport
// is unavailable. Performs the same upserts as the generated SQL, but via the
// PostgREST REST API using SUPABASE_SERVICE_KEY (same key the upload scripts use).
//
// 1. UPSERT living_reports (on_conflict=slug) -> capture report id
// 2. UPSERT 3 report_translations rows (on_conflict=report_id,locale)
//
// Prints the resolved report_id on success (REPORT_ID=<uuid>).
import { SLUG, COUNTRY, INDUSTRY, YEAR, PAGES, PRICE, META } from './_build_2027-ph-telemedicine_sql.mjs';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('missing SUPABASE_URL / SUPABASE_SERVICE_KEY'); process.exit(2); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const headers = { ...H };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(URL + '/rest/v1/' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const now = new Date().toISOString();

// 1. Upsert living_reports on slug, return the row.
const lrRows = await rest('living_reports?on_conflict=slug', {
  method: 'POST',
  prefer: 'resolution=merge-duplicates,return=representation',
  body: [{
    slug: SLUG,
    country: COUNTRY,
    industry: INDUSTRY,
    year: YEAR,
    pages: PAGES,
    price: PRICE,
    currency: 'USD',
    status: 'published',
    published_at: now,
    updated_at: now,
  }],
});
const reportId = lrRows[0].id;
console.log('living_reports upserted id=' + reportId);

// 2. Upsert the 3 translations on (report_id, locale).
const transBody = ['en', 'ja', 'ko'].map((loc) => {
  const m = META[loc];
  return {
    report_id: reportId,
    locale: loc,
    title: m.title,
    eyebrow: m.eyebrow,
    preview: m.preview,
    toc: m.toc,
    pdf_url: `${reportId}/${loc}.pdf`,
    status: 'published',
    published_at: now,
  };
});
const trRows = await rest('report_translations?on_conflict=report_id,locale', {
  method: 'POST',
  prefer: 'resolution=merge-duplicates,return=representation',
  body: transBody,
});
console.log('report_translations upserted: ' + trRows.map((r) => r.locale).sort().join(','));
console.log('REPORT_ID=' + reportId);
