// ============================================================
// KIRA RESEARCH — api/_lib/studio-templates.js
//
// PHASE N.25 — Template-fill renderer (no LLM)
//
// Loads `skills/kira-research-report/templates/page_components.html`,
// extracts each <!-- TEMPLATE_START: foo --> ... <!-- TEMPLATE_END: foo -->
// block, and substitutes a JSON slots object into placeholders.
//
// Why this exists:
//   N.20-N.24 had Stage 5 emit raw HTML per section, then concat into
//   a master document. Result: generic <div>s + minimal styling — nothing
//   like KIRA consulting reports. N.25 inverts: LLM returns STRUCTURED
//   DATA (callout labels, narrative paragraphs, chart series), and we
//   substitute it into the rich consulting-grade KIRA HTML templates.
//
// Substitution rules:
//   - {{VAR}}                 → slot.VAR (escaped by default)
//   - {{&VAR}} or {{{VAR}}}   → slot.VAR (raw HTML, used for narrative body)
//   - <!-- LOOP: <key> -->    → repeat the enclosed block for each item
//     ...                       in slot.<key> (array). Inside the loop,
//     <!-- END LOOP -->         placeholders resolve against the item.
//
// Loop key inference:
//   page_components.html uses comments like `<!-- LOOP: 4 callouts -->`
//   for description. We don't trust the inline label — instead the
//   slot schema in TEMPLATE_ALLOWLIST tells us which array slot drives
//   the loop, in the order they appear.
//
// Charts:
//   For templates with a {{CHART_SVG}} placeholder, the drafter returns
//   `chart_data: { type: 'bar' | 'line' | 'donut', series: [...] }`.
//   renderChartSvg() produces a clean inline SVG. If chart_data is
//   missing/empty, returns a faint "Chart pending" caption — the
//   surrounding template still renders cleanly.
// ============================================================

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SKILL_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'skills', 'kira-research-report'
);

