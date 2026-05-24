// ============================================================
// KIRA RESEARCH — api/_lib/studio-pptx.js
//
// PHASE N.27 — Native PPTX renderer for KIRA Studio
//
// Takes the same drafts + parsed/plan data Stage 7 hands to the HTML
// renderer, but produces an EDITABLE .pptx using pptxgenjs's native
// shape + text + chart APIs. Each slide is real PowerPoint geometry —
// text boxes the user can click + edit, native bar/line/donut charts
// they can re-style in PowerPoint, not flat images.
//
// LAYOUT: 16:9 widescreen, 13.33in × 7.5in (matches the 1280×720 HTML
//         template aspect ratio).
//
// FONT: Calibri (PowerPoint default) — closest to Satoshi without
//       requiring a font embed. Users can swap to a corporate font.
//
// COLORS (KIRA brand): primary blue 1E6FFF, ink 0F172A, mid 64748B,
//         border E2E8F0, white FFFFFF, dark divider 0A0F1C.
//
// ============================================================

import pptxgen from 'pptxgenjs';

// Brand colors (hex without #).
const C_PRIMARY = '1E6FFF';
const C_INK     = '0F172A';
const C_MID     = '64748B';
const C_MUTED   = '94A3B8';
const C_BORDER  = 'E2E8F0';
const C_PANEL   = 'F8FAFC';
const C_WHITE   = 'FFFFFF';
const C_DARK    = '0A0F1C';

// Multi-series chart palette (KIRA brand for first 2-3, soft greys after).
const CHART_PALETTE = ['1E6FFF', '0F172A', 'F59E0B', '10B981', '7C3AED', 'EC4899'];

// ============================================================
// Helpers
// ============================================================

