// ============================================================
// KIRA RESEARCH — api/cron-sequences.js
// Hourly Vercel cron (vercel.json, minute 23). Stage 1 email sequences; the rules are in api/_lib/sequences.js:
//   ABN1 / ABN24  abandoned checkout (signed-in buyers only: +1 h, +24 h)
//   A3 / A10      coming-soon requesters whose report is published: +3 days reminder, +10 days related reports
//   D3            buyers: +3 days, two related items (no discount)
//   DIGEST        weekly "new reports on <country> / <industry>" for confirmed alerts (once a day, at 01:xx UTC)
// Why hourly: the +1 hour abandoned-checkout reminder needs it. Everything else is idempotent (claim-then-send on
// email_sequence_log; a failed send releases the claim), so running hourly costs nothing.
// Each sequence has its own switch in /en/admin/config (notify.seq_*). Logs job 'sequences' for /en/admin/health.
// The caller must send `Authorization: Bearer <CRON_SECRET>` (Vercel cron does). `?only=abn|a|d|digest` for a manual run.
// ============================================================

import { cronAuthorized } from './_lib/cron-auth.js';
import { logJobRun } from './_lib/jobs.js';
import { getConfig } from './_lib/config.js';
import { dueTopicSteps, dueBuyerSteps, dueAbandoned, pickRelated, digestFor, ownedSet, optoutUrl, DAY } from './_lib/sequences.js';
import * as D from './_lib/seq-data.js';
import { sendReminder, sendRelated, sendAbandoned, sendReportAlertDigest, itemUrl } from './_lib/email-nurture.js';
import { normLocale, tr } from './_lib/email-i18n.js';

const APP_URL = process.env.APP_URL || 'https://kiraresearch.com';
const CAP = 60;                                   // emails per sequence per run
const iso = (ms) => new Date(ms).toISOString();

// Claim, send, release on failure. → true when an email went out.
async function attempt(kind, ref, email, loc, send) {
  if (!(await D.claim(kind, ref, email, loc))) return false;
  const ok = await send().catch(() => false);
  if (!ok) { await D.release(kind, ref); return false; }
  return true;
}

async function runAbandoned(now, catalog) {
  const orders = await D.abandonedOrders(iso(now - 72 * 3600e3));
  if (!orders.length) return 0;
  const [paid, buyers, optouts, lg] = await Promise.all([
    D.paidOrderIds(orders.map((o) => o.paypal_order_id)), D.buyersSince(iso(now - 30 * DAY)),
    D.optoutsFor(orders.map((o) => o.email)), D.loggedSet(['ABN1', 'ABN24'], iso(now - 5 * DAY))]);
  let sent = 0;
  for (const { kind, order: o } of dueAbandoned({ orders, paidOrders: paid, buyers, optouts, logged: lg.keys, now })) {
    if (sent >= CAP) break;
    const loc = normLocale(o.locale);
    const item = catalog.bySlug.get(o.slug);
    const title = o.kind === 'list' ? `${o.slug.split('/').pop().replace(/-/g, ' ')} (${tr(loc, 'kindList')})` : (item ? catalog.titleOf(item, loc) : o.slug);
    const url = `${itemUrl(loc, { kind: o.kind, slug: o.slug })}?buy=1`;
    const ok = await attempt(kind, o.paypal_order_id, o.email, loc, () => sendAbandoned({
      to: o.email, loc, step: kind === 'ABN24' ? 2 : 1, title, price: o.amount ? Math.round(Number(o.amount)) : null, url, unsubUrl: optoutUrl(APP_URL, o.email) }));
    if (ok) sent++;
  }
  return sent;
}

async function runTopic(now, catalog, saleOn) {
  const requests = await D.candidatesA(iso(now - 17 * DAY));
  if (!requests.length) return 0;
  const [buyers, optouts, lg] = await Promise.all([
    D.buyersSince(iso(now - 30 * DAY)), D.optoutsFor(requests.map((r) => r.email)), D.loggedSet(['A3', 'A10'], iso(now - 20 * DAY))]);
  const owned = ownedSet(buyers);
  let sent = 0;
  for (const { kind, request: r } of dueTopicSteps({ requests, buyers, optouts, logged: lg.keys, now })) {
    if (sent >= CAP) break;
    const loc = normLocale(r.locale);
    const url = `${APP_URL}/${loc}/reports/${r.report_slug}`;
    const unsubUrl = optoutUrl(APP_URL, r.email);
    let send;
    if (kind === 'A3') {
      send = () => sendReminder({ to: r.email, loc, title: r.topic_title, url, price: saleOn ? r.price : null, unsubUrl });
    } else {
      const cat = [...catalog.items.map((i) => ({ ...i, title: catalog.titleOf(i, loc) })), ...(await D.mapsForCountry(r.country))];
      const items = pickRelated({ country: r.country, industry: r.industry, baseSlug: r.report_slug, owned, email: r.email, catalog: cat });
      if (!items.length) continue;                                  // nothing related: no email (the window expires)
      send = () => sendRelated({ to: r.email, loc, kind: 'A10', topic: [r.country, r.industry].filter(Boolean).join(' · '), baseTitle: r.topic_title, items, unsubUrl });
    }
    if (await attempt(kind, r.request_id, r.email, loc, send)) sent++;
  }
  return sent;
}

