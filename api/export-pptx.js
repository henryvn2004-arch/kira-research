// api/export-pptx.js
// Unified PPTX export: dark theme (screen/presentation) + light theme (print/McKinsey-style)
//
// POST /api/export-pptx
// Body: { slug, sections[], title, country, industry, type, generated, theme:'dark'|'light' }
//       OR { reportId } to fetch from Supabase
//
// FLOW OPTIMIZATIONS:
// 1. maxDuration:25 (not 60) — typical 7-slide deck generates in ~3s; fail fast if something breaks
// 2. sections sent from client (not re-fetched) — removes one DB roundtrip for the common case
// 3. Dynamic import of pptxgenjs — keeps cold start < 500ms
// 4. No CDN dependency — all server-side, no client bundle weight
//
// DEPENDENCIES (package.json):
//   "pptxgenjs": "^3.12.0"
//   "@supabase/supabase-js": "^2.x" (only needed if using reportId fetch)

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
  s.addText(`Source: ${src}`,{x:0.35,y:H-0.22,w:7,h:0.16,fontFace:"Arial",fontSize:7,color:C.textDim,italic:true,margin:0});
  s.addText(`KIRA RESEARCH  |  ${String(n).padStart(2,"0")}/${String(total).padStart(2,"0")}`,{x:7.5,y:H-0.22,w:2.3,h:0.16,fontFace:"Arial",fontSize:7,color:C.textDim,bold:true,align:"right",margin:0});
}

function header(p,s,C,num,label,title){
  if(C.isDark){
    s.addShape(p.shapes.RECTANGLE,{x:0,y:0,w:0.04,h:H,fill:{color:C.border},line:{color:C.border}});
  } else {
    s.addShape(p.shapes.RECTANGLE,{x:0,y:0,w:W,h:0.04,fill:{color:C.blue},line:{color:C.blue}});
  }
  s.addText(`${String(num).padStart(2,"0")}  —  ${label.toUpperCase()}`,{x:0.35,y:0.22,w:9,h:0.22,fontFace:"Arial",fontSize:8,bold:true,color:C.blue,charSpacing:2,margin:0});
  const fs=title.length>90?14.5:title.length>60?16:18;
  const th=title.length>90?1.0:0.8;
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
  const color=ac||C.blue;
  const bg=C.isDark?C.surface2:"FFFFFF";
  s.addShape(p.shapes.RECTANGLE,{x,y,w,h,fill:{color:bg},line:{color:C.border,width:C.isDark?0.5:0.75}});
  s.addShape(p.shapes.RECTANGLE,{x,y,w,h:0.03,fill:{color},line:{color}});
  s.addText(label.toUpperCase(),{x:x+0.12,y:y+0.09,w:w-0.2,h:0.18,fontFace:"Arial",fontSize:7,color:C.textDim,charSpacing:1,margin:0});
  s.addText(value,{x:x+0.12,y:y+0.26,w:w-0.2,h:0.42,fontFace:"Arial",fontSize:26,bold:true,color:C.text,margin:0});
  if(sub) s.addText(sub,{x:x+0.12,y:y+0.65,w:w-0.2,h:0.16,fontFace:"Arial",fontSize:8,color,margin:0});
}

function finding(p,s,C,y,text){
  const bg=C.isDark?C.surface2:C.surface2;
  s.addShape(p.shapes.RECTANGLE,{x:0.35,y,w:9.3,h:0.78,fill:{color:bg},line:{color:C.border,width:C.isDark?0.5:0.75}});
  s.addShape(p.shapes.RECTANGLE,{x:0.35,y,w:0.04,h:0.78,fill:{color:C.blue},line:{color:C.blue}});
  s.addText("KEY FINDING",{x:0.5,y:y+0.08,w:2,h:0.15,fontFace:"Arial",fontSize:7,bold:true,color:C.blue,charSpacing:2,margin:0});
  s.addText(text,{x:0.5,y:y+0.25,w:9.0,h:0.44,fontFace:"Arial",fontSize:9,color:C.text,margin:0});
}

function iconCard(p,s,C,x,y,w,h,icon,title,desc,ac){
  const bg=C.isDark?C.surface2:"FFFFFF";
  s.addShape(p.shapes.RECTANGLE,{x,y,w,h,fill:{color:bg},line:{color:C.border,width:C.isDark?0.5:0.75}});
  s.addShape(p.shapes.OVAL,{x:x+0.14,y:y+0.14,w:0.36,h:0.36,fill:{color:ac,transparency:88},line:{color:ac,width:1}});
  s.addText(icon,{x:x+0.14,y:y+0.14,w:0.36,h:0.36,fontFace:"Arial",fontSize:13,bold:true,color:ac,align:"center",valign:"middle",margin:0});
  s.addText(title,{x:x+0.60,y:y+0.12,w:w-0.74,h:0.2,fontFace:"Arial",fontSize:10,bold:true,color:C.text,margin:0});
  s.addText(desc,{x:x+0.14,y:y+0.55,w:w-0.26,h:0.52,fontFace:"Arial",fontSize:8.5,color:C.textMid,margin:0});
}

