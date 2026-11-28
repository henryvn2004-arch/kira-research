// ============================================================
// KIRA RESEARCH — api/_lib/email-layout.js
// One plain layout for the nurture and alert emails (HTML + text from the same blocks), so every language
// uses the same shell. Blocks, in order:
//   { h: 'heading' }  { p: 'paragraph' }  { strong: 'bold line' }  { small: 'grey note' }
//   { cta: { url, label } }  { items: [{ title, url, meta }] }  { facts: [[label, value]] }
// Footer: optional "why you get this" + one-click unsubscribe link (also returned as headers).
// ============================================================
import { tr } from './email-i18n.js';

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderMail({ loc = 'en', blocks = [], why = null, unsubUrl = null, signoff = true }) {
  const text = [], html = [];
  for (const b of blocks) {
    if (b.h) {
      text.push(b.h, '');
      html.push(`<h1 style="font-size:20px;margin:0 0 16px;font-weight:600;">${esc(b.h)}</h1>`);
    } else if (b.p) {
      text.push(b.p, '');
      html.push(`<p style="margin:0 0 16px;">${esc(b.p)}</p>`);
    } else if (b.strong) {
      text.push(b.strong, '');
      html.push(`<p style="margin:0 0 18px;"><strong>${esc(b.strong)}</strong></p>`);
    } else if (b.small) {
      text.push(b.small, '');
      html.push(`<p style="margin:0 0 14px;font-size:13px;color:#666;">${esc(b.small)}</p>`);
    } else if (b.cta) {
      text.push(`${b.cta.label}: ${b.cta.url}`, '');
      html.push(`<p style="margin:0 0 18px;"><a href="${esc(b.cta.url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;font-size:14px;border-radius:4px;">${esc(b.cta.label)}</a></p>`);
    } else if (b.link) {
      text.push(`${b.link.label}: ${b.link.url}`, '');
      html.push(`<p style="margin:0 0 14px;font-size:13px;"><a href="${esc(b.link.url)}" style="color:#111;">${esc(b.link.label)}</a></p>`);
    } else if (b.items) {
      for (const it of b.items) {
        text.push(`• ${it.title}${it.meta ? ' (' + it.meta + ')' : ''}`, `  ${it.url}`);
        html.push(`<p style="margin:0 0 14px;">${it.meta ? `<span style="font-size:13px;color:#666;">${esc(it.meta)}</span><br>` : ''}<a href="${esc(it.url)}" style="color:#111;">${esc(it.title)}</a></p>`);
      }
      text.push('');
    } else if (b.facts) {
      html.push('<table style="border-collapse:collapse;margin:0 0 20px;">' + b.facts.map(([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#666;font-size:13px;">${esc(k)}</td><td style="padding:4px 0;font-size:14px;">${esc(v)}</td></tr>`).join('') + '</table>');
      text.push(...b.facts.map(([k, v]) => `${k}: ${v}`), '');
    }
  }
  if (why) { text.push(why); }
  if (unsubUrl) text.push(`${tr(loc, 'stop')}: ${unsubUrl}`);
  if (signoff) text.push('', tr(loc, 'signoff'));
  const foot = (why || unsubUrl)
    ? `<p style="margin:28px 0 0;font-size:12px;color:#777;">${why ? esc(why) + ' ' : ''}${unsubUrl ? `<a href="${esc(unsubUrl)}" style="color:#777;">${esc(tr(loc, 'stop'))}</a>.` : ''}</p>` : '';
  const doc = `<!doctype html><html lang="${esc(loc)}"><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,'Hiragino Sans','Noto Sans CJK JP','Noto Sans CJK KR','PingFang SC',sans-serif;font-size:15px;line-height:1.55;color:#111;max-width:560px;margin:0 auto;padding:32px 24px;">
  <p style="margin:0 0 18px;font-size:13px;color:#666;letter-spacing:.08em;text-transform:uppercase;">KIRA RESEARCH</p>
  ${html.join('\n  ')}
  ${foot}
</body></html>`;
  return { html: doc, text: text.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
}

// Headers that make "unsubscribe" one click in Gmail / Yahoo (RFC 8058).
export const unsubHeaders = (url) => (url ? { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined);
