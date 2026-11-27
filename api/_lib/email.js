// ============================================================
// KIRA RESEARCH — api/_lib/email.js
//
// Transactional email helpers for Resend (resend.com).
//
//   sendPurchaseReceipt({ buyerEmail, slug, locale, amount, currency, downloadUrl })
//     → Receipt to the buyer after successful PayPal capture.
//
//   sendLeadNotification({ leadId, name, email, company, role, tier, deadline, brief, locale, source })
//     → Notify admins about a new Custom Research inquiry.
//
//   sendWaitlistNotification({ email, name, company, role, plan, locale, source, repeat })
//     → Notify admins about a subscription-waitlist sign-up (Sprint S5).
//
// Both functions:
//   • Return false silently if RESEND_API_KEY is unset (lets dev / unconfigured
//     prod environments work without erroring out).
//   • Never throw — failures are logged and absorbed so they can't break the
//     parent API request (receipts must not block a successful purchase).
//
// Vercel routing: this file lives in /api/_lib/ — directories prefixed with
// `_` are excluded from Vercel's filesystem routing, so the helper is NOT
// exposed as a public endpoint.
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM    = process.env.RESEND_FROM   || 'KIRA RESEARCH <noreply@kiraresearch.com>';
const APP_URL        = process.env.APP_URL       || 'https://kiraresearch.com';
const ADMIN_EMAILS   = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

import { tr, noun as nounOf } from './email-i18n.js';
import { renderMail, unsubHeaders } from './email-layout.js';

// Addresses that hard-bounced or marked us as spam (email_suppressions, filled by /api/email-webhook).
// Sending to them again hurts the domain's reputation. Fails open: if the lookup breaks, mail still goes out.
async function dropSuppressed(recipients) {
  const SB = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB || !KEY || !recipients.length) return recipients;
  try {
    const list = recipients.map(a => `"${String(a).toLowerCase().replace(/"/g, '')}"`).join(',');
    const r = await fetch(`${SB}/rest/v1/email_suppressions?select=email&email=in.(${encodeURIComponent(list)})`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!r.ok) return recipients;
    const bad = new Set((await r.json()).map(x => x.email));
    return recipients.filter(a => !bad.has(String(a).toLowerCase()));
  } catch { return recipients; }
}

// ── Low-level POST to Resend ─────────────────────────────
export async function resendSend({ to, subject, html, text, replyTo, headers }) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to);
    return false;
  }
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('[email] no recipients — skipping');
    return false;
  }

  try {
    const recipients = await dropSuppressed(Array.isArray(to) ? to : [to]);
    if (recipients.length === 0) {
      console.warn('[email] every recipient is suppressed (bounced or complained) — skipping');
      return false;
    }
    const body = {
      from:    RESEND_FROM,
      to:      recipients,
      subject,
      html,
      text
    };
    if (replyTo) body.reply_to = replyTo;
    if (headers) body.headers = headers;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      console.error('[email] resend send failed', r.status, await r.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    // Network / parse errors — never propagate.
    console.error('[email] resend send threw', err.message);
    return false;
  }
}

