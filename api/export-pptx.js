// api/export-pptx.js
// Unified PPTX export: dark theme (screen/presentation) + light theme (print/McKinsey-style)
//
// POST /api/export-pptx
// Body: { slug, sections[], title, country, industry, type, generated, theme:'dark'|'light' }
//       OR { reportId } to fetch from Supabase
//
// FIXES v2:
// 1. Line/radar chart data: buildExpChart sends {labels, datasets} not {data} — transform correctly
// 2. Stat cards: dynamic width so 1–6 stats never overflow the 10-inch slide
// 3. Tables: render tableHeaders + tableRows using addTable
// 4. Radar chart: added renderer (was silently dropped before)

export const config = { maxDuration: 25 };

const THEMES = {
  dark: {
    isDark: true,
    bg:"080A0D", surface:"0E1219", surface2:"141820",
    border:"1C2230", borderLt:"242D3D",
    blue:"1E6FFF", text:"E8EDF5", textMid:"8A96A8", textDim:"505A6B",
    accent:"00D4A8", gold:"C9A84C", red:"E05252",
    footerBg:"060809", ghostK:"0E1219",
  },
  light: {
    isDark: false,
    bg:"FFFFFF", surface:"F8FAFC", surface2:"EDF2F7",
    border:"CBD5E0", borderLt:"E2E8F0",
    blue:"1565D8", text:"1A202C", textMid:"4A5568", textDim:"718096",
    accent:"0694A2", gold:"975A16", red:"C53030",
    footerBg:"EDF2F7", ghostK:"F0F4F8",
  },
};

const W = 10, H = 5.625;

function cBase(C, bg) {
  const b = bg || C.surface2;
  return {
    chartArea: { fill:{color:b}, border:{pt:C.isDark?0:0.5,color:C.borderLt} },
    catAxisLabelColor:C.textDim, valAxisLabelColor:C.textDim,
    catAxisLineShow:false, valAxisLineShow:false,
    valGridLine:{color:C.borderLt,size:0.5}, catGridLine:{style:"none"},
    dataLabelFontSize:9, dataLabelColor:C.text,
    catAxisLabelFontSize:9, valAxisLabelFontSize:8,
    plotArea:{fill:{color:b}},
  };
}

function footer(p,s,C,src,n,total){
  s.addShape(p.shapes.RECTANGLE,{x:0,y:H-0.28,w:W,h:0.28,fill:{color:C.footerBg},line:{color:C.footerBg}});
  s.addText(`Source: ${src||'Proprietary research library'}`,{x:0.35,y:H-0.22,w:7,h:0.16,fontFace:"Arial",fontSize:7,color:C.textDim,italic:true,margin:0});
  s.addText(`KIRA RESEARCH  |  ${String(n).padStart(2,"0")}/${String(total).padStart(2,"0")}`,{x:7.5,y:H-0.22,w:2.3,h:0.16,fontFace:"Arial",fontSize:7,color:C.textDim,bold:true,align:"right",margin:0});
}

function header(p,s,C,num,label,title){
  if(C.isDark){
    s.addShape(p.shapes.RECTANGLE,{x:0,y:0,w:0.04,h:H,fill:{color:C.border},line:{color:C.border}});
  } else {
    s.addShape(p.shapes.RECTANGLE,{x:0,y:0,w:W,h:0.04,fill:{color:C.blue},line:{color:C.blue}});
  }
  s.addText(`${String(num).padStart(2,"0")}  —  ${(label||'').toUpperCase()}`,{x:0.35,y:0.22,w:9,h:0.22,fontFace:"Arial",fontSize:8,bold:true,color:C.blue,charSpacing:2,margin:0});
  const fs = title.length>90?14.5 : title.length>60?16 : 18;
  const th = title.length>90?1.0 : 0.8;
  s.addText(title,{x:0.35,y:0.5,w:9.3,h:th,fontFace:"Arial",fontSize:fs,bold:true,color:C.text,margin:0});
  if(C.isDark){
    s.addShape(p.shapes.LINE,{x:0.35,y:0.5+th+0.05,w:9.3,h:0,line:{color:C.border,width:0.75}});
  } else {
    s.addShape(p.shapes.RECTANGLE,{x:0.35,y:0.5+th+0.05,w:0.55,h:0.025,fill:{color:C.blue},line:{color:C.blue}});
    s.addShape(p.shapes.LINE,{x:0.9,y:0.5+th+0.065,w:8.75,h:0,line:{color:C.border,width:0.5}});
  }
  return 0.5+th+0.22;
}

