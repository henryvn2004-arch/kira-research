// ============================================================
// KIRA RESEARCH — api/indexnow-key.js
//   GET /indexnow.txt   (vercel.json rewrite) → the IndexNow key from env INDEXNOW_KEY, as plain text.
// 404 while the env is not set. The key value is never committed.
// ============================================================
import { indexNowKey } from './_lib/indexnow.js';

export default function handler(req, res) {
  const key = indexNowKey();
  if (!key) { res.status(404).send('Not found'); return; }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
  res.status(200).send(key);
}
