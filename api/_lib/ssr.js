// ============================================================
// KIRA RESEARCH — api/_lib/ssr.js
// Helpers for api/ssr.js: server-rendered HTML for transcripts, insights, reports and coming-soon
// pages. The page templates (public/en/<type>/_view.html) stay the single source of layout and
// client behaviour; the server fills <title>, meta, link tags, JSON-LD and the content between the
// <!--SSR-->…<!--/SSR--> markers of the root container. The client script still renders over it.
// ============================================================
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { orgLdTag } from './org-ld.js';

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
  hub: 'public/en/markets/_view.html',
};
const TEMPLATE_URLS = {
  report: '/en/reports/_view',
  insight: '/en/insights/_view',
  transcript: '/en/experts/transcripts/_view',
  hub: '/en/markets/_view',
};
const cache = new Map();   // type → { at, html }
const TTL = 5 * 60 * 1000;

// A static page file: from the function bundle (includeFiles), else from the site itself.
export async function loadStatic(key, file, urlPath, req) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.html;
  let html = null;
  try { html = await readFile(path.join(process.cwd(), file), 'utf8'); } catch (_e) { /* not bundled */ }
  if (!html) {
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    const origin = /^(www\.)?kiraresearch\.com$|\.vercel\.app$|^localhost(:\d+)?$/.test(host)
      ? `${/^localhost/.test(host) ? 'http' : 'https'}://${host}` : BASE;
    const r = await fetch(origin + urlPath, { headers: { 'user-agent': 'kira-ssr' } });
    if (!r.ok) throw new Error(`template ${key}: ${r.status}`);
    html = await r.text();
  }
  cache.set(key, { at: Date.now(), html });
  return html;
}
export const loadTemplate = (type, req) => loadStatic(type, TEMPLATE_FILES[type], TEMPLATE_URLS[type], req);

// Replace one attribute of the <meta>/<link> tag that carries id="…".
function setById(html, id, attr, value) {
  const tag = new RegExp(`<(?:meta|link)\\b[^>]*\\bid="${id}"[^>]*>`);
  return html.replace(tag, (m) => m.replace(new RegExp(`(\\b${attr}=")[^"]*(")`), (_x, a, b) => a + esc(value) + b));
}

// Audience tags for Google Ads remarketing (W5): read by /js/consent.js, sent as the GA4 view_item event. No personal data.
const ISO2 = { vietnam: 'VN', 'viet-nam': 'VN', thailand: 'TH', singapore: 'SG', indonesia: 'ID', japan: 'JP', 'south-korea': 'KR', korea: 'KR', taiwan: 'TW', malaysia: 'MY', philippines: 'PH', australia: 'AU', 'new-zealand': 'NZ', 'hong-kong': 'HK', cambodia: 'KH', laos: 'LA', myanmar: 'MM', brunei: 'BN' };
export function audMeta(a) {
  const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9_]+/g, '-').replace(/^-+|-+$/g, '');
  const o = { ...(a || {}) };
  const cs = o.country ? slug(o.country) : '';
  const iso = ISO2[cs] || (/^[a-z]{2}$/.test(cs) && Object.values(ISO2).includes(cs.toUpperCase()) ? cs.toUpperCase() : '');
  delete o.country;   // country = ISO2 upper case (same as BizDirect); unknown country → no param, never a wrong value
  const q = [...(iso ? [`country=${iso}`, `country_slug=${encodeURIComponent(cs)}`] : []),
    ...Object.entries(o).filter(([, v]) => v && slug(v)).map(([k, v]) => `${k}=${encodeURIComponent(slug(v))}`)].join('&');
  return q ? `<meta name="kira-audience" content="${esc(q)}" />\n` : '';
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
  if (opts.aud) head += audMeta(opts.aud);
  if (robots) head += `<meta name="robots" content="${esc(robots)}" />\n`;
  for (const h of opts.hreflang || []) head += `<link rel="alternate" hreflang="${esc(HREFLANG[h.locale])}" href="${esc(h.url)}" data-ssr="1" />\n`;
  if (opts.xDefault) head += `<link rel="alternate" hreflang="x-default" href="${esc(opts.xDefault)}" data-ssr="1" />\n`;
  if (!(opts.ld || []).some((l) => l.id === 'ld-organization')) head += orgLdTag(locale) + '\n';
  for (const l of opts.ld || []) head += `<script type="application/ld+json" id="${l.id}">${ldJson(l.data)}</script>\n`;
  out = out.replace('</head>', () => head + '</head>');

  const re = /<!--SSR-->[\s\S]*?<!--\/SSR-->/;
  if (!re.test(out)) throw new Error('SSR markers missing in template');
  out = out.replace(re, () => content);
  // Optional second slots outside the page root (the client script does not touch them): <!--KQ-->…<!--/KQ-->
  for (const [name, html] of Object.entries(opts.slots || {})) {
    out = out.replace(new RegExp(`<!--${name}-->[\\s\\S]*?<!--/${name}-->`), () => `<!--${name}-->${html}<!--/${name}-->`);
  }
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