// ============================================================
// Template allowlist for Studio
//
// We deliberately use a SUBSET of the 15 templates in
// page_components.html. The 5 Phase-H templates (persona_profile,
// policy_timeline, risk_matrix, channel_waterfall, price_quality_matrix)
// are too specialised to be reliable for generic Studio uploads —
// they require domain-specific structured data (5x5 risk grid,
// horizontal timeline events, brand×price coords) that's hard for
// the drafter to produce well in one shot.
//
// The 8 templates below cover almost any deliverable kind:
//   • cover                    → handled programmatically (not via planner)
//   • divider                  → chapter break
//   • exec_summary_p1          → narrative + 4 KPI callouts + chart
//   • exec_summary_p2_implications → 5-card grid (findings/recos/services)
//   • market_data_chart        → narrative + chart (data-led sections)
//   • use_case_grid_6          → 6-card 3×2 grid (products/features/cases)
//   • methodology_inline       → 2-col reference (methodology/team/FAQ)
//   • competitive_profile_deep → single-entity deep dive (company profile)
//   • narrative_page           → 2-col text only (programmatic fallback)
//
// `loops` field maps loop block index → slot key + recommended item count.
// `picker_hint` is what the planner sees to choose which template fits.
// ============================================================
// Each loop has a `prefix` matching the template's placeholder naming
// (e.g. `{{CALLOUT_LABEL}}` → prefix "CALLOUT"). The renderer maps the
// LLM's bare slot key (`label`) → both `LABEL` AND `CALLOUT_LABEL` so
// either placeholder shape resolves. This keeps the LLM schema clean
// (just "label") while honoring the templates' existing namespacing.
export const TEMPLATE_ALLOWLIST = [
  {
    id: 'exec_summary_p1',
    label: 'Executive summary (callouts + chart + narrative)',
    picker_hint:
      'Best for an executive summary, key takeaways, or any opening section with 4 headline numbers + 2 narrative paragraphs + 1 chart. Use when you have hard numbers worth highlighting.',
    has_chart: true,
    loops: [
      { key: 'callouts',  prefix: 'CALLOUT',   count: 4, schema: ['label', 'num', 'unit', 'change', 'change_dir', 'source_tag', 'source_label'] },
      { key: 'narrative', prefix: 'NARRATIVE', count: 2, schema: ['heading', 'body_html'] }
    ],
    scalar_slots: [
      'section_tag', 'page_h1', 'subhead_html',
      'chart_title', 'chart_subtitle', 'chart_unit', 'chart_source',
      'source_key_html'
    ]
  },
  {
    id: 'exec_summary_p2_implications',
    label: '5-card findings/recommendations grid',
    picker_hint:
      'Best for "key findings", "implications", "recommendations", "action plan", "what this means" sections. Renders 5 numbered cards in a grid.',
    has_chart: false,
    loops: [
      { key: 'cards', prefix: 'CARD', count: 5, schema: ['num_tag', 'title', 'body_html', 'anchor_html'] }
    ],
    scalar_slots: ['section_tag', 'page_h1', 'subhead_html']
  },
  {
    id: 'market_data_chart',
    label: 'Narrative + single chart page',
    picker_hint:
      'Best for any data-led section: market sizing, growth trajectory, revenue trend, financial highlights, segment breakdown. 2-3 narrative blocks beside one chart.',
    has_chart: true,
    loops: [
      { key: 'narrative', prefix: 'NARRATIVE', count: 3, schema: ['heading', 'body_html'] }
    ],
    scalar_slots: [
      'section_tag', 'page_h1', 'subhead_html',
      'chart_title', 'chart_subtitle', 'chart_unit', 'chart_source',
      'source_key_html'
    ]
  },
  {
    id: 'use_case_grid_6',
    label: '6-card 3×2 grid',
    picker_hint:
      'Best for showcasing 6 items at equal weight: product lines, services, use cases, client logos, features, customer segments, capability areas.',
    has_chart: false,
    loops: [
      { key: 'cards', prefix: 'CARD', count: 6, schema: ['num_tag', 'title', 'body_html', 'example_label'] }
    ],
    scalar_slots: ['section_tag', 'page_h1', 'subhead_html']
  },
  {
    id: 'methodology_inline',
    label: '2-column reference page',
    picker_hint:
      'Best for methodology, team / leadership bios, FAQs, process steps, principles — anything that splits naturally into two columns of labelled items.',
    has_chart: false,
    loops: [
      { key: 'left_items',  prefix: 'ITEM', count: 4, schema: ['label', 'desc_html'] },
      { key: 'right_items', prefix: 'ITEM', count: 4, schema: ['label', 'desc_html'] }
    ],
    scalar_slots: ['page_h1', 'subhead_html', 'left_col_heading', 'right_col_heading']
  },
  {
    id: 'competitive_profile_deep',
    label: 'Single-entity deep dive (company / product profile)',
    picker_hint:
      'Best for ONE entity in depth: a company profile, a single product spec, a single competitor breakdown. Hero block with stats, then 2-column body. Pick this when the deliverable centers on ONE thing.',
    has_chart: false,
    loops: [
      { key: 'tags',           prefix: 'TAG',           count: 3, schema: ['label', 'type'] },
      { key: 'profile_stats',  prefix: 'STAT',          count: 4, schema: ['label', 'val', 'unit'] },
      { key: 'left_sections',  prefix: 'LEFT_SECTION',  count: 2, schema: ['heading', 'body_html'] },
      { key: 'right_sections', prefix: 'RIGHT_SECTION', count: 2, schema: ['heading', 'body_html'] }
    ],
    scalar_slots: ['section_tag', 'company_name', 'company_subtitle']
  },
  {
    id: 'divider',
    label: 'Chapter break (dark mode)',
    picker_hint:
      'Use sparingly to break the document into named chapters. Dark page with section number + a thesis sentence + 3-5 pill labels.',
    has_chart: false,
    loops: [
      { key: 'pills', prefix: 'PILL', count: 4, schema: ['label'] }
    ],
    scalar_slots: ['section_num', 'title_part_1', 'title_part_2', 'thesis_html']
  },
  {
    id: 'narrative_page',
    label: 'Text-only page (2-3 paragraphs)',
    picker_hint:
      'Fallback for sections that don\'t fit any of the structured templates above — generic narrative pages without charts, cards, or grids. Use only when nothing else fits.',
    has_chart: false,
    loops: [
      { key: 'paragraphs', prefix: 'PARA', count: 4, schema: ['heading', 'body_html'] }
    ],
    scalar_slots: ['section_tag', 'page_h1', 'subhead_html']
  }
];

// O(1) lookup
const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATE_ALLOWLIST.map(t => [t.id, t]));

