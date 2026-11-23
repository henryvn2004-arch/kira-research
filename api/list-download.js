// ============================================================
// KIRA RESEARCH — api/list-download.js
//   GET /api/list-download?token=<download_token>
// Serves the Excel file of a paid market-map list from the private bucket. The token is the secret (random, in
// list_purchases); a link works for 7 days after the file is ready and for at most 5 downloads. The counter is
// bumped with a conditional update, so two parallel requests cannot pass the limit.
// ============================================================
import { sb, BUCKET } from './_lib/lists.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const token = String((req.query || {}).token || '');
  if (!/^[0-9a-f]{48}$/.test(token)) { res.status(404).json({ error: 'not_found' }); return; }
  try {
    const rows = await sb(`list_purchases?download_token=eq.${token}&status=eq.completed&build_status=eq.ready&select=id,slug,file_path,expires_at,download_count,max_downloads,market_maps(title)&limit=1`);
    const p = rows[0];
    if (!p || !p.file_path) { res.status(404).json({ error: 'not_found' }); return; }
    if (new Date(p.expires_at) <= new Date()) { res.status(410).json({ error: 'link_expired', message: 'This download link has expired. Reply to your receipt email and we will help.' }); return; }
    if (p.download_count >= p.max_downloads) { res.status(410).json({ error: 'downloads_used', message: 'This link has reached its download limit. Reply to your receipt email and we will help.' }); return; }
    const bumped = await sb(`list_purchases?id=eq.${p.id}&download_count=eq.${p.download_count}`, 'PATCH', { download_count: p.download_count + 1 });
    if (!bumped || !bumped.length) { res.status(409).json({ error: 'try_again' }); return; }
    const f = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${p.file_path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
    if (!f.ok) { await sb(`list_purchases?id=eq.${p.id}`, 'PATCH', { download_count: p.download_count }); res.status(502).json({ error: 'file_unavailable' }); return; }
    const name = `${(p.market_maps?.title || p.slug).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}_company-list.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.status(200).send(Buffer.from(await f.arrayBuffer()));
  } catch (err) {
    console.error('[list-download] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
