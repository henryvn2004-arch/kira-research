import fs from 'node:fs';

// Publish 2026-th-property via PostgREST (cron fires lack the Supabase execute_sql MCP).
// Upserts living_reports (on slug) -> gets report_id -> upserts 3 report_translations.
// Run: node skills/kira-research-report/scripts/_publish_2026-th-property.mjs

const BASE = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;
if (!BASE || !KEY) { console.error('missing env'); process.exit(1); }

const SLUG     = 'thailand-real-estate-2026';
const COUNTRY  = 'Thailand';
const INDUSTRY = 'Real Estate';
const YEAR     = 2026;
const PAGES    = 18;
const PRICE    = 39;
const DIR      = 'skills/kira-research-report/outputs/batch/2026-th-property';
const NOW      = new Date().toISOString();

function decode(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&mdash;/g, '—').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}
function first(html, re) { const m = html.match(re); return m ? decode(m[1]) : null; }

const BAR_VALUES = [88, 93, 97.9];
const BAR_LABELS = ['2023', '2024', '2025'];
const BAR_MAX    = Math.max(...BAR_VALUES);
const BAR_PCT    = BAR_VALUES.map(v => Math.round((v / BAR_MAX) * 100));
const EYEBROW = {
  en: 'THAILAND · REAL ESTATE · MARKET ANALYSIS',
  ja: 'タイ · 不動産 · マーケット分析',
  ko: '태국 · 부동산 · 시장 분석',
};

function buildMeta(loc) {
  const html = fs.readFileSync(`${DIR}/${loc}.html`, 'utf8');
  const title = first(html, /<div class="cover-main">[\s\S]*?<h1>([\s\S]*?)<\/h1>/);
  const lede  = first(html, /<p class="cover-subtitle">([\s\S]*?)<\/p>/);
  const chartTitle = first(html, /<div class="chart-title">([\s\S]*?)<\/div>/);
  const chartSub   = first(html, /<div class="chart-subtitle">([\s\S]*?)<\/div>/);
  const subheads = [...html.matchAll(/<p class="page-subhead">([\s\S]*?)<\/p>/g)].map(m => decode(m[1]));
  const tocRaw = [...html.matchAll(/<span class="tnum">([\s\S]*?)<\/span><span class="ttitle">([\s\S]*?)<span class="tsub">([\s\S]*?)<\/span><\/span><span class="tpage">([\s\S]*?)<\/span>/g)];
  const pgPrefix = loc === 'en' ? 'PG ' : 'P ';
  const toc = tocRaw.map((m, i) => ({
    num: decode(m[1]), name: decode(m[2]),
    pages: pgPrefix + String(parseInt(decode(m[4]), 10)).padStart(2, '0'),
    locked: i >= 3,
  }));
  const preview = {
    lede,
    paragraphs: [subheads[1], subheads[2]],
    chart: { title: chartTitle, subtitle: chartSub,
      bars: BAR_LABELS.map((label, i) => ({ pct: BAR_PCT[i], label, value: BAR_VALUES[i] })) },
  };
  return { title, eyebrow: EYEBROW[loc], preview, toc };
}

async function pg(path, method, body, extraPrefer = '') {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: `resolution=merge-duplicates,return=representation${extraPrefer}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) { console.error(`${method} ${path} -> ${res.status}: ${text}`); process.exit(1); }
  return text ? JSON.parse(text) : null;
}

const reportRows = await pg('living_reports?on_conflict=slug', 'POST', [{
  slug: SLUG, country: COUNTRY, industry: INDUSTRY, year: YEAR,
  pages: PAGES, price: PRICE, currency: 'USD', status: 'published',
  published_at: NOW, updated_at: NOW,
}]);
const reportId = reportRows[0].id;

const transRows = ['en', 'ja', 'ko'].map((loc) => {
  const m = buildMeta(loc);
  return {
    report_id: reportId, locale: loc, title: m.title, eyebrow: m.eyebrow,
    preview: m.preview, toc: m.toc,
    pdf_url: `${reportId}/${loc}.pdf`, status: 'published', published_at: NOW,
  };
});
const inserted = await pg('report_translations?on_conflict=report_id,locale', 'POST', transRows);

console.log('REPORT_ID=' + reportId);
console.log('SLUG=' + SLUG);
console.log('TRANSLATIONS=' + inserted.map(r => r.locale).join(','));