// HTML-escape user-provided strings so a malicious "name" can't inject markup
// into the admin notification email body.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Purchase receipt ─────────────────────────────────────
export async function sendPurchaseReceipt({
  buyerEmail,
  slug,
  locale = 'en',
  amount,
  currency = 'USD',
  reportTitle,
  downloadUrl,
  kind = 'report',           // 'report' | 'transcript' (expert-interview transcript, S19) | 'list' (market-map company list)
  pending = false,           // list only: paid, the file is not ready yet
  licence = 'single',        // 'single' | 'team' | 'company' (shown on the receipt)
  signInUrl = null           // guest checkout: one-time sign-in link, the same mail doubles as the sign-in email
}) {
  if (!buyerEmail) return false;

  // Language = the page the buyer paid on (EN / JA / KO / ZH); the text lives in email-i18n.js.
  const L = locale;
  const niceAmount = typeof amount === 'number' ? amount.toFixed(2) : String(amount || '');
  const title = reportTitle || slug;
  const isTranscript = kind === 'transcript';
  const isList = kind === 'list';
  const noun = nounOf(L, kind);
  const reportUrl = isTranscript ? `${APP_URL}/${locale}/experts/transcripts/${slug}` : isList ? `${APP_URL}/${locale}/market-maps/${slug}` : `${APP_URL}/${locale}/reports/${slug}`;
  const listNote = !isList ? '' : tr(L, pending ? 'receipt.listPending' : 'receipt.listReady');

  const subject = tr(L, 'receipt.subject', { noun, title });
  const licenceLabel = licence === 'team' ? tr(L, 'receipt.licenceTeam') : licence === 'company' ? tr(L, 'receipt.licenceCompany') : '';
  const openUrl = isList && downloadUrl ? downloadUrl : (signInUrl || reportUrl);
  const signInNote = signInUrl ? tr(L, 'receipt.signInNote') : '';
  const facts = [[noun, title], [tr(L, 'receipt.amount'), `${niceAmount} ${currency}`]];
  if (licenceLabel) facts.push([tr(L, 'receipt.licence'), licenceLabel]);

  const blocks = [
    { h: tr(L, 'receipt.thanks') },
    { p: `${tr(L, isList ? 'receipt.thankBuy' : 'receipt.access')} ${title}` },
    { facts },
    { cta: { url: openUrl, label: isList ? tr(L, downloadUrl ? 'receipt.listDownload' : 'receipt.listView') : tr(L, signInUrl ? 'receipt.openSignedIn' : 'receipt.open', { noun }) } }
  ];
  if (signInNote) blocks.push({ small: signInNote });
  if (isList) blocks.push({ small: listNote });
  if (downloadUrl && !isList) blocks.push({ small: `${tr(L, 'receipt.pdfDirect')}: ${downloadUrl}` });
  blocks.push({ small: tr(L, 'refund') }, { small: tr(L, 'receipt.questions') });
  const { html, text } = renderMail({ loc: L, blocks });
  return resendSend({ to: buyerEmail, subject, html, text });
}

// ── Month subscription started ───────────────────────────
// Sent once, the first time a subscription is seen active (api/subscription.js claims `welcomed_at`
// before calling this). Best-effort like the other receipts.
export async function sendSubscriptionStarted({ buyerEmail, plan = 'month', amount, currency = 'USD', periodEnd, pdfLimit = 5 }) {
  if (!buyerEmail) return false;
  const year = plan === 'year';
  const label = year ? 'Annual' : 'Month', per = year ? 'year' : 'month';
  const niceAmount = typeof amount === 'number' ? amount.toFixed(2) : String(amount || '');
  const next = periodEnd ? new Date(periodEnd).toISOString().slice(0, 10) : '';
  const manageUrl = `${APP_URL}/en/subscription`;
  const subject = `Your KIRA RESEARCH ${label} subscription is live`;
  const text = [
    'Thanks for subscribing.',
    '',
    `Plan: ${label}, ${niceAmount} ${currency} per ${per}, renews automatically${next ? ` (next charge around ${next})` : ''}.`,
    `Included: every report in full online, every expert-interview transcript, and ${pdfLimit} PDF downloads per billing period.`,
    '',
    `Manage or cancel any time: ${manageUrl}`,
    'Cancelling stops the next charge; access continues to the end of the period you paid for.',
    '',
    'If you have any questions, just reply to this email.',
    '',
    '— The KIRA RESEARCH team'
  ].join('\n');
  const html = `
<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:540px;margin:0 auto;padding:32px 24px;">
  <p style="margin:0 0 18px;font-size:13px;color:#666;letter-spacing:.08em;text-transform:uppercase;">KIRA RESEARCH</p>
  <h1 style="font-size:20px;margin:0 0 16px;font-weight:600;">Your ${esc(label)} subscription is live.</h1>
  <p style="margin:0 0 18px;">${esc(niceAmount)} ${esc(currency)} per ${per}, renews automatically${next ? ` (next charge around ${esc(next)})` : ''}.</p>
  <p style="margin:0 0 18px;">Included: every report in full online, every expert-interview transcript, and ${esc(String(pdfLimit))} PDF downloads per billing period.</p>
  <p style="margin:0 0 12px;"><a href="${esc(manageUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;font-size:14px;border-radius:4px;">Manage your subscription</a></p>
  <p style="margin:18px 0 6px;font-size:13px;color:#666;">Cancel any time: the next charge stops, and access continues to the end of the period you paid for.</p>
  <p style="margin:0;font-size:13px;color:#666;">— The KIRA RESEARCH team</p>
</body></html>`.trim();
  return resendSend({ to: buyerEmail, subject, html, text });
}