// Strip simple HTML tags from a body_html slot so the text reads cleanly
// in PowerPoint. <strong>/<em> tags become bold/italic via pptxgenjs's
// runs, but for simplicity here we just flatten. (N.28 could parse rich
// runs.)
function stripHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/li>\s*<li[^>]*>/gi, '\n• ')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// Convert a value (number or string) to a chart numeric value.
// pptxgenjs charts need actual numbers; strings like "$1.2B" → 1200000000.
function chartNum(v) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  const s = String(v).trim().replace(/[, ]/g, '');
  const m = s.match(/^([+-]?\$?€?£?¥?)?([\d.]+)\s*([kKmMbB]?)\s*[%$]?$/);
  if (!m) {
    const n = Number(s.replace(/[^0-9.+-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  const base = Number(m[2]);
  const mult = m[3]?.toLowerCase() === 'k' ? 1e3
              : m[3]?.toLowerCase() === 'm' ? 1e6
              : m[3]?.toLowerCase() === 'b' ? 1e9
              : 1;
  return base * mult;
}

// Add the standard page header (section tag top-left, page counter top-right).
function addPageHeader(slide, { sectionTag, pageNum, totalPages }) {
  slide.addText(String(sectionTag || '').toUpperCase(), {
    x: 0.5, y: 0.35, w: 9, h: 0.28,
    fontFace: 'Calibri', fontSize: 9, bold: true, color: C_PRIMARY, charSpacing: 3
  });
  slide.addText(`${pageNum} / ${totalPages}`, {
    x: 11, y: 0.35, w: 1.83, h: 0.28,
    fontFace: 'Calibri', fontSize: 9, bold: true, color: C_MUTED,
    align: 'right', charSpacing: 2
  });
  // Thin divider line under header
  slide.addShape('line', {
    x: 0.5, y: 0.7, w: 12.33, h: 0,
    line: { color: C_BORDER, width: 0.5 }
  });
}

function addPageFooter(slide, { footerText }) {
  // KIRA. RESEARCH logo
  slide.addText([
    { text: 'KIRA',     options: { bold: true, color: C_INK,     fontSize: 9 } },
    { text: '.',        options: { bold: true, color: C_PRIMARY, fontSize: 9 } },
    { text: ' RESEARCH',options: { bold: false,color: C_MID,     fontSize: 9, charSpacing: 3 } }
  ], {
    x: 0.5, y: 7.15, w: 4, h: 0.25,
    fontFace: 'Calibri'
  });
  slide.addText(String(footerText || ''), {
    x: 6, y: 7.15, w: 6.83, h: 0.25,
    fontFace: 'Calibri', fontSize: 8, color: C_MUTED, align: 'right'
  });
}

function addH1(slide, text) {
  slide.addText(String(text || ''), {
    x: 0.5, y: 0.85, w: 12.33, h: 0.7,
    fontFace: 'Calibri', fontSize: 28, bold: true, color: C_INK, valign: 'top'
  });
}

function addSubhead(slide, html) {
  const text = stripHtml(html);
  if (!text) return;
  slide.addText(text, {
    x: 0.5, y: 1.6, w: 12.33, h: 0.6,
    fontFace: 'Calibri', fontSize: 12, color: C_MID, valign: 'top'
  });
}

// ============================================================
// COVER — single-slide title page.
// ============================================================
function renderCoverSlide(pres, { finalTitle, subtitle, reportKind, primarySubject, country, industry, year }) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };

  // Top brand mark
  slide.addText([
    { text: 'KIRA',     options: { bold: true, color: C_INK,     fontSize: 22 } },
    { text: '.',        options: { bold: true, color: C_PRIMARY, fontSize: 22 } },
    { text: ' RESEARCH',options: { color: C_PRIMARY, fontSize: 10, charSpacing: 5, bold: true } }
  ], {
    x: 0.6, y: 0.5, w: 8, h: 0.45,
    fontFace: 'Calibri', valign: 'middle'
  });

  // Eyebrow line
  const eyebrowParts = [country, industry, year].filter(Boolean);
  const eyebrow = eyebrowParts.length
    ? eyebrowParts.join(' · ').toUpperCase()
    : `${reportKind || 'Deliverable'}${primarySubject ? ` · ${primarySubject}` : ''}`.toUpperCase();

  slide.addText(eyebrow, {
    x: 0.6, y: 2.6, w: 12.13, h: 0.4,
    fontFace: 'Calibri', fontSize: 11, bold: true, color: C_PRIMARY, charSpacing: 5
  });

  // Title — big
  slide.addText(String(finalTitle || 'Untitled deliverable'), {
    x: 0.6, y: 3.0, w: 11, h: 2.2,
    fontFace: 'Calibri', fontSize: 48, bold: true, color: C_INK, valign: 'top'
  });

  // Subtitle
  if (subtitle) {
    slide.addText(String(subtitle), {
      x: 0.6, y: 5.25, w: 11, h: 0.9,
      fontFace: 'Calibri', fontSize: 16, color: C_MID, italic: true
    });
  }

  // Meta row at bottom
  const today = new Date();
  const dateStr = today.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const metaCells = [
    { label: 'Subject',   value: primarySubject || reportKind || '—' },
    { label: 'Kind',      value: reportKind || 'Document' },
    { label: 'Published', value: dateStr },
    { label: 'Confidential', value: 'Single-user license' }
  ];
  const cellW = 12.13 / 4;
  metaCells.forEach((c, i) => {
    const x = 0.6 + i * cellW;
    slide.addText(c.label.toUpperCase(), {
      x, y: 6.5, w: cellW - 0.2, h: 0.22,
      fontFace: 'Calibri', fontSize: 8, bold: true, color: C_MUTED, charSpacing: 3
    });
    slide.addText(String(c.value), {
      x, y: 6.75, w: cellW - 0.2, h: 0.3,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: C_INK
    });
  });
}

// ============================================================
// exec_summary_p1 — 4 callouts + 2 narrative cols + chart.
// ============================================================
function renderExecSummaryP1(pres, slot, ctx) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };
  addPageHeader(slide, { sectionTag: slot.section_tag, pageNum: ctx.pageNum, totalPages: ctx.totalPages });
  addH1(slide, slot.page_h1);
  addSubhead(slide, slot.subhead_html);

  // 4 callouts row at y=2.35, h=1.45
  const callouts = Array.isArray(slot.callouts) ? slot.callouts.slice(0, 4) : [];
  const calloutW = (12.33 - 0.3 * 3) / 4;
  callouts.forEach((c, i) => {
    const x = 0.5 + i * (calloutW + 0.3);
    // Background panel
    slide.addShape('rect', {
      x, y: 2.35, w: calloutW, h: 1.45,
      fill: { color: C_PANEL },
      line: { color: C_BORDER, width: 0.5 }
    });
    slide.addText(String(c.label || '').toUpperCase(), {
      x: x + 0.15, y: 2.45, w: calloutW - 0.3, h: 0.22,
      fontFace: 'Calibri', fontSize: 8, bold: true, color: C_MUTED, charSpacing: 3
    });
    slide.addText(`${c.num || ''}${c.unit ? ' ' + c.unit : ''}`, {
      x: x + 0.15, y: 2.7, w: calloutW - 0.3, h: 0.6,
      fontFace: 'Calibri', fontSize: 24, bold: true, color: C_INK
    });
    if (c.change) {
      slide.addText(String(c.change), {
        x: x + 0.15, y: 3.3, w: calloutW - 0.3, h: 0.2,
        fontFace: 'Calibri', fontSize: 9, bold: true,
        color: c.change_dir === 'down' ? 'DC2626' : '16A34A'
      });
    }
    if (c.source_label) {
      slide.addText(String(c.source_label), {
        x: x + 0.15, y: 3.55, w: calloutW - 0.3, h: 0.2,
        fontFace: 'Calibri', fontSize: 7, color: C_MUTED, italic: true
      });
    }
  });

  // Bottom row: narrative left, chart right
  const bodyY = 4.0;
  const bodyH = 3.0;
  const narrative = Array.isArray(slot.narrative) ? slot.narrative.slice(0, 2) : [];
  narrative.forEach((n, i) => {
    const ny = bodyY + i * (bodyH / 2);
    slide.addText(String(n.heading || ''), {
      x: 0.5, y: ny, w: 6, h: 0.3,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: C_PRIMARY, charSpacing: 2
    });
    slide.addText(stripHtml(n.body_html), {
      x: 0.5, y: ny + 0.3, w: 6, h: (bodyH / 2) - 0.35,
      fontFace: 'Calibri', fontSize: 10, color: C_INK, valign: 'top'
    });
  });

  addChartBlock(pres, slide, slot, { x: 6.83, y: bodyY, w: 6, h: bodyH });

  addPageFooter(slide, { footerText: ctx.footerText });
}

