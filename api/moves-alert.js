// ============================================================
// KIRA RESEARCH — api/moves-alert.js
// Kira Data (D7): "email me new moves" for a corridor (investor → host market), one market, or one investor.
// Double opt-in: a sign-up is 'pending' until the reader clicks the link in the confirmation email; only
// 'active' alerts get the daily digest (/api/cron-moves-alerts). Every digest carries the unsubscribe link.
//
//   POST /api/moves-alert                    { email, host?, investor?, locale?, hp, attr? }  → { ok: true }
//   GET  /api/moves-alert?t=<token>&a=confirm  → 302 to the page the alert is about (?alert=confirmed)
//   GET  /api/moves-alert?t=<token>&a=unsub    → 302 (?alert=stopped)
//   POST /api/moves-alert?t=<token>&a=unsub    → 200 (one-click unsubscribe from the mail client, RFC 8058)
//
// The confirmation email is capped so the form can not be used to mail strangers: at most 3 per address
// per 24 h and 10 per IP per hour. A repeat sign-up is a silent success.
// ============================================================

import { sendMovesAlertConfirm } from './_lib/email.js';
import { cleanAttr } from './_lib/attribution.js';
import { alertLabel, alertPath } from './_lib/moves/alerts.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APP_URL              = process.env.APP_URL || 'https://kiraresearch.com';
const CONFIRM_PER_EMAIL_DAY = 3, CONFIRM_PER_IP_HOUR = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALES  = new Set(['en', 'ja', 'ko', 'zh']);
const HOSTS    = new Set(['VN', 'ID', 'TH', 'MY', 'PH', 'SG', 'TW', 'AU', 'NZ', 'KH', 'LA', 'MM', 'BN', 'JP', 'KR']);
const clean = (s, max) => (typeof s === 'string' ? s : '').trim().slice(0, max);
const H = (prefer) => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) });

async function sb(path, method = 'GET', body, prefer) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: H(prefer), body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 || !(r.headers.get('content-type') || '').includes('json') ? null : r.json();
}
async function count(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...H(), Prefer: 'count=exact', Range: '0-0' } });
  const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
  return m ? Number(m[1]) : 0;
}

// Sends the confirmation email unless this address or IP already had its share; never throws.
async function confirm(row, ip) {
  try {
    const day = new Date(Date.now() - 864e5).toISOString(), hour = new Date(Date.now() - 36e5).toISOString();
    if (await count(`moves_alerts?email=eq.${encodeURIComponent(row.email)}&confirm_sent_at=gte.${day}&select=id`) >= CONFIRM_PER_EMAIL_DAY) return;
    if (ip && await count(`moves_alerts?ip_address=eq.${encodeURIComponent(ip)}&confirm_sent_at=gte.${hour}&select=id`) >= CONFIRM_PER_IP_HOUR) return;
    const label = alertLabel(row);
    const ok = await sendMovesAlertConfirm({ to: row.email, label, confirmUrl: `${APP_URL}/api/moves-alert?t=${row.token}&a=confirm` });
    if (ok) await sb(`moves_alerts?id=eq.${row.id}`, 'PATCH', { confirm_sent_at: new Date().toISOString() });
  } catch (err) { console.error('[moves-alert] confirmation failed:', err.message); }
}

async function byToken(token) {
  if (!/^[a-f0-9]{20,64}$/.test(token)) return null;
  const rows = await sb(`moves_alerts?token=eq.${token}&select=id,email,host_country,investor_country,locale,status&limit=1`);
  return rows && rows[0] ? rows[0] : null;
}

// Newest published move: an alert starts after it, so the first digest holds only moves published after confirming.
async function newestEventId() {
  const rows = await sb('company_events?status=eq.published&select=id&order=id.desc&limit=1');
  return rows && rows[0] ? rows[0].id : 0;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const url = new URL(req.url, 'https://x');
  const token = String(url.searchParams.get('t') || '');
  const action = String(url.searchParams.get('a') || '');

  // ---- links from the emails ----
  if (token && (action === 'confirm' || action === 'unsub')) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    try {
      const row = await byToken(token);
      if (!row) return req.method === 'GET' ? res.redirect(302, '/en/data/moves?alert=unknown') : res.status(404).json({ error: 'not_found' });
      const now = new Date().toISOString();
      if (action === 'confirm' && row.status !== 'active') {
        await sb(`moves_alerts?id=eq.${row.id}`, 'PATCH', { status: 'active', confirmed_at: now, unsubscribed_at: null, last_event_id: await newestEventId() });
      }
      if (action === 'unsub' && row.status !== 'unsubscribed') {
        await sb(`moves_alerts?id=eq.${row.id}`, 'PATCH', { status: 'unsubscribed', unsubscribed_at: now });
      }
      if (req.method === 'POST') return res.status(200).json({ ok: true });
      return res.redirect(302, alertPath(row, { alert: action === 'confirm' ? 'confirmed' : 'stopped' }));
    } catch (err) {
      console.error('[moves-alert] link failed:', err.message);
      return req.method === 'GET' ? res.redirect(302, '/en/data/moves?alert=error') : res.status(500).json({ error: 'server_error' });
    }
  }

  // ---- sign-up ----
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }
  if (!body || typeof body !== 'object') body = {};
  if (body.hp && String(body.hp).trim() !== '') return res.status(200).json({ ok: true });   // honeypot

  const email    = clean(body.email, 200).toLowerCase();
  const host     = clean(body.host, 2).toUpperCase() || null;
  const investor = clean(body.investor, 2).toUpperCase() || null;
  const locale   = LOCALES.has(clean(body.locale, 8).toLowerCase()) ? clean(body.locale, 8).toLowerCase() : 'en';
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'email_invalid' });
  if (host && !HOSTS.has(host)) return res.status(400).json({ error: 'host_invalid' });
  if (investor && !/^[A-Z]{2}$/.test(investor)) return res.status(400).json({ error: 'investor_invalid' });
  if (!host && !investor) return res.status(400).json({ error: 'host_or_investor_required' });
  if (host && investor && host === investor) return res.status(400).json({ error: 'same_country' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
  try {
    const filt = `email=eq.${encodeURIComponent(email)}&host_country=${host ? 'eq.' + host : 'is.null'}&investor_country=${investor ? 'eq.' + investor : 'is.null'}`;
    let row = (await sb(`moves_alerts?${filt}&select=id,email,host_country,investor_country,locale,status,token&limit=1`))[0];
    if (row && row.status === 'active') return res.status(200).json({ ok: true });
    if (row) {
      if (row.status === 'unsubscribed') await sb(`moves_alerts?id=eq.${row.id}`, 'PATCH', { status: 'pending', locale });
    } else {
      const insert = { email, host_country: host, investor_country: investor, locale, ip_address: ip };
      const attribution = cleanAttr(body.attr);
      if (attribution) insert.attribution = attribution;
      row = (await sb('moves_alerts', 'POST', insert, 'return=representation'))[0];
    }
    await confirm({ ...row, locale }, ip);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[moves-alert] write failed:', err.message);
    return res.status(500).json({ error: 'insert_failed' });
  }
}