function statCard(p,s,C,x,y,w,h,label,value,sub,ac){
  const color = ac || C.blue;
  const bg = C.isDark ? C.surface2 : "FFFFFF";
  s.addShape(p.shapes.RECTANGLE,{x,y,w,h,fill:{color:bg},line:{color:C.border,width:C.isDark?0.5:0.75}});
  s.addShape(p.shapes.RECTANGLE,{x,y,w,h:0.03,fill:{color},line:{color}});
  s.addText((label||'').toUpperCase(),{x:x+0.12,y:y+0.09,w:w-0.2,h:0.18,fontFace:"Arial",fontSize:7,color:C.textDim,charSpacing:1,margin:0});
  // Shrink font for long values
  const vfs = String(value||'').length > 8 ? 20 : 26;
  s.addText(String(value||''),{x:x+0.12,y:y+0.26,w:w-0.2,h:0.42,fontFace:"Arial",fontSize:vfs,bold:true,color:C.text,margin:0});
  if(sub) s.addText(String(sub),{x:x+0.12,y:y+0.65,w:w-0.2,h:0.16,fontFace:"Arial",fontSize:8,color,margin:0});
}

function finding(p,s,C,y,text){
  const bg = C.isDark ? C.surface2 : C.surface2;
  const h = Math.min(0.78, 0.3 + Math.ceil(String(text||'').length/120)*0.18);
  s.addShape(p.shapes.RECTANGLE,{x:0.35,y,w:9.3,h,fill:{color:bg},line:{color:C.border,width:C.isDark?0.5:0.75}});
  s.addShape(p.shapes.RECTANGLE,{x:0.35,y,w:0.04,h,fill:{color:C.blue},line:{color:C.blue}});
  s.addText("KEY FINDING",{x:0.5,y:y+0.08,w:2,h:0.15,fontFace:"Arial",fontSize:7,bold:true,color:C.blue,charSpacing:2,margin:0});
  s.addText(String(text||''),{x:0.5,y:y+0.25,w:9.0,h:h-0.3,fontFace:"Arial",fontSize:9,color:C.text,margin:0});
}

// ── Convert chart data to pptxgenjs [{name, labels, values}] format ──
// buildExpChart() on the client sends different shapes per type:
//   bar/doughnut  → { data:[{name,labels,values}], colors:[] }   ← already pptxgenjs format
//   line/radar    → { labels:[...], datasets:[{name,values}] }   ← must transform
function toPptxData(ch) {
  if (!ch) return null;
  // Already in pptxgenjs format (bar, doughnut)
  if (Array.isArray(ch.data) && ch.data.length) return ch.data;
  // Transform line/radar format
  if (Array.isArray(ch.datasets) && ch.datasets.length) {
    return ch.datasets.map(ds => ({
      name:   ds.name || '',
      labels: ch.labels || [],
      values: ds.values || [],
    }));
  }
  return null;
}

// ── Render a table ──
function addTableSlide(p, s, C, cy, headers, rows) {
  if (!headers?.length || !rows?.length) return cy;
  const colW = 9.3 / headers.length;
  const tableBg  = C.isDark ? C.surface2 : 'FFFFFF';
  const headerBg = C.isDark ? C.surface  : C.surface2;

  const tableRows = [
    // Header row
    headers.map(h => ({
      text: String(h||'').toUpperCase(),
      options: {
        bold: true, fontSize: 8, color: C.textDim, charSpacing: 1,
        fill: { color: headerBg }, align: 'left',
        border: [
          {pt:0},{pt:0},{pt:0.5,color:C.border},{pt:0}
        ]
      }
    })),
    // Data rows
    ...rows.slice(0, 12).map((row, ri) => row.map((cell, ci) => ({
      text: String(cell||''),
      options: {
        fontSize: 8.5,
        color: ci === 0 ? C.text : C.textMid,
        bold: ci === 0,
        fill: { color: ri%2===0 ? tableBg : (C.isDark ? C.surface : 'F7FAFC') },
        align: 'left',
        border: [
          {pt:0},{pt:0},{pt:0.3,color:C.borderLt},{pt:0}
        ]
      }
    })))
  ];

  const tableH = tableRows.length * 0.3;
  try {
    s.addTable(tableRows, {
      x: 0.35, y: cy, w: 9.3,
      rowH: 0.28,
      fontFace: 'Arial',
      border: {pt:0.5, color:C.border},
      fill: {color: tableBg},
    });
  } catch(e) {
    // fallback: skip table if addTable fails
    console.warn('Table render skipped:', e.message);
  }
  return cy + Math.min(tableH, 3.0) + 0.15;
}