// ============================================================
// exec_summary_p2_implications — 5-card grid.
// Layout: 3 top + 2 centered bottom.
// ============================================================
function renderExecSummaryP2(pres, slot, ctx) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };
  addPageHeader(slide, { sectionTag: slot.section_tag, pageNum: ctx.pageNum, totalPages: ctx.totalPages });
  addH1(slide, slot.page_h1);
  addSubhead(slide, slot.subhead_html);

  const cards = Array.isArray(slot.cards) ? slot.cards.slice(0, 5) : [];
  const gridY = 2.4;
  const cardH = 2.2;

  // Top row: 3 cards
  const topW = (12.33 - 0.3 * 2) / 3;
  cards.slice(0, 3).forEach((c, i) => {
    const x = 0.5 + i * (topW + 0.3);
    drawCard(slide, c, x, gridY, topW, cardH);
  });

  // Bottom row: 2 cards (centered)
  const bottomW = (12.33 - 0.3) / 2 - 1.5; // narrower, with margins
  const bottomStartX = 0.5 + 1.5;
  cards.slice(3, 5).forEach((c, i) => {
    const x = bottomStartX + i * (bottomW + 0.3);
    drawCard(slide, c, x, gridY + cardH + 0.25, bottomW, cardH);
  });

  addPageFooter(slide, { footerText: ctx.footerText });
}

function drawCard(slide, c, x, y, w, h) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: C_WHITE },
    line: { color: C_BORDER, width: 0.5 }
  });
  if (c.num_tag) {
    slide.addText(String(c.num_tag).toUpperCase(), {
      x: x + 0.15, y: y + 0.15, w: w - 0.3, h: 0.25,
      fontFace: 'Calibri', fontSize: 9, bold: true, color: C_PRIMARY, charSpacing: 3
    });
  }
  slide.addText(String(c.title || ''), {
    x: x + 0.15, y: y + 0.45, w: w - 0.3, h: 0.4,
    fontFace: 'Calibri', fontSize: 13, bold: true, color: C_INK
  });
  slide.addText(stripHtml(c.body_html), {
    x: x + 0.15, y: y + 0.9, w: w - 0.3, h: h - 1.1,
    fontFace: 'Calibri', fontSize: 9, color: C_MID, valign: 'top'
  });
  if (c.anchor_html || c.example_label) {
    slide.addText(stripHtml(c.anchor_html || c.example_label), {
      x: x + 0.15, y: y + h - 0.3, w: w - 0.3, h: 0.2,
      fontFace: 'Calibri', fontSize: 8, color: C_MUTED, italic: true
    });
  }
}