export function getTemplateMeta(id) {
  return TEMPLATE_BY_ID[id] || null;
}

// Compact guide block injected into the planner prompt.
export function getTemplateGuideForPlanner() {
  return TEMPLATE_ALLOWLIST
    .map(t => `  • "${t.id}" — ${t.picker_hint}`)
    .join('\n');
}

// Slot schema as a compact JSON-shape description for the drafter prompt.
export function describeSlotShape(templateId) {
  const t = TEMPLATE_BY_ID[templateId];
  if (!t) return '{}';
  const obj = {};
  for (const k of t.scalar_slots) obj[k] = '<string>';
  for (const loop of t.loops) {
    obj[loop.key] = [Object.fromEntries(loop.schema.map(k => [k, '<string>']))];
  }
  if (t.has_chart) {
    obj.chart_data = {
      type: '<one of: bar | line | donut>',
      series: [{ label: '<string>', value: '<number>' }]
    };
  }
  return JSON.stringify(obj, null, 2);
}

// ============================================================
// Template loader — parse page_components.html once, cache.
// ============================================================
let _cachedRawHtml = null;
let _cachedTemplates = null;

async function loadRawTemplatesFile() {
  if (_cachedRawHtml) return _cachedRawHtml;
  _cachedRawHtml = await readFile(
    path.join(SKILL_DIR, 'templates', 'page_components.html'),
    'utf8'
  );
  return _cachedRawHtml;
}

async function loadParsedTemplates() {
  if (_cachedTemplates) return _cachedTemplates;
  const raw = await loadRawTemplatesFile();
  const map = {};
  const re = /<!--\s*TEMPLATE_START:\s*([a-z0-9_]+)\s*-->([\s\S]*?)<!--\s*TEMPLATE_END:\s*\1\s*-->/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    map[m[1]] = m[2].trim();
  }
  _cachedTemplates = map;
  return _cachedTemplates;
}

// ============================================================
// Tiny HTML-escape — only escapes the 5 dangerous chars.
// Use for scalar slots that should display as literal text.
// ============================================================
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
// Substitute {{VAR}} / {{&VAR}} / {{{VAR}}} placeholders.
// `raw` keys (with & or triple-brace) are inserted unescaped — used
// for slot values that are HTML fragments (narrative body, anchor html).
// ============================================================
function applyPlaceholders(html, scope) {
  if (!html) return html;
  return html
    .replace(/\{\{\{([A-Z0-9_]+)\}\}\}/g, (_, key) => {
      const v = scope[key] ?? scope[key.toLowerCase()];
      return v == null ? '' : String(v);
    })
    .replace(/\{\{&\s*([A-Z0-9_]+)\}\}/g, (_, key) => {
      const v = scope[key] ?? scope[key.toLowerCase()];
      return v == null ? '' : String(v);
    })
    .replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
      const v = scope[key] ?? scope[key.toLowerCase()];
      return v == null ? '' : esc(v);
    });
}

// ============================================================
// Loop expansion.
//
// Templates use:
//   <!-- LOOP: 4 callouts -->
//   ...block...
//   <!-- END LOOP -->
//
// We replace the Nth loop block with the rendered concatenation of
// slot.<loops[N].key>. Each item's keys become available in the
// substitution scope inside the block.
//
// Some templates have nested loops (e.g. competitive_structure has
// stat rows inside player cards). Studio's allowlist deliberately
// excludes those — every allowlist template is flat (no nesting).
// ============================================================
function expandLoops(templateHtml, loopDefs, slots) {
  // Find all top-level LOOP/END LOOP pairs in order.
  const re = /<!--\s*LOOP:[^-]*-->([\s\S]*?)<!--\s*END LOOP\s*-->/g;
  let loopIdx = 0;
  return templateHtml.replace(re, (_match, inner) => {
    const def = loopDefs[loopIdx++];
    if (!def) return ''; // unexpected extra loop — drop quietly
    const items = Array.isArray(slots[def.key]) ? slots[def.key] : [];
    if (items.length === 0) return '';
    const prefix = def.prefix ? `${def.prefix}_` : '';
    return items
      .map(item => {
        // Item scope = uppercased keys for placeholder match. Also add
        // a prefixed variant (e.g. label → CALLOUT_LABEL) so the
        // KIRA templates' namespaced placeholders resolve cleanly.
        const scope = {};
        for (const k of Object.keys(item || {})) {
          const upper = k.toUpperCase();
          scope[upper]            = item[k];
          if (prefix) scope[prefix + upper] = item[k];
        }
        // Also inherit top-level scalar slots so loop blocks can
        // reference parent scalars (rare but used by chart-source-tag
        // loops). Don't shadow already-set item keys.
        for (const k of Object.keys(slots || {})) {
          if (typeof slots[k] !== 'object' || slots[k] == null) {
            const upper = k.toUpperCase();
            if (!(upper in scope)) scope[upper] = slots[k];
          }
        }
        return applyPlaceholders(inner, scope);
      })
      .join('\n');
  });
}