// ── Extract key insight sentences from commentary ──
function extractKeyPts(commentary, max) {
  if (!commentary) return [];
  const clean = commentary.replace(/\*\*(.*?)\*\*/g,'$1').replace(/###\s*/g,'');
  const paras = clean.split(/\n\n+/).filter(p => p.trim().length > 30).slice(0, max + 1);
  return paras.map(p => {
    const sentences = p.match(/[^.!?]+[.!?]+/g) || [p];
    return sentences.slice(0, 2).join(' ').trim().slice(0, 200);
  }).filter(Boolean).slice(0, max);
}

// ── Render key insight bullets in left column ──
function addKeyPoints(s, C, x, y, w, maxH, pts) {
  if (!pts?.length) return y;
  const lineH = 0.35;
  pts.slice(0, Math.floor(maxH / lineH)).forEach((pt, i) => {
    const yp = y + i * lineH;
    // Blue tick mark
    s.addShape(s._p?.shapes?.RECTANGLE || 'rect', { x: x, y: yp + 0.08, w: 0.04, h: lineH * 0.55, fill: { color: C.blue }, line: { color: C.blue } });
    s.addText(pt, { x: x + 0.1, y: yp, w: w - 0.12, h: lineH, fontFace: 'Arial', fontSize: 8.5, color: C.textMid, wrap: true, valign: 'top', margin: 0 });
  });
  return y + pts.length * lineH;
}

async function generate(meta, sections, theme){
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title  = meta.title || 'KIRA RESEARCH Report';
  pres.author = 'KIRA RESEARCH';
  const C = THEMES[theme] || THEMES.dark;

  // ── Cover ──
  {
    const s = pres.addSlide();
    s.background = {color:C.bg};
    if(!C.isDark) s.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:W,h:0.06,fill:{color:C.blue},line:{color:C.blue}});
    s.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:0.05,h:H,fill:{color:C.blue},line:{color:C.blue}});
    s.addText("KIRA  RESEARCH",{x:0.5,y:0.52,w:8,h:0.32,fontFace:"Arial",fontSize:10,bold:true,color:C.blue,charSpacing:5,margin:0});
    s.addShape(pres.shapes.LINE,{x:0.5,y:0.9,w:4,h:0,line:{color:C.border,width:0.5}});
    s.addText(`${(meta.type||'').toUpperCase()}  ·  ${(meta.country||'').toUpperCase()}  ·  ${meta.generated||''}`,{x:0.5,y:1.04,w:9,h:0.24,fontFace:"Arial",fontSize:9,color:C.textDim,charSpacing:2,margin:0});
    s.addText(meta.title||'',{x:0.5,y:1.55,w:7.5,h:2.4,fontFace:"Arial",fontSize:38,bold:true,color:C.text,margin:0});
    s.addShape(pres.shapes.RECTANGLE,{x:0.5,y:3.72,w:1.4,h:0.04,fill:{color:C.blue},line:{color:C.blue}});
    s.addText("Proprietary Market Intelligence  ·  Southeast Asia",{x:0.5,y:H-0.52,w:8,h:0.28,fontFace:"Arial",fontSize:9,color:C.textDim,margin:0});
    s.addText("K",{x:6.5,y:0.1,w:4,h:5.3,fontFace:"Arial",fontSize:240,bold:true,color:C.ghostK,margin:0});
  }

  // ── Content slides — generate sub-slides per section ──
  let globalSlideNum = 1;
  const totalSlides = sections.reduce((sum, sec) => {
    let n = 1; // always divider
    if (sec.stats?.length) n++;
    if (sec.chart) n++;
    if (sec.tableHeaders?.length) n++;
    return sum + n;
  }, 0);

  sections.forEach((sec, idx) => {
    const keyPts = extractKeyPts(sec.commentary || '', 4);
    const cBg    = C.isDark ? C.surface2 : 'FFFFFF';

    // ── A: Section divider slide ──
    {
      const s = pres.addSlide();
      s.background = {color:C.bg};
      if(!C.isDark) s.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:W,h:0.06,fill:{color:C.blue},line:{color:C.blue}});
      s.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:0.05,h:H,fill:{color:C.blue},line:{color:C.blue}});
      // Ghost section number
      s.addText(String(idx+1).padStart(2,'0'),{x:5.5,y:0.1,w:5,h:5.3,fontFace:"Arial",fontSize:240,bold:true,color:C.ghostK,margin:0});
      s.addText(`${String(idx+1).padStart(2,'0')}  —  SECTION`,{x:0.5,y:1.6,w:7,h:0.28,fontFace:"Arial",fontSize:9,bold:true,color:C.blue,charSpacing:3,margin:0});
      const tfs = (sec.label||'').length > 60 ? 22 : (sec.label||'').length > 40 ? 26 : 30;
      s.addText(sec.label||sec.title||'',{x:0.5,y:2.1,w:8,h:1.6,fontFace:"Arial",fontSize:tfs,bold:true,color:C.text,margin:0});
      if(sec.finding){
        s.addShape(pres.shapes.RECTANGLE,{x:0.5,y:3.55,w:0.04,h:0.82,fill:{color:C.blue},line:{color:C.blue}});
        s.addShape(pres.shapes.RECTANGLE,{x:0.5,y:3.55,w:8.8,h:0.82,fill:{color:C.isDark?C.surface2:C.surface2},line:{color:C.border,width:0.5}});
        s.addText('KEY FINDING',{x:0.65,y:3.62,w:3,h:0.16,fontFace:"Arial",fontSize:7,bold:true,color:C.blue,charSpacing:2,margin:0});
        s.addText(sec.finding,{x:0.65,y:3.8,w:8.5,h:0.48,fontFace:"Arial",fontSize:9.5,color:C.text,margin:0});
      }
      footer(pres,s,C,sec.source||'',globalSlideNum++,totalSlides);
    }

    // ── B: Dashboard slide — stats + key points ──
    if(sec.stats?.length) {
      const s = pres.addSlide();
      s.background = {color:C.surface};
      let cy = header(pres,s,C,idx+1,sec.label||'',sec.title||sec.finding||'Key Metrics Overview');

      // Stats row — dynamic width
      const stats = sec.stats.slice(0,4);
      const n = stats.length;
      const gap = 0.18, sw = (9.3-(n-1)*gap)/n, sh = 0.82;
      stats.forEach((st,i) => statCard(pres,s,C,0.35+i*(sw+gap),cy,sw,sh,st.label||'',st.value||'',st.change||'',st.accentColor||C.blue));
      cy += sh + 0.2;

      // Key points below stats
      if(keyPts.length) {
        s.addText('KEY INSIGHTS',{x:0.35,y:cy,w:3,h:0.2,fontFace:"Arial",fontSize:7,bold:true,color:C.blue,charSpacing:2,margin:0});
        cy += 0.22;
        keyPts.slice(0,3).forEach((pt,i) => {
          const yp = cy + i*0.48;
          s.addShape(pres.shapes.RECTANGLE,{x:0.35,y:yp+0.08,w:0.03,h:0.28,fill:{color:C.border},line:{color:C.border}});
          s.addText(pt,{x:0.5,y:yp,w:8.8,h:0.44,fontFace:"Arial",fontSize:9,color:C.textMid,wrap:true,valign:'top',margin:0});
        });
      }
      footer(pres,s,C,sec.source||'',globalSlideNum++,totalSlides);
    }

    // ── C: Analysis slide — 2-col: key points LEFT | chart RIGHT ──
    if(sec.chart) {
      const ch = sec.chart;
      const s = pres.addSlide();
      s.background = {color:C.surface};
      header(pres,s,C,idx+1,sec.label||'',ch.title||sec.title||'');

      // Divider between columns
      const divX = 3.6;
      s.addShape(pres.shapes.LINE,{x:divX,y:1.2,w:0,h:H-1.55,line:{color:C.border,width:0.5}});

      // LEFT: key points
      s.addText('ANALYSIS',{x:0.35,y:1.25,w:3,h:0.18,fontFace:"Arial",fontSize:7,bold:true,color:C.blue,charSpacing:2,margin:0});
      if(sec.finding){
        s.addShape(pres.shapes.RECTANGLE,{x:0.35,y:1.5,w:0.03,h:0.68,fill:{color:C.blue},line:{color:C.blue}});
        s.addShape(pres.shapes.RECTANGLE,{x:0.35,y:1.5,w:3.1,h:0.68,fill:{color:cBg},line:{color:C.borderLt,width:0.5}});
        s.addText(sec.finding,{x:0.5,y:1.52,w:2.9,h:0.62,fontFace:"Arial",fontSize:8.5,bold:true,color:C.text,wrap:true,valign:'top',margin:0});
      }
      const kpY = sec.finding ? 2.28 : 1.5;
      keyPts.slice(0,3).forEach((pt,i) => {
        const yp = kpY + i*0.56;
        s.addShape(pres.shapes.RECTANGLE,{x:0.35,y:yp+0.1,w:0.03,h:0.32,fill:{color:C.border},line:{color:C.border}});
        s.addText(pt,{x:0.5,y:yp,w:2.9,h:0.52,fontFace:"Arial",fontSize:8.5,color:C.textMid,wrap:true,valign:'top',margin:0});
      });

      // RIGHT: chart
      const data = toPptxData(ch);
      if(data?.length && data[0]?.labels?.length) {
        const opts = {
          x:divX+0.2, y:1.2, w:9.3-divX-0.15, h:H-1.55,
          ...cBase(C,cBg),
          chartColors:ch.colors||[C.blue],
          showValue:false,
          title:ch.title||'',showTitle:!!(ch.title),titleFontSize:8.5,titleColor:C.textDim,
          chartArea:{fill:{color:cBg},border:{pt:0}},
          plotArea:{fill:{color:cBg}},
        };
        try {
          if(ch.type==='bar') s.addChart(pres.charts.BAR,data,{...opts,barDir:ch.dir||'col'});
          else if(ch.type==='line') s.addChart(pres.charts.LINE,data,{...opts,lineSize:1.8,lineSmooth:true,showLegend:data.length>1,legendPos:'b',legendFontSize:7,legendColor:C.textMid});
          else if(ch.type==='doughnut') s.addChart(pres.charts.DOUGHNUT,data,{...opts,holeSize:50,showLegend:true,legendPos:'b',legendFontSize:7,legendColor:C.textMid});
          else if(ch.type==='radar') s.addChart(pres.charts.RADAR,data,{...opts,showLegend:data.length>1,legendPos:'b',legendFontSize:7,radarStyle:'marker'});
        } catch(e) { console.warn('Chart render err:',e.message); }
      }
      footer(pres,s,C,sec.source||'',globalSlideNum++,totalSlides);
    }

    // ── D: Data slide — 2-col: key points LEFT | table RIGHT ──
    if(sec.tableHeaders?.length && sec.tableRows?.length) {
      const s = pres.addSlide();
      s.background = {color:C.surface};
      header(pres,s,C,idx+1,sec.label||'',sec.tableTitle||sec.title||'');

      const divX = 3.6;
      s.addShape(pres.shapes.LINE,{x:divX,y:1.2,w:0,h:H-1.55,line:{color:C.border,width:0.5}});

      // LEFT: key points
      s.addText('ANALYSIS',{x:0.35,y:1.25,w:3,h:0.18,fontFace:"Arial",fontSize:7,bold:true,color:C.blue,charSpacing:2,margin:0});
      const kpStart = 1.52;
      const kpSlice = keyPts.slice(-3);
      kpSlice.forEach((pt,i) => {
        const yp = kpStart + i * 0.6;
        s.addShape(pres.shapes.RECTANGLE,{x:0.35,y:yp+0.1,w:0.03,h:0.35,fill:{color:C.border},line:{color:C.border}});
        s.addText(pt,{x:0.5,y:yp,w:2.9,h:0.56,fontFace:"Arial",fontSize:8.5,color:C.textMid,wrap:true,valign:'top',margin:0});
      });

      // RIGHT: table
      const tableH = Math.min(H - 1.55, 0.28 * (1 + (sec.tableRows||[]).length));
      const colW = (9.3 - divX - 0.15) / sec.tableHeaders.length;
      const tRows = [
        sec.tableHeaders.map(h=>({text:h.toUpperCase(),options:{bold:true,fontSize:7.5,color:C.textDim,charSpacing:1,fill:{color:C.isDark?C.surface:C.surface2},align:'left',border:[{pt:0},{pt:0},{pt:0.4,color:C.border},{pt:0}]}})),
        ...(sec.tableRows||[]).slice(0,10).map((row,ri)=>row.map((cell,ci)=>({text:String(cell||''),options:{fontSize:8.5,color:ci===0?C.text:C.textMid,bold:ci===0,fill:{color:ri%2===0?cBg:(C.isDark?C.surface:'F7FAFC')},align:'left',border:[{pt:0},{pt:0},{pt:0.3,color:C.borderLt},{pt:0}]}}))),
      ];
      try {
        s.addTable(tRows,{x:divX+0.2,y:1.2,w:9.3-divX-0.2,rowH:0.28,fontFace:'Arial',border:{pt:0.5,color:C.border},fill:{color:cBg}});
      } catch(e) { console.warn('Table render err:',e.message); }

      footer(pres,s,C,sec.source||'',globalSlideNum++,totalSlides);
    }
  });

  // ── Back cover ──
  {
    const s = pres.addSlide();
    s.background = {color:C.bg};
    if(!C.isDark) s.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:W,h:0.06,fill:{color:C.blue},line:{color:C.blue}});
    s.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:0.05,h:H,fill:{color:C.blue},line:{color:C.blue}});
    s.addText("K",{x:5.5,y:0.2,w:5,h:5.5,fontFace:"Arial",fontSize:240,bold:true,color:C.ghostK,margin:0});
    s.addText("KIRA  RESEARCH",{x:0.5,y:1.8,w:6,h:0.38,fontFace:"Arial",fontSize:11,bold:true,color:C.blue,charSpacing:6,margin:0});
    s.addText("Driven by insight. Built for impact.",{x:0.5,y:2.28,w:6,h:0.35,fontFace:"Arial",fontSize:14,color:C.text,margin:0});
    s.addText("kiraresearch.com",{x:0.5,y:H-0.5,w:4,h:0.25,fontFace:"Arial",fontSize:9,color:C.textDim,margin:0});
  }

  return pres.write({outputType:'nodebuffer'});
}