// ============================================================
// market_data_chart — narrative left, chart right.
// ============================================================
function renderMarketDataChart(pres, slot, ctx) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };
  addPageHeader(slide, { sectionTag: slot.section_tag, pageNum: ctx.pageNum, totalPages: ctx.totalPages });
  addH1(slide, slot.page_h1);
  addSubhead(slide, slot.subhead_html);

  const bodyY = 2.4;
  const bodyH = 4.5;
  const narrative = Array.isArray(slot.narrative) ? slot.narrative.slice(0, 3) : [];
  const blockH = bodyH / Math.max(1, narrative.length);
  narrative.forEach((n, i) => {
    const ny = bodyY + i * blockH;
    slide.addText(String(n.heading || ''), {
      x: 0.5, y: ny, w: 6, h: 0.3,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: C_PRIMARY, charSpacing: 2
    });
    slide.addText(stripHtml(n.body_html), {
      x: 0.5, y: ny + 0.3, w: 6, h: blockH - 0.35,
      fontFace: 'Calibri', fontSize: 10, color: C_INK, valign: 'top'
    });
  });

  addChartBlock(pres, slide, slot, { x: 6.83, y: bodyY, w: 6, h: bodyH });
  addPageFooter(slide, { footerText: ctx.footerText });
}

// ============================================================
// use_case_grid_6 — 3×2 grid.
// ============================================================
function renderUseCaseGrid6(pres, slot, ctx) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };
  addPageHeader(slide, { sectionTag: slot.section_tag, pageNum: ctx.pageNum, totalPages: ctx.totalPages });
  addH1(slide, slot.page_h1);
  addSubhead(slide, slot.subhead_html);

  const cards = Array.isArray(slot.cards) ? slot.cards.slice(0, 6) : [];
  const cardW = (12.33 - 0.3 * 2) / 3;
  const cardH = 2.15;
  const gridY = 2.4;

  cards.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * (cardW + 0.3);
    const y = gridY + row * (cardH + 0.25);
    drawCard(slide, c, x, y, cardW, cardH);
  });

  addPageFooter(slide, { footerText: ctx.footerText });
}

// ============================================================
// methodology_inline — 2-col labeled items.
// ============================================================
function renderMethodologyInline(pres, slot, ctx) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };
  addPageHeader(slide, { sectionTag: slot.section_tag || 'Methodology', pageNum: ctx.pageNum, totalPages: ctx.totalPages });
  addH1(slide, slot.page_h1);
  addSubhead(slide, slot.subhead_html);

  const colW = 5.9;
  const startY = 2.4;

  // Left column
  slide.addText(String(slot.left_col_heading || '').toUpperCase(), {
    x: 0.5, y: startY, w: colW, h: 0.3,
    fontFace: 'Calibri', fontSize: 10, bold: true, color: C_PRIMARY, charSpacing: 3
  });
  const leftItems = Array.isArray(slot.left_items) ? slot.left_items.slice(0, 4) : [];
  leftItems.forEach((it, i) => {
    const y = startY + 0.4 + i * 1.0;
    slide.addText(`→ ${it.label || ''}`, {
      x: 0.5, y, w: colW, h: 0.3,
      fontFace: 'Calibri', fontSize: 12, bold: true, color: C_INK
    });
    slide.addText(stripHtml(it.desc_html), {
      x: 0.7, y: y + 0.3, w: colW - 0.2, h: 0.65,
      fontFace: 'Calibri', fontSize: 9, color: C_MID, valign: 'top'
    });
  });

  // Right column
  slide.addText(String(slot.right_col_heading || '').toUpperCase(), {
    x: 6.93, y: startY, w: colW, h: 0.3,
    fontFace: 'Calibri', fontSize: 10, bold: true, color: C_PRIMARY, charSpacing: 3
  });
  const rightItems = Array.isArray(slot.right_items) ? slot.right_items.slice(0, 4) : [];
  rightItems.forEach((it, i) => {
    const y = startY + 0.4 + i * 1.0;
    slide.addText(`→ ${it.label || ''}`, {
      x: 6.93, y, w: colW, h: 0.3,
      fontFace: 'Calibri', fontSize: 12, bold: true, color: C_INK
    });
    slide.addText(stripHtml(it.desc_html), {
      x: 7.13, y: y + 0.3, w: colW - 0.2, h: 0.65,
      fontFace: 'Calibri', fontSize: 9, color: C_MID, valign: 'top'
    });
  });

  addPageFooter(slide, { footerText: ctx.footerText });
}

