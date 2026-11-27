// ============================================================
// KIRA RESEARCH — api/_lib/preview-pages.js
//
// Curated free preview of a report (stage 0, decision 8).
//
// Before: the preview was "the first 5 pages", which is cover + methodology +
// contents + a hook page or two. Now the free pages are chosen by rule:
//   - the executive summary pages (the answer and the recommendation)
//   - 1-2 proof pages from the body: the first data-chart page and the first
//     comparison / matrix page
//   - NEVER the decision pages (risk, option scorecard, stage-gate / recommended
//     path, conditions to win), Who's who, the closing page
//   - methodology and contents are not free pages (the contents list is already
//     public on the report page as text)
//   - the cover is kept in the file only for the small cover thumbnail; the
//     viewer does not count it as a free page
//   - at most 20% of the pages (min 4, max 7), cover not counted
//   - if no executive summary is detected the picker falls back to the first 5
//     pages (the old behaviour), so the pipeline never ships an empty preview.
//
// This file is shared by the publish script (skills/.../upload-html.mjs) and
// the server (api/_lib/preview-slice.js), so both sides agree by construction.
// Pure functions, no I/O. The full HTML never leaves the server: the output of
// buildPreview() holds only the allowed pages plus a small JSON block with every
// page's number, type and title (titles are action titles, public on purpose:
// they feed the locked-page strip).
// ============================================================

export const PREVIEW_MIN = 4;
export const PREVIEW_MAX = 7;
export const PREVIEW_SHARE = 0.2;
export const FALLBACK_PAGES = 5;
// Page types that are never part of a free preview.
export const FORBIDDEN = new Set(['risk', 'scorecard', 'stage_gate', 'decision', 'players', 'closing']);

const PAGE_OPEN = /<(?:div|section)\s+class="page(?:\s[^"]*)?"[^>]*>/g;

// ── Splitting ───────────────────────────────────────────────

/**
 * Split a report HTML into its top-level pages.
 * A page runs from its opening tag to the start of the next page (the last one
 * to </body>), so a malformed page cannot make the walk fail open.
 */
export function splitPages(html) {
  const src = String(html || '');
  const bodyAt = Math.max(src.search(/<body\b/i), 0);
  const headMatch = src.match(/<head[\s\S]*?<\/head>/i);
  const bodyEnd = src.toLowerCase().lastIndexOf('</body>');
  const end = bodyEnd > bodyAt ? bodyEnd : src.length;
  const opens = [];
  PAGE_OPEN.lastIndex = bodyAt;
  for (let m; (m = PAGE_OPEN.exec(src)); ) opens.push({ at: m.index, tag: m[0] });
  const pages = opens.map((o, k) => {
    const to = k + 1 < opens.length ? opens[k + 1].at : end;
    const html = src.slice(o.at, Math.max(to, o.at + o.tag.length));
    const stamp = o.tag.match(/\sdata-src-page="(\d+)"/);
    const info = classifyPage(o.tag, html);
    return { index: k, src: stamp ? Number(stamp[1]) : null, open: o.tag, html, ...info };
  });
  const lang = (src.match(/<html[^>]*\slang="([^"]+)"/i) || [])[1] || 'en';
  return { head: headMatch ? headMatch[0] : '<head></head>', lang, pages };
}

// ── Classification ──────────────────────────────────────────