// ============================================================
// Cleanup pass: remove obviously-empty inner blocks left over after
// substitution. Some templates have alternative blocks intended for
// different content types (e.g. competitive_profile_deep right column
// has both <p> AND <ul><li></li></ul> emitted per item — we drop empty
// list items so they don't render as empty bullets).
// ============================================================
function cleanupEmptyBlocks(html) {
  return html
    // <ul>...empty <li></li>...</ul> (any attributes)
    .replace(/<ul[^>]*>\s*(?:<li[^>]*>\s*<\/li>\s*)+<\/ul>/g, '')
    // <p ...></p> empty paragraphs (any attributes)
    .replace(/<p[^>]*>\s*<\/p>/g, '')
    // <h3 ...></h3> empty (any attributes)
    .replace(/<h3[^>]*>\s*<\/h3>/g, '')
    // <h4 ...></h4> empty
    .replace(/<h4[^>]*>\s*<\/h4>/g, '')
    // empty <div class="source-key"></div> (no inline aliases on this page)
    .replace(/<div class="source-key">\s*<\/div>/g, '');
}

// ============================================================
// Main render entry.
// ============================================================
export async function renderTemplate(templateId, slots) {
  const meta = TEMPLATE_BY_ID[templateId];
  if (!meta) throw new Error(`unknown_template:${templateId}`);
  const all = await loadParsedTemplates();
  let html = all[templateId];

  // narrative_page isn't in page_components.html — it's a programmatic
  // fallback. Build it inline.
  if (templateId === 'narrative_page') {
    return renderNarrativePage(slots);
  }
  if (!html) throw new Error(`template_html_not_found:${templateId}`);

  // 1) Chart slot — inject inline SVG (or empty caption) BEFORE we run
  //    placeholders, so the placeholder lookup picks up CHART_SVG.
  const enrichedSlots = { ...slots };
  if (meta.has_chart) {
    enrichedSlots.chart_svg = renderChartSvg(slots.chart_data, slots.chart_unit);
  }

  // 2) Expand each loop in order against its defined slot key.
  html = expandLoops(html, meta.loops || [], enrichedSlots);

  // 3) Substitute top-level placeholders.
  //    Upper-case the scope so {{PAGE_H1}} matches slots.page_h1.
  const topScope = {};
  for (const k of Object.keys(enrichedSlots || {})) {
    topScope[k.toUpperCase()] = enrichedSlots[k];
  }
  html = applyPlaceholders(html, topScope);

  // 4) Strip obviously-empty inner blocks (empty <li>, empty <p>, etc.)
  //    left over from templates with conditional alternates.
  html = cleanupEmptyBlocks(html);

  return html;
}

// ============================================================
// narrative_page — programmatic fallback. Stylistically matches the
// other page templates (page-inner wrapper + page-header + h1 + body).
// ============================================================
function renderNarrativePage(slots) {
  const paragraphs = Array.isArray(slots.paragraphs) ? slots.paragraphs : [];
  const blocks = paragraphs.map(p => {
    const heading = p?.heading ? `<h3>${esc(p.heading)}</h3>` : '';
    const body = p?.body_html ? String(p.body_html) : '';
    return `${heading}\n<p>${body}</p>`;
  }).join('\n');

  return `<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">${esc(slots.section_tag || '')}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">${esc(slots.page_h1 || '')}</h1>
    ${slots.subhead_html ? `<p class="page-subhead">${slots.subhead_html}</p>` : ''}
    <div class="exec-body" style="grid-template-columns: 1fr; gap: 40px;">
      <div class="exec-narrative">${blocks}</div>
    </div>
    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>${esc(slots.footer_text || '')}</div>
    </div>
  </div>
</div>`;
}

