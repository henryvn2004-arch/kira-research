// ============================================================
// KIRA RESEARCH — api/checkout-status.js
// Public. What can be bought right now, so pages can show the right button without a deploy
// (the switches are on /en/admin/config → Checkout).
//   GET /api/checkout-status → { report, transcript, subscription (Month), annual } each { enabled, price }
// ============================================================
import { getConfig } from './_lib/config.js';
import { REPORT_PRICE_DEFAULT, TRANSCRIPT_PRICE, SUBSCRIPTION_MONTH_PRICE, SUBSCRIPTION_YEAR_PRICE } from './_lib/pricing.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.status(200).json({
    report: { enabled: await getConfig('checkout.single_report_enabled'), price: REPORT_PRICE_DEFAULT },
    transcript: { enabled: await getConfig('checkout.transcript_enabled'), price: TRANSCRIPT_PRICE },
    subscription: { enabled: await getConfig('checkout.subscription_enabled'), price: SUBSCRIPTION_MONTH_PRICE },
    annual: { enabled: await getConfig('checkout.annual_enabled'), price: SUBSCRIPTION_YEAR_PRICE }
  });
}
