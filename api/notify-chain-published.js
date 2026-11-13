// ============================================================
// KIRA RESEARCH — api/notify-chain-published.js
// Daily Vercel cron (vercel.json). Emails everyone who left an email on a Kira Chain search that
// found nothing (chain_requests) once a chain that matches their words is published.
// Same shape as notify-topic-published: a request is claimed (notified_at set) before sending and
// released again if the send fails, so a run can be repeated safely.
//
// Matching uses the same code as the search page (api/_lib/chain-match.js) but only counts a strong
// match (score >= 70: same name, same start, or the name inside the words). A typo-level match or a
// single shared word (scores below 70) is shown by the search page but never emailed. A request only
// counts for a chain that was updated after the request was made. Requests without an email are demand signal only and never emailed.
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>`
// (Vercel cron does this automatically).
// ============================================================

import { sendChainPublishedEmail } from './_lib/email.js';
import { logJobRun } from './_lib/jobs.js';
import { getConfig } from './_lib/config.js';
import { matchChains } from './_lib/chain-match.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;
const APP_URL              = process.env.APP_URL || 'https://kiraresearch.com';
const MIN_SCORE            = 70;

async function sb(path, method = 'GET', body, prefer) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });

  const startedAt = Date.now();
  try {
    if (!(await getConfig('notify.chain_ready_enabled'))) {
      await logJobRun('notify-chain-published', { ok: true, detail: 'paused in /en/admin/config; nobody was emailed', startedAt });
      return res.status(200).json({ ok: true, paused: true });
    }
    const [chains, countries, pending] = await Promise.all([
      sb('chains?status=eq.published&select=country_code,slug,name,aliases,updated_at&limit=500'),
      sb('tax_countries?select=code,name').catch(() => []),
      sb('chain_requests?email=not.is.null&notified_at=is.null&select=id,query,email,created_at&order=created_at.asc&limit=200')
    ]);

    let due = 0, sent = 0, failed = 0;
    for (const r of pending) {
      const hit = matchChains(r.query, chains, countries, MIN_SCORE)[0];
      if (!hit || !(new Date(r.created_at) < new Date(hit.chain.updated_at))) continue;
      due++;
      // Claim first; if another run got it, the PATCH returns no row.
      const claimed = await sb(`chain_requests?id=eq.${r.id}&notified_at=is.null`, 'PATCH',
        { notified_at: new Date().toISOString() }, 'return=representation');
      if (!claimed || !claimed.length) continue;
      const c = hit.chain;
      const country = (countries.find((x) => x.code === c.country_code) || {}).name || c.country_code;
      const ok = await sendChainPublishedEmail({
        to: r.email, title: `${country} · ${c.name}`,
        url: `${APP_URL}/en/chain/${c.country_code.toLowerCase()}/${c.slug}`
      });
      if (ok) sent++;
      else {
        failed++;
        await sb(`chain_requests?id=eq.${r.id}`, 'PATCH', { notified_at: null }).catch(() => {});
      }
    }
    await logJobRun('notify-chain-published', { ok: failed === 0, detail: `waiting ${pending.length}, due ${due}, sent ${sent}, failed ${failed}`, startedAt });
    return res.status(200).json({ ok: true, waiting: pending.length, due, sent, failed });
  } catch (err) {
    console.error('[notify-chain-published] error:', err.message);
    await logJobRun('notify-chain-published', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
