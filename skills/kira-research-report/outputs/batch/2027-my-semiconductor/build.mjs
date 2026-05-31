#!/usr/bin/env node
// Build script for KIRA Research report: 2027-my-semiconductor
// Malaysia manufacturing 2027 outlook — semiconductor packaging & back-end test expansion
// Reuses the render-tested master CSS inlined in the 2026-my-construction baseline.
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const BATCH = path.resolve(HERE, '..');

// --- pull the canonical inlined master CSS from a known-good sibling report ---
const ref = fs.readFileSync(path.join(BATCH, '2026-my-construction', 'en.html'), 'utf8');
const cssMatch = ref.match(/<style>\n([\s\S]*?)\n<\/style>/);
if (!cssMatch) throw new Error('could not extract master CSS from reference');
const CSS = cssMatch[1];

const TOTAL = 23; // total page count (kept in sync with pages array length)
const pn = (n) => `${String(n).padStart(2, '0')} / ${TOTAL}`;

// ---- helper builders ----
const dataTag = (kind, label) => `<span class="data-tag ${kind}">${label}</span>`;

function page(inner) { return `<div class="page">\n  <div class="page-inner">\n${inner}\n  </div>\n</div>`; }

function header(tag, counter) {
  return `    <div class="page-header">\n      <div class="page-section-tag">${tag}</div>\n      <div class="page-section-counter">${counter}</div>\n    </div>`;
}
function footer() {
  return `    <div class="page-footer">\n      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>\n      <div>Malaysia · Semiconductor · 2027</div>\n    </div>`;
}
function sourceKey(txt) {
  return `    <div class="source-key" style="font-family:'JetBrains Mono',monospace; font-size:10px; color:var(--muted); font-style:italic; line-height:1.5; margin-top:auto; padding-top:10px;">${txt}</div>`;
}

const pages = [];

/* ============ 1 · COVER ============ */
pages.push(`<div class="page cover-page" style="background:var(--dark-bg); color:var(--dark-text);">
  <div style="position:absolute; inset:0; background-image: radial-gradient(ellipse 70% 50% at 75% 30%, rgba(30,111,255,0.22) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 15% 85%, rgba(30,111,255,0.10) 0%, transparent 60%); pointer-events:none;"></div>
  <div style="position:relative; z-index:2; height:100%; display:flex; flex-direction:column; padding:64px 72px;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-family:'Satoshi'; font-weight:900; font-size:22px; letter-spacing:-0.02em;">KIRA<span style="color:var(--primary);">.</span><span style="font-weight:400; color:var(--muted); font-size:13px; letter-spacing:0.25em; margin-left:8px;">RESEARCH</span></div>
      <div class="mono" style="font-size:11px; color:var(--muted); letter-spacing:0.15em;">CONFIDENTIAL</div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
      <div class="mono" style="font-size:13px; color:var(--primary); letter-spacing:0.3em; margin-bottom:24px;">MALAYSIA · SEMICONDUCTOR · 2027</div>
      <h1 style="font-family:'Satoshi'; font-weight:900; font-size:58px; line-height:1.04; letter-spacing:-0.04em; margin-bottom:28px; max-width:960px;">Malaysia's back-end semiconductor base moves up the value chain</h1>
      <p style="font-size:18px; color:#A3A9B6; line-height:1.5; max-width:720px; margin-bottom:auto;">Advanced packaging, test capacity, and the northern corridor reset a 13%-of-world assembly-and-test position for the AI-chip cycle through 2027.</p>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
      <div class="mono" style="font-size:11px; color:var(--muted); letter-spacing:0.1em;">REPORT · KR-MY-SEMICONDUCTOR-2027</div>
      <div class="mono" style="font-size:11px; color:var(--muted); letter-spacing:0.1em;">MARKET ANALYSIS</div>
    </div>
  </div>
</div>`);

/* ============ 2 · METHODOLOGY ============ */
pages.push(page(`${header('Methodology', pn(2))}
    <h1 class="page-h1">How we built this view</h1>
    <p class="page-subhead">This view is built from two evidence streams: <strong>primary inputs</strong> — channel checks across the northern semiconductor corridor, analyst synthesis, and specialist reads — and <strong>secondary anchors</strong> — statistical authorities, listed-company filings, and triangulated estimates. Every quantitative claim carries an explicit source tag.</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:28px; margin-top:8px; flex:1;">
      <div>
        <div style="font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--primary); letter-spacing:0.15em; text-transform:uppercase; font-weight:600; margin-bottom:16px; padding-bottom:8px; border-bottom:2px solid var(--primary);">Primary inputs</div>
        <div style="margin-bottom:16px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Corridor channel checks</div><div style="font-size:12px; color:var(--text-mid); line-height:1.5;">Conversations with OSAT operators, equipment vendors, and recruiters across Penang, Kulim, and the Klang Valley — surfaces real utilisation, real hiring, real lead times.</div></div>
        <div style="margin-bottom:16px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Analyst synthesis</div><div style="font-size:12px; color:var(--text-mid); line-height:1.5;">KIRA in-house triangulation across multiple disclosed inputs. Tagged inline as [Kira estimates].</div></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Specialist & operator reads</div><div style="font-size:12px; color:var(--text-mid); line-height:1.5;">Packaging engineers, test-floor managers, and investment-corridor officials closer to the demand signal than headline trade data.</div></div>
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace; font-size:11px; color:var(--primary); letter-spacing:0.15em; text-transform:uppercase; font-weight:600; margin-bottom:16px; padding-bottom:8px; border-bottom:2px solid var(--primary);">Secondary anchors</div>
        <div style="margin-bottom:16px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Statistical authorities</div><div style="font-size:12px; color:var(--text-mid); line-height:1.5;">Trade and investment agencies, the central bank, and industry-strategy documents — cited inline by named source.</div></div>
        <div style="margin-bottom:16px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Listed-company filings</div><div style="font-size:12px; color:var(--text-mid); line-height:1.5;">Annual reports and investor decks of named OSAT and IDM operators — cited by company and period.</div></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Triangulated estimates</div><div style="font-size:12px; color:var(--text-mid); line-height:1.5;">Where no single source covers a figure, we combine two to three inputs and disclose the method. Tagged [Kira estimates].</div></div>
      </div>
    </div>
${footer()}`));