// ============================================================
// competitive_profile_deep — single-entity hero + 2-col body.
// ============================================================
function renderCompetitiveProfileDeep(pres, slot, ctx) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };
  addPageHeader(slide, { sectionTag: slot.section_tag, pageNum: ctx.pageNum, totalPages: ctx.totalPages });

  // Hero block (no h1; company_name takes that role)
  const heroY = 0.85;
  slide.addText(String(slot.company_name || ''), {
    x: 0.5, y: heroY, w: 7.5, h: 0.7,
    fontFace: 'Calibri', fontSize: 26, bold: true, color: C_INK
  });
  slide.addText(String(slot.company_subtitle || ''), {
    x: 0.5, y: heroY + 0.7, w: 7.5, h: 0.35,
    fontFace: 'Calibri', fontSize: 12, color: C_MID, italic: true
  });

  // Tags row
  const tags = Array.isArray(slot.tags) ? slot.tags.slice(0, 3) : [];
  tags.forEach((tag, i) => {
    const x = 0.5 + i * 1.5;
    slide.addShape('roundRect', {
      x, y: heroY + 1.1, w: 1.4, h: 0.32,
      fill: { color: C_PRIMARY },
      line: { color: C_PRIMARY, width: 0 },
      rectRadius: 0.05
    });
    slide.addText(String(tag.label || '').toUpperCase(), {
      x, y: heroY + 1.1, w: 1.4, h: 0.32,
      fontFace: 'Calibri', fontSize: 8, bold: true, color: C_WHITE, align: 'center', valign: 'middle', charSpacing: 3
    });
  });

  // Profile stats grid (right side of hero)
  const stats = Array.isArray(slot.profile_stats) ? slot.profile_stats.slice(0, 4) : [];
  const statW = 1.15;
  const statStartX = 13.33 - 0.5 - statW * stats.length - 0.1 * (stats.length - 1);
  stats.forEach((s, i) => {
    const x = statStartX + i * (statW + 0.1);
    slide.addText(String(s.label || '').toUpperCase(), {
      x, y: heroY, w: statW, h: 0.22,
      fontFace: 'Calibri', fontSize: 7, bold: true, color: C_MUTED, charSpacing: 2
    });
    slide.addText(`${s.val || ''}${s.unit ? ' ' + s.unit : ''}`, {
      x, y: heroY + 0.25, w: statW, h: 0.6,
      fontFace: 'Calibri', fontSize: 18, bold: true, color: C_INK
    });
  });

  // Body 2-col
  const bodyY = 2.6;
  const bodyH = 4.4;
  const colW = 5.9;

  const leftSecs = Array.isArray(slot.left_sections) ? slot.left_sections.slice(0, 2) : [];
  leftSecs.forEach((s, i) => {
    const y = bodyY + i * (bodyH / 2);
    slide.addText(String(s.heading || ''), {
      x: 0.5, y, w: colW, h: 0.3,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: C_PRIMARY, charSpacing: 2
    });
    slide.addText(stripHtml(s.body_html), {
      x: 0.5, y: y + 0.3, w: colW, h: (bodyH / 2) - 0.35,
      fontFace: 'Calibri', fontSize: 10, color: C_INK, valign: 'top'
    });
  });

  const rightSecs = Array.isArray(slot.right_sections) ? slot.right_sections.slice(0, 2) : [];
  rightSecs.forEach((s, i) => {
    const y = bodyY + i * (bodyH / 2);
    slide.addText(String(s.heading || ''), {
      x: 6.93, y, w: colW, h: 0.3,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: C_PRIMARY, charSpacing: 2
    });
    slide.addText(stripHtml(s.body_html), {
      x: 6.93, y: y + 0.3, w: colW, h: (bodyH / 2) - 0.35,
      fontFace: 'Calibri', fontSize: 10, color: C_INK, valign: 'top'
    });
  });

  addPageFooter(slide, { footerText: ctx.footerText });
}