// ============================================================
// Programmatic COVER — always section 1, never planned by LLM.
// Adapts to whether Stage 1 actually filled country/industry/year.
// ============================================================
export function renderCoverPage({ finalTitle, subtitle, reportKind, primarySubject, country, industry, year, jobId }) {
  // Split the title across two lines + accent for that signature KIRA look.
  // Heuristic: if title has a colon or em-dash, split there.
  // Otherwise split roughly mid-sentence by word count.
  const title = String(finalTitle || 'Untitled deliverable').trim();
  let line1 = title, line2 = '', accent = '';
  const sepMatch = title.match(/^(.+?)[—:·](.+)$/);
  if (sepMatch) {
    line1 = sepMatch[1].trim();
    line2 = '';
    accent = sepMatch[2].trim();
  } else {
    // Move final word to accent if title is 3+ words.
    const words = title.split(/\s+/);
    if (words.length >= 3) {
      accent = words.pop();
      const half = Math.ceil(words.length / 2);
      line1 = words.slice(0, half).join(' ');
      line2 = words.slice(half).join(' ');
    } else {
      // Short title — single line, last word accented.
      const w = title.split(/\s+/);
      if (w.length >= 2) {
        accent = w.pop();
        line1 = w.join(' ');
        line2 = '';
      }
    }
  }

  const eyebrowParts = [country, industry, year].filter(Boolean);
  const eyebrow = eyebrowParts.length
    ? eyebrowParts.join(' · ')
    : `${reportKind || 'Deliverable'}${primarySubject ? ` · ${primarySubject}` : ''}`;

  const today = new Date();
  const yearStr   = String(today.getFullYear());
  const monthStr  = today.toLocaleString('en-US', { month: 'short' });
  const dayStr    = String(today.getDate()).padStart(2, '0');
  const publishDate = `${monthStr} ${dayStr} · ${yearStr}`;

  const reportId = (jobId ? String(jobId).replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase() : 'STUDIO');

  return `<div class="page cover">
  <div class="cover-grid"></div>
  <div class="cover-content">
    <div class="page-inner">
      <div class="cover-top">
        <span style="font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 28px;">KIRA<span style="color: var(--primary);">.</span></span>
        <span style="font-family: 'Satoshi', sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 0.32em; color: var(--primary); text-transform: uppercase;">RESEARCH</span>
      </div>
      <div class="cover-main">
        <div class="cover-eyebrow">${esc(eyebrow)}</div>
        <h1>${esc(line1)}${line2 ? `<br>${esc(line2)}` : ''}${accent ? ` <span class="accent">${esc(accent)}</span>` : ''}</h1>
        ${subtitle ? `<p class="cover-subtitle">${esc(subtitle)}</p>` : ''}
      </div>
      <div>
        <div class="cover-meta-grid">
          <div class="cover-meta-item"><div class="label">Subject</div><div class="val">${esc(primarySubject || reportKind || '—')}</div></div>
          <div class="cover-meta-item"><div class="label">Kind</div><div class="val">${esc(reportKind || 'Document')}</div></div>
          <div class="cover-meta-item"><div class="label">Published</div><div class="val">${esc(publishDate)}</div></div>
          <div class="cover-meta-item"><div class="label">Report ID</div><div class="val"><span class="accent">${esc(reportId)}</span></div></div>
        </div>
        <div class="cover-confidential" style="margin-top: 16px;"><strong>CONFIDENTIAL</strong> · Single-user license · © ${yearStr} KIRA Research</div>
      </div>
    </div>
  </div>
</div>`;
}

