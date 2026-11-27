// ============================================================
// KIRA RESEARCH — api/report-alert.js
// "Email me when KIRA publishes new reports / market maps on <country> [/ <industry>]" (stage 1, 2026-11-27).
// No account. Double opt-in like /api/moves-alert: a sign-up is 'pending' until the reader clicks the link in the
// confirmation email; only 'active' alerts get the weekly digest (api/cron-sequences.js, at most 5 items, with price).
// The confirmation email carries one free sample: the link to the free PREVIEW page of the newest report on that
// country (never a full file).
//
//   POST /api/report-alert                          { email, country, industry?, locale?, path?, hp, attr? } → { ok: true }
//   GET  /api/report-alert?t=<token>&a=confirm      → 302 to the library for that country (?alert=confirmed)
//   GET  /api/report-alert?t=<token>&a=unsub        → 302 (?alert=stopped)
//   POST /api/report-alert?t=<token>&a=unsub        → 200 (one-click unsubscribe, RFC 8058)
//   GET|POST /api/report-alert?a=optout&e=<email>&s=<hmac>   opt out of the nurture emails (reminders, related reports,
//                                                   abandoned-checkout); also stops that address's alerts. GET shows a
//                                                   confirmation page, POST (mail client one-click) acts at once.
// Same caps as the other forms: 3 confirmation emails per address per 24 h, 10 per IP per hour; a repeat is a silent success.
// ============================================================

import { sendReportAlertConfirm } from './_lib/email-nurture.js';
import { cleanAttr } from './_lib/attribution.js';
import { getConfig } from './_lib/config.js';
import { slugify, verifyEmailSig } from './_lib/sequences.js';
import { normLocale } from './_lib/email-i18n.js';
import { sb } from './_lib/seq-data.js';

const APP_URL = process.env.APP_URL || 'https://kiraresearch.com';
const CONFIRM_PER_EMAIL_DAY = 3, CONFIRM_PER_IP_HOUR = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (s, max) => (typeof s === 'string' ? s : '').trim().slice(0, max);
const titleCase = (slug) => String(slug).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

async function count(path) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, Prefer: 'count=exact', Range: '0-0' } });
  const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
  return m ? Number(m[1]) : 0;
}

// Newest published report on the country (same industry first): the free sample in the confirmation email.
async function sampleFor(country, industry, loc) {
  const c = encodeURIComponent(country.replace(/-/g, '*'));
  const rows = await sb(`living_reports?status=eq.published&country=ilike.${c}&select=id,slug,industry,published_at&order=published_at.desc.nullslast&limit=20`).catch(() => []);
  if (!rows.length) return null;
  const r = (industry && rows.find((x) => slugify(x.industry) === industry)) || rows[0];
  const tt = await sb(`report_translations?report_id=eq.${r.id}&locale=in.(${loc},en)&select=locale,title`).catch(() => []);
  const title = (tt.find((t) => t.locale === loc) || tt.find((t) => t.locale === 'en') || {}).title || r.slug;
  return { title, url: `${APP_URL}/${loc}/reports/${r.slug}` };
}

async function confirmMail(row, ip) {
  try {
    const day = new Date(Date.now() - 864e5).toISOString(), hour = new Date(Date.now() - 36e5).toISOString();
    if (await count(`report_alerts?email=eq.${encodeURIComponent(row.email)}&confirm_sent_at=gte.${day}&select=id`) >= CONFIRM_PER_EMAIL_DAY) return;
    if (ip && await count(`report_alerts?ip_address=eq.${encodeURIComponent(ip)}&confirm_sent_at=gte.${hour}&select=id`) >= CONFIRM_PER_IP_HOUR) return;
    const loc = normLocale(row.locale);
    const what = [titleCase(row.country), row.industry ? titleCase(row.industry) : null].filter(Boolean).join(' · ');
    const ok = await sendReportAlertConfirm({ to: row.email, loc, what, confirmUrl: `${APP_URL}/api/report-alert?t=${row.token}&a=confirm`,
      sample: await sampleFor(row.country, row.industry, loc) });
    if (ok) await sb(`report_alerts?id=eq.${row.id}`, 'PATCH', { confirm_sent_at: new Date().toISOString() }, 'return=minimal');
  } catch (err) { console.error('[report-alert] confirmation failed:', err.message); }
}

const byToken = async (t) => (/^[a-f0-9]{20,64}$/.test(t) ? (await sb(`report_alerts?token=eq.${t}&select=id,email,country,locale,status&limit=1`))[0] || null : null);

const page = (msg) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>KIRA RESEARCH</title><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:15vh auto;padding:0 24px;line-height:1.55"><p style="font-size:13px;letter-spacing:.08em;color:#666">KIRA RESEARCH</p>${msg}</body>`;