// ============================================================
// divider — dark chapter break.
// ============================================================
function renderDivider(pres, slot, ctx) {
  const slide = pres.addSlide();
  slide.background = { color: C_DARK };

  slide.addText(`SECTION ${slot.section_num || ctx.pageNum}`, {
    x: 0.6, y: 2.5, w: 11, h: 0.4,
    fontFace: 'Calibri', fontSize: 11, bold: true, color: C_PRIMARY, charSpacing: 5
  });

  // Title in two parts (second part accent color)
  const titleP1 = slot.title_part_1 || '';
  const titleP2 = slot.title_part_2 || '';
  slide.addText([
    { text: titleP1,                     options: { color: C_WHITE,   fontSize: 44, bold: true } },
    { text: titleP2 ? ` ${titleP2}` : '', options: { color: C_PRIMARY, fontSize: 44, bold: true } }
  ], {
    x: 0.6, y: 3.0, w: 11, h: 1.6,
    fontFace: 'Calibri', valign: 'top'
  });

  if (slot.thesis_html) {
    slide.addText(stripHtml(slot.thesis_html), {
      x: 0.6, y: 4.7, w: 9, h: 1.2,
      fontFace: 'Calibri', fontSize: 14, color: 'CBD5E1', italic: true, valign: 'top'
    });
  }

  // Mini TOC pills
  const pills = Array.isArray(slot.pills) ? slot.pills.slice(0, 5) : [];
  pills.forEach((p, i) => {
    const x = 0.6 + i * 2.2;
    slide.addShape('roundRect', {
      x, y: 6.2, w: 2.0, h: 0.4,
      fill: { color: '1F2937' },
      line: { color: C_PRIMARY, width: 0.75 },
      rectRadius: 0.05
    });
    slide.addText(String(p.label || '').toUpperCase(), {
      x, y: 6.2, w: 2.0, h: 0.4,
      fontFace: 'Calibri', fontSize: 8, bold: true, color: C_WHITE, align: 'center', valign: 'middle', charSpacing: 3
    });
  });

  // Dark-mode logo
  slide.addText([
    { text: 'KIRA',     options: { bold: true, color: C_WHITE,   fontSize: 9 } },
    { text: '.',        options: { bold: true, color: C_PRIMARY, fontSize: 9 } },
    { text: ' RESEARCH',options: { color: 'CBD5E1', fontSize: 9, charSpacing: 3 } }
  ], {
    x: 0.6, y: 7.15, w: 4, h: 0.25,
    fontFace: 'Calibri'
  });
}

// ============================================================
// narrative_page — text-only fallback.
// ============================================================
function renderNarrativePage(pres, slot, ctx) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };
  addPageHeader(slide, { sectionTag: slot.section_tag, pageNum: ctx.pageNum, totalPages: ctx.totalPages });
  addH1(slide, slot.page_h1);
  addSubhead(slide, slot.subhead_html);

  const paras = Array.isArray(slot.paragraphs) ? slot.paragraphs.slice(0, 4) : [];
  const bodyY = 2.4;
  const bodyH = 4.5;
  const blockH = bodyH / Math.max(1, paras.length);
  paras.forEach((p, i) => {
    const y = bodyY + i * blockH;
    if (p.heading) {
      slide.addText(String(p.heading), {
        x: 0.5, y, w: 12.33, h: 0.32,
        fontFace: 'Calibri', fontSize: 12, bold: true, color: C_PRIMARY, charSpacing: 2
      });
    }
    slide.addText(stripHtml(p.body_html), {
      x: 0.5, y: y + (p.heading ? 0.35 : 0), w: 12.33, h: blockH - (p.heading ? 0.4 : 0.05),
      fontFace: 'Calibri', fontSize: 11, color: C_INK, valign: 'top'
    });
  });

  addPageFooter(slide, { footerText: ctx.footerText });
}

