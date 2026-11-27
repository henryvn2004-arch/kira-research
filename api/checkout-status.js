// ============================================================
// KIRA RESEARCH — api/checkout-status.js
// Public. What can be bought right now, so pages can show the right button without a deploy
// (the switches are on /en/admin/config → Checkout).
//   GET /api/checkout-status → { report, transcript, subscription (Month), annual } each { enabled, price }
// ============================================================
import { getConfig } from './_lib/config.js';
import { REPORT_PRICE_MIN, REPORT_PRICE_MAX, TRANSCRIPT_PRICE_MIN, TRANSCRIPT_PRICE_MAX, LIST_PRICE_MIN, LIST_PRICE_MAX, SUBSCRIPTION_MONTH_PRICE, SUBSCRIPTION_YEAR_PRICE } from './_lib/pricing.js';

const SUPABASE_URL = process.env.SUPABASE_URL, SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
// Lowest and highest price actually on sale, read from the data ("from $X" on the pricing page); the rule's own bounds when the read fails.
async function range(path, col, lo, hi) {
  try {
    const H = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    const q = async (dir) => (await (await fetch(`${SUPABASE_URL}/rest/v1/${path}&select=${col}&order=${col}.${dir}&limit=1`, { headers: H })).json())[0];
    const a = await q('asc'), b = await q('desc');
    if (a && b && a[col] > 0) return { from: Number(a[col]), to: Number(b[col]) };
  } catch (_e) { /* fall through */ }
  return { from: lo, to: hi };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  const rep = await range('living_reports?status=eq.published&price=gt.0', 'price', REPORT_PRICE_MIN, REPORT_PRICE_MAX);
  const tr = await range('expert_transcripts?status=eq.published', 'price', TRANSCRIPT_PRICE_MIN, TRANSCRIPT_PRICE_MAX);
  res.status(200).json({
    // price = "from-to" text kept for older callers; from/to are numbers. Company lists: from the rule's bounds (the price follows the company count).
    report: { enabled: await getConfig('checkout.single_report_enabled'), price: `${rep.from}–${rep.to}`, from: rep.from, to: rep.to },
    transcript: { enabled: await getConfig('checkout.transcript_enabled'), price: tr.from, from: tr.from, to: tr.to },
    list: { enabled: await getConfig('checkout.list_enabled'), from: LIST_PRICE_MIN, to: LIST_PRICE_MAX },
    subscription: { enabled: await getConfig('checkout.subscription_enabled'), price: SUBSCRIPTION_MONTH_PRICE },
    annual: { enabled: await getConfig('checkout.annual_enabled'), price: SUBSCRIPTION_YEAR_PRICE }
  });
}