// ============================================================
// SOURCE-KEY PAGE — final page, lists uploaded files.
// Renders inside the standard page wrapper for consistent styling.
// ============================================================
export function renderSourceKeyPage({ extracted, totalPages }) {
  const items = (Array.isArray(extracted) ? extracted : [])
    .slice(0, 40)
    .map((f, i) => {
      const name = String(f?.filename || '').trim();
      if (!name) return null;
      const chars = Number(f?.char_count || 0);
      const sizeLabel = chars >= 1000 ? `~${Math.round(chars / 1000)}K chars` : `${chars} chars`;
      return `<div style="margin-bottom: 8px; color: var(--text-mid); font-size: 12px;">
        <span class="mono" style="color: var(--primary); margin-right: 6px;">[${i + 1}]</span>
        <strong style="color: var(--text);">${esc(name)}</strong>
        <span style="color: var(--muted);"> · ${sizeLabel}</span>
      </div>`;
    })
    .filter(Boolean)
    .join('\n');

  return `<div class="page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">Source key &amp; traceability</div>
      <div class="page-section-counter">${esc(totalPages)} / ${esc(totalPages)}</div>
    </div>
    <h1 class="page-h1">Source key.</h1>
    <p class="page-subhead">Inline tags like <code>[filename]</code> in the body resolve to the user-uploaded sources listed below. Tags of the form <code>[Kira estimates]</code> mark analyst inference not directly traceable to an uploaded source.</p>
    <div style="flex: 1; overflow: hidden; min-height: 0;">
      <h3 style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--primary); letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); font-weight: 600;">Source index</h3>
      <div style="columns: 2; column-gap: 32px;">
        ${items || '<div style="font-size:12px;color:var(--text-mid);">No source files uploaded — deliverable drafted from analyst inference (tagged [Kira estimates]).</div>'}
      </div>
    </div>
    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>Confidential · Single-user license</div>
    </div>
  </div>
</div>`;
}

// ============================================================
// SVG CHART RENDERER — bar / line / donut.
//
// Slot signature:
//   chart_data = { type: 'bar' | 'line' | 'donut', series: [{label, value}, ...] }
//
// Designed to fill the 600×280-ish chart panel slot in the templates.
// Uses KIRA blue (#1E6FFF) for primary fill + slate ink for labels.
//
// N.26 will replace with richer / multi-series charts; for N.25 this
// is "good enough to look intentional".
// ============================================================
export function renderChartSvg(chartData, _unitHint) {
  if (!chartData || !Array.isArray(chartData.series) || chartData.series.length === 0) {
    return `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">Chart data not provided</div>`;
  }
  const type = String(chartData.type || 'bar').toLowerCase();
  if (type === 'donut') return renderDonut(chartData.series);
  if (type === 'line')  return renderLine(chartData.series);
  return renderBar(chartData.series);
}

