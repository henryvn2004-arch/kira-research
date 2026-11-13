// ============================================================
// KIRA RESEARCH — api/report-og.js
// Link-preview HTML for a report page. Facebook, LinkedIn, X, Slack and the like do not run
// JavaScript, and /<locale>/reports/<slug> sets its title, description and image in JS, so they
// only ever saw the generic tags. vercel.json sends those bots here, by user agent.
//
//   GET /api/report-og?slug=vietnam-fintech-2026&locale=en
//
// og:image is the rendered cover slide (<slug>-og-<locale>.jpg, 1200x630, upload-cover-slide.mjs),
// the bare cover art if that file is missing, the site default if the report has no cover.
// Title and description are built as the page does (updateHead in reports/_view.html).
// A slug that is not a published report (a coming-soon page) gets the generic tags, as before.
// A person who lands here anyway is sent on to the real page.
// ============================================================
import { coverUrls } from './_lib/cover.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BASE = 'https://kiraresearch.com';
const SUPPORTED = new Set(['en', 'ja', 'ko', 'zh']);
const OG_LOCALE = { en: 'en_US', ja: 'ja_JP', ko: 'ko_KR', zh: 'zh_CN' };
const DEFAULT_DESC = 'Market intelligence report from KIRA RESEARCH.';

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}
async function exists(url) {
  try { return (await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })).ok; } catch (_e) { return false; }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug   = (url.searchParams.get('slug') || '').trim().slice(0, 200);
  const locale = SUPPORTED.has(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';
  if (!/^[a-z0-9-]+$/.test(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }

  try {
    let title = 'Report', description = DEFAULT_DESC, image = `${BASE}/og-image.png`, size = null;
    const rows = await sb(`living_reports?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,cover_url,cover_thumb_url&limit=1`);
    const base = rows[0];
    if (base) {
      const trs = await sb(`report_translations?report_id=eq.${base.id}&status=eq.published&locale=in.(${locale},en)&select=locale,title,preview`);
      const t = trs.find(r => r.locale === locale) || trs[0];
      if (t) {
        if (t.title) title = t.title;
        if (t.preview && typeof t.preview === 'object' && t.preview.lede) description = String(t.preview.lede).slice(0, 200);
      }
      const c = coverUrls(base, t ? t.locale : 'en');
      if (c) {
        if (await exists(c.og)) { image = c.og; size = [1200, 630]; } else image = c.full;
      }
    }
    const page = `${BASE}/${locale}/reports/${slug}`;
    const full = `${title} — KIRA RESEARCH`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(
`<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(page)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="KIRA RESEARCH">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(page)}">
<meta property="og:image" content="${esc(image)}">${size ? `
<meta property="og:image:width" content="${size[0]}">
<meta property="og:image:height" content="${size[1]}">` : ''}
<meta property="og:locale" content="${OG_LOCALE[locale]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(full)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(page)}">
</head><body><a href="${esc(page)}">${esc(full)}</a></body></html>`);
  } catch (err) {
    console.error('[report-og] error:', err.message);
    res.status(500).send('server_error');
  }
}
