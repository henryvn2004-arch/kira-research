// Publisher for 2026-id-data-center. Upserts living_reports + 3 report_translations
// via PostgREST using SUPABASE_URL + SUPABASE_SERVICE_KEY from env.
// Extracts title/eyebrow/lede/paragraphs/toc directly from the rendered en/ja/ko HTML
// so the DB preview matches the published report. Chart is curated (scenarios chart, pg 16).
//
// Run: node skills/kira-research-report/scripts/_publish_2026-id-data-center_rest.mjs
// Prints REPORT_ID + TRANSLATIONS on success.

import fs from 'fs';
import path from 'path';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const DIR      = path.resolve('skills/kira-research-report/outputs/batch/2026-id-data-center');
const SLUG     = 'data-center-indonesia-2026';
const COUNTRY  = 'Indonesia';
const INDUSTRY = 'Data Center';
const YEAR     = 2026;
const PAGES    = 17;
const PRICE    = 39;
const NOW      = new Date().toISOString();

// Energized data center capacity scenarios (live MW). 2025 actual 420; 2027F constrained ~800,
// base ~1050, accel ~1250. Max 1250 -> pct. From the scenarios chart (pg 16).
const chartBars = [
  { pct: 34,  label: '2025',      value: 420 },
  { pct: 64,  label: '2027 low',  value: 800 },
  { pct: 84,  label: '2027 base', value: 1050 },
  { pct: 100, label: '2027 high', value: 1250 },
];
const chartMeta = {
  en: { title: 'Energized capacity scenarios', subtitle: 'Indonesia · live MW · 2025 actual vs 2027F' },
  ja: { title: '稼働容量シナリオ',              subtitle: 'インドネシア · 稼働MW · 2025年実績 vs 2027年予測' },
  ko: { title: '가동 용량 시나리오',            subtitle: '인도네시아 · 가동 MW · 2025 실적 vs 2027 전망' },
};
const pageLabel = { en: 'PG', ja: 'P', ko: 'P' };

function strip(s) {
  return s
    .replace(/<span class="tsub">[\s\S]*?<\/span>/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad2(p) { const n = parseInt(p, 10); return Number.isNaN(n) ? p : String(n).padStart(2, '0'); }

function extract(loc) {
  const h = fs.readFileSync(path.join(DIR, `${loc}.html`), 'utf8');
  const title    = strip((h.match(/<div class="cover-main">[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '');
  const eyebrow  = strip((h.match(/class="cover-eyebrow">([\s\S]*?)<\/div>/) || [])[1] || '');
  const subtitle = strip((h.match(/<p class="cover-subtitle">([\s\S]*?)<\/p>/) || [])[1] || '');
  const subheads = [...h.matchAll(/<p class="page-subhead">([\s\S]*?)<\/p>/g)].map((m) => strip(m[1]));

  // subhead[2] = exec hook (USD 2.8bn market...) -> lede; subhead[3] = five forces -> closing para.
  const lede = subheads[2];
  const para1 = subheads[3];

  const rows = [...h.matchAll(/<div class="toc-row">([\s\S]*?)<\/div>/g)].map((m) => {
    const blk = m[1];
    const name = strip((blk.match(/class="ttitle">([\s\S]*?)<\/span><span class="tpage/) || [])[1] || '');
    const page = (blk.match(/class="tpage">([\s\S]*?)<\/span>/) || [])[1] || '';
    return { name, page: page.trim() };
  });
  const toc = rows.map((r, i) => ({
    num: String(i + 1).padStart(2, '0'),
    name: r.name,
    pages: `${pageLabel[loc]} ${pad2(r.page)}`,
    locked: i !== 0,
  }));

  const preview = {
    lede,
    paragraphs: [subtitle, para1],
    chart: { title: chartMeta[loc].title, subtitle: chartMeta[loc].subtitle, bars: chartBars },
  };
  return { title, eyebrow, preview, toc };
}

const META = { en: extract('en'), ja: extract('ja'), ko: extract('ko') };

for (const loc of ['en', 'ja', 'ko']) {
  const m = META[loc];
  process.stderr.write(`[${loc}] title="${m.title}" | eyebrow="${m.eyebrow}" | toc=${m.toc.length} | lede=${m.preview.lede?.length} | p0=${m.preview.paragraphs[0]?.length} | p1=${m.preview.paragraphs[1]?.length}\n`);
}

async function main() {
  // sanity: no empty critical fields
  for (const loc of ['en', 'ja', 'ko']) {
    const m = META[loc];
    if (!m.title || !m.eyebrow || !m.preview.lede || !m.preview.paragraphs[0] || !m.preview.paragraphs[1] || m.toc.length !== 10) {
      console.error(`EXTRACT FAIL for ${loc}`, JSON.stringify({ title: !!m.title, eyebrow: !!m.eyebrow, lede: !!m.preview.lede, p0: !!m.preview.paragraphs[0], p1: !!m.preview.paragraphs[1], toc: m.toc.length }));
      process.exit(1);
    }
  }

  const lrBody = [{
    slug: SLUG, country: COUNTRY, industry: INDUSTRY, year: YEAR,
    pages: PAGES, price: PRICE, currency: 'USD', status: 'published', published_at: NOW,
  }];
  let res = await fetch(`${URL}/rest/v1/living_reports?on_conflict=slug`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(lrBody),
  });
  let txt = await res.text();
  if (!res.ok) { console.error('living_reports upsert FAILED', res.status, txt); process.exit(1); }
  const reportId = JSON.parse(txt)[0].id;

  const rows = ['en', 'ja', 'ko'].map((loc) => ({
    report_id: reportId,
    locale: loc,
    title: META[loc].title,
    eyebrow: META[loc].eyebrow,
    preview: META[loc].preview,
    toc: META[loc].toc,
    pdf_url: `${reportId}/${loc}.pdf`,
    status: 'published',
    published_at: NOW,
  }));
  res = await fetch(`${URL}/rest/v1/report_translations?on_conflict=report_id,locale`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  });
  txt = await res.text();
  if (!res.ok) { console.error('report_translations upsert FAILED', res.status, txt); process.exit(1); }
  const locs = JSON.parse(txt).map((r) => r.locale).sort().join(',');

  console.log('REPORT_ID=' + reportId);
  console.log('TRANSLATIONS=' + locs);
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