function _num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function renderBar(series) {
  const W = 600, H = 260;
  const padL = 80, padR = 20, padT = 24, padB = 50;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const values = series.map(s => _num(s.value));
  const max = Math.max(1, ...values);
  const n = series.length;
  const barW = Math.max(8, (innerW / n) * 0.62);
  const step = innerW / n;

  const bars = series.map((s, i) => {
    const v = _num(s.value);
    const h = (v / max) * innerH;
    const x = padL + step * i + (step - barW) / 2;
    const y = padT + innerH - h;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="#1E6FFF" rx="2"/>
      <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="#0F172A">${esc(s.label_value || v.toLocaleString())}</text>
      <text x="${(x + barW / 2).toFixed(1)}" y="${(H - padB + 18).toFixed(1)}" text-anchor="middle" font-family="Satoshi, sans-serif" font-size="10" font-weight="500" fill="#64748B">${esc(String(s.label || '').slice(0, 14))}</text>
    `;
  }).join('');

  // Y-axis baseline
  const axisY = padT + innerH;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;">
    <line x1="${padL}" y1="${axisY}" x2="${padL + innerW}" y2="${axisY}" stroke="#E2E8F0" stroke-width="1"/>
    ${bars}
  </svg>`;
}

function renderLine(series) {
  const W = 600, H = 260;
  const padL = 60, padR = 20, padT = 24, padB = 50;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const values = series.map(s => _num(s.value));
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const range = Math.max(1, max - min);
  const n = series.length;
  const step = n > 1 ? innerW / (n - 1) : 0;

  const pts = series.map((s, i) => {
    const v = _num(s.value);
    const x = padL + step * i;
    const y = padT + innerH - ((v - min) / range) * innerH;
    return [x, y, v, s.label];
  });

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const dots = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="#1E6FFF"/>`).join('');
  const valueLabels = pts.map(p => `<text x="${p[0].toFixed(1)}" y="${(p[1] - 10).toFixed(1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="#0F172A">${esc(p[2].toLocaleString())}</text>`).join('');
  const axisLabels = pts.map(p => `<text x="${p[0].toFixed(1)}" y="${(H - padB + 18).toFixed(1)}" text-anchor="middle" font-family="Satoshi, sans-serif" font-size="10" font-weight="500" fill="#64748B">${esc(String(p[3] || '').slice(0, 14))}</text>`).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;">
    <line x1="${padL}" y1="${padT + innerH}" x2="${padL + innerW}" y2="${padT + innerH}" stroke="#E2E8F0" stroke-width="1"/>
    <path d="${pathD}" fill="none" stroke="#1E6FFF" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${valueLabels}
    ${axisLabels}
  </svg>`;
}

function renderDonut(series) {
  const W = 600, H = 260;
  const cx = 160, cy = 130, rOuter = 90, rInner = 56;
  const total = series.reduce((a, s) => a + Math.max(0, _num(s.value)), 0) || 1;
  const palette = ['#1E6FFF', '#3F8AFF', '#7BA8FF', '#A6C2FF', '#CDDBFE', '#E2E8F0'];

  let angle = -Math.PI / 2;
  const slices = series.map((s, i) => {
    const v = Math.max(0, _num(s.value));
    const frac = v / total;
    const next = angle + frac * 2 * Math.PI;
    const largeArc = frac > 0.5 ? 1 : 0;
    const x1 = cx + rOuter * Math.cos(angle);
    const y1 = cy + rOuter * Math.sin(angle);
    const x2 = cx + rOuter * Math.cos(next);
    const y2 = cy + rOuter * Math.sin(next);
    const ix1 = cx + rInner * Math.cos(next);
    const iy1 = cy + rInner * Math.sin(next);
    const ix2 = cx + rInner * Math.cos(angle);
    const iy2 = cy + rInner * Math.sin(angle);
    const d = [
      `M ${x1.toFixed(1)} ${y1.toFixed(1)}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      `L ${ix1.toFixed(1)} ${iy1.toFixed(1)}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ix2.toFixed(1)} ${iy2.toFixed(1)}`,
      'Z'
    ].join(' ');
    const slice = `<path d="${d}" fill="${palette[i % palette.length]}"/>`;
    angle = next;
    return { slice, color: palette[i % palette.length], frac, label: s.label, value: v };
  });

  const legend = slices.map((s, i) => {
    const y = 24 + i * 22;
    const pct = Math.round(s.frac * 1000) / 10;
    return `
      <rect x="320" y="${y}" width="12" height="12" fill="${s.color}" rx="2"/>
      <text x="338" y="${y + 10}" font-family="Satoshi, sans-serif" font-size="11" font-weight="600" fill="#0F172A">${esc(String(s.label || '').slice(0, 24))}</text>
      <text x="${W - 20}" y="${y + 10}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600" fill="#1E6FFF">${pct}%</text>
    `;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" style="display:block;">
    ${slices.map(s => s.slice).join('')}
    ${legend}
  </svg>`;
}

// ============================================================
// PAGE NUMBER PASS — runs after all pages are assembled.
// Templates emit {{PAGE_NUM}} / {{TOTAL_PAGES}} placeholders that
// only the assembler knows the final values for. This walks the
// concatenated page HTML, replacing them with 1..N / N.
// ============================================================
export function applyPageNumbers(allPagesHtml) {
  // First count pages by counting top-level .page divs that contain
  // a placeholder. Cheap: just count {{PAGE_NUM}} occurrences and
  // divide … but pages can have multiple placeholders, so count
  // unique pages instead by counting `<div class="page` openings.
  const pageOpenMatches = allPagesHtml.match(/<div class="page(?:\s[^"]*)?"/g) || [];
  const total = pageOpenMatches.length;

  let counter = 0;
  // For each page block, scope-replace placeholders within it.
  // Split on the opening tag to walk page-by-page.
  const parts = allPagesHtml.split(/(?=<div class="page(?:\s[^"]*)?")/);
  const rebuilt = parts.map(p => {
    if (!p.includes('class="page')) return p;
    counter++;
    return p
      .replace(/\{\{PAGE_NUM\}\}/g, String(counter))
      .replace(/\{\{TOTAL_PAGES\}\}/g, String(total));
  }).join('');
  return rebuilt;
}

// ============================================================
// MASTER WRAPPER — final document shell with embedded master CSS.
// ============================================================
export async function loadMasterWrapper() {
  return readFile(
    path.join(SKILL_DIR, 'templates', 'master_wrapper.html'),
    'utf8'
  );
}
