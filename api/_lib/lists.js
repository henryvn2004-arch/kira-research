// ============================================================
// KIRA RESEARCH — api/_lib/lists.js
// Shared by api/list-buy.js (capture, build retry), api/list-download.js and api/library-my-purchases.js.
// Build the file for a paid list, store it in the private bucket, open the 7-day / 5-download window, email the link.
// ============================================================
import { randomBytes } from 'node:crypto';
import { buildList } from './list-source.js';
import { sendPurchaseReceipt } from './email.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL = process.env.APP_URL || 'https://kiraresearch.com';
export const BUCKET = 'market-lists';
export const LINK_DAYS = 7;
export const MAX_DOWNLOADS = 5;
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,80}\/[a-z0-9][a-z0-9-]{0,80}$/;

export async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json',
      Prefer: method === 'POST' || method === 'PATCH' ? 'return=representation' : '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// A link a buyer can still use: file ready, not expired, downloads left.
export const linkLive = (p) => p.build_status === 'ready' && p.download_token && p.expires_at && new Date(p.expires_at) > new Date() && p.download_count < p.max_downloads;
export const downloadUrl = (p) => `${APP_URL}/api/list-download?token=${p.download_token}`;

// Build + store + open the link + send the email. Never throws: a failed build leaves the purchase 'pending'/'failed'
// (the buyer has paid) and the receipt says the file is being prepared. Returns the updated purchase row.
export async function finishBuild(purchase, buyerEmail, title) {
  const id = purchase.id;
  let built = null;
  try {
    built = await buildList({ slug: purchase.slug, orderId: purchase.paypal_order_id, nCompanies: purchase.n_companies });
  } catch (err) {
    console.error('[lists] build failed for purchase', id, err.message);
    try { await sb(`list_purchases?id=eq.${id}`, 'PATCH', { build_status: 'failed', build_error: String(err.message).slice(0, 300) }); } catch (_e) { /* logged above */ }
  }
  let row = { ...purchase, build_status: built ? purchase.build_status : 'failed' };
  if (built) {
    const filePath = `${id}.xlsx`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filePath}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'x-upsert': 'true',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      body: built.bytes,
    });
    if (!up.ok) {
      console.error('[lists] storage upload failed', up.status);
      await sb(`list_purchases?id=eq.${id}`, 'PATCH', { build_status: 'failed', build_error: `storage ${up.status}` });
    } else {
      const patch = { build_status: 'ready', build_error: null, file_path: filePath, download_token: randomBytes(24).toString('hex'),
        expires_at: new Date(Date.now() + LINK_DAYS * 86400000).toISOString(), download_count: 0, max_downloads: MAX_DOWNLOADS };
      const upd = await sb(`list_purchases?id=eq.${id}`, 'PATCH', patch);
      row = Array.isArray(upd) ? upd[0] : { ...row, ...patch };
    }
  }
  sendPurchaseReceipt({
    buyerEmail, slug: purchase.slug, locale: 'en', amount: Number(purchase.amount), currency: purchase.currency || 'USD', reportTitle: title,
    kind: 'list', downloadUrl: row.build_status === 'ready' ? downloadUrl(row) : null, pending: row.build_status !== 'ready',
  }).catch((e) => console.error('[lists] receipt threw:', e.message));
  return row;
}