// ============================================================
// SOURCE KEY — final page.
// ============================================================
function renderSourceKeySlide(pres, { extracted, totalPages, footerText }) {
  const slide = pres.addSlide();
  slide.background = { color: C_WHITE };
  addPageHeader(slide, { sectionTag: 'Source key & traceability', pageNum: totalPages, totalPages });
  addH1(slide, 'Source key.');
  addSubhead(slide, 'Inline tags [filename] resolve to the user-uploaded sources listed below.');

  const items = (Array.isArray(extracted) ? extracted : []).slice(0, 30);
  // 2-column layout
  const colW = 5.9;
  const startY = 2.4;
  const rowH = 0.28;
  const perCol = Math.ceil(items.length / 2);

  items.forEach((f, i) => {
    const col = i < perCol ? 0 : 1;
    const row = i < perCol ? i : i - perCol;
    const x = 0.5 + col * (colW + 0.5);
    const y = startY + row * rowH;
    const chars = Number(f?.char_count || 0);
    const sizeLabel = chars >= 1000 ? ` ~${Math.round(chars / 1000)}K chars` : ` ${chars} chars`;
    slide.addText([
      { text: `[${i + 1}] `, options: { color: C_PRIMARY, bold: true, fontSize: 9 } },
      { text: String(f.filename || ''), options: { color: C_INK, bold: true, fontSize: 9 } },
      { text: sizeLabel, options: { color: C_MUTED, fontSize: 9 } }
    ], {
      x, y, w: colW, h: rowH - 0.02,
      fontFace: 'Calibri', valign: 'top'
    });
  });

  if (items.length === 0) {
    slide.addText('No source files uploaded — deliverable drafted from analyst inference (tagged [Kira estimates]).', {
      x: 0.5, y: startY, w: 12.33, h: 0.4,
      fontFace: 'Calibri', fontSize: 10, color: C_MID, italic: true
    });
  }

  addPageFooter(slide, { footerText });
}

// ============================================================
// CHART BLOCK — adds chart_title / chart_subtitle / native chart.
// ============================================================
function addChartBlock(pres, slide, slot, { x, y, w, h }) {
  // Title bar
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: C_PANEL },
    line: { color: C_BORDER, width: 0.5 }
  });
  if (slot.chart_title) {
    slide.addText(String(slot.chart_title), {
      x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.32,
      fontFace: 'Calibri', fontSize: 11, bold: true, color: C_INK
    });
  }
  if (slot.chart_subtitle) {
    slide.addText(String(slot.chart_subtitle), {
      x: x + 0.2, y: y + 0.47, w: w - 0.4, h: 0.22,
      fontFace: 'Calibri', fontSize: 9, color: C_MID, italic: true
    });
  }

  // Chart area
  const chartX = x + 0.2;
  const chartY = y + 0.8;
  const chartW = w - 0.4;
  const chartH = h - 1.2;

  const data = chartDataToPptx(slot.chart_data);
  if (!data) {
    slide.addText('Chart data not provided', {
      x: chartX, y: chartY, w: chartW, h: chartH,
      fontFace: 'Calibri', fontSize: 10, color: C_MUTED, italic: true,
      align: 'center', valign: 'middle'
    });
  } else {
    const chartType = data.type === 'line'   ? pres.ChartType.line
                    : data.type === 'donut'  ? pres.ChartType.doughnut
                    : pres.ChartType.bar;
    const opts = {
      x: chartX, y: chartY, w: chartW, h: chartH,
      chartColors: CHART_PALETTE.slice(0, data.payload.length || 1),
      showLegend: data.payload.length > 1,
      legendPos: 't',
      legendFontSize: 9,
      legendFontFace: 'Calibri',
      catAxisLabelFontFace: 'Calibri',
      catAxisLabelFontSize: 9,
      catAxisLabelColor: C_MID,
      valAxisLabelFontFace: 'Calibri',
      valAxisLabelFontSize: 9,
      valAxisLabelColor: C_MUTED,
      showValue: data.type !== 'line' && data.payload.length === 1,
      dataLabelFontSize: 8,
      dataLabelFontFace: 'Calibri',
      dataLabelColor: C_INK
    };
    if (data.type === 'donut') {
      opts.holeSize = 60;
      opts.showLegend = true;
      opts.legendPos = 'r';
      opts.showPercent = true;
      opts.showValue = false;
    }
    slide.addChart(chartType, data.payload, opts);
  }

  // Source caption bottom
  if (slot.chart_source) {
    slide.addText(`Source: ${slot.chart_source}`, {
      x: x + 0.2, y: y + h - 0.3, w: w - 0.4, h: 0.22,
      fontFace: 'Calibri', fontSize: 8, color: C_MUTED, italic: true
    });
  }
}