/* ============ 3 · CONTENTS ============ */
pages.push(page(`${header('Contents', pn(3))}
    <h1 class="page-h1">Contents</h1>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 48px; margin-top:18px; flex:1;">
      <div>
        ${[['03','Executive summary','The 2027 inflection','004'],
            ['04','Macro context','Malaysia 2027 backdrop','006'],
            ['05','Sector sizing','Assembly, test & packaging','008'],
            ['06','Segment economics','Packaging vs test vs front-end','010'],
            ['07','Competitive landscape','Operators & IDM anchors','012']].map(r=>
        `<div style="display:flex; align-items:baseline; gap:14px; padding:11px 0; border-bottom:1px solid var(--border);"><span class="mono" style="font-size:11px; color:var(--primary); font-weight:600;">${r[0]}</span><div style="flex:1;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px;">${r[1]}</div><div style="font-size:11px; color:var(--muted);">${r[2]}</div></div><span class="mono" style="font-size:11px; color:var(--muted);">${r[3]}</span></div>`).join('\n        ')}
      </div>
      <div>
        ${[['08','Demand & investment','Corridor pipeline','017'],
            ['09','Policy landscape','National Semiconductor Strategy','019'],
            ['10','AI impact','Advanced packaging & test','020'],
            ['11','Five-year outlook','Forecast to 2030','022'],
            ['12','Methodology endnote','Source mix & disclosure','023']].map(r=>
        `<div style="display:flex; align-items:baseline; gap:14px; padding:11px 0; border-bottom:1px solid var(--border);"><span class="mono" style="font-size:11px; color:var(--primary); font-weight:600;">${r[0]}</span><div style="flex:1;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px;">${r[1]}</div><div style="font-size:11px; color:var(--muted);">${r[2]}</div></div><span class="mono" style="font-size:11px; color:var(--muted);">${r[3]}</span></div>`).join('\n        ')}
      </div>
    </div>
${footer()}`));