async function generate(meta, sections, theme){
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title = meta.title || 'KIRA RESEARCH Report';
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

  // ── Content slides ──
  sections.forEach((sec, idx) => {
    const s = pres.addSlide();
    s.background = {color:C.surface};
    let cy = header(pres, s, C, idx+1, sec.label||'', sec.title||'');
    const cBg = C.isDark ? C.surface2 : "FFFFFF";

    // Stats
    if(sec.stats?.length){
      const sw=2.8,sh=0.82,gap=0.25;
      sec.stats.forEach((st,i)=> statCard(pres,s,C,0.35+i*(sw+gap),cy,sw,sh,st.label||'',st.value||'',st.change||'',st.accentColor||C.blue));
      cy+=sh+0.22;
    }

    // Chart
    if(sec.chart){
      const ch=sec.chart;
      const opts={x:ch.x??0.35,y:ch.y??cy,w:ch.w??9.3,h:ch.h??2.8,...cBase(C,cBg),
        chartColors:ch.colors||[C.blue],showValue:ch.showValue??true,dataLabelPosition:"outEnd",
        title:ch.title||'',showTitle:!!(ch.title),titleFontSize:9,titleColor:C.textDim,
        chartArea:{fill:{color:cBg},border:{pt:C.isDark?0:0.5,color:C.borderLt}},plotArea:{fill:{color:cBg}},...(ch.extra||{})};
      if(ch.type==='bar') s.addChart(pres.charts.BAR,ch.data,{...opts,barDir:ch.dir||'col'});
      else if(ch.type==='line') s.addChart(pres.charts.LINE,ch.data,{...opts,lineSize:2.5,lineSmooth:true,showLegend:true,legendPos:'r',legendFontSize:9,legendColor:C.textMid});
      else if(ch.type==='doughnut') s.addChart(pres.charts.DOUGHNUT,ch.data,{...opts,holeSize:55,showLabel:false,showPercent:false,showLegend:true,legendPos:'b',legendFontSize:8,legendColor:C.textMid});
      if(!ch.x) cy+=(ch.h??2.8)+0.15;
    }

    // Bullets
    if(sec.bullets?.length){
      const items=sec.bullets.map((b,i)=>({text:b,options:{bullet:true,breakLine:i<sec.bullets.length-1,color:C.textMid,fontSize:10,paraSpaceAfter:4}}));
      const bh=Math.min(sec.bullets.length*0.38,1.8);
      s.addText(items,{x:0.35,y:cy,w:9.3,h:bh,fontFace:"Arial",margin:[0,0,0,8]});
      cy+=bh+0.15;
    }

    // Icon grid
    if(sec.iconCards?.length){
      const cards=sec.iconCards;
      const rowSize=cards.length<=4?2:3;
      const gap=0.24, cardH=1.15;
      for(let ri=0;ri<Math.ceil(cards.length/rowSize);ri++){
        const row=cards.slice(ri*rowSize,(ri+1)*rowSize);
        const cw=(9.3-(row.length-1)*gap)/row.length;
        row.forEach((card,ci)=>iconCard(pres,s,C,0.35+ci*(cw+gap),cy+ri*(cardH+0.2),cw,cardH,card.icon||'?',card.title||'',card.desc||'',card.color||C.blue));
      }
      cy+=Math.ceil(cards.length/rowSize)*(cardH+0.2)+0.1;
    }

    // Finding
    if(sec.finding){
      const fy=Math.min(cy,H-1.05);
      finding(pres,s,C,fy,sec.finding);
    }

    // Inline 2-column text blocks
    if(sec.blocks?.length){
      const gap=0.22, bw=(9.3-(sec.blocks.length-1)*gap)/sec.blocks.length;
      const bh=1.15;
      sec.blocks.forEach((blk,i)=>{
        const bx=0.35+i*(bw+gap), by=cy;
        const bg=C.isDark?C.surface2:"FFFFFF";
        s.addShape(pres.shapes.RECTANGLE,{x:bx,y:by,w:bw,h:bh,fill:{color:bg},line:{color:C.border,width:C.isDark?0.5:0.75}});
        s.addShape(pres.shapes.RECTANGLE,{x:bx,y:by,w:0.04,h:bh,fill:{color:blk.color||C.blue},line:{color:blk.color||C.blue}});
        s.addText((blk.label||'').toUpperCase(),{x:bx+0.14,y:by+0.1,w:bw-0.2,h:0.16,fontFace:"Arial",fontSize:7,bold:true,color:blk.color||C.blue,charSpacing:2,margin:0});
        s.addText(blk.text||'',{x:bx+0.14,y:by+0.28,w:bw-0.2,h:0.78,fontFace:"Arial",fontSize:9,color:C.text,margin:0});
      });
      cy+=bh+0.18;
    }

    footer(pres,s,C,sec.source||'',idx+1,sections.length);
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
  const {reportId,slug,sections,title,country,industry,type,generated,theme='dark'} = req.body;

  let finalSections=sections;
  let meta={title,country,industry,type,generated:generated||new Date().getFullYear().toString()};

  if(reportId && !sections){
    try {
      const {createClient}=await import('@supabase/supabase-js');
      const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
      const {data:r,error}=await sb.from('custom_reports').select('*').eq('id',reportId).single();
      if(error||!r) return res.status(404).json({error:'Report not found'});
      finalSections=r.sections;
      meta={title:title||r.input_params?.title||`${r.input_params?.industry} Market Report`,country:country||r.input_params?.country||'SEA',industry:industry||r.input_params?.industry||'',type:type||r.report_type||'Industry Deep Dive',generated:generated||new Date(r.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'})};
    } catch(err){ return res.status(500).json({error:err.message}); }
  }

  if(!finalSections?.length) return res.status(400).json({error:'Missing sections'});

  try {
    const buf=await generate(meta,finalSections,theme);
    const fname=`kira-${(slug||'report').replace(/[^a-z0-9-]/gi,'-')}-${theme}.pptx`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition',`attachment; filename="${fname}"`);
    res.setHeader('Content-Length',buf.length);
    return res.send(buf);
  } catch(err){
    console.error('Export error:',err);
    return res.status(500).json({error:err.message});
  }
}