// Convert chart_data (series OR groups shape) into pptxgenjs payload.
function chartDataToPptx(chartData) {
  if (!chartData) return null;
  const type = String(chartData.type || 'bar').toLowerCase();

  // Donut: always single-series.
  if (type === 'donut') {
    const series = chartData.series || chartData.groups?.[0]?.values || [];
    if (!series.length) return null;
    return {
      type,
      payload: [{
        name:   chartData.title || 'Share',
        labels: series.map(s => String(s.label || '')),
        values: series.map(s => chartNum(s.value))
      }]
    };
  }

  // Multi-series (groups)
  if (Array.isArray(chartData.groups) && chartData.groups.length > 0) {
    const validGroups = chartData.groups.filter(g => Array.isArray(g.values) && g.values.length > 0);
    if (!validGroups.length) return null;
    const labels = validGroups[0].values.map(v => String(v.label || ''));
    return {
      type,
      payload: validGroups.map(g => ({
        name:   String(g.name || ''),
        labels,
        values: g.values.map(v => chartNum(v.value))
      }))
    };
  }

  // Single-series (series)
  if (Array.isArray(chartData.series) && chartData.series.length > 0) {
    return {
      type,
      payload: [{
        name:   chartData.title || 'Series',
        labels: chartData.series.map(s => String(s.label || '')),
        values: chartData.series.map(s => chartNum(s.value))
      }]
    };
  }

  return null;
}

// ============================================================
// MAIN ENTRY
// ============================================================
const RENDER_MAP = {
  exec_summary_p1:             renderExecSummaryP1,
  exec_summary_p2_implications:renderExecSummaryP2,
  market_data_chart:           renderMarketDataChart,
  use_case_grid_6:             renderUseCaseGrid6,
  methodology_inline:          renderMethodologyInline,
  competitive_profile_deep:    renderCompetitiveProfileDeep,
  divider:                     renderDivider,
  narrative_page:              renderNarrativePage
};

/**
 * Build the full PPTX and return a Buffer.
 *
 *   drafts: [{ title, page_type, template_id, slots, ... }] from Stage 5
 *   parsed: Stage 1 classification (report_kind, primary_subject, country, ...)
 *   plan:   Stage 3 plan (final_title, subtitle, sections...)
 *   extracted: Stage 2 extracted files (for source-key slide)
 */
export async function renderPptxBuffer({ drafts, parsed, plan, extracted, finalTitle, subtitle }) {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 inches
  pres.title = finalTitle || 'KIRA Studio deliverable';
  pres.company = 'KIRA Research';
  pres.author = 'KIRA Research';

  const reportKind = String(parsed?.report_kind || 'document').trim();
  const primarySubject = String(parsed?.primary_subject || '').trim();
  const footerText = `${reportKind} · ${primarySubject || finalTitle}`.slice(0, 80);

  // Total page count = cover + drafts + source-key
  const totalPages = 1 + drafts.length + 1;

  // 1. Cover
  renderCoverSlide(pres, {
    finalTitle:     finalTitle || plan?.final_title || parsed?.working_title || 'Untitled deliverable',
    subtitle:       subtitle   || plan?.subtitle    || parsed?.subtitle      || '',
    reportKind,
    primarySubject,
    country:        parsed?.country,
    industry:       parsed?.industry,
    year:           parsed?.year
  });

  // 2. Section slides
  drafts.forEach((draft, idx) => {
    const tid = String(draft.template_id || 'narrative_page');
    const renderer = RENDER_MAP[tid] || RENDER_MAP.narrative_page;
    const ctx = {
      pageNum:    idx + 2,
      totalPages,
      footerText
    };
    try {
      renderer(pres, draft.slots || {}, ctx);
    } catch (err) {
      console.warn(`[studio-pptx] render failed for "${draft.title}" (${tid}):`, err.message);
      // Fall back to a generic narrative slide with whatever we have.
      const fallbackSlot = {
        section_tag: draft.title || tid,
        page_h1:     draft.title || '',
        subhead_html: '',
        paragraphs:  Array.isArray(draft.slots?.narrative)  ? draft.slots.narrative
                  :  Array.isArray(draft.slots?.paragraphs) ? draft.slots.paragraphs
                  :  [{ heading: draft.title, body_html: 'Section render failed.' }]
      };
      renderNarrativePage(pres, fallbackSlot, ctx);
    }
  });

  // 3. Source key (always last)
  renderSourceKeySlide(pres, { extracted, totalPages, footerText });

  // 4. Serialize to Buffer (nodebuffer is what Supabase upload wants).
  const buf = await pres.write({ outputType: 'nodebuffer' });
  return buf;
}
