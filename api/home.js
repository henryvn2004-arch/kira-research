// ============================================================
// KIRA RESEARCH — api/home.js
//   GET /   (vercel.json rewrite) → public/_home.html (renamed so the static file does not shadow the rewrite), plus the Naver ownership <meta> when env NAVER_SITE_VERIFICATION is set.
// Any failure serves the page unchanged. Without the env this is the same HTML as before.
// ============================================================
import { loadStatic } from './_lib/ssr.js';
import { naverToken, injectNaver } from './_lib/naver.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  try {
    const html = await loadStatic('home', 'public/_home.html', '/_home.html', req);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(injectNaver(html, naverToken()));
  } catch (e) {
    console.error('[home]', e.message);
    res.status(500).send('Server error');
  }
}
