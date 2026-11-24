// ============================================================
// KIRA RESEARCH — api/listing.js
//   GET /api/listing?type=library|insights|transcripts&loc=en      (vercel.json rewrites point here)
// The static listing page (public/<loc>/<library|insights>/_list.html, public/en/experts/transcripts/_list.html)
// with a plain server-rendered list of the newest items inside its container. Any failure serves the
// unchanged page. The page script still renders over it.
// ============================================================
import { LOCALES, loadStatic } from './_lib/ssr.js';
import { TYPES, listItems, listHtml, injectList } from './_lib/listing.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
async function sb(p) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

const FILE = (type, loc) => (type === 'transcripts' ? 'public/en/experts/transcripts/_list.html' : `public/${loc}/${type === 'library' ? 'library' : 'insights'}/_list.html`);
const URLP = (type, loc) => (type === 'transcripts' ? '/en/experts/transcripts/_list' : `/${loc}/${type === 'library' ? 'library' : 'insights'}/_list`);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const type = url.searchParams.get('type');
  let loc = url.searchParams.get('loc');
  if (!TYPES.includes(type)) { res.status(404).send('Not found'); return; }
  if (!LOCALES.includes(loc) || type === 'transcripts') loc = 'en';
  try {
    const html = await loadStatic(`list-${type}-${loc}`, FILE(type, loc), URLP(type, loc), req);
    let out = html;
    try { out = injectList(html, type, listHtml(type, loc, await listItems(sb, type, loc))); } catch (e) { console.error('[listing]', type, e.message); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Browsers revalidate (vercel.json sets max-age=0 for every path and overrides Cache-Control here); the Vercel CDN keeps the
    // page 1 hour and serves it stale for a day while it refreshes. Vercel-CDN-Cache-Control is not touched by vercel.json header rules.
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(out);
  } catch (e) {
    console.error('[listing] template', type, e.message);
    res.status(500).send('Server error');
  }
}