async function runBuyers(now, catalog) {
  const buyers = await D.buyersSince(iso(now - 30 * DAY));
  const recent = buyers.filter((b) => now - Date.parse(b.captured_at) < 9 * DAY);
  if (!recent.length) return 0;
  const [optouts, lg] = await Promise.all([D.optoutsFor(recent.map((b) => b.email)), D.loggedSet(['D3'], iso(now - 30 * DAY))]);
  const owned = ownedSet(buyers);
  let sent = 0;
  for (const { purchase: p } of dueBuyerSteps({ buyers, optouts, logged: lg.keys, loggedEmails: lg.emails, now })) {
    if (sent >= CAP) break;
    const loc = normLocale(p.locale);
    const cat = [...catalog.items.map((i) => ({ ...i, title: catalog.titleOf(i, loc) })), ...(await D.mapsForCountry(p.country))];
    const items = pickRelated({ country: p.country, industry: p.industry, baseSlug: p.slug, owned, email: p.email, catalog: cat });
    if (!items.length) continue;
    const base = catalog.bySlug.get(p.slug);
    const baseTitle = base ? catalog.titleOf(base, loc) : p.slug;
    if (await attempt('D3', p.purchase_key, p.email, loc, () => sendRelated({
      to: p.email, loc, kind: 'D3', topic: [p.country, p.industry].filter(Boolean).join(' · '), baseTitle, items, unsubUrl: optoutUrl(APP_URL, p.email) }))) sent++;
  }
  return sent;
}

async function runDigest(now, catalog) {
  const alerts = await D.activeAlerts();
  let sent = 0;
  const mapCache = new Map();
  for (const a of alerts) {
    if (sent >= 300) break;
    const since = a.last_digest_at || a.confirmed_at;
    const reports = catalog.items.filter((i) => i.kind === 'report');
    const key = `${a.country}|${since}`;
    if (!mapCache.has(key)) mapCache.set(key, await D.newMapsSince(a.country, since));
    const loc = normLocale(a.locale);
    const items = digestFor({ alert: a, items: [...reports, ...mapCache.get(key)], now });
    // Nothing new: keep the clock where it is so the next new item goes out at the next weekly slot (no empty emails).
    if (!items.length) continue;
    const what = [a.country.replace(/-/g, ' '), a.industry ? a.industry.replace(/-/g, ' ') : tr(loc, 'ra.allIndustries')].join(' · ');
    const week = Math.floor(now / (7 * DAY));
    const ok = await attempt('DIGEST', `${a.id}:${week}`, a.email, loc, () => sendReportAlertDigest({
      to: a.email, loc, what, pageUrl: `${APP_URL}/${loc}/library?country=${encodeURIComponent(a.country)}`,
      items: items.map((it) => ({ ...it, title: it.kind === 'report' ? catalog.titleOf(it, loc) : it.title })),
      unsubUrl: `${APP_URL}/api/report-alert?t=${a.token}&a=unsub` }));
    if (ok) { await D.markDigest(a.id, iso(now)); sent++; }
  }
  return sent;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const startedAt = Date.now(), now = startedAt;
  const only = new URL(req.url, 'https://x').searchParams.get('only');
  const want = (k) => !only || only === k;
  const counts = { ABN: 0, A: 0, D: 0, DIGEST: 0 };
  const errors = [];
  try {
    const [abn, topic, buyers, alerts, sale] = await Promise.all([
      getConfig('notify.seq_abandoned_enabled'), getConfig('notify.seq_topic_enabled'), getConfig('notify.seq_buyers_enabled'),
      getConfig('notify.seq_alerts_enabled'), getConfig('checkout.single_report_enabled')]);
    const catalog = await D.loadCatalog();
    const step = async (name, on, fn) => { if (!on) return; try { counts[name] = await fn(); } catch (e) { errors.push(`${name}: ${e.message}`); } };
    await step('ABN', abn && want('abn'), () => runAbandoned(now, catalog));
    await step('A', topic && want('a'), () => runTopic(now, catalog, sale));
    await step('D', buyers && want('d'), () => runBuyers(now, catalog));
    // The weekly digest is checked once a day (01:xx UTC); each alert still needs 7 days since its last one.
    await step('DIGEST', alerts && want('digest') && (only === 'digest' || new Date(now).getUTCHours() === 1), () => runDigest(now, catalog));
    const detail = `abandoned ${counts.ABN} · requesters ${counts.A} · buyers ${counts.D} · digests ${counts.DIGEST}` + (errors.length ? ` · errors: ${errors.join('; ')}` : '');
    await logJobRun('sequences', { ok: errors.length === 0, detail, startedAt });
    return res.status(200).json({ ok: errors.length === 0, ...counts, errors });
  } catch (err) {
    console.error('[sequences] error:', err.message);
    await logJobRun('sequences', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}