/* ============ 4 · EXEC SUMMARY P1 ============ */
pages.push(page(`${header('Executive summary', pn(4))}
    <h1 class="page-h1">Malaysia's semiconductor base — 2027 inflection</h1>
    <p class="page-subhead">After a 2023–24 cyclical trough, the AI-chip cycle and supply-chain diversification reset the back-end growth curve. The position to defend is a <strong>~13% share of global assembly, test and packaging</strong> — and the prize is moving the value mix toward advanced packaging.</p>
    <div class="exec-callouts">
      <div class="callout"><div class="label">E&amp;E exports 2024</div><div class="num">RM601<span class="unit">bn</span></div><div class="change">~40% of total exports</div><div class="source-tag">MATRADE</div></div>
      <div class="callout"><div class="label">Global ATP share</div><div class="num">~13<span class="unit">%</span></div><div class="change">assembly·test·packaging</div><div class="source-tag">MIDA</div></div>
      <div class="callout"><div class="label">NSS investment target</div><div class="num">RM500<span class="unit">bn</span></div><div class="change">multi-year, launched 2024</div><div class="source-tag">NSS</div></div>
      <div class="callout"><div class="label">Engineer gap</div><div class="num">60<span class="unit">k</span></div><div class="change">high-skill target</div><div class="source-tag">NSS</div></div>
    </div>
    <div style="display:grid; grid-template-columns:1.4fr 1fr; gap:32px; flex:1;">
      <div>
        <div style="margin-bottom:16px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:15px; margin-bottom:6px;">The setup</div><p style="font-size:12.5px; color:var(--text-mid); line-height:1.6;">Malaysia is the world's largest back-end node outside Taiwan and China, with roughly <strong>13% of global ATP services</strong> [MIDA] and about 7% of world semiconductor trade routed through its plants [MIDA]. The 2023–24 downturn cut OSAT utilisation hard, but AI accelerators, rising automotive silicon content, and inventory normalisation have turned demand up through 2025–27 [WSTS].</p></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:15px; margin-bottom:6px;">The shift</div><p style="font-size:12.5px; color:var(--text-mid); line-height:1.6;">The strategic move in 2027 is qualitative, not just volume. Advanced packaging — 2.5D/3D integration, fan-out, and system-in-package — is the fastest-growing slice of the value chain [Kira estimates], and the National Semiconductor Strategy explicitly steers the corridor from commodity assembly toward higher-margin packaging, test, and design [NSS].</p></div>
      </div>
      <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:18px;">
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:2px;">Global chip sales trajectory</div>
        <div class="mono" style="font-size:10px; color:var(--muted); margin-bottom:12px;">USD BN · WORLDWIDE · 2024–2026F</div>
        ${barChart([['2024',630,'#1E6FFF',false],['2025',772,'#1E6FFF',false],['2026F',976,'#D97706',true]], 976, 'USD BN')}
        <div class="mono" style="font-size:9px; color:var(--muted); margin-top:8px; letter-spacing:0.05em;">SOURCE: WSTS, SIA · KIRA RESEARCH 2027</div>
      </div>
    </div>
${sourceKey('MIDA = Malaysian Investment Development Authority · MATRADE = Malaysia External Trade Development Corp · WSTS = World Semiconductor Trade Statistics · SIA = Semiconductor Industry Assn · NSS = National Semiconductor Strategy 2024 · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

/* helper: vertical bar chart for exec/market pages */
function barChart(data, max, unit) {
  // data: [label, value, color, dashed]
  const W = 480, H = 200, base = 170, top = 18, plotH = base - top;
  const n = data.length;
  const slot = (W - 60) / n;
  const bw = Math.min(58, slot * 0.55);
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">\n<line x1="40" y1="${base}" x2="${W-10}" y2="${base}" stroke="#E5E7EB" stroke-width="1"/>\n<g class="mono">`;
  data.forEach((d, i) => {
    const [label, val, color, dashed] = d;
    const h = Math.round((val / max) * plotH);
    const x = 50 + i * slot + (slot - bw) / 2;
    const y = base - h;
    if (dashed) {
      svg += `\n<rect x="${x.toFixed(0)}" y="${y}" width="${bw.toFixed(0)}" height="${h}" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="3,2"/>`;
    } else {
      svg += `\n<rect x="${x.toFixed(0)}" y="${y}" width="${bw.toFixed(0)}" height="${h}" fill="${color}"/>`;
    }
    const cx = x + bw / 2;
    svg += `\n<text x="${cx.toFixed(0)}" y="${base + 16}" text-anchor="middle" font-size="10" fill="#6B7280">${label}</text>`;
    svg += `\n<text x="${cx.toFixed(0)}" y="${y - 6}" text-anchor="middle" font-size="10" font-weight="700" fill="${dashed ? '#D97706' : '#0B0D10'}">${val}</text>`;
  });
  svg += `\n</g>\n</svg>`;
  return svg;
}

/* ============ 5 · EXEC SUMMARY P2 — IMPLICATIONS ============ */
const implications = [
  ['POSITIONING', 'Defend the test floor before the fab', 'Front-end fabs grab headlines, but Malaysia’s defensible edge in 2027 is back-end <strong>assembly and test</strong> [Kira estimates]. AI and automotive devices demand longer, more complex test — a margin pool corridor operators can capture without the capital intensity of wafer fabs.', 'See Segment economics · p.010'],
  ['CAPEX', 'Advanced packaging is the value migration', 'Standard wirebond is commoditising. The growth and margin sit in 2.5D/3D, fan-out and SiP, where global advanced packaging runs ~USD 38–44 bn in 2024 toward USD 65–80 bn by 2030 [Kira estimates]. Capacity placed here in 2027 compounds.', 'See AI impact · p.020'],
  ['TALENT', 'The engineer gap is the binding constraint', 'The NSS 60,000-engineer target [NSS] is not a stretch goal — it is the gating factor on every expansion. Wage arbitrage versus Singapore is eroding; participants that solve retention, not just hiring, win the cycle.', 'See Macro context · p.006'],
  ['GEOGRAPHY', 'The northern corridor concentrates the bet', 'Penang anchors packaging and test; Kulim (Kedah) is emerging as the wafer-fab counterpart [MIDA]. Co-location of packaging, test and front-end in one corridor is the structural advantage to protect.', 'See Demand & investment · p.017'],
  ['POLICY', 'Use NSS incentives, plan for their sunset', 'The strategy front-loads fiscal support — at least RM25 bn over 5–10 years [NSS]. Decisions taken in 2027 should bank the incentive while building cost competitiveness that survives the subsidy taper.', 'See Policy landscape · p.019'],
];
pages.push(page(`${header('Executive summary', pn(5))}
    <h1 class="page-h1">Five strategic implications for 2027</h1>
    <p class="page-subhead">Where the Malaysian semiconductor base must act. Each implication is anchored to the section that develops the evidence.</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; flex:1; align-content:start;">
      ${implications.map((c,i)=>`<div style="background:var(--bg-soft); border:1px solid var(--border); border-left:3px solid var(--primary); border-radius:6px; padding:14px 16px;${i===4?' grid-column:1 / -1;':''}">
        <div class="mono" style="font-size:9px; color:var(--primary); letter-spacing:0.12em; font-weight:600; margin-bottom:6px;">${c[0]}</div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:14.5px; margin-bottom:6px; line-height:1.2;">${c[1]}</div>
        <p style="font-size:11.5px; color:var(--text-mid); line-height:1.55; margin-bottom:8px;">${c[2]}</p>
        <div class="mono" style="font-size:9px; color:var(--muted); letter-spacing:0.05em;">${c[3]}</div>
      </div>`).join('\n      ')}
    </div>
${footer()}`));

/* ============ 6 · MACRO DIVIDER ============ */
function divider(num, title, thesis, pills) {
  return `<div class="page divider-page">
  <div class="atmosphere"></div>
  <div class="divider-content">
    <div class="divider-section-num">SECTION ${num}</div>
    <h2 class="divider-title">${title}</h2>
    <p class="divider-thesis">${thesis}</p>
    <div class="divider-mini-toc">${pills.map(p=>`<span class="toc-pill">${p}</span>`).join('')}</div>
  </div>
</div>`;
}
pages.push(divider('04', 'Macro context: <span class="accent">Malaysia 2027</span>', 'A 4.5–5% growth economy with a recovering ringgit and an export base where electronics is the single largest category. The semiconductor cycle is now a macro driver, not a sub-sector. <strong>The constraint is people, not demand.</strong>', ['GDP & FX', 'Export mix', 'Talent gap']));

/* ============ 7 · MACRO PAGE ============ */
pages.push(page(`${header('Section 04 · Macro context', pn(7))}
    <h1 class="page-h1">Macro indicators driving the 2027 base</h1>
    <p class="page-subhead">Steady growth and a firmer ringgit support capex planning, but electronics export concentration means the chip cycle now moves the national numbers.</p>
    <div style="display:grid; grid-template-columns:1fr 1.1fr; gap:32px; flex:1;">
      <div>
        <div style="margin-bottom:14px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Growth holds in the 4.5–5% band</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Real GDP grew ~5.1% in 2024 after ~3.6% in 2023, with the central bank guiding ~4.5–5.5% for 2025 and a similar 2026–27 path [BNM]. A constructive backdrop for multi-year fab and packaging commitments.</p></div>
        <div style="margin-bottom:14px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Ringgit recovery aids imported tooling</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">The ringgit weakened to ~RM4.70/USD in early 2024 before recovering toward RM4.20–4.40 [BNM]. Since back-end capacity runs on imported equipment priced in dollars, FX stability matters directly to project economics.</p></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Electronics dominates the export base</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">E&amp;E exports reached ~RM601 bn in 2024, around 40% of total exports [MATRADE]. Semiconductors are the largest slice — making the back-end cycle a national-account variable.</p></div>
      </div>
      <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:18px;">
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:2px;">GDP growth vs ringgit</div>
        <div class="mono" style="font-size:10px; color:var(--muted); margin-bottom:14px;">REAL GDP % (BARS) · RM/USD (LINE) · 2023–2027F</div>
        ${comboChart()}
        <div class="mono" style="font-size:9px; color:var(--muted); margin-top:10px;">SOURCE: BNM, DOSM · KIRA RESEARCH 2027</div>
      </div>
    </div>
${sourceKey('BNM = Bank Negara Malaysia · DOSM = Dept of Statistics Malaysia · MATRADE = Malaysia External Trade Development Corp · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

function comboChart() {
  const W=480,H=220,base=160,top=22;
  const gdp=[['2023',3.6],['2024',5.1],['2025F',4.8],['2026F',4.7],['2027F',4.6]];
  const fx=[4.56,4.42,4.30,4.25,4.22]; // RM/USD
  const maxG=6, slot=(W-60)/gdp.length, bw=34, plotH=base-top;
  let s=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">\n<line x1="40" y1="${base}" x2="${W-10}" y2="${base}" stroke="#E5E7EB" stroke-width="1"/>\n<g class="mono">`;
  const cxs=[];
  gdp.forEach((d,i)=>{const h=Math.round((d[1]/maxG)*plotH);const x=50+i*slot+(slot-bw)/2;const y=base-h;const cx=x+bw/2;cxs.push(cx);
    s+=`\n<rect x="${x.toFixed(0)}" y="${y}" width="${bw}" height="${h}" fill="#1E6FFF"/>`;
    s+=`\n<text x="${cx.toFixed(0)}" y="${base+15}" text-anchor="middle" font-size="9" fill="#6B7280">${d[0]}</text>`;
    s+=`\n<text x="${cx.toFixed(0)}" y="${y-5}" text-anchor="middle" font-size="9" font-weight="700" fill="#0B0D10">${d[1]}</text>`;
  });
  // FX line scaled: 4.2..4.6 -> map to top..base region
  const fxMin=4.15,fxMax=4.65; const fy=(v)=>top+ (1-(v-fxMin)/(fxMax-fxMin))*(plotH*0.7);
  let pts=fx.map((v,i)=>`${cxs[i].toFixed(0)},${fy(v).toFixed(0)}`).join(' ');
  s+=`\n<polyline points="${pts}" fill="none" stroke="#D97706" stroke-width="1.8"/>`;
  fx.forEach((v,i)=>{s+=`\n<circle cx="${cxs[i].toFixed(0)}" cy="${fy(v).toFixed(0)}" r="3" fill="#D97706"/>`;
    s+=`\n<text x="${cxs[i].toFixed(0)}" y="${(fy(v)-7).toFixed(0)}" text-anchor="middle" font-size="8" fill="#D97706">${v.toFixed(2)}</text>`;});
  s+=`\n</g>\n</svg>`;
  return s;
}

/* ============ 8 · SECTOR DIVIDER ============ */
pages.push(divider('05', 'Sector sizing: <span class="accent">assembly, test &amp; packaging</span>', 'Malaysia’s ~13% share of global ATP is the headline asset. The 2023–24 trough is behind it; the question for 2027 is how much of the recovering value pool migrates from commodity wirebond to advanced packaging and high-value test.', ['ATP share', 'Value pool', 'Recovery shape']));

/* ============ 9 · SECTOR SIZING ============ */
pages.push(page(`${header('Section 05 · Sector sizing', pn(9))}
    <h1 class="page-h1">Market size &amp; growth: Malaysia back-end semiconductor</h1>
    <p class="page-subhead">A recovering global market lifts a base anchored in assembly and test. Worldwide chip sales of ~USD 630 bn in 2024 head toward ~USD 976 bn in 2026 [WSTS]; Malaysia’s back-end share rides that curve.</p>
    <div style="display:grid; grid-template-columns:1fr 1.1fr; gap:32px; flex:1;">
      <div>
        <div style="margin-bottom:14px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">A ~13% back-end position</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Malaysia handles roughly 13% of global assembly, test and packaging [MIDA]. Against a global OSAT pool of ~USD 45–50 bn in 2024 [Kira estimates], that share frames a multi-billion-dollar domestic value pool before counting in-house IDM back-end.</p></div>
        <div style="margin-bottom:14px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Out of the trough</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Consumer-electronics weakness cut OSAT utilisation in 2023–24. Inventory normalisation, AI accelerators, and rising automotive content have turned utilisation up through 2025 [Kira estimates], setting a firmer 2027 base.</p></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">China-plus-one tailwind</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Supply-chain diversification is steering new ATP investment toward Malaysia [MIDA], adding structural demand on top of the cyclical recovery.</p></div>
      </div>
      <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:18px;">
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:2px;">Malaysia E&amp;E exports</div>
        <div class="mono" style="font-size:10px; color:var(--muted); margin-bottom:12px;">RM BN · 2022–2027F</div>
        ${barChart([['2022',593,'#1E6FFF',false],['2023',575,'#1E6FFF',false],['2024',601,'#1E6FFF',false],['2027F',720,'#D97706',true]], 760, 'RM BN')}
        <div class="mono" style="font-size:9px; color:var(--muted); margin-top:8px;">SOURCE: MATRADE; 2027F KIRA EST. · KIRA RESEARCH 2027</div>
      </div>
    </div>
${sourceKey('MIDA = Malaysian Investment Development Authority · MATRADE = Malaysia External Trade Development Corp · WSTS = World Semiconductor Trade Statistics · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

/* ============ 10 · SEGMENT ECONOMICS ============ */
pages.push(page(`${header('Section 06 · Segment economics', pn(10))}
    <h1 class="page-h1">Segment economics: where the margin sits</h1>
    <p class="page-subhead">The back-end value chain splits into commodity assembly, high-value test, and the fast-growing advanced-packaging tier. Margin and growth concentrate at the top of that stack.</p>
    <div style="display:grid; grid-template-columns:1.05fr 1fr; gap:30px; flex:1;">
      <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:18px;">
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:2px;">Indicative segment margin profile</div>
        <div class="mono" style="font-size:10px; color:var(--muted); margin-bottom:14px;">GROSS MARGIN BAND % · KIRA EST.</div>
        ${hbar([['Advanced packaging',32,'#1E6FFF'],['Final & system test',28,'#1E6FFF'],['Wafer-level / bumping',24,'#4A5568'],['Standard wirebond assembly',15,'#4A5568']],40)}
        <div class="mono" style="font-size:9px; color:var(--muted); margin-top:10px;">SOURCE: OPERATOR FILINGS, CHANNEL CHECKS · KIRA RESEARCH 2027</div>
      </div>
      <div>
        <div style="margin-bottom:13px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Advanced packaging — the growth tier</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">2.5D/3D integration, fan-out and SiP carry the highest margins and the strongest demand, pulled by AI/HPC and HBM stacking [Kira estimates]. This is the slice the corridor must over-index toward in 2027.</p></div>
        <div style="margin-bottom:13px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Test — the underrated margin pool</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">AI and automotive devices need longer, more complex test, and system-level test adoption is rising for high-value parts [Kira estimates]. Test capacity scales margin without wafer-fab capital intensity.</p></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Standard assembly — commoditising</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Wirebond and leadframe work remains the volume base but faces price pressure [Kira estimates]. Defensible only on scale, automation, and proximity to test.</p></div>
      </div>
    </div>
${sourceKey('Margin bands are KIRA estimates triangulated from listed OSAT filings and corridor channel checks · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

function hbar(rows, max, unit) {
  unit = (unit===undefined) ? "%" : unit;
  const W=460, rowH=42, top=8;
  let s=`<svg viewBox="0 0 ${W} ${rows.length*rowH+top}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g class="mono">`;
  rows.forEach((r,i)=>{const [label,val,color]=r; const y=top+i*rowH; const bw=Math.round((val/max)*(W-150));
    s+=`\n<text x="0" y="${y+16}" font-size="11" fill="#0B0D10" font-weight="500">${label}</text>`;
    s+=`\n<rect x="0" y="${y+22}" width="${bw}" height="12" fill="${color}" rx="2"/>`;
    s+=`\n<text x="${bw+8}" y="${y+32}" font-size="10" font-weight="700" fill="${color}">${val}${unit}</text>`;
  });
  s+=`\n</g></svg>`;
  return s;
}

/* ============ 11 · COMPETITIVE DIVIDER ============ */
pages.push(divider('07', 'Competitive landscape', 'Two tiers share the corridor: home-listed OSATs and the multinational IDMs that anchor the cluster. The 2027 contest is for advanced-packaging mandates and the engineers to run them — not for commodity volume.', ['Listed OSATs', 'IDM anchors', 'Mandate race']));

/* ============ 12 · COMPETITIVE STRUCTURE ============ */
pages.push(page(`${header('Section 07 · Competitive landscape', pn(12))}
    <h1 class="page-h1">Market structure: a two-tier corridor</h1>
    <p class="page-subhead">Home-listed OSATs supply specialised packaging and test at scale; multinational IDMs and global OSATs anchor the cluster with the largest capex. Concentration is moderate and contested at the high-value tier.</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:22px; margin-bottom:16px;">
      <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:16px;">
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:2px;">Anchor commitments in the corridor</div>
        <div class="mono" style="font-size:10px; color:var(--muted); margin-bottom:12px;">SELECTED INVESTMENT, USD BN · RECENT</div>
        ${hbar([['Intel · 3D packaging, Penang',7.0,'#1E6FFF'],['Infineon · SiC fab, Kulim',5.0,'#1E6FFF'],['Texas Instruments · assembly/test',3.1,'#4A5568']],8,' bn')}
        <div class="mono" style="font-size:9px; color:var(--muted); margin-top:10px;">SOURCE: MIDA, COMPANY ANNOUNCEMENTS · KIRA RESEARCH 2027</div>
      </div>
      <div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:8px;">Structural read</div>
        <p style="font-size:12px; color:var(--text-mid); line-height:1.55; margin-bottom:10px;">The cluster pairs <strong>home OSATs</strong> (Inari, Unisem, MPI, Globetronics) with <strong>IDM anchors</strong> (Intel, Infineon, Texas Instruments, Micron) and global OSATs (ASE, Amkor) operating Malaysian sites [MIDA].</p>
        <div class="mono" style="font-size:11px; color:var(--text-mid); line-height:1.9;">
          · ~13% of global ATP handled in Malaysia [MIDA]<br>
          · ~7% of world chip trade routed through [MIDA]<br>
          · China-plus-one steering new mandates in [MIDA]<br>
          · High-value tier contested, not consolidated [Kira est.]
        </div>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px;">
      ${[['01','Inari Amertron','RF / optoelectronics packaging','FY24 rev ~RM1.4–1.5 bn [Inari AR]'],
          ['02','Unisem','Wafer bumping, flip-chip, test','2024 rev ~RM1.5 bn [Unisem AR]'],
          ['03','Intel Malaysia','3D advanced packaging anchor','~USD 7 bn Penang [MIDA]'],
          ['04','Infineon Kulim','SiC power-device fab','Up to ~EUR 5 bn [Infineon]']].map(c=>
      `<div style="background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:12px;">
        <div class="mono" style="font-size:9px; color:var(--primary); font-weight:600; margin-bottom:6px;">PLAYER ${c[0]}</div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:4px; line-height:1.15;">${c[1]}</div>
        <div style="font-size:10.5px; color:var(--text-mid); line-height:1.4; margin-bottom:6px;">${c[2]}</div>
        <div class="mono" style="font-size:9px; color:var(--muted);">${c[3]}</div>
      </div>`).join('\n      ')}
    </div>
${sourceKey('MIDA = Malaysian Investment Development Authority · Inari AR / Unisem AR = company annual reports · Infineon = company announcement · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

/* ============ 13 · PLAYER PROFILE 1 — Inari ============ */
function profile(num, name, subtitle, tags, stats, leftSecs, rightTitle, rightItems, srcKey) {
  return page(`${header('Section 07 · Player profiles', pn(num))}
    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:14px; border-bottom:2px solid var(--text); margin-bottom:16px;">
      <div>
        <h1 style="font-family:'Satoshi'; font-weight:900; font-size:30px; letter-spacing:-0.03em; margin-bottom:6px;">${name}</h1>
        <p style="font-size:13px; color:var(--text-mid);">${subtitle}</p>
        <div style="display:flex; gap:8px; margin-top:10px;">${tags.map(t=>`<span class="mono" style="font-size:9px; background:var(--primary-soft); color:var(--primary); padding:4px 9px; border-radius:3px; letter-spacing:0.05em; font-weight:600;">${t}</span>`).join('')}</div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(2,auto); gap:14px 26px; text-align:right;">
        ${stats.map(s=>`<div><div style="font-family:'Satoshi'; font-weight:900; font-size:22px; letter-spacing:-0.02em;">${s[1]}</div><div class="mono" style="font-size:9px; color:var(--muted); letter-spacing:0.08em; text-transform:uppercase;">${s[0]}</div></div>`).join('')}
      </div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:32px; flex:1;">
      <div>${leftSecs.map(s=>`<div style="margin-bottom:14px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">${s[0]}</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">${s[1]}</p></div>`).join('')}</div>
      <div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:10px;">${rightTitle}</div>
        <div style="font-size:12px; color:var(--text-mid); line-height:1.5;">${rightItems.map(it=>`<div style="display:flex; gap:8px; margin-bottom:9px;"><span style="color:var(--primary); font-weight:700;">→</span><span>${it}</span></div>`).join('')}</div>
      </div>
    </div>
${sourceKey(srcKey)}
${footer()}`);
}

pages.push(profile(13, 'Inari Amertron',
  'Malaysia’s largest listed OSAT by market value — RF, optoelectronics and photonics packaging.',
  ['RF PACKAGING','OPTOELECTRONICS','SiP'],
  [['FY24 revenue','~RM1.4bn'],['Listing','Bursa'],['Lead customer','RF filters'],['Expansion','SiP / China']],
  [['Position','Inari is the corridor’s flagship home OSAT, specialising in RF front-end modules and optoelectronics, with FY2024 revenue around RM1.4–1.5 bn [Inari AR]. Its scale in radio-frequency packaging is the strongest home-grown high-value position in Malaysia.'],
   ['Customer concentration','A single dominant client — supplying RF filters that ultimately feed flagship smartphones — drives the bulk of revenue [Kira estimates]. Concentration is both the growth engine and the principal risk.']],
  'Strategic implications',
  ['Diversify the customer base while RF demand is strong, ahead of any smartphone-cycle softness [Kira estimates].',
   'Scale system-in-package and advanced capacity to ride AI/HPC content growth [Kira estimates].',
   'Use the Yiwu (China) footprint as a China-plus-one hedge, not a margin drag [Kira estimates].'],
  'SOURCE KEY · Inari AR = Inari Amertron annual report FY2024 · Kira estimates = KIRA in-house triangulation'));

/* ============ 14 · PLAYER PROFILE 2 — Unisem ============ */
pages.push(profile(14, 'Unisem',
  'Mixed-signal OSAT with wafer bumping, flip-chip and test — Ipoh plus a Chengdu footprint.',
  ['WAFER BUMPING','FLIP-CHIP','TEST'],
  [['2024 revenue','~RM1.5bn'],['Sites','Ipoh · Chengdu'],['Strength','Bumping / FC'],['Owner link','China JV']],
  [['Position','Unisem offers wafer bumping, flip-chip and leadframe packaging plus test across Ipoh and Chengdu, with 2024 revenue near RM1.5 bn [Unisem AR]. Its bumping and flip-chip lines sit closer to the advanced-packaging tier than commodity wirebond.'],
   ['Cycle exposure','Margins were pressured through the 2023–24 demand trough [Unisem AR]; utilisation recovery in 2025 is the swing factor on profitability into 2027 [Kira estimates].']],
  'Strategic implications',
  ['Lean into flip-chip and bumping capacity as the on-ramp to advanced packaging mandates [Kira estimates].',
   'Balance the Malaysia–China footprint against supply-chain-diversification demand [Kira estimates].',
   'Convert recovering utilisation into margin via mix shift toward test and higher-value packages [Kira estimates].'],
  'SOURCE KEY · Unisem AR = Unisem (M) Berhad annual report 2024 · Kira estimates = KIRA in-house triangulation'));

/* ============ 15 · PLAYER PROFILE 3 — Intel/IDM anchor ============ */
pages.push(profile(15, 'IDM anchors',
  'Multinational integrated device makers that anchor the corridor with the largest single commitments.',
  ['ADV. PACKAGING','SiC FAB','ASSEMBLY/TEST'],
  [['Intel · Penang','~$7bn'],['Infineon · Kulim','~€5bn'],['TI · KL/Melaka','~$3.1bn'],['Role','Cluster anchor']],
  [['Intel — advanced packaging','Intel’s ~USD 7 bn Penang investment in 3D advanced packaging is the single largest signal that high-value back-end is migrating to Malaysia [MIDA]. It pulls suppliers, test capacity, and engineering talent into the corridor.'],
   ['Infineon & TI — breadth','Infineon is building a large 200mm silicon-carbide power fab in Kulim (up to ~EUR 5 bn) [Infineon], while Texas Instruments is adding ~USD 3.1 bn of assembly and test [MIDA] — broadening the cluster beyond logic into power and automotive.']],
  'Strategic implications for the ecosystem',
  ['Home OSATs and vendors should position as second-source and overflow partners to anchor IDMs [Kira estimates].',
   'Kulim’s SiC fab seeds a wafer-fab counterpart to Penang’s packaging strength [MIDA].',
   'Anchor capex compounds the talent constraint — ecosystem hiring must scale in lockstep [Kira estimates].'],
  'SOURCE KEY · MIDA = Malaysian Investment Development Authority · Infineon = company announcement · Kira estimates = KIRA in-house triangulation'));

/* ============ 16 · DEMAND & INVESTMENT DIVIDER ============ */
pages.push(divider('08', 'Demand &amp; investment: <span class="accent">the corridor pipeline</span>', 'Record approved investment is concentrating in the northern corridor. Penang leads on packaging and test; Kulim adds wafer-fab capacity. The pipeline is real — <strong>delivery hinges on power, land, and engineers.</strong>', ['FDI pipeline', 'Penang + Kulim', 'Build constraints']));

/* ============ 17 · DEMAND / INVESTMENT PAGE ============ */
pages.push(page(`${header('Section 08 · Demand & investment', pn(17))}
    <h1 class="page-h1">Investment pipeline &amp; the northern corridor</h1>
    <p class="page-subhead">The bet is geographically concentrated. Penang attracted record approved manufacturing investment in recent years, while Kulim emerges as the wafer-fab counterpart — forming a single northern semiconductor corridor.</p>
    <div style="display:grid; grid-template-columns:1.05fr 1fr; gap:30px; flex:1;">
      <div>
        <div style="margin-bottom:13px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Penang — the packaging &amp; test core</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Penang drew record approved manufacturing investment (on the order of ~RM60 bn in a peak year) led by semiconductor and E&amp;E [MIDA], and hosts the bulk of Malaysia’s back-end activity — including Intel’s 3D packaging build.</p></div>
        <div style="margin-bottom:13px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Kulim — the wafer-fab counterpart</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Kulim Hi-Tech Park in Kedah is emerging as a fab hub alongside Penang, anchored by Infineon’s SiC power-device fab [Infineon] — extending the corridor from back-end toward front-end.</p></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Delivery constraints</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Power supply, industrial land, and — above all — skilled engineers are the binding constraints on converting the pipeline into output [Kira estimates].</p></div>
      </div>
      <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:18px;">
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:2px;">Corridor anchor map</div>
        <div class="mono" style="font-size:10px; color:var(--muted); margin-bottom:14px;">SELECTED COMMITMENTS BY NODE</div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${[['Penang','Intel 3D packaging · Bosch test · home OSATs','#1E6FFF'],
              ['Kulim (Kedah)','Infineon SiC power fab','#1E6FFF'],
              ['Kuala Lumpur / Melaka','Texas Instruments assembly & test','#4A5568'],
              ['Ipoh (Perak)','Unisem bumping / flip-chip / test','#4A5568']].map(r=>
          `<div style="display:flex; gap:12px; align-items:flex-start; padding:10px 12px; background:var(--bg); border:1px solid var(--border); border-radius:6px;">
            <span style="width:8px; height:8px; border-radius:50%; background:${r[2]}; margin-top:5px; flex-shrink:0;"></span>
            <div><div style="font-family:'Satoshi'; font-weight:700; font-size:12.5px;">${r[0]}</div><div style="font-size:11px; color:var(--text-mid); line-height:1.4;">${r[1]}</div></div>
          </div>`).join('\n          ')}
        </div>
        <div class="mono" style="font-size:9px; color:var(--muted); margin-top:12px;">SOURCE: MIDA, COMPANY ANNOUNCEMENTS · KIRA RESEARCH 2027</div>
      </div>
    </div>
${sourceKey('MIDA = Malaysian Investment Development Authority · Infineon = company announcement · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

/* ============ 18 · POLICY DIVIDER ============ */
pages.push(divider('09', 'Policy landscape: <span class="accent">the National Semiconductor Strategy</span>', 'Launched in 2024, the NSS is the policy spine of the 2027 outlook: at least RM500 bn of targeted investment, RM25 bn of fiscal support, and an explicit climb from back-end toward design and front-end.', ['RM500 bn target', 'Three phases', 'Talent build']));

/* ============ 19 · POLICY PAGE ============ */
pages.push(page(`${header('Section 09 · Policy landscape', pn(19))}
    <h1 class="page-h1">Regulatory &amp; policy: the NSS frame</h1>
    <p class="page-subhead">The National Semiconductor Strategy sets the direction of travel — up the value chain — and front-loads incentives. The 2027 task is to bank the support while building cost competitiveness that survives the taper.</p>
    <div style="display:grid; grid-template-columns:1fr 1.1fr; gap:30px; flex:1;">
      <div>
        <div style="margin-bottom:13px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Scale of ambition</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">The NSS targets at least RM500 bn (~USD 107 bn) of investment, with at least RM25 bn of fiscal support over 5–10 years and a goal of 10 local champions in design and advanced packaging [NSS].</p></div>
        <div style="margin-bottom:13px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Phased value climb</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">Phase 1 prioritises advanced packaging and design; Phase 2 moves toward advanced logic and front-end; Phase 3 targets global leadership [NSS] — a deliberate path off commodity assembly.</p></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:4px;">Talent at the core</div><p style="font-size:12px; color:var(--text-mid); line-height:1.55;">The strategy commits to train and upskill 60,000 high-skilled engineers [NSS] — the policy’s most important and hardest-to-hit target.</p></div>
      </div>
      <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:18px;">
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:14px;">NSS in three phases</div>
        <div style="position:relative; padding-left:22px;">
          <div style="position:absolute; left:5px; top:6px; bottom:6px; width:2px; background:var(--border-strong);"></div>
          ${[['PHASE 1','Advanced packaging &amp; design','Build on the back-end base; seed design houses and advanced packaging mandates.'],
              ['PHASE 2','Advanced logic &amp; front-end','Move up into higher-value logic and wafer-fab capability.'],
              ['PHASE 3','Global leadership','Establish local champions competing at the global frontier.']].map(p=>
          `<div style="position:relative; margin-bottom:16px;">
            <span style="position:absolute; left:-22px; top:3px; width:11px; height:11px; border-radius:50%; background:var(--primary); border:2px solid var(--bg-soft);"></span>
            <div class="mono" style="font-size:9px; color:var(--primary); font-weight:600; letter-spacing:0.1em; margin-bottom:2px;">${p[0]}</div>
            <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:3px;">${p[1]}</div>
            <div style="font-size:11px; color:var(--text-mid); line-height:1.45;">${p[2]}</div>
          </div>`).join('\n          ')}
        </div>
        <div class="mono" style="font-size:9px; color:var(--muted); margin-top:4px;">SOURCE: NSS 2024 · KIRA RESEARCH 2027</div>
      </div>
    </div>
${sourceKey('NSS = National Semiconductor Strategy, launched 2024 · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

/* ============ 20 · AI DIVIDER ============ */
pages.push(divider('10', 'AI impact on <span class="accent">advanced packaging &amp; test</span>', 'AI is not a sub-theme here — it is the demand driver. HBM stacking and accelerator logic are pulling the advanced-packaging market from ~USD 38–44 bn toward USD 65–80 bn by 2030, and lengthening test on every high-value device.', ['HBM & 2.5D/3D', 'Test complexity', 'Capacity bet']));

/* ============ 21 · AI OVERVIEW ============ */
pages.push(page(`${header('Section 10 · AI impact', pn(21))}
    <h1 class="page-h1">AI in Malaysian back-end: sizing &amp; use cases</h1>
    <p class="page-subhead">AI accelerators and high-bandwidth memory are the structural pull behind advanced packaging and longer test — the exact tiers where the corridor can capture margin in 2027.</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-bottom:16px;">
      <div>
        <div style="margin-bottom:12px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:13.5px; margin-bottom:3px;">Advanced packaging demand</div><p style="font-size:11.5px; color:var(--text-mid); line-height:1.5;">Heterogeneous integration is replacing monolithic scaling as Moore’s Law slows; AI/HPC is the largest pull [Kira estimates].</p></div>
        <div style="margin-bottom:12px;"><div style="font-family:'Satoshi'; font-weight:700; font-size:13.5px; margin-bottom:3px;">HBM stacking</div><p style="font-size:11.5px; color:var(--text-mid); line-height:1.5;">High-bandwidth memory stacks lift packaging value per device sharply [Kira estimates].</p></div>
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:13.5px; margin-bottom:3px;">Test lengthening</div><p style="font-size:11.5px; color:var(--text-mid); line-height:1.5;">AI chips need longer, more complex test; system-level test adoption rises for high-value parts [Kira estimates].</p></div>
      </div>
      <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:16px;">
        <div style="font-family:'Satoshi'; font-weight:700; font-size:13px; margin-bottom:2px;">Global advanced-packaging market</div>
        <div class="mono" style="font-size:10px; color:var(--muted); margin-bottom:12px;">USD BN · 2024 → 2030F</div>
        ${barChart([['2024',41,'#1E6FFF',false],['2030F',72,'#D97706',true]], 80, 'USD BN')}
        <div class="mono" style="font-size:9px; color:var(--muted); margin-top:8px;">SOURCE: INDUSTRY TRIANGULATION; ~9–11% CAGR · KIRA RESEARCH 2027</div>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px;">
      ${[['HIGH IMPACT','HBM & 2.5D/3D lines','Place capacity for memory stacking and interposer integration — the steepest value-per-device tier.'],
          ['HIGH IMPACT','Advanced test (ATE / SLT)','Add test capacity for AI/HPC devices where test time and cost per device are rising.'],
          ['MEDIUM','Fan-out & SiP','Scale fan-out wafer-level and system-in-package for compact, high-performance modules.'],
          ['MEDIUM','Power & SiC packaging','Capture automotive/power demand via SiC device packaging out of the Kulim fab base.'],
          ['ENABLER','Yield & inspection analytics','Use data-driven yield and defect analytics to lift advanced-package first-pass yield.'],
          ['ENABLER','Engineering throughput','Apply design-for-test and automation to stretch scarce engineering headcount.']].map(c=>
      `<div style="background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:12px;">
        <div class="mono" style="font-size:8.5px; color:var(--primary); font-weight:600; letter-spacing:0.1em; margin-bottom:5px;">${c[0]}</div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:12.5px; margin-bottom:4px; line-height:1.15;">${c[1]}</div>
        <div style="font-size:10.5px; color:var(--text-mid); line-height:1.4;">${c[2]}</div>
      </div>`).join('\n      ')}
    </div>
${sourceKey('Advanced-packaging sizing is KIRA triangulation of industry sources (~USD 38–44 bn 2024 → USD 65–80 bn 2030, ~9–11% CAGR) · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

/* ============ 22 · FORECAST ============ */
pages.push(page(`${header('Section 11 · Five-year outlook', pn(22))}
    <h1 class="page-h1">Five-year outlook &amp; forecast to 2030</h1>
    <p class="page-subhead">A recovering global market, AI-led advanced-packaging demand, and China-plus-one investment set a constructive base case — gated by talent and execution.</p>
    <div style="background:var(--bg-soft); border:1px solid var(--border); border-radius:8px; padding:18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
        <div><div style="font-family:'Satoshi'; font-weight:700; font-size:13px;">Malaysia E&amp;E exports — base-case path</div><div class="mono" style="font-size:10px; color:var(--muted);">RM BN · ACTUAL → FORECAST</div></div>
        <div class="mono" style="font-size:10px; color:var(--primary); font-weight:600;">~+5–7% CAGR [Kira est.]</div>
      </div>
      ${barChart([['2023',575,'#4A5568',false],['2024',601,'#4A5568',false],['2025F',650,'#1E6FFF',false],['2027F',720,'#1E6FFF',false],['2030F',840,'#D97706',true]], 880, 'RM BN')}
      <div class="mono" style="font-size:9px; color:var(--muted); margin-top:8px;">SOURCE: MATRADE (ACTUALS); 2025F–2030F KIRA ESTIMATES · KIRA RESEARCH 2027</div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:14px;">
      ${[['BEAR','Cycle stalls','Renewed consumer-electronics weakness and a talent crunch cap utilisation; growth slips toward the low single digits [Kira estimates].'],
          ['BASE','Steady value climb','AI-led packaging demand and China-plus-one investment hold ~5–7% export CAGR with mix shifting toward advanced packaging [Kira estimates].'],
          ['BULL','Advanced-packaging breakout','NSS execution lands multiple advanced-packaging mandates and the engineer build hits target, pushing growth above the base path [Kira estimates].']].map((c,i)=>
      `<div style="background:var(--bg); border:1px solid var(--border); border-top:3px solid ${i===1?'var(--primary)':'var(--border-strong)'}; border-radius:6px; padding:14px;">
        <div class="mono" style="font-size:9px; color:${i===1?'var(--primary)':'var(--muted)'}; font-weight:600; letter-spacing:0.12em; margin-bottom:6px;">${c[0]}</div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:6px;">${c[1]}</div>
        <p style="font-size:11px; color:var(--text-mid); line-height:1.5;">${c[2]}</p>
      </div>`).join('\n      ')}
    </div>
${sourceKey('MATRADE = Malaysia External Trade Development Corp (actuals) · Forecast bands and CAGR are KIRA estimates anchored to WSTS global trajectory and corridor pipeline · Kira estimates = KIRA in-house triangulation')}
${footer()}`));

/* ============ 23 · METHODOLOGY ENDNOTE ============ */
pages.push(page(`${header('Methodology endnote', pn(23))}
    <h1 class="page-h1">Methodology endnote &amp; source mix</h1>
    <p class="page-subhead">This view triangulates two evidence streams. Where a figure carries a named source tag, the underlying data comes from that source. Where a figure carries [Kira estimates], KIRA analysts derived it from a blend of disclosed inputs.</p>
    <div style="display:grid; grid-template-columns:1.1fr 1fr; gap:32px; flex:1;">
      <div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:8px;">How to read the tags</div>
        <p style="font-size:12px; color:var(--text-mid); line-height:1.6; margin-bottom:14px;">Named tags (e.g. [MIDA], [MATRADE], [WSTS], [NSS]) point to a specific external source listed below. [Kira estimates] marks figures our analysts triangulated from filings, trade data, and corridor channel checks using the method disclosed in the relevant section. Roughly <strong>55%</strong> of quantitative claims here are externally cited and <strong>45%</strong> are KIRA-derived [Kira estimates].</p>
        <div style="display:flex; gap:10px; margin-bottom:14px;">
          ${dataTag('secondary','~55% cited')} ${dataTag('estimate','~45% Kira est.')}
        </div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:6px;">Disclosure</div>
        <p style="font-size:10.5px; color:var(--muted); line-height:1.5; border-top:1px solid var(--border); padding-top:10px;">This report is provided for information only and does not constitute investment, legal, or commercial advice. Forecasts are estimates subject to revision as conditions change. © KIRA Research 2027.</p>
      </div>
      <div>
        <div style="font-family:'Satoshi'; font-weight:700; font-size:14px; margin-bottom:10px;">Source list</div>
        <div class="mono" style="font-size:10.5px; color:var(--text-mid); line-height:1.85;">
          ${[['MIDA','Malaysian Investment Development Authority — ATP share, investment data'],
              ['MATRADE','Malaysia External Trade Development Corp — E&amp;E export values'],
              ['DOSM','Department of Statistics Malaysia — macro indicators'],
              ['BNM','Bank Negara Malaysia — GDP, FX guidance'],
              ['NSS','National Semiconductor Strategy 2024 — targets, phases'],
              ['WSTS','World Semiconductor Trade Statistics — global chip sales'],
              ['SIA','Semiconductor Industry Association — global sales'],
              ['Inari AR','Inari Amertron annual report FY2024'],
              ['Unisem AR','Unisem (M) Berhad annual report 2024'],
              ['Infineon','Infineon Technologies — Kulim SiC fab announcement']].map(s=>
          `<div style="display:flex; gap:8px; padding:3px 0; border-bottom:1px solid var(--border);"><span style="color:var(--primary); font-weight:600; min-width:74px;">${s[0]}</span><span>${s[1]}</span></div>`).join('\n          ')}
        </div>
      </div>
    </div>
${footer()}`));

// ---- assemble ----
const REPORT_TITLE = 'Malaysia semiconductor 2027 outlook — KIRA Research';
const META = 'Malaysia’s back-end semiconductor base — assembly, test and advanced packaging — moves up the value chain for the AI-chip cycle through 2027. KIRA Research market analysis.';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1280, initial-scale=1.0">
<title>${REPORT_TITLE}</title>
<meta name="description" content="${META}">
<meta property="og:title" content="${REPORT_TITLE}">
<meta property="og:description" content="Malaysia semiconductor market analysis 2027 — back-end sizing, OSAT landscape, advanced packaging, AI impact, forecast.">
<meta property="og:type" content="article">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap">
<style>
${CSS}
</style>
</head>
<body>

${pages.join('\n\n')}

</body>
</html>`;

const out = path.join(HERE, 'en.html');
fs.writeFileSync(out, html);
const pageCount = (html.match(/<div class="page(?=["\s])(?:[^"]*)?"/g) || []).length;
console.log('wrote', out, '·', fs.statSync(out).size, 'bytes ·', pageCount, 'pages');