export default async function handler(req, res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {reportId, slug, sections, title, country, industry, type, generated, theme='dark'} = req.body;

  let finalSections = sections;
  let meta = {title, country, industry, type, generated: generated || new Date().getFullYear().toString()};

  if(reportId && !sections){
    try {
      const {createClient} = await import('@supabase/supabase-js');
      const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      const {data:r, error} = await sb.from('custom_reports').select('*').eq('id',reportId).single();
      if(error||!r) return res.status(404).json({error:'Report not found'});
      finalSections = r.sections;
      meta = {
        title:     title || r.input_params?.title || `${r.input_params?.industry} Market Report`,
        country:   country || r.input_params?.country || 'SEA',
        industry:  industry || r.input_params?.industry || '',
        type:      type || r.report_type || 'Industry Deep Dive',
        generated: generated || new Date(r.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}),
      };
    } catch(err) { return res.status(500).json({error:err.message}); }
  }

  if(!finalSections?.length) return res.status(400).json({error:'Missing sections'});

  try {
    const buf  = await generate(meta, finalSections, theme);
    const fname = `kira-${(slug||'report').replace(/[^a-z0-9-]/gi,'-')}-${theme}.pptx`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition',`attachment; filename="${fname}"`);
    res.setHeader('Content-Length', buf.length);
    return res.send(buf);
  } catch(err) {
    console.error('Export error:', err);
    return res.status(500).json({error: err.message, stack: err.stack?.split('\n').slice(0,5).join(' | ')});
  }
}
