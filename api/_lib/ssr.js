// ============================================================
// KIRA RESEARCH — api/_lib/ssr.js
// Helpers for api/ssr.js: server-rendered HTML for transcripts, insights, reports and coming-soon
// pages. The page templates (public/en/<type>/_view.html) stay the single source of layout and
// client behaviour; the server fills <title>, meta, link tags, JSON-LD and the content between the
// <!--SSR-->…<!--/SSR--> markers of the root container. The client script still renders over it.
// ============================================================
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const BASE = 'https://kiraresearch.com';
export const LOCALES = ['en', 'ja', 'ko', 'zh'];
export const HREFLANG = { en: 'en', ja: 'ja', ko: 'ko', zh: 'zh-Hans' };
export const OG_LOCALE = { en: 'en_US', ja: 'ja_JP', ko: 'ko_KR', zh: 'zh_CN' };

export const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// JSON for an inline <script type="application/ld+json">: no "</script>" can end it early.
export const ldJson = (o) => JSON.stringify(JSON.parse(JSON.stringify(o))).replace(/</g, '\\u003c');

const TEMPLATE_FILES = {
  report: 'public/en/reports/_view.html',
  insight: 'public/en/insights/_view.html',
  transcript: 'public/en/experts/transcripts/_view.html',
};
const TEMPLATE_URLS = {
  report: '/en/reports/_view',
  insight: '/en/insights/_view',
  transcript: '/en/experts/transcripts/_view',
};
const cache = new Map();   // type → { at, html }
const TTL = 5 * 60 * 1000;

// The static template: from the function bundle (includeFiles), else from the site itself.
export async function loadTemplate(type, req) {
  const hit = cache.get(type);
  if (hit && Date.now() - hit.at < TTL) return hit.html;
  let html = null;
  try { html = await readFile(path.join(process.cwd(), TEMPLATE_FILES[type]), 'utf8'); } catch (_e) { /* not bundled */ }
  if (!html) {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    const origin = /^(www\.)?kiraresearch\.com$|\.vercel\.app$|^localhost(:\d+)?$/.test(host)
      ? `${/^localhost/.test(host) ? 'http' : 'https'}://${host}` : BASE;
    const r = await fetch(origin + TEMPLATE_URLS[type], { headers: { 'user-agent': 'kira-ssr' } });
    if (!r.ok) throw new Error(`template ${type}: ${r.status}`);
    html = await r.text();
  }
  cache.set(type, { at: Date.now(), html });
  return html;
}

// Replace one attribute of the <meta>/<link> tag that carries id="…".
function setById(html, id, attr, value) {
  const tag = new RegExp(`<(?:meta|link)\\b[^>]*\\bid="${id}"[^>]*>`);
  return html.replace(tag, (m) => m.replace(new RegExp(`(\\b${attr}=")[^"]*(")`), (_x, a, b) => a + esc(value) + b));
}

// opts: { locale, title, description, canonical, ogImage, robots, hreflang:[{locale,url}], xDefault, ld:[{id,data}], extraHead, content, ogType }
export function fillTemplate(html, opts) {
  const { locale, title, description, canonical, ogImage, robots, content } = opts;
  let out = html;
  out = out.replace(/<html lang="[^"]*"/, `<html lang="${HREFLANG[locale] || locale}"`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(title)}</title>`);
  out = out.replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${esc(description)}" />`);
  out = setById(out, 'meta-canonical', 'href', canonical);
  out = setById(out, 'meta-og-title', 'content', title);
  out = setById(out, 'meta-og-description', 'content', description);
  out = setById(out, 'meta-og-url', 'content', canonical);
  out = setById(out, 'meta-og-locale', 'content', OG_LOCALE[locale] || 'en_US');
  out = setById(out, 'meta-tw-title', 'content', title);
  out = setById(out, 'meta-tw-description', 'content', description);
  if (ogImage) { out = setById(out, 'meta-og-image', 'content', ogImage); out = setById(out, 'meta-tw-image', 'content', ogImage); }

  let head = '';
  if (robots) head += `<meta name="robots" content="${esc(robots)}" />\n`;
  for (const h of opts.hreflang || []) head += `<link rel="alternate" hreflang="${esc(HREFLANG[h.locale])}" href="${esc(h.url)}" data-ssr="1" />\n`;
  if (opts.xDefault) head += `<link rel="alternate" hreflang="x-default" href="${esc(opts.xDefault)}" data-ssr="1" />\n`;
  for (const l of opts.ld || []) head += `<script type="application/ld+json" id="${l.id}">${ldJson(l.data)}</script>\n`;
  out = out.replace('</head>', () => head + '</head>');

  const re = /<!--SSR-->[\s\S]*?<!--\/SSR-->/;
  if (!re.test(out)) throw new Error('SSR markers missing in template');
  out = out.replace(re, () => content);
  return out;
}

export function send(res, html, status = 200) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(status).send(html);
}

export const crumbJson = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.item })),
});

export const titleCase = (s) => String(s || '').replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
export const plain = (s) => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
