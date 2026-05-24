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

// ── Low-level POST to Resend ─────────────────────────────
async function resendSend({ to, subject, html, text, replyTo }) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to);
    return false;
  }
  if (!to || (Array.isArray(to) && to.length === 0)) {
    console.warn('[email] no recipients — skipping');
    return false;
  }

  try {
    const body = {
      from:    RESEND_FROM,
      to:      Array.isArray(to) ? to : [to],
      subject,
      html,
      text
    };
    if (replyTo) body.reply_to = replyTo;

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
  downloadUrl
}) {
  if (!buyerEmail) return false;

  const niceAmount = typeof amount === 'number' ? amount.toFixed(2) : String(amount || '');
  const title = reportTitle || slug;
  const reportUrl = `${APP_URL}/${locale}/reports/${slug}`;

  const subject = `Your KIRA RESEARCH report — ${title}`;

  const text = [
    `Thanks for your purchase.`,
    ``,
    `You bought: ${title}`,
    `Amount: ${niceAmount} ${currency}`,
    ``,
    `View your report: ${reportUrl}`,
    downloadUrl ? `Direct PDF download: ${downloadUrl}` : '',
    ``,
    `If you have any questions, just reply to this email.`,
    ``,
    `— The KIRA RESEARCH team`
  ].filter(Boolean).join('\n');

  const html = `
<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:540px;margin:0 auto;padding:32px 24px;">
  <p style="margin:0 0 18px;font-size:13px;color:#666;letter-spacing:.08em;text-transform:uppercase;">KIRA RESEARCH</p>
  <h1 style="font-size:20px;margin:0 0 16px;font-weight:600;">Thanks for your purchase.</h1>
  <p style="margin:0 0 18px;">You now have access to <strong>${esc(title)}</strong>.</p>
  <table style="border-collapse:collapse;margin:0 0 24px;">
    <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;">Report</td><td style="padding:4px 0;font-size:14px;">${esc(title)}</td></tr>
    <tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;">Amount</td><td style="padding:4px 0;font-size:14px;">${esc(niceAmount)} ${esc(currency)}</td></tr>
  </table>
  <p style="margin:0 0 12px;"><a href="${esc(reportUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;font-size:14px;border-radius:4px;">Open your report</a></p>
  ${downloadUrl ? `<p style="margin:0 0 18px;font-size:13px;color:#666;">Direct PDF link (expires in 1 hour): <a href="${esc(downloadUrl)}">download</a></p>` : ''}
  <p style="margin:24px 0 6px;font-size:13px;color:#666;">If you have any questions, just reply to this email.</p>
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
