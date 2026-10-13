// ============================================================
// KIRA RESEARCH — api/_lib/exhibits.js
// The numbers behind a report's exhibits (S12): the check used when a report is made, and the
// Excel / PowerPoint files built for a reader who owns the report.
//
// exhibits.json (one per report, written next to en.html; see skills/kira-research-report/prompts/brain_route.md):
// {
//   "version": 1,
//   "exhibits": [
//     { "page": 31,                                   // page number in the report (optional)
//       "title": "Public charging units (SPKLU) in operation",   // EXACTLY the exhibit-title text on the page
//       "subtitle": "Indonesia · units · 2026 plan dashed",       // optional
//       "chart": "column",            // bar (horizontal) | column | stacked | line | pie | none
//       "columns": ["Period", "Units"],      // first column = labels; with a chart, every other column is numbers
//       "rows": [["2023", 911], ["Dec 2025", 4778], ["Dec 2026 (plan)", 9633]],
//       "source": "Source: [ESDM 2023 data]; [ESDM Feb 2026]",    // the exhibit-note text
//       "note": "optional one line" } ],
//   "skipped": [ { "title": "Payback driver tree", "reason": "diagram, no table of values" } ]
// }
// ============================================================

export const CHARTS = ['bar', 'column', 'stacked', 'line', 'pie', 'none'];
const MAX_EXHIBITS = 60, MAX_ROWS = 80, MAX_COLS = 12, MAX_TEXT = 400;

const isText = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_TEXT;

// Returns { ok, errors[] }. `data` is the parsed exhibits.json.
export function validateExhibits(data) {
  const errors = [];
  const err = (m) => { if (errors.length < 30) errors.push(m); };
  if (!data || typeof data !== 'object') return { ok: false, errors: ['not an object'] };
  if (data.version !== 1) err('version must be 1');
  const list = Array.isArray(data.exhibits) ? data.exhibits : null;
  if (!list) return { ok: false, errors: [...errors, 'exhibits must be an array'] };
  if (list.length > MAX_EXHIBITS) err(`more than ${MAX_EXHIBITS} exhibits`);
  const seen = new Set();
  list.forEach((x, i) => {
    const at = `exhibits[${i}]${x && x.title ? ` "${String(x.title).slice(0, 40)}"` : ''}`;
    if (!x || typeof x !== 'object') { err(`${at}: not an object`); return; }
    if (!isText(x.title)) err(`${at}: title missing or too long`);
    else if (seen.has(x.title)) err(`${at}: duplicate title`);
    else seen.add(x.title);
    if (x.subtitle != null && (typeof x.subtitle !== 'string' || x.subtitle.length > MAX_TEXT)) err(`${at}: subtitle`);
    if (x.source != null && (typeof x.source !== 'string' || x.source.length > 600)) err(`${at}: source`);
    if (x.note != null && (typeof x.note !== 'string' || x.note.length > MAX_TEXT)) err(`${at}: note`);
    if (x.page != null && !(Number.isInteger(x.page) && x.page > 0 && x.page < 500)) err(`${at}: page`);
    if (!CHARTS.includes(x.chart)) err(`${at}: chart must be one of ${CHARTS.join(', ')}`);
    const cols = x.columns, rows = x.rows;
    if (!Array.isArray(cols) || cols.length < 2 || cols.length > MAX_COLS || !cols.every(isText)) { err(`${at}: columns need 2-${MAX_COLS} non-empty texts`); return; }
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_ROWS) { err(`${at}: rows need 1-${MAX_ROWS} entries`); return; }
    rows.forEach((r, j) => {
      if (!Array.isArray(r) || r.length !== cols.length) { err(`${at}: row ${j + 1} has ${Array.isArray(r) ? r.length : 'no'} cells, expected ${cols.length}`); return; }
      r.forEach((c, k) => {
        const numeric = k > 0 && x.chart !== 'none';
        if (numeric) { if (c !== null && !(typeof c === 'number' && Number.isFinite(c))) err(`${at}: row ${j + 1} column ${k + 1} must be a number (or null) for a ${x.chart} chart`); }
        else if (!(c === null || (typeof c === 'string' && c.length <= MAX_TEXT) || (typeof c === 'number' && Number.isFinite(c)))) err(`${at}: row ${j + 1} column ${k + 1} is not text or a number`);
      });
    });
    if (x.chart === 'pie' && cols.length !== 2) err(`${at}: a pie chart takes exactly one value column`);
  });
  if (data.skipped != null) {
    if (!Array.isArray(data.skipped)) err('skipped must be an array');
    else data.skipped.forEach((s, i) => { if (!s || !isText(s.title) || !isText(s.reason)) err(`skipped[${i}] needs title and reason`); else if (seen.has(s.title)) err(`skipped[${i}] "${s.title.slice(0, 40)}" is also in exhibits`); });
  }
  return { ok: errors.length === 0, errors };
}

