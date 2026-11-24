// ============================================================
// KIRA RESEARCH — api/econ-page.js
//   GET /api/econ-page?loc=en&slug=vietnam   (vercel.json rewrites /<loc>/data/<slug> here)
// The market-data page of one country with its lead sentence, figures, tables, sources and Dataset JSON-LD already in
// the HTML (api/_lib/econ/page.js), so a crawler or answer engine that does not run scripts sees the numbers. The browser
// script public/js/econ-view.js still renders over it (charts, Excel, dashboard). Same index/noindex rule as the sitemap
// (api/_lib/econ/coverage.js, via `indexable` of the data). Anything that is not a known country (company-moves pages,
// unknown slug) or any failure serves the template unchanged, as before.
// ============================================================
import { LOCALES, HREFLANG, BASE, esc, loadStatic } from './_lib/ssr.js';
import { loadBase, loadCountry } from './_lib/econ/load.js';
import { econPage } from './_lib/econ/page.js';

const FILE = 'public/en/data/_econ.html';
const URLP = '/en/data/_econ';

export function fillEcon(html, loc, slug, page) {
  let out = html.replace(/<html lang="[^"]*"/, `<html lang="${HREFLANG[loc] || loc}"`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(page.title)}</title>`);
  out = out.replace(/<meta name="description"[^>]*>/, () => `<meta name="description" content="${esc(page.description)}" />`);
  out = out.replace(/<meta name="robots"[^>]*>/, () => `<meta name="robots" content="${page.robots}" />`);
  let head = `<link rel="canonical" href="${esc(page.pageUrl)}" />\n`;
  if (page.ld) {
    for (const l of LOCALES) head += `<link rel="alternate" hreflang="${HREFLANG[l]}" href="${BASE}/${l}/data/${esc(slug)}" />\n`;
    head += `<link rel="alternate" hreflang="x-default" href="${BASE}/en/data/${esc(slug)}" />\n`;
    head += `<script type="application/ld+json" id="ld-dataset">${page.ld}</script>\n`;
  }
  out = out.replace('</head>', () => head + '</head>');
  out = out.replace(/(id="ed-root")>[\s\S]*?<\/main>/, (_m, a) => `${a} data-ssr="1">${page.content}</main>`);
  out = out.replace(/(<a href=")\/en\/data\/(" id="ed-crumb-data")/, (_m, a, b) => `${a}/${loc}/data/${b}`);
  out = out.replace(/(id="ed-crumb-country">)<\/span>/, (_m, a) => `${a}${esc(page.countryName)}</span>`);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const loc = LOCALES.includes(url.searchParams.get('loc')) ? url.searchParams.get('loc') : 'en';
  const slug = String(url.searchParams.get('slug') || '').toLowerCase();
  let html;
  try { html = await loadStatic('econ-view', FILE, URLP, req); } catch (e) {
    console.error('[econ-page] template', e.message);
    res.status(500).send('Server error');
    return;
  }
  let out = html, ok = false;
  try {
    if (/^[a-z0-9-]{2,40}$/.test(slug)) {
      const base = await loadBase();
      const data = base.sources.length ? await loadCountry(base, slug) : null;
      if (data) { out = fillEcon(html, loc, data.country.slug, econPage(data, loc)); ok = true; }
    }
  } catch (e) { console.error('[econ-page]', slug, e.message); }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  // Vercel CDN: 1 hour fresh, a day stale while it refreshes. Pages that did not render stay out of the CDN.
  res.setHeader('Vercel-CDN-Cache-Control', ok ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'no-store');
  res.status(200).send(out);
}