const decode = s => String(s).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/g, "'");
const text = s => decode(String(s).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const grab = (html, re) => { const m = html.match(re); return m ? text(m[1]) : ''; };

// Section-tag keywords, EN / JA / KO / ZH. Tag text is free text in the real reports, so these are
// best effort; a miss only means the page is treated as a plain body page.
const RE_TOC = /table of contents|contents|目次|목차|目录/i;
const RE_METHOD = /methodolog|sources|方法論|方法|출처|방법론|研究方法|来源|資料|数据来源/i;
const RE_PLAYERS = /who.?s who|key players|player profiles|主要プレイヤー|プレイヤー|주요 (?:기업|플레이어)|主要(?:企业|参与者|厂商)/i;
const RE_DECISION = /risk|scorecard|stage.?gate|roadmap|recommended (?:path|move)|conditions to win|go.?\/?no.?go|first 90|next steps|options compared|decision|リスク|ロードマップ|推奨|意思決定|次のステップ|리스크|위험|로드맵|권고|의사결정|风险|路线图|建议|决策|下一步/i;
const RE_EXEC = /executive|summary|エグゼクティブ|要旨|要約|サマリー|エグゼ|요약|핵심|执行摘要|摘要|概要/i;
const RE_CMP = /matrix|heatmap|comparison|compare|quadrant|benchmark|比較|マトリクス|ヒートマップ|비교|매트릭스|히트맵|对比|比较|矩阵|热力/i;

/**
 * Type of one page, from class names first (reliable), then the section tag and
 * content. Returns { type, title, tag }.
 * Types: cover divider toc methodology exec chart comparison body
 *        risk scorecard stage_gate decision players closing
 */
export function classifyPage(openTag, html) {
  const cls = (openTag.match(/class="([^"]*)"/) || [, ''])[1];
  const tag = grab(html, /class="page-section-tag"[^>]*>([\s\S]*?)<\/div>/i);
  const title = grab(html, /<h1[^>]*class="[^"]*(?:page-h1|divider-title|cv-title)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
    || grab(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || grab(html, /<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const has = c => new RegExp('(?:^|\\s)' + c + '(?:\\s|$)').test(cls);
  const out = type => ({ type, title: title.slice(0, 180), tag: tag.slice(0, 80) });

  if (/\bcover\d?\b|\bcv-L\d/.test(cls)) return out('cover');
  if (has('closing-page')) return out('closing');
  if (has('players-page')) return out('players');
  if (has('risk-matrix-page')) return out('risk');
  if (has('decision-scorecard-page')) return out('scorecard');
  if (has('stage-gate-page')) return out('stage_gate');
  if (has('divider-page')) return out('divider');
  if (has('toc-page') || /class="toc[\s"-]/.test(html.slice(0, 1500))) return out('toc');
  if (RE_TOC.test(tag)) return out('toc');
  if (RE_METHOD.test(tag)) return out('methodology');
  if (RE_PLAYERS.test(tag)) return out('players');
  if (RE_DECISION.test(tag)) return out('decision');
  if (RE_EXEC.test(tag) || /class="exec-callouts"/.test(html)) return out('exec');
  const svgLabel = (html.match(/<svg[^>]*aria-label="([^"]*)"/i) || [, ''])[1];
  if (/<svg\b/i.test(html)) return out(RE_CMP.test(tag + ' ' + svgLabel) ? 'comparison' : 'chart');
  if (/kira-table|<table\b/i.test(html)) return out('comparison');
  return out('body');
}

// ── Picking ─────────────────────────────────────────────────

/** Number of free viewer pages allowed for a report of `total` pages (cover not counted). */
export function previewCap(total) {
  return Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, Math.ceil(total * PREVIEW_SHARE)));
}

/**
 * Choose the free pages. `pages` is the result of splitPages().pages (only `type`
 * is read). Returns { total, cover, free, fallback }:
 *   cover: index of the cover page (kept only as a thumbnail) or null
 *   free:  sorted page indices the visitor may read (cover excluded)
 */
export function pickPreviewPages(pages) {
  const total = pages.length;
  const fallback = () => ({
    total, cover: null, fallback: true,
    free: pages.slice(0, FALLBACK_PAGES).map((_, i) => i),
  });
  if (!total) return { total: 0, cover: null, free: [], fallback: true };

  const cover = pages[0].type === 'cover' ? 0 : null;
  const firstDivider = pages.findIndex(p => p.type === 'divider');
  const execLimit = firstDivider > 0 ? firstDivider : Math.ceil(total * 0.3);
  const execs = [];
  pages.forEach((p, i) => { if (p.type === 'exec' && i < execLimit && execs.length < 2) execs.push(i); });
  if (!execs.length) return fallback();

  // The body ends where the decision chapter starts (first forbidden page).
  const bodyEnd = (() => { const k = pages.findIndex((p, i) => i > execs[0] && FORBIDDEN.has(p.type)); return k < 0 ? total : k; })();
  const inBody = i => i > execs[execs.length - 1] && i < bodyEnd;
  const proofs = [];
  const chart = pages.findIndex((p, i) => inBody(i) && p.type === 'chart');
  if (chart >= 0) proofs.push(chart);
  const cmp = pages.findIndex((p, i) => inBody(i) && p.type === 'comparison' && i !== chart);
  if (cmp >= 0) proofs.push(cmp);

  const cap = previewCap(total);
  const free = [...execs, ...proofs].slice(0, cap);
  // Pad up to the minimum with other body pages (never forbidden / front-matter types).
  for (let i = 0; i < total && free.length < Math.min(cap, PREVIEW_MIN); i++) {
    if (!free.includes(i) && inBody(i) && ['chart', 'comparison', 'body'].includes(pages[i].type)) free.push(i);
  }
  if (free.length < 3) return fallback();
  free.sort((a, b) => a - b);
  return { total, cover, free, fallback: false };
}

