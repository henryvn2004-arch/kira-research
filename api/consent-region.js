// ============================================================
// KIRA RESEARCH — api/consent-region.js
// Public, tiny. { country: "DE" } from Vercel's x-vercel-ip-country header, so the cookie banner shows only where consent is needed
// (EEA, UK, CH). Nothing is stored; the browser keeps the answer one day. No IP is read or logged.
// ============================================================
export default function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const raw = String(req.headers['x-vercel-ip-country'] || '').toUpperCase();
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.status(200).json({ country: /^[A-Z]{2}$/.test(raw) ? raw : null });
}
