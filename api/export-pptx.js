// KIRA RESEARCH — api/export-pptx.js
// POST /api/export-pptx
// Body: { title, industry, country, sections: [{title, content}] }
// Returns: .pptx file download
//
// Slide structure per section (consulting style):
//   - Dark header bar with section title
//   - Left 45%: key bullet points (distilled from commentary)
//   - Right 50%: native chart (if available)
//   - If table: separate full-width slide
//   - Source footer on each slide

export const config = { maxDuration: 30 };

import PptxGenJS from 'pptxgenjs';

// ── KIRA Brand colors ─────────────────────────────────────
const C = {
  navy:    '0A1628',
  navyMid: '152238',
  blue:    '1E6FFF',
  blueLt:  'E8F1FF',
  teal:    '00C9A7',
  white:   'FFFFFF',
  gray:    'A3A9B6',
  grayLt:  'E2E8F0',
  dark:    '1A1D24',
  text:    '1a1a1a',
  textMid: '4a5568',
};

// ── Extract bullets from commentary prose ─────────────────
function extractBullets(commentary, max = 5) {
  if (!commentary) return [];
  // Take first sentence of each paragraph
  const bullets = commentary
    .replace(/\*\*(.*?)\*\*/g, '$1') // strip bold
    .replace(/^### .+$/gm, '')        // strip headers
    .split('\n\n')
    .filter(p => p.trim().length > 30)
    .map(p => {
      const first = p.trim().split(/[.!?]/)[0].trim();
      return first.length > 20 ? first + '.' : null;
    })
    .filter(Boolean)
    .slice(0, max);
  return bullets;
}

// ── Convert Chart.js data → pptxgenjs format ─────────────
function convertChart(chartDef) {
  if (!chartDef?.labels?.length || !chartDef?.datasets?.length) return null;
  const typeMap = {
    bar:    'bar',
    line:   'line',
    pie:    'pie',
    donut:  'doughnut',
    radar:  'radar',
  };
  const pptxType = typeMap[chartDef.type] || 'bar';
  const chartData = chartDef.datasets.map(ds => ({
    name:   ds.label || 'Data',
    labels: chartDef.labels,
    values: ds.data.map(v => typeof v === 'number' ? v : parseFloat(v) || 0),
  }));
  return { type: pptxType, data: chartData, title: chartDef.title || '' };
}

// ── CORS ──────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// ── Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, industry, country, sections = [], reportType } = req.body;
  if (!sections.length) return res.status(400).json({ error: 'No sections provided' });

  const pres = new PptxGenJS();
  pres.layout  = 'LAYOUT_WIDE'; // 13.3" × 7.5"
  pres.author  = 'KIRA RESEARCH';
  pres.title   = title || `${industry} Market Report`;
  pres.subject = `${industry} — ${country}`;

  const W = 13.3; // slide width
  const H = 7.5;  // slide height

  // ══════════════════════════════════════════════════════════
  // COVER SLIDE
  // ══════════════════════════════════════════════════════════
  const cover = pres.addSlide();
  cover.background = { color: C.navy };

  // Blue accent bar left
  cover.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.5, h: H,
    fill: { color: C.blue }, line: { color: C.blue }
  });

  // KIRA RESEARCH wordmark
  cover.addText('KIRA', {
    x: 0.9, y: 1.8, w: 6, h: 0.9,
    fontSize: 54, bold: true, color: C.white,
    fontFace: 'Calibri', margin: 0
  });
  cover.addText('RESEARCH', {
    x: 0.9, y: 2.65, w: 6, h: 0.55,
    fontSize: 22, bold: false, color: C.blue,
    fontFace: 'Calibri', charSpacing: 8, margin: 0
  });

  // Divider
  cover.addShape(pres.shapes.RECTANGLE, {
    x: 0.9, y: 3.35, w: 5, h: 0.04,
    fill: { color: C.blue }, line: { color: C.blue }
  });

  // Report title
  const reportTitle = title || `${industry} Market`;
  cover.addText(reportTitle, {
    x: 0.9, y: 3.6, w: 10, h: 1.2,
    fontSize: 28, bold: true, color: C.white,
    fontFace: 'Calibri', margin: 0, wrap: true
  });

  // Subtitle
  cover.addText(`${country}  ·  ${new Date().getFullYear()}  ·  AI-Powered Market Intelligence`, {
    x: 0.9, y: 4.85, w: 10, h: 0.4,
    fontSize: 13, color: C.gray, fontFace: 'Calibri', margin: 0
  });

  // Report type badge
  const typeLabel = (reportType || 'industry_deep_dive').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  cover.addShape(pres.shapes.RECTANGLE, {
    x: 0.9, y: 5.5, w: 2.4, h: 0.36,
    fill: { color: C.blue }, line: { color: C.blue }
  });
  cover.addText(typeLabel, {
    x: 0.9, y: 5.5, w: 2.4, h: 0.36,
    fontSize: 10, bold: true, color: C.white,
    fontFace: 'Calibri', align: 'center', valign: 'middle', margin: 0
  });

  // ══════════════════════════════════════════════════════════
  // TABLE OF CONTENTS SLIDE
  // ══════════════════════════════════════════════════════════
  const toc = pres.addSlide();
  toc.background = { color: 'F7FAFC' };

  // Header
  toc.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: W, h: 0.75,
    fill: { color: C.navy }, line: { color: C.navy }
  });
  toc.addText('Table of Contents', {
    x: 0.5, y: 0, w: W - 1, h: 0.75,
    fontSize: 18, bold: true, color: C.white,
    fontFace: 'Calibri', valign: 'middle', margin: 0
  });

  // 2-column layout for TOC items
  const half = Math.ceil(sections.length / 2);
  sections.forEach((sec, i) => {
    const col  = i < half ? 0 : 1;
    const row  = i < half ? i : i - half;
    const x    = col === 0 ? 0.6 : W / 2 + 0.3;
    const y    = 1.1 + row * 0.52;
    const num  = String(i + 1).padStart(2, '0');

    toc.addShape(pres.shapes.RECTANGLE, {
      x: x, y: y + 0.04, w: 0.32, h: 0.32,
      fill: { color: C.blue }, line: { color: C.blue }
    });
    toc.addText(num, {
      x: x, y: y + 0.04, w: 0.32, h: 0.32,
      fontSize: 10, bold: true, color: C.white,
      fontFace: 'Calibri', align: 'center', valign: 'middle', margin: 0
    });
    toc.addText(sec.title, {
      x: x + 0.42, y: y, w: 5.6, h: 0.42,
      fontSize: 13, color: C.text, fontFace: 'Calibri',
      valign: 'middle', margin: 0
    });
  });

  // ══════════════════════════════════════════════════════════
  // CONTENT SLIDES — one per section
  // ══════════════════════════════════════════════════════════
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    let parsed = null;
    try { parsed = JSON.parse(sec.content); } catch { parsed = null; }

    const headline   = parsed?.headline   || '';
    const commentary = parsed?.commentary || sec.content || '';
    const chartDef   = parsed?.chart      || null;
    const tableDef   = parsed?.table      || null;
    const sources    = parsed?.sources    || [];
    const bullets    = extractBullets(commentary, 5);
    const chart      = convertChart(chartDef);
    const hasChart   = chart && (chart.type === 'bar' || chart.type === 'line' || chart.type === 'pie' || chart.type === 'doughnut' || chart.type === 'radar');

    // ── Main content slide ───────────────────────────────
    const slide = pres.addSlide();
    slide.background = { color: C.white };

    // Dark header bar
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0, y: 0, w: W, h: 0.7,
      fill: { color: C.navy }, line: { color: C.navy }
    });
    // Section number badge
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y: 0.14, w: 0.38, h: 0.38,
      fill: { color: C.blue }, line: { color: C.blue }
    });
    slide.addText(String(si + 1).padStart(2, '0'), {
      x: 0.4, y: 0.14, w: 0.38, h: 0.38,
      fontSize: 11, bold: true, color: C.white,
      fontFace: 'Calibri', align: 'center', valign: 'middle', margin: 0
    });
    // Section title
    slide.addText(sec.title.toUpperCase(), {
      x: 0.9, y: 0, w: W - 1.2, h: 0.7,
      fontSize: 15, bold: true, color: C.white,
      fontFace: 'Calibri', valign: 'middle',
      charSpacing: 2, margin: 0
    });

    // Headline bar (key finding)
    if (headline) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: 0.7, w: W, h: 0.55,
        fill: { color: C.blueLt }, line: { color: C.blueLt }
      });
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: 0.7, w: 0.22, h: 0.55,
        fill: { color: C.blue }, line: { color: C.blue }
      });
      slide.addText(headline, {
        x: 0.38, y: 0.7, w: W - 0.6, h: 0.55,
        fontSize: 12, bold: false, color: C.navyMid,
        fontFace: 'Calibri', valign: 'middle', margin: 0, italic: true
      });
    }

    const contentY = headline ? 1.35 : 0.85;
    const contentH = H - contentY - 0.55; // leave room for footer
    const leftW  = hasChart ? W * 0.44 : W - 0.8;
    const rightX = W * 0.46;
    const rightW = W - rightX - 0.3;

    // ── Left column: bullets ─────────────────────────────
    if (bullets.length) {
      const bulletItems = bullets.map((b, bi) => [
        { text: '', options: {
            bullet: false, breakLine: false,
            color: C.blue, fontSize: 9,
        }},
        { text: b, options: {
            bullet: false,
            breakLine: bi < bullets.length - 1,
            color: C.text, fontSize: 13,
            fontFace: 'Calibri',
            paraSpaceAfter: 8,
        }}
      ]).flat();

      // Blue accent dots
      bullets.forEach((_, bi) => {
        const dotY = contentY + 0.04 + bi * (contentH / bullets.length);
        slide.addShape(pres.shapes.OVAL, {
          x: 0.4, y: dotY, w: 0.1, h: 0.1,
          fill: { color: C.blue }, line: { color: C.blue }
        });
      });

      slide.addText(
        bullets.map((b, bi) => ({
          text: b,
          options: {
            bullet: false,
            breakLine: bi < bullets.length - 1,
            color: C.text,
            fontSize: 13,
            fontFace: 'Calibri',
            paraSpaceAfter: 10,
          }
        })),
        {
          x: 0.6, y: contentY, w: leftW,
          h: contentH,
          valign: 'top', margin: 0,
          wrap: true,
        }
      );
    }

    // ── Right column: chart ──────────────────────────────
    if (hasChart) {
      const chartColors = [C.blue, C.teal, '64748B', 'F59E0B', 'EF4444', '8B5CF6'];
      const pptxChartType = {
        bar:       pres.charts.BAR,
        line:      pres.charts.LINE,
        pie:       pres.charts.PIE,
        doughnut:  pres.charts.DOUGHNUT,
        radar:     pres.charts.RADAR,
      }[chart.type] || pres.charts.BAR;

      const isBar = chart.type === 'bar';

      slide.addChart(pptxChartType, chart.data, {
        x: rightX, y: contentY, w: rightW, h: contentH,
        barDir: isBar ? 'col' : undefined,
        chartColors,
        chartArea:  { fill: { color: 'F7FAFC' } },
        catAxisLabelColor:  C.gray,
        valAxisLabelColor:  C.gray,
        valGridLine: { color: 'E2E8F0', size: 0.5 },
        catGridLine: { style: 'none' },
        showValue:   isBar,
        dataLabelColor: C.navy,
        dataLabelFontSize: 9,
        showLegend:  chart.data.length > 1,
        legendFontSize: 10,
        legendColor: C.gray,
        legendPos:   'b',
        showTitle:   !!chart.title,
        title:       chart.title,
        titleFontSize: 11,
        titleColor:  C.textMid,
      });

      // Vertical divider
      slide.addShape(pres.shapes.LINE, {
        x: rightX - 0.1, y: contentY, w: 0, h: contentH,
        line: { color: C.grayLt, width: 1 }
      });
    }

    // ── Table slide (if exists) ──────────────────────────
    if (tableDef?.headers?.length) {
      const tslide = pres.addSlide();
      tslide.background = { color: C.white };

      // Same header bar
      tslide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: 0, w: W, h: 0.7,
        fill: { color: C.navy }, line: { color: C.navy }
      });
      tslide.addShape(pres.shapes.RECTANGLE, {
        x: 0.4, y: 0.14, w: 0.38, h: 0.38,
        fill: { color: C.blue }, line: { color: C.blue }
      });
      tslide.addText(String(si + 1).padStart(2, '0'), {
        x: 0.4, y: 0.14, w: 0.38, h: 0.38,
        fontSize: 11, bold: true, color: C.white,
        fontFace: 'Calibri', align: 'center', valign: 'middle', margin: 0
      });
      tslide.addText(sec.title.toUpperCase(), {
        x: 0.9, y: 0, w: W - 1.2, h: 0.7,
        fontSize: 15, bold: true, color: C.white,
        fontFace: 'Calibri', valign: 'middle', charSpacing: 2, margin: 0
      });

      // Table title
      if (tableDef.title) {
        tslide.addText(tableDef.title, {
          x: 0.5, y: 0.85, w: W - 1, h: 0.35,
          fontSize: 12, bold: true, color: C.navyMid,
          fontFace: 'Calibri', margin: 0
        });
      }

      // Build table data
      const headerRow = tableDef.headers.map(h => ({
        text: h,
        options: {
          bold: true, color: C.white,
          fill: { color: C.navy },
          fontSize: 11, fontFace: 'Calibri',
          align: 'left', valign: 'middle',
          margin: [4, 8, 4, 8],
        }
      }));
      const dataRows = (tableDef.rows || []).map((row, ri) =>
        row.map(cell => ({
          text: String(cell),
          options: {
            color: C.text,
            fill: { color: ri % 2 === 0 ? C.white : 'F7FAFC' },
            fontSize: 11, fontFace: 'Calibri',
            align: 'left', valign: 'top',
            margin: [4, 8, 4, 8],
          }
        }))
      );

      const tableY = tableDef.title ? 1.3 : 0.9;
      const tableH = H - tableY - 0.55;
      const colW = Array(tableDef.headers.length).fill((W - 1) / tableDef.headers.length);

      tslide.addTable([headerRow, ...dataRows], {
        x: 0.5, y: tableY, w: W - 1, h: tableH,
        colW,
        border: { type: 'solid', pt: 0.5, color: C.grayLt },
        autoPage: false,
      });

      // Sources footer for table slide
      if (sources.length) {
        tslide.addShape(pres.shapes.RECTANGLE, {
          x: 0, y: H - 0.38, w: W, h: 0.38,
          fill: { color: 'F0F4F8' }, line: { color: C.grayLt, width: 0.5 }
        });
        tslide.addText('Source: ' + sources.join('  ·  '), {
          x: 0.5, y: H - 0.38, w: W - 1, h: 0.38,
          fontSize: 9, color: C.gray, fontFace: 'Calibri',
          valign: 'middle', italic: true, margin: 0
        });
      }
    }

    // ── Sources footer ───────────────────────────────────
    if (sources.length) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: 0, y: H - 0.38, w: W, h: 0.38,
        fill: { color: 'F0F4F8' }, line: { color: C.grayLt, width: 0.5 }
      });
      slide.addText('Source: ' + sources.join('  ·  '), {
        x: 0.5, y: H - 0.38, w: W - 1, h: 0.38,
        fontSize: 9, color: C.gray, fontFace: 'Calibri',
        valign: 'middle', italic: true, margin: 0
      });
    }
  }

  // ══════════════════════════════════════════════════════════
  // BACK COVER
  // ══════════════════════════════════════════════════════════
  const back = pres.addSlide();
  back.background = { color: C.navy };
  back.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.5, h: H,
    fill: { color: C.blue }, line: { color: C.blue }
  });
  back.addText('KIRA', {
    x: 0.9, y: 2.4, w: 6, h: 0.9,
    fontSize: 42, bold: true, color: C.white, fontFace: 'Calibri', margin: 0
  });
  back.addText('RESEARCH', {
    x: 0.9, y: 3.3, w: 6, h: 0.5,
    fontSize: 18, color: C.blue, fontFace: 'Calibri', charSpacing: 8, margin: 0
  });
  back.addText('kiraresearch.com', {
    x: 0.9, y: 4.2, w: 6, h: 0.4,
    fontSize: 12, color: C.gray, fontFace: 'Calibri', margin: 0
  });

  // ── Write and return ──────────────────────────────────────
  const pptxBuffer = await pres.write({ outputType: 'nodebuffer' });
  const fileName = `KIRA-${(industry || 'Report').replace(/\s+/g, '-')}-${country || 'SEA'}-${new Date().getFullYear()}.pptx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Length', pptxBuffer.length);
  return res.end(pptxBuffer);
}