// ── Building ────────────────────────────────────────────────

const esc = s => String(s).replace(/[&"<>]/g, c => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[c]));
const jsonSafe = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/** The meta block: one entry per page of the FULL report (number, type, title), nothing else. */
export function previewMeta(parts, pick) {
  return {
    v: 1,
    total: pick.total,
    cover: pick.cover,
    free: pick.free,
    fallback: pick.fallback,
    pages: parts.pages.map(p => ({ i: p.index, t: p.type, h: p.title })),
  };
}

function assemble(parts, keep, metaJson) {
  const head = metaJson
    ? parts.head.replace(/<\/head>/i, `<script type="application/json" id="kira-preview-meta">${metaJson}</script></head>`)
    : parts.head;
  const body = keep.map(p => {
    const role = p.role ? ` data-kira-role="${p.role}"` : '';
    const open = p.open.replace(/^(<(?:div|section)\s+class="[^"]*")/, `$1 data-src-page="${p.src}"${role}`);
    return open + p.html.slice(p.open.length);
  });
  return ['<!DOCTYPE html>', `<html lang="${esc(parts.lang)}">`, head, '<body>', body.join('\n\n'), '</body>', '</html>', ''].join('\n');
}

/**
 * Build the preview file from a FULL report HTML.
 * Returns { html, meta, pick } or null when the HTML has no pages.
 * opts.firstN forces the old "first N pages" cut (publish script compatibility).
 */
export function buildPreview(fullHtml, opts = {}) {
  const parts = splitPages(fullHtml);
  if (!parts.pages.length) return null;
  const pick = opts.firstN
    ? { total: parts.pages.length, cover: null, fallback: true, free: parts.pages.slice(0, opts.firstN).map((_, i) => i) }
    : pickPreviewPages(parts.pages);
  const meta = previewMeta(parts, pick);
  const keep = [];
  if (pick.cover != null) keep.push({ ...parts.pages[pick.cover], src: pick.cover, role: 'cover' });
  pick.free.forEach(i => keep.push({ ...parts.pages[i], src: i, role: 'free' }));
  keep.sort((a, b) => a.src - b.src);
  return { html: assemble(parts, keep, jsonSafe(meta)), meta, pick };
}

/**
 * Server-side enforcement, applied to every /api/preview-html response.
 *  - A file the publish script already sliced (pages carry data-src-page) is only
 *    re-checked: forbidden page types are dropped and the count is capped.
 *  - Anything else (a whole report that landed in the bucket by mistake) is run
 *    through the same picker, so a whole report cannot leave the server.
 *  - A file with no recognisable pages yields an empty shell, never the raw HTML.
 */
export function enforcePreview(html) {
  const parts = splitPages(html);
  if (!parts.pages.length) return assemble(parts, [], '');
  const stamped = parts.pages.some(p => p.src != null);
  if (!stamped) return buildPreview(html).html;
  const keep = parts.pages
    .filter(p => p.src != null && !FORBIDDEN.has(p.type))
    .slice(0, PREVIEW_MAX + 1)
    .map(p => ({ ...p, role: /data-kira-role="cover"/.test(p.open) ? 'cover' : 'free' }));
  // Stamps are already in the open tag: do not stamp twice.
  const head = parts.head;
  const body = keep.map(p => p.html);
  return ['<!DOCTYPE html>', `<html lang="${esc(parts.lang)}">`, head, '<body>', body.join('\n\n'), '</body>', '</html>', ''].join('\n');
}
