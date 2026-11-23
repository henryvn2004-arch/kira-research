// ============================================================
// KIRA RESEARCH — api/market-map-order.js
// Stub for the market-map list order (Excel, $49 up to 500 companies, $99 above).
// The real flow (payment, then the file built by the private pipeline through the BizDirect API) comes later.
// Until then every call answers 501 and no money or data moves. Only reachable from a page where
// checkout.list_enabled is on; that setting is off by default.
//   POST /api/market-map-order { slug }  ->  501 { error: 'not_implemented', message }
// ============================================================
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  res.status(501).json({ error: 'not_implemented', message: 'Ordering opens soon. Leave your email on the request form and we will write to you.' });
}
