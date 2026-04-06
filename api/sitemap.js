// ============================================================
// KIRA RESEARCH — api/sitemap.js
// GET /api/sitemap  → returns sitemap.xml
// Add to vercel.json rewrites:
//   { "source": "/sitemap.xml", "destination": "/api/sitemap" }
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const SITE_URL  = process.env.SITE_URL || 'https://kiraresearch.com';

const STATIC_PAGES = [
  { path: '/',              priority: '1.0', changefreq: 'weekly'  },
  { path: '/report.html',  priority: '0.9', changefreq: 'monthly' },
  { path: '/compare.html', priority: '0.9', changefreq: 'monthly' },
  { path: '/tracker.html', priority: '0.9', changefreq: 'monthly' },
  { path: '/library.html', priority: '0.8', changefreq: 'daily'   },
  { path: '/insights.html',priority: '0.8', changefreq: 'daily'   },
  { path: '/pricing.html', priority: '0.7', changefreq: 'monthly' },
  { path: '/about.html',   priority: '0.5', changefreq: 'monthly' },
  { path: '/contact.html', priority: '0.4', changefreq: 'yearly'  },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

  const today = new Date().toISOString().split('T')[0];

  // Fetch dynamic pages
  const [{ data: insights }, { data: reports }] = await Promise.all([
    supabase.from('insights').select('slug, created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(200),
    supabase.from('living_reports').select('slug, updated_at').eq('status', 'active').order('updated_at', { ascending: false }).limit(200),
  ]);

  const urls = [];

  // Static pages
  for (const p of STATIC_PAGES) {
    urls.push(`
  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`);
  }

  // Insights articles
  for (const a of (insights || [])) {
    const date = a.created_at?.split('T')[0] || today;
    urls.push(`
  <url>
    <loc>${SITE_URL}/insights.html?slug=${a.slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  // Living reports
  for (const r of (reports || [])) {
    const date = r.updated_at?.split('T')[0] || today;
    urls.push(`
  <url>
    <loc>${SITE_URL}/library.html?slug=${r.slug}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}
</urlset>`;

  res.status(200).send(xml);
}
