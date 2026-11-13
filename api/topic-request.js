// ============================================================
// KIRA RESEARCH — api/topic-request.js
// Public POST. "Email me when it is published" for a coming-soon topic, or a
// request for a keyword that matches no topic. Nothing is charged.
//
// POST /api/topic-request  { email, topic?, keyword?, locale?, hp }
//   topic    slug of a topic (coming-soon page)
//   keyword  free text, used when there is no topic (library search with no hit)
// → { ok: true }
//
// One row per (email, topic) or (email, keyword); a repeat is a silent success.
// Each request is demand signal: /en/admin/topics shows the count and
// sync-approved-topics.mjs moves requested topics up the production queue.
// ============================================================

import { sendTopicRequestConfirmation } from './_lib/email.js';
import { cleanAttr } from './_lib/attribution.js';
import { topicEta, formatEtaEn } from './_lib/eta.js';
import { getConfig } from './_lib/config.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const APP_URL  = process.env.APP_URL || 'https://kiraresearch.com';
// The instant confirmation email is capped so the form can not be used to mail strangers:
// at most 3 per address per 24 h, at most 10 per IP per hour. The request itself is always saved.
const CONFIRM_PER_EMAIL_DAY = 3, CONFIRM_PER_IP_HOUR = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCALES  = new Set(['en', 'ja', 'ko', 'zh']);
const clean = (s, max) => (typeof s === 'string' ? s : '').trim().slice(0, max);

async function sb(path, method = 'GET', body, prefer = 'return=minimal') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
               'Content-Type': 'application/json', Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (r.status === 409) return 409;
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  if (prefer === 'return=representation') return r.json();
  return r.status;
}

async function count(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, Prefer: 'count=exact', Range: '0-0' }
  });
  const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
  return m ? Number(m[1]) : 0;
}

// A topic a reader made up from a search ('requested') or a planner proposal nobody approved yet ('proposed')
// is approved the moment someone leaves an email for it, so it can be produced within the promised time
// (queue.mjs sync-topics then queues it ahead of everything else). Capped per 24 h by the owner setting
// ondemand.auto_approve_per_day because every approved topic costs one full report.
const AUTO_NOTE = 'auto-approved: a reader asked for it';
async function autoApprove(topic) {
  try {
    if (topic.status !== 'requested' && topic.status !== 'proposed') return;
    const cap = await getConfig('ondemand.auto_approve_per_day');
    if (cap <= 0) return;
    const since = new Date(Date.now() - 864e5).toISOString();
    if (await count(`topics?note=ilike.${encodeURIComponent('*auto-approved*')}&decided_at=gte.${since}&select=id`) >= cap) return;
    await sb(`topics?id=eq.${topic.id}&status=in.(requested,proposed)`, 'PATCH', {
      status: 'approved', decided_at: new Date().toISOString(), note: topic.note ? `${topic.note} · ${AUTO_NOTE}` : AUTO_NOTE
    });
  } catch (err) { console.error('[topic-request] auto-approve failed:', err.message); }
}

// First email request on a topic: record the date we promised, once (the health page flags topics past it).
async function recordPromise(topic, eta) {
  try {
    if (!eta || topic.promise_at || topic.report_id) return;
    await sb(`topics?id=eq.${topic.id}&promise_at=is.null`, 'PATCH', { promise_at: `${eta.date}T23:59:59Z` });
  } catch (err) { console.error('[topic-request] promise not recorded:', err.message); }
}

// Send the "we got your request" email unless this address or IP already had its share; never throws.
async function confirm({ id, email, ip, title, url, eta }) {
  try {
    const day = new Date(Date.now() - 86400000).toISOString(), hour = new Date(Date.now() - 3600000).toISOString();
    if (await count(`topic_requests?email=eq.${encodeURIComponent(email)}&confirmed_at=gte.${day}&select=id`) >= CONFIRM_PER_EMAIL_DAY) return;
    if (ip && await count(`topic_requests?ip_address=eq.${encodeURIComponent(ip)}&confirmed_at=gte.${hour}&select=id`) >= CONFIRM_PER_IP_HOUR) return;
    if (await sendTopicRequestConfirmation({ to: email, title, url, eta })) {
      await sb(`topic_requests?id=eq.${id}`, 'PATCH', { confirmed_at: new Date().toISOString() });
    }
  } catch (err) { console.error('[topic-request] confirmation failed:', err.message); }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }
  if (!body || typeof body !== 'object') body = {};

  // Honeypot — bots fill it, humans don't. Pretend success.
  if (body.hp && String(body.hp).trim() !== '') return res.status(200).json({ ok: true });

  const email   = clean(body.email, 200).toLowerCase();
  const slug    = clean(body.topic, 170).toLowerCase();
  const keyword = clean(body.keyword, 80).replace(/\s+/g, ' ');
  const locale  = LOCALES.has(clean(body.locale, 8).toLowerCase()) ? clean(body.locale, 8).toLowerCase() : 'en';

  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'email_invalid' });
  if (!slug && keyword.length < 3) return res.status(400).json({ error: 'topic_or_keyword_required' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;

  try {
    const row = { email, locale, ip_address: ip };
    const attribution = cleanAttr(body.attr);
    if (attribution) row.attribution = attribution;
    let title = keyword, url = `${APP_URL}/${locale}/library`, topic = null;
    if (slug) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/topics?slug=eq.${encodeURIComponent(slug)}&status=neq.rejected&select=id,title,status,note,report_id,promise_at&limit=1`, {
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      const found = r.ok ? await r.json() : [];
      if (!found.length) return res.status(404).json({ error: 'topic_not_found' });
      topic = found[0];
      row.topic_id = topic.id;
      title = topic.title || slug;
      url = `${APP_URL}/${locale}/reports/${encodeURIComponent(slug)}`;
      if (keyword) row.keyword = keyword;
    } else {
      row.keyword = keyword;
    }
    const saved = await sb('topic_requests', 'POST', row, 'return=representation');   // 409 = already requested → still success
    if (Array.isArray(saved) && saved[0]) {
      let eta = null;
      if (topic && !topic.report_id) {
        await autoApprove(topic);
        eta = await topicEta(topic.id);                // after the insert, so this request counts as "asked now"
        await recordPromise(topic, eta);
      }
      await confirm({ id: saved[0].id, email, ip, title, url, eta: eta ? formatEtaEn(eta.date) : null });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[topic-request] write failed:', err.message);
    return res.status(500).json({ error: 'insert_failed' });
  }
}
