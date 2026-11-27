// ============================================================
// KIRA RESEARCH — api/_lib/email-nurture.js
// Senders for the stage 1 sequences and the "new reports" alert (strings: email-i18n.js, shell: email-layout.js).
// Each never throws (resendSend absorbs errors) and carries a one-click unsubscribe link + List-Unsubscribe header.
// ============================================================
import { resendSend } from './email.js';
import { renderMail, unsubHeaders } from './email-layout.js';
import { tr } from './email-i18n.js';

const APP_URL = process.env.APP_URL || 'https://kiraresearch.com';
export const itemUrl = (loc, it) => (it.kind === 'transcript' ? `${APP_URL}/${loc}/experts/transcripts/${it.slug}`
  : it.kind === 'list' ? `${APP_URL}/${loc}/market-maps/${it.slug}` : `${APP_URL}/${loc}/reports/${it.slug}`);
const itemRow = (loc, it) => ({ title: it.title, url: itemUrl(loc, it), meta: it.price ? `$${it.price}` : '' });
const withBuy = (url) => `${url}${url.includes('?') ? '&' : '?'}buy=1`;

export function sendReminder({ to, loc, title, url, price, unsubUrl }) {
  const { html, text } = renderMail({ loc, why: tr(loc, 'whySent'), unsubUrl, blocks: [
    { h: tr(loc, 'rem.heading') }, { strong: title }, { p: tr(loc, 'rem.body') },
    { cta: { url: price ? withBuy(url) : url, label: price ? tr(loc, 'pub.cta', { price: `$${price}` }) : tr(loc, 'pub.free') } },
    { small: `${tr(loc, 'pub.free')}: ${url}` }, { small: tr(loc, 'refund') }, { small: tr(loc, 'rem.once') }] });
  return resendSend({ to, subject: tr(loc, 'rem.subject', { title }), html, text, headers: unsubHeaders(unsubUrl) });
}

// kind 'A10' (requesters, +10 days) or 'D3' (buyers, +3 days): two related items, no discount.
export function sendRelated({ to, loc, kind, topic, baseTitle, items, unsubUrl }) {
  const a = kind === 'A10';
  const { html, text } = renderMail({ loc, why: tr(loc, 'whySent'), unsubUrl, blocks: [
    { h: tr(loc, a ? 'rel10.heading' : 'buy3.heading') },
    { p: a ? tr(loc, 'rel10.body') : tr(loc, 'buy3.body', { title: baseTitle }) },
    { items: items.map((it) => itemRow(loc, it)) },
    { small: tr(loc, a ? 'rel10.last' : 'buy3.last') }] });
  const subject = tr(loc, a ? 'rel10.subject' : 'buy3.subject', { topic });
  return resendSend({ to, subject, html, text, headers: unsubHeaders(unsubUrl) });
}

export function sendAbandoned({ to, loc, step, title, price, url, unsubUrl }) {
  const k = step === 2 ? 'ab2' : 'ab1';
  const { html, text } = renderMail({ loc, why: tr(loc, 'whySent'), unsubUrl, blocks: [
    { h: tr(loc, `${k}.heading`) }, { p: tr(loc, `${k}.body`, { title, price: price ? `$${price}` : '' }) },
    { cta: { url, label: tr(loc, 'ab1.cta') } }, { small: tr(loc, 'refund') }] });
  return resendSend({ to, subject: tr(loc, `${k}.subject`, { title }), html, text, headers: unsubHeaders(unsubUrl) });
}

// Double opt-in confirmation + one free sample (the free PREVIEW page of one report, never a full file).
export function sendReportAlertConfirm({ to, loc, what, confirmUrl, sample }) {
  const blocks = [{ h: tr(loc, 'ra.confirmHeading') }, { p: tr(loc, 'ra.confirmLead') }, { strong: what },
    { cta: { url: confirmUrl, label: tr(loc, 'ra.confirmBtn') } }];
  if (sample) blocks.push({ h: tr(loc, 'ra.sampleHead') }, { p: tr(loc, 'ra.sampleBody') }, { items: [{ title: sample.title, url: sample.url }] });
  blocks.push({ small: tr(loc, 'ra.confirmNote') });
  const { html, text } = renderMail({ loc, blocks });
  return resendSend({ to, subject: tr(loc, 'ra.confirmSubject', { what }), html, text });
}

export function sendReportAlertDigest({ to, loc, what, items, pageUrl, unsubUrl }) {
  const { html, text } = renderMail({ loc, why: tr(loc, 'ra.why'), unsubUrl, blocks: [
    { h: tr(loc, 'ra.digestHeading') }, { small: what },
    { items: items.map((it) => ({ title: it.title, url: itemUrl(loc, it), meta: [tr(loc, it.kind === 'list' ? 'ra.itemMap' : 'ra.itemReport'), it.price ? `$${it.price}` : ''].filter(Boolean).join(' · ') })) },
    { cta: { url: pageUrl, label: tr(loc, 'ra.digestMore') } }] });
  return resendSend({ to, subject: tr(loc, 'ra.digestSubject', { n: items.length, what }), html, text, headers: unsubHeaders(unsubUrl) });
}