// ── Excel ────────────────────────────────────────────────
function sheetName(i, title, used) {
  let base = `${String(i + 1).padStart(2, '0')} ${title}`.replace(/[\\/?*[\]:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31).trim();
  let name = base, n = 2;
  while (used.has(name.toLowerCase())) name = `${base.slice(0, 28)} ${n++}`;
  used.add(name.toLowerCase());
  return name;
}

// report: { title, code }. Returns a Buffer.
export async function buildXlsx(report, data) {
  const XLSX = (await import('xlsx')).default || (await import('xlsx'));
  const wb = XLSX.utils.book_new();
  const used = new Set(['contents']);
  const names = data.exhibits.map((x, i) => sheetName(i, x.title, used));

  const idx = [[report.title], ['Exhibit data · KIRA RESEARCH'], [], ['Sheet', 'Exhibit', 'Page']];
  data.exhibits.forEach((x, i) => idx.push([names[i], x.title, x.page || '']));
  idx.push([], ['Numbers are as printed in the report; sources are given on each sheet. Estimates are marked [Kira estimates].']);
  const c = XLSX.utils.aoa_to_sheet(idx);
  c['!cols'] = [{ wch: 34 }, { wch: 70 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, c, 'Contents');

  data.exhibits.forEach((x, i) => {
    const aoa = [[x.title], [x.subtitle || ''], [], x.columns, ...x.rows, []];
    if (x.note) aoa.push([x.note]);
    if (x.source) aoa.push([x.source]);
    aoa.push([`${report.title} · KIRA RESEARCH`]);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = x.columns.map((_, k) => ({ wch: k === 0 ? 38 : 16 }));
    XLSX.utils.book_append_sheet(wb, ws, names[i]);
  });
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

// ── PowerPoint ───────────────────────────────────────────
const INK = '0F172A', PRIMARY = '1E6FFF', MID = '64748B', PANEL = 'F8FAFC', BORDER = 'E2E8F0';
const PALETTE = ['1E6FFF', '0F172A', 'F59E0B', '10B981', '7C3AED', 'EC4899', '64748B', '0EA5E9'];

const cell = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? String(v) : String(v));

// Returns a Buffer. Charts are native PowerPoint charts, so the reader can restyle them.
export async function buildPptx(report, data) {
  const pptxgen = (await import('pptxgenjs')).default;
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';            // 13.33 x 7.5 in
  pptx.title = `${report.title} — exhibits`;
  pptx.company = 'KIRA RESEARCH';

  const cover = pptx.addSlide();
  cover.background = { color: INK };
  cover.addText('KIRA RESEARCH', { x: 0.7, y: 0.6, w: 8, h: 0.4, fontFace: 'Calibri', fontSize: 14, bold: true, color: 'FFFFFF', charSpacing: 3 });
  cover.addText(report.title, { x: 0.7, y: 2.4, w: 11.5, h: 1.8, fontFace: 'Calibri', fontSize: 34, bold: true, color: 'FFFFFF', valign: 'top' });
  cover.addText('Exhibits · editable charts and tables', { x: 0.7, y: 4.4, w: 11.5, h: 0.5, fontFace: 'Calibri', fontSize: 16, color: '94A3B8' });

  for (const x of data.exhibits) {
    const s = pptx.addSlide();
    s.background = { color: 'FFFFFF' };
    s.addText(x.title, { x: 0.6, y: 0.35, w: 12.1, h: 0.8, fontFace: 'Calibri', fontSize: 24, bold: true, color: INK, valign: 'top', fit: 'shrink' });
    if (x.subtitle) s.addText(x.subtitle, { x: 0.6, y: 1.15, w: 12.1, h: 0.4, fontFace: 'Calibri', fontSize: 13, color: MID, valign: 'top', fit: 'shrink' });
    const box = { x: 0.6, y: 1.7, w: 12.1, h: 4.7 };

    const labels = x.rows.map((r) => cell(r[0]));
    const series = x.columns.slice(1).map((name, k) => ({ name, labels, values: x.rows.map((r) => (r[k + 1] === null ? 0 : r[k + 1])) }));
    // Bars start at zero (design rule), unless some value is negative: then the axis must reach it.
    const nonNegative = series.every((sr) => sr.values.every((v) => v >= 0));
    const common = { ...box, showLegend: series.length > 1 && x.chart !== 'pie', legendPos: 'b', legendFontSize: 11, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10,
      showValue: true, dataLabelFontSize: 10, dataLabelFormatCode: '#,##0.##', valAxisLabelFormatCode: '#,##0.##', chartColors: PALETTE.slice(0, x.chart === 'pie' ? labels.length : series.length), catAxisLabelFontFace: 'Calibri', valAxisLabelFontFace: 'Calibri' };
    if (x.chart === 'pie') {
      s.addChart(pptx.charts.PIE, [series[0]], { ...box, showLegend: true, legendPos: 'r', showPercent: false, showValue: true, dataLabelFontSize: 12, dataLabelColor: 'FFFFFF', dataLabelFormatCode: '#,##0.##', chartColors: PALETTE.concat(PALETTE).slice(0, labels.length) });
    } else if (x.chart === 'line') {
      s.addChart(pptx.charts.LINE, series, { ...common, lineSize: 2.5, lineDataSymbolSize: 7 });
    } else if (x.chart === 'bar' || x.chart === 'column' || x.chart === 'stacked') {
      s.addChart(pptx.charts.BAR, series, { ...common, barDir: x.chart === 'bar' ? 'bar' : 'col', barGrouping: x.chart === 'stacked' ? 'stacked' : 'clustered', ...(nonNegative ? { valAxisMinVal: 0 } : { catAxisLabelPos: 'low' }), catAxisOrientation: x.chart === 'bar' ? 'maxMin' : 'minMax' });
    } else {
      const head = x.columns.map((c) => ({ text: c, options: { bold: true, color: 'FFFFFF', fill: { color: INK }, fontSize: 11 } }));
      const body = x.rows.map((r, j) => r.map((c, k) => ({ text: cell(c), options: { fontSize: 10, color: INK, fill: { color: j % 2 ? PANEL : 'FFFFFF' }, bold: k === 0 } })));
      s.addTable([head, ...body], { ...box, fontFace: 'Calibri', border: { type: 'solid', pt: 0.5, color: BORDER }, valign: 'middle', autoPage: true, autoPageRepeatHeader: true });
    }
    const foot = [x.note, x.source].filter(Boolean).join('  ·  ');
    if (foot) s.addText(foot, { x: 0.6, y: 6.55, w: 12.1, h: 0.45, fontFace: 'Calibri', fontSize: 10, color: MID, valign: 'top', fit: 'shrink' });
    s.addText(`KIRA RESEARCH${x.page ? `  ·  p. ${x.page}` : ''}`, { x: 0.6, y: 7.05, w: 12.1, h: 0.3, fontFace: 'Calibri', fontSize: 9, color: PRIMARY, bold: true });
  }
  return Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
}