// ── Studio credit top-up receipt ─────────────────────────
//
// Sent after a successful PayPal capture in /api/studio-credits-buy.
// Best-effort: returns false on any failure, never throws — must not
// block the success response.
export async function sendCreditTopupReceipt({
  buyerEmail,
  packLabel,
  credits,
  amount,
  currency = 'USD',
  newBalance
}) {
  if (!buyerEmail) return false;

  const niceAmount = typeof amount === 'number' ? amount.toFixed(2) : String(amount || '');
  const billingUrl = `${APP_URL.replace(/^https:\/\/(www\.)?kiraresearch\.com/, 'https://studio.kiraresearch.com')}/billing`;
  const newUrl     = billingUrl.replace('/billing', '/new');

  const subject = `KIRA Studio — ${credits} credits added`;

  const text = [
    `Thanks for your top-up.`,
    ``,
    `Pack:    ${packLabel}`,
    `Credits: +${credits}`,
    `Amount:  ${niceAmount} ${currency}`,
    typeof newBalance === 'number' ? `Balance: ${newBalance} credits` : '',
    ``,
    `Start a new report: ${newUrl}`,
    `Manage credits:     ${billingUrl}`,
    ``,
    `— The KIRA Studio team`
  ].filter(Boolean).join('\n');

  const html = `
<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:540px;margin:0 auto;padding:32px 24px;">
  <p style="margin:0 0 18px;font-size:13px;color:#666;letter-spacing:.08em;text-transform:uppercase;">KIRA Studio</p>
  <h1 style="font-size:20px;margin:0 0 16px;font-weight:600;">Credits added.</h1>
  <p style="margin:0 0 18px;">Your top-up went through. You're ready to generate.</p>
  <table style="border-collapse:collapse;margin:0 0 24px;">
    <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;">Pack</td><td style="padding:4px 0;font-size:14px;">${esc(packLabel)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;">Credits</td><td style="padding:4px 0;font-size:14px;">+${esc(credits)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;">Amount</td><td style="padding:4px 0;font-size:14px;">${esc(niceAmount)} ${esc(currency)}</td></tr>
    ${typeof newBalance === 'number' ? `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;">Balance</td><td style="padding:4px 0;font-size:14px;"><strong>${esc(newBalance)} credits</strong></td></tr>` : ''}
  </table>
  <p style="margin:0 0 12px;">
    <a href="${esc(newUrl)}" style="display:inline-block;background:#1E6FFF;color:#fff;text-decoration:none;padding:10px 18px;font-size:14px;border-radius:4px;">Start a new report</a>
    <a href="${esc(billingUrl)}" style="display:inline-block;color:#1E6FFF;text-decoration:none;padding:10px 18px;font-size:14px;">Manage credits</a>
  </p>
  <p style="margin:24px 0 6px;font-size:13px;color:#666;">If you have any questions, just reply to this email.</p>
  <p style="margin:0;font-size:13px;color:#666;">— The KIRA Studio team</p>
</body></html>`.trim();

  return resendSend({ to: buyerEmail, subject, html, text });
}

// ── Lead notification ────────────────────────────────────
export async function sendLeadNotification(lead) {
  if (ADMIN_EMAILS.length === 0) {
    console.warn('[email] ADMIN_EMAILS empty — skipping lead notification');
    return false;
  }

  const id      = lead.leadId || lead.id || '';
  const name    = lead.name    || '(no name)';
  const email   = lead.email   || '(no email)';
  const company = lead.company || '';
  const role    = lead.role    || '';
  const tier    = lead.tier    || '';
  const deadline = lead.deadline || '';
  const locale  = lead.locale  || 'en';
  const source  = lead.source  || 'custom-research';
  const brief   = lead.brief   || '';

  const subject = `New lead: ${name}${company ? ` @ ${company}` : ''} (${tier})`;

  const text = [
    `New ${tier || 'custom-research'} lead from ${source} (${locale}).`,
    ``,
    `Name:     ${name}`,
    `Email:    ${email}`,
    company  ? `Company:  ${company}` : '',
    role     ? `Role:     ${role}`    : '',
    `Tier:     ${tier || '(not specified)'}`,
    `Deadline: ${deadline || '(flex)'}`,
    ``,
    `Brief:`,
    brief,
    ``,
    `Lead ID: ${id}`
  ].filter(Boolean).join('\n');

  const html = `
<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;max-width:600px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 4px;font-size:12px;color:#666;letter-spacing:.08em;text-transform:uppercase;">KIRA RESEARCH — new lead</p>
  <h1 style="font-size:18px;margin:0 0 18px;font-weight:600;">${esc(name)}${company ? ` <span style="color:#666;font-weight:400;">— ${esc(company)}</span>` : ''}</h1>
  <table style="border-collapse:collapse;font-size:13px;margin:0 0 18px;">
    <tr><td style="padding:3px 16px 3px 0;color:#666;">Email</td><td style="padding:3px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
    ${role     ? `<tr><td style="padding:3px 16px 3px 0;color:#666;">Role</td><td style="padding:3px 0;">${esc(role)}</td></tr>` : ''}
    <tr><td style="padding:3px 16px 3px 0;color:#666;">Tier</td><td style="padding:3px 0;">${esc(tier || '(not specified)')}</td></tr>
    <tr><td style="padding:3px 16px 3px 0;color:#666;">Deadline</td><td style="padding:3px 0;">${esc(deadline || '(flex)')}</td></tr>
    <tr><td style="padding:3px 16px 3px 0;color:#666;">Locale</td><td style="padding:3px 0;">${esc(locale)}</td></tr>
    <tr><td style="padding:3px 16px 3px 0;color:#666;">Source</td><td style="padding:3px 0;">${esc(source)}</td></tr>
  </table>
  <h2 style="font-size:14px;margin:0 0 6px;font-weight:600;">Brief</h2>
  <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;margin:0 0 18px;padding:12px;background:#f6f6f6;border-radius:4px;">${esc(brief)}</pre>
  <p style="margin:18px 0 0;font-size:12px;color:#666;">Lead ID: ${esc(id)}</p>
</body></html>`.trim();

  // Use the lead's email as reply-to so the admin can reply directly.
  return resendSend({ to: ADMIN_EMAILS, subject, html, text, replyTo: email });
}

// ── Waitlist notification (Sprint S5) ────────────────────
//   sendWaitlistNotification({ id, email, name, company, role, plan, locale, source, repeat })
//     → Tell admins someone joined (or re-joined) the subscription waitlist.
export async function sendWaitlistNotification(entry) {
  if (ADMIN_EMAILS.length === 0) {
    console.warn('[email] ADMIN_EMAILS empty — skipping waitlist notification');
    return false;
  }
  const email   = entry.email   || '(no email)';
  const name    = entry.name    || '';
  const company = entry.company || '';
  const role    = entry.role    || '';
  const plan    = entry.plan    || 'not-sure';
  const locale  = entry.locale  || 'en';
  const source  = entry.source  || 'pricing';
  const repeat  = !!entry.repeat;

  const subject = `${repeat ? 'Waitlist update' : 'New waitlist sign-up'}: ${email} (${plan})`;
  const text = [
    `${repeat ? 'Existing waitlist entry updated' : 'New waitlist sign-up'} from ${source} (${locale}).`,
    ``,
    `Email:   ${email}`,
    name    ? `Name:    ${name}`    : '',
    company ? `Company: ${company}` : '',
    role    ? `Role:    ${role}`    : '',
    `Plan:    ${plan}`,
    ``,
    `Manage: ${APP_URL}/en/admin/waitlist`
  ].filter(Boolean).join('\n');

  const html = `
<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111;max-width:600px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 4px;font-size:12px;color:#666;letter-spacing:.08em;text-transform:uppercase;">KIRA RESEARCH — ${repeat ? 'waitlist update' : 'new waitlist sign-up'}</p>
  <h1 style="font-size:18px;margin:0 0 18px;font-weight:600;">${esc(email)}</h1>
  <table style="border-collapse:collapse;font-size:13px;margin:0 0 18px;">
    ${name    ? `<tr><td style="padding:3px 16px 3px 0;color:#666;">Name</td><td style="padding:3px 0;">${esc(name)}</td></tr>` : ''}
    ${company ? `<tr><td style="padding:3px 16px 3px 0;color:#666;">Company</td><td style="padding:3px 0;">${esc(company)}</td></tr>` : ''}
    ${role    ? `<tr><td style="padding:3px 16px 3px 0;color:#666;">Role</td><td style="padding:3px 0;">${esc(role)}</td></tr>` : ''}
    <tr><td style="padding:3px 16px 3px 0;color:#666;">Plan</td><td style="padding:3px 0;">${esc(plan)}</td></tr>
    <tr><td style="padding:3px 16px 3px 0;color:#666;">Locale</td><td style="padding:3px 0;">${esc(locale)}</td></tr>
    <tr><td style="padding:3px 16px 3px 0;color:#666;">Source</td><td style="padding:3px 0;">${esc(source)}</td></tr>
  </table>
  <p style="margin:18px 0 0;font-size:12px;color:#666;"><a href="${esc(APP_URL)}/en/admin/waitlist">Open the waitlist admin</a></p>
</body></html>`.trim();

  return resendSend({ to: ADMIN_EMAILS, subject, html, text, replyTo: entry.email || undefined });
}

// ── "We got your request" — sent the moment a reader leaves an email on a coming-soon page ──
// Two jobs: the reader sees right away whether our mail lands in the inbox or in spam, and the
// reply-to is a real inbox. Plain on purpose (one link, no images) so it is not filtered.
export async function sendTopicRequestConfirmation({ to, title, url, eta, locale = 'en' }) {
  if (!to || !title || !url) return false;
  const replyTo = ADMIN_EMAILS[0] || undefined;
  // Never echo reader-typed text into the subject (mail relay / phishing risk): fixed subject.
  const { html, text } = renderMail({ loc: locale, blocks: [
    { h: tr(locale, 'req.heading') }, { p: tr(locale, 'req.lead') }, { strong: title },
    { p: tr(locale, eta ? 'req.eta' : 'req.noEta', { eta }) }, { p: url },
    { small: tr(locale, 'req.spam') }, { small: tr(locale, 'req.notYou') }
  ] });
  return resendSend({ to, subject: tr(locale, 'req.subject'), html, text, replyTo });
}

// ── Coming-soon topic is now published ────────────────────
// Sent once to each reader who asked to be told (topic_requests).
// Sequence A, step 0. price/reason make it a buy email: price, why it costs that, and a direct buy link
// (the report page opens its buy box with ?buy=1).
export async function sendTopicPublishedEmail({ to, title, url, locale = 'en', price = null, reason = '', unsubUrl = null }) {
  if (!to || !url) return false;
  const p = price ? `$${price}` : null;
  const buyUrl = p ? `${url}${url.includes('?') ? '&' : '?'}buy=1` : url;
  const blocks = [{ h: tr(locale, 'pub.heading') }, { strong: title }];
  if (p && reason) blocks.push({ p: tr(locale, 'pub.priceLine', { price: p, reason }) });
  blocks.push({ cta: { url: buyUrl, label: p ? tr(locale, 'pub.cta', { price: p }) : tr(locale, 'pub.free') } });
  if (p) blocks.push({ small: `${tr(locale, 'pub.free')}: ${url}` });
  blocks.push({ small: p ? tr(locale, 'pub.reason', { price: p }) : tr(locale, 'chain.once') }, { small: tr(locale, 'refund') });
  const { html, text } = renderMail({ loc: locale, blocks, unsubUrl });
  return resendSend({ to, subject: tr(locale, 'pub.subject', { title }), html, text, headers: unsubHeaders(unsubUrl) });
}

// ── A Kira Chain a reader asked for is now published ──────
// Sent once to each reader who left an email on a chain search that found nothing (chain_requests).
export async function sendChainPublishedEmail({ to, title, url, locale = 'en' }) {
  if (!to || !url) return false;
  const { html, text } = renderMail({ loc: locale, blocks: [
    { h: tr(locale, 'chain.heading') }, { strong: title }, { cta: { url, label: tr(locale, 'chain.cta') } }, { small: tr(locale, 'chain.once') }
  ] });
  return resendSend({ to, subject: tr(locale, 'chain.subject', { title }), html, text });
}

// ── "Pipeline went silent" alert to the admins (api/cron-pipeline-watch.js) ──
// idle = [{ label, last_at (ISO or null), hours, limit }]
export async function sendPipelineWatchAlert({ idle }) {
  if (ADMIN_EMAILS.length === 0) {
    console.warn('[email] ADMIN_EMAILS empty — skipping pipeline watch alert');
    return false;
  }
  if (!idle || !idle.length) return false;
  const lines = idle.map(i => `- ${i.label}: last activity ${i.last_at ? i.last_at.replace('T', ' ').slice(0, 16) + ' UTC' : 'never'}` +
    (i.hours == null ? '' : ` (${i.hours} hours ago; alert after ${i.limit})`));
  const subject = `KIRA pipeline silent: ${idle.map(i => i.label).join(', ')}`;
  const causes = [
    'The Routine is paused or the claude.ai usage limit was reached.',
    'An environment variable on the Routine was renamed or is missing (the Routine then exits quietly before it touches the database).',
    'The Routine ran but every item failed (look for errors on the Pipeline page).'
  ];
  const where = [
    'claude.ai Routines page (is the Routine enabled, did its last fire run?)',
    `${APP_URL}/en/admin/pipeline`,
    `${APP_URL}/en/admin/health`
  ];
  const text = `Nothing new has been produced by:\n\n${lines.join('\n')}\n\nLikely causes:\n${causes.map(c => '- ' + c).join('\n')}\n\nWhere to look:\n${where.map(c => '- ' + c).join('\n')}\n\nYou get this at most once a day per stream. Thresholds: ${APP_URL}/en/admin/config`;
  const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
  const html = `
<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <p>Nothing new has been produced by:</p><ul>${li(lines.map(l => l.replace(/^- /, '')))}</ul>
  <p><strong>Likely causes</strong></p><ul>${li(causes)}</ul>
  <p><strong>Where to look</strong></p><ul>${li(where)}</ul>
  <p style="font-size:12px;color:#777;">You get this at most once a day per stream. Thresholds are in /en/admin/config.</p>
</body></html>`.trim();
  return resendSend({ to: ADMIN_EMAILS, subject, html, text });
}

// ── One-to-one email the owner writes in /en/admin/crm ────
// Sent from the KIRA address with Reply-To = the admin who wrote it, so the answer goes straight to them.
export async function sendCrmMessage({ to, subject, text, replyTo }) {
  if (!to || !subject || !text) return false;
  const footer = 'You are receiving this because you contacted KIRA RESEARCH. Just reply to this email to answer.';
  const plain = `${text}\n\n--\nKIRA RESEARCH\n${footer}`;
  const html = `
<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <div style="white-space:pre-wrap;">${esc(text)}</div>
  <p style="margin:28px 0 0;font-size:12px;color:#777;border-top:1px solid #e5e5e5;padding-top:12px;">KIRA RESEARCH<br>${esc(footer)}</p>
</body></html>`.trim();
  return resendSend({ to, subject, html, text: plain, replyTo });
}

// ── Kira Data: "email me new moves" (moves_alerts, migration 063) ──────────
// Double opt-in: the first email only asks the reader to confirm; nothing else is sent until they click.
export async function sendMovesAlertConfirm({ to, label, confirmUrl, locale = 'en' }) {
  if (!to || !confirmUrl) return false;
  const { html, text } = renderMail({ loc: locale, blocks: [
    { h: tr(locale, 'mv.confirmHeading') }, { p: tr(locale, 'mv.confirmLead') }, { strong: label },
    { cta: { url: confirmUrl, label: tr(locale, 'mv.confirmBtn') } }, { small: tr(locale, 'mv.confirmNote') }
  ] });
  return resendSend({ to, subject: tr(locale, 'mv.confirmSubject', { label }), html, text });
}

// One email per alert with the moves published since the last one. Every email carries the unsubscribe link,
// in the body and as a List-Unsubscribe header (one-click unsubscribe in Gmail / Yahoo).
export async function sendMovesDigest({ to, label, moves, pageUrl, unsubUrl, locale = 'en' }) {
  if (!to || !moves || !moves.length || !unsubUrl) return false;
  const subject = moves.length === 1 ? tr(locale, 'mv.digestOne', { title: moves[0].title }).slice(0, 140) : tr(locale, 'mv.digestMany', { n: moves.length, label });
  const { html, text } = renderMail({ loc: locale, why: tr(locale, 'mv.why'), unsubUrl, blocks: [
    { h: tr(locale, 'mv.digestHeading') }, { small: label },
    { items: moves.map((m) => ({ title: m.title, url: m.url, meta: [m.date, m.type].filter(Boolean).join(' · ') })) },
    { cta: { url: pageUrl, label: tr(locale, 'mv.digestAll') } }
  ] });
  return resendSend({ to, subject, html, text, headers: unsubHeaders(unsubUrl) });
}