async function optout(email) {
  await sb('email_optouts', 'POST', { email, source: 'link' }, 'resolution=ignore-duplicates,return=minimal');
  await sb(`report_alerts?email=eq.${encodeURIComponent(email)}&status=neq.unsubscribed`, 'PATCH', { status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }, 'return=minimal').catch(() => {});
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const url = new URL(req.url, 'https://x');
  const token = String(url.searchParams.get('t') || ''), action = String(url.searchParams.get('a') || '');

  // ---- opt out of the nurture emails (signed link, no account) ----
  if (action === 'optout') {
    const email = clean(url.searchParams.get('e'), 200).toLowerCase(), sig = String(url.searchParams.get('s') || '');
    if (!EMAIL_RE.test(email) || !verifyEmailSig(email, sig)) return res.status(400).send(page('<p>This link is not valid.</p>'));
    try {
      if (req.method === 'POST') { await optout(email); return res.status(200).json({ ok: true }); }
      if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
      if (url.searchParams.get('confirm') === '1') { await optout(email); return res.status(200).send(page('<h1 style="font-size:20px">You are unsubscribed.</h1><p>We will not send you reminders or recommendations. Receipts for anything you buy still arrive.</p>')); }
      // GET only asks (mail scanners open links): the button makes the second request.
      return res.status(200).send(page(`<h1 style="font-size:20px">Stop these emails?</h1><form method="get"><input type="hidden" name="a" value="optout"><input type="hidden" name="e" value="${email.replace(/[^a-z0-9@._+-]/g, '')}"><input type="hidden" name="s" value="${sig.replace(/[^A-Za-z0-9_-]/g, '')}"><input type="hidden" name="confirm" value="1"><button style="padding:10px 18px;font-size:14px">Unsubscribe</button></form>`));
    } catch (err) { console.error('[report-alert] optout failed:', err.message); return res.status(500).send(page('<p>Something went wrong. Please reply to any of our emails and we will remove you.</p>')); }
  }

  // ---- links from the alert emails ----
  if (token && (action === 'confirm' || action === 'unsub')) {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    try {
      const row = await byToken(token);
      if (!row) return req.method === 'GET' ? res.redirect(302, '/en/library?alert=unknown') : res.status(404).json({ error: 'not_found' });
      const now = new Date().toISOString();
      if (action === 'confirm' && row.status !== 'active') await sb(`report_alerts?id=eq.${row.id}`, 'PATCH', { status: 'active', confirmed_at: now, last_digest_at: now, unsubscribed_at: null }, 'return=minimal');
      if (action === 'unsub' && row.status !== 'unsubscribed') await sb(`report_alerts?id=eq.${row.id}`, 'PATCH', { status: 'unsubscribed', unsubscribed_at: now }, 'return=minimal');
      if (req.method === 'POST') return res.status(200).json({ ok: true });
      return res.redirect(302, `/${normLocale(row.locale)}/library?country=${encodeURIComponent(row.country)}&alert=${action === 'confirm' ? 'confirmed' : 'stopped'}`);
    } catch (err) {
      console.error('[report-alert] link failed:', err.message);
      return req.method === 'GET' ? res.redirect(302, '/en/library?alert=error') : res.status(500).json({ error: 'server_error' });
    }
  }

  // ---- sign-up ----
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { return res.status(400).json({ error: 'invalid_json' }); }
  if (!body || typeof body !== 'object') body = {};
  if (body.hp && String(body.hp).trim() !== '') return res.status(200).json({ ok: true });   // honeypot
  if (!(await getConfig('notify.seq_alerts_enabled'))) return res.status(503).json({ error: 'paused' });

  const email = clean(body.email, 200).toLowerCase();
  const country = slugify(clean(body.country, 60)), industry = slugify(clean(body.industry, 80)) || null;
  const locale = normLocale(clean(body.locale, 8));
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'email_invalid' });
  if (!/^[a-z][a-z0-9-]{1,40}$/.test(country)) return res.status(400).json({ error: 'country_invalid' });
  if (industry && !/^[a-z0-9][a-z0-9-]{0,60}$/.test(industry)) return res.status(400).json({ error: 'industry_invalid' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
  try {
    const filt = `email=eq.${encodeURIComponent(email)}&country=eq.${country}&industry=${industry ? 'eq.' + industry : 'is.null'}`;
    let row = (await sb(`report_alerts?${filt}&select=id,email,country,industry,locale,status,token&limit=1`))[0];
    if (row && row.status === 'active') return res.status(200).json({ ok: true });
    if (row) {
      if (row.status === 'unsubscribed') await sb(`report_alerts?id=eq.${row.id}`, 'PATCH', { status: 'pending', locale }, 'return=minimal');
    } else {
      const insert = { email, country, industry, locale, ip_address: ip, source_path: /^\/[A-Za-z0-9/_\-.]{0,160}$/.test(String(body.path || '')) ? body.path : null };
      const attribution = cleanAttr(body.attr);
      if (attribution) insert.attribution = attribution;
      row = (await sb('report_alerts', 'POST', insert, 'return=representation'))[0];
    }
    await confirmMail({ ...row, locale }, ip);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[report-alert] write failed:', err.message);
    return res.status(500).json({ error: 'insert_failed' });
  }
}
