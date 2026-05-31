#!/usr/bin/env node
// Build script for 2026-my-construction — assembles KIRA market_analysis report.
// Sequential section composition + pre-render validation gate.
import fs from 'node:fs';
import path from 'node:path';

const SKILL = '/home/user/kira-research/skills/kira-research-report';
const OUT_DIR = path.join(SKILL, 'outputs/batch/2026-my-construction');
const css = fs.readFileSync(path.join(SKILL, 'templates/master_styles.css'), 'utf8');
const wrapper = fs.readFileSync(path.join(SKILL, 'templates/master_wrapper.html'), 'utf8');

const FOOTER = 'Malaysia · Construction · 2026 · KR-MYS-CONS-2026-001';

// ---- SECTION PLAN (validation gate source of truth) ----
const section_plan = [
  '01_cover', '02_methodology_inline', '03_toc',
  '04_exec_summary_p1', '04_exec_summary_p2',
  '05_macro_divider', '06_macro_pages_1', '06_macro_pages_2',
  '07_sector_divider', '08_sector_sizing_1', '09_segments',
  '10_competitive_divider', '11_competitive_structure',
  '12_player_gamuda', '12_player_sunway', '12_player_ijm',
  '13_demand_divider', '14_demand_data_center', '15_regulatory',
  '16_ai_divider', '17_ai_overview', '18_forecast_outlook',
  '19_methodology_endnote',
];

const generated_sections = {}; // id -> html string

function srcKey(s) { return `<div class="source-key">${s}</div>`; }

// helper for chart frame
function chartCard(title, subtitle, unit, svg, source) {
  return `<div class="exec-chart">
    <div class="chart-header"><div><div class="chart-title">${title}</div><div class="chart-subtitle">${subtitle}</div></div><div class="chart-unit">${unit}</div></div>
    <div class="chart-body-flex">${svg}</div>
    <div class="chart-source">${source}</div>
  </div>`;
}
function pageFooter() {
  return `<div class="page-footer"><div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div><div>${FOOTER}</div></div>`;
}

// =================== 01 COVER ===================
generated_sections['01_cover'] = `<div class="page cover">
  <div class="cover-grid"></div>
  <div class="cover-content"><div class="page-inner">
    <div class="cover-top"><span style="font-family:'Satoshi',sans-serif;font-weight:900;font-size:28px;">KIRA<span style="color:var(--primary);">.</span></span><span style="font-family:'Satoshi',sans-serif;font-weight:500;font-size:12px;letter-spacing:0.32em;color:var(--primary);text-transform:uppercase;">RESEARCH</span></div>
    <div class="cover-main">
      <div class="cover-eyebrow">Malaysia · Construction · 2026</div>
      <h1>Malaysia construction<br>at a <span class="accent">data-centre inflection</span></h1>
      <p class="cover-subtitle">The data-centre build-out and the Johor-Singapore Special Economic Zone are re-pricing a MYR 70 billion market — where the next cycle of demand, margin and risk sits.</p>
    </div>
    <div>
      <div class="cover-meta-grid">
        <div class="cover-meta-item"><div class="label">Country</div><div class="val">Malaysia</div></div>
        <div class="cover-meta-item"><div class="label">Sector</div><div class="val">Construction</div></div>
        <div class="cover-meta-item"><div class="label">Published</div><div class="val">May 2026</div></div>
        <div class="cover-meta-item"><div class="label">Report ID</div><div class="val"><span class="accent">KR-MYS-CONS-2026-001</span></div></div>
      </div>
      <div class="cover-confidential" style="margin-top:16px;"><strong>CONFIDENTIAL</strong> · Single-user license · © 2026 KIRA Research</div>
    </div>
  </div></div>
</div>`;

// =================== 02 METHODOLOGY INLINE ===================
generated_sections['02_methodology_inline'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 02 · Methodology</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">How we built this view</h1>
  <p class="page-subhead">This view is built from two evidence streams: <strong>primary inputs</strong> — contractor channel checks, project-pipeline tracking, and analyst synthesis — and <strong>secondary anchors</strong> — statistical authorities, listed-contractor filings, and triangulated estimates. Every quantitative claim carries an explicit source tag.</p>
  <div class="exec-body" style="grid-template-columns:1fr 1fr;gap:40px;">
    <div>
      <h3 style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--primary);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);font-weight:600;">Primary inputs</h3>
      ${[['Pipeline & tender tracking','Project-by-project tracking of awarded and tendered data-centre, SEZ and transport contracts — surfaces real order books, real award timing, real workloads.'],['Analyst synthesis','KIRA in-house triangulation across multiple disclosed inputs. Tagged inline as [Kira estimates].'],['Operator & specialist reads','Conversations with civil contractors, MEP specialists and developers closer to the demand signal than headline output data.']].map(([l,d])=>`<div style="margin-bottom:14px;padding-left:20px;position:relative;"><div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:3px;">→ ${l}</div><div style="font-size:12px;color:var(--text-mid);line-height:1.55;">${d}</div></div>`).join('')}
    </div>
    <div>
      <h3 style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--primary);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);font-weight:600;">Secondary anchors</h3>
      ${[['Statistical authorities','Department of Statistics Malaysia, CIDB, Bank Negara, IMF and World Bank — cited inline by named source.'],['Listed-contractor filings','Annual reports, quarterly results and order-book disclosures of named players — cited inline by company plus period.'],['Triangulated estimates','Where no single source covers a figure, we combine two to three inputs and disclose the method. Tagged [Kira estimates].']].map(([l,d])=>`<div style="margin-bottom:14px;padding-left:20px;position:relative;"><div style="font-weight:700;font-size:13px;color:var(--text);margin-bottom:3px;">→ ${l}</div><div style="font-size:12px;color:var(--text-mid);line-height:1.55;">${d}</div></div>`).join('')}
    </div>
  </div>
  ${pageFooter()}
</div></div>`;

// =================== 03 TOC ===================
const tocRows = [
  ['03','Executive summary','Market at a data-centre inflection','004'],
  ['04','Macro context','GDP, Budget 2026 and the 13MP pipeline','006'],
  ['05','Sector overview & sizing','MYR 70bn market, segment split','009'],
  ['06','Segment economics','Residential, non-residential, civil','011'],
  ['07','Competitive landscape','Structure and leading contractors','012'],
  ['08','Demand drivers','Data-centre pipeline & JS-SEZ','017'],
  ['09','Regulatory & policy','IBS mandate, green DC guidelines','019'],
  ['10','AI impact','AI in design, delivery and the DC build','021'],
  ['11','5-year outlook','Forecast to 2030 & scenarios','022'],
  ['12','Methodology endnote','Source mix & citations','023'],
];
generated_sections['03_toc'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 03 · Table of Contents</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Contents</h1>
  <div style="flex:1;display:flex;flex-direction:column;gap:4px;min-height:0;overflow:hidden;">
    ${tocRows.map(([n,t,s,p])=>`<div style="display:grid;grid-template-columns:60px 1fr 80px;gap:16px;padding:11px 0;border-bottom:1px solid var(--border);align-items:center;"><div class="mono" style="font-size:11px;color:var(--primary);font-weight:700;letter-spacing:0.1em;">${n}</div><div><div style="font-family:'Satoshi',sans-serif;font-weight:700;font-size:14px;color:var(--text);margin-bottom:2px;">${t}</div><div style="font-size:11px;color:var(--text-mid);">${s}</div></div><div class="mono" style="font-size:11px;color:var(--muted);text-align:right;letter-spacing:0.05em;">PG ${p}</div></div>`).join('')}
  </div>
  ${pageFooter()}
</div></div>`;

// =================== 04 EXEC SUMMARY P1 ===================
const execChartSvg = `<svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet">
  <line x1="40" y1="200" x2="350" y2="200" class="axis-line"/>
  ${[['2024',58.8,'#9CA3AF'],['2025',66.3,'var(--primary)'],['2026',70.4,'var(--primary)']].map((d,i)=>{
    const x=70+i*95; const h=(d[1]/72)*160; const y=200-h;
    return `<rect x="${x}" y="${y}" width="58" height="${h}" fill="${d[2]}" rx="2"/><text x="${x+29}" y="${y-8}" text-anchor="middle" class="label-data">${d[1]}</text><text x="${x+29}" y="216" text-anchor="middle" class="axis-text">${d[0]}</text>`;
  }).join('')}
  <text x="40" y="30" class="label-small">MYR bn, construction work done</text>
</svg>`;
generated_sections['04_exec_summary_p1'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 03 · Executive Summary</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Malaysia's construction market — 2026 inflection</h1>
  <p class="page-subhead">A market that grew double-digit in 2025 normalises in 2026, but a structural <strong>data-centre and SEZ build-out</strong> re-anchors demand toward high-value non-residential and civil work.</p>
  <div class="exec-callouts">
    <div class="callout"><div class="label">Market size 2026</div><div class="num">70.4<span class="unit">MYR bn</span></div><div class="change">+6.1% YoY</div><div class="source-tag sec">GlobalData 2026</div></div>
    <div class="callout"><div class="label">2021–25 CAGR</div><div class="num">10.5<span class="unit">%</span></div><div class="change">post-11.4% 2025</div><div class="source-tag sec">GlobalData 2026</div></div>
    <div class="callout"><div class="label">Top-5 contractor share</div><div class="num">&lt;33<span class="unit">%</span></div><div class="change down">fragmented field</div><div class="source-tag est">Kira est.</div></div>
    <div class="callout"><div class="label">JS-SEZ committed inv.</div><div class="num">68<span class="unit">MYR bn</span></div><div class="change">9M 2025 approvals</div><div class="source-tag sec">MIDA 2025</div></div>
  </div>
  <div class="exec-body">
    <div class="exec-narrative">
      <h3>From cyclical highs to structural demand</h3>
      <p>Construction work done reached MYR 66.3 bn in 2025 after expanding <strong>11.4% in real terms</strong> [GlobalData 2026], the strongest print in a decade. 2026 normalises to roughly <strong>6.1% growth toward MYR 70.4 bn</strong> [GlobalData 2026] — but the composition is shifting. Non-residential work grew 18.6% YoY in Q4 2025 [DOSM 2025], led by industrial and data-centre builds.</p>
      <h3>Data centres and Johor anchor the cycle</h3>
      <p>Hyperscaler commitments now exceed <strong>USD 12 bn</strong> across AWS, Microsoft and Google [Kira estimates], with Johor's pipeline at ~4.0 GW of power capacity, 700 MW already under construction [JLL 2025]. The Johor-Singapore SEZ drew <strong>MYR 68 bn</strong> of approved investment in 9M 2025 [MIDA 2025], converting cross-border ambition into civil and shell-and-core workloads.</p>
    </div>
    ${chartCard('Construction work done','Annual output, real terms','MYR bn',execChartSvg,'GlobalData 2026 · DOSM 2025')}
  </div>
  ${srcKey('GlobalData 2026 = GlobalData Malaysia Construction Industry Report 2026 · DOSM 2025 = Department of Statistics Malaysia, quarterly construction statistics · MIDA 2025 = Malaysian Investment Development Authority / Invest Johor 9M-2025 approvals · JLL 2025 = JLL Malaysia data-centre tracker Nov 2025 · Kira estimates = KIRA in-house analyst triangulation')}
  ${pageFooter()}
</div></div>`;

// =================== 04 EXEC SUMMARY P2 (implications) ===================
const imps = [
  ['IMP 01','Bid the data-centre shell-and-core wave','Four Selangor data-centre packages worth a combined <strong>MYR 10 bn</strong> [The Edge 2025] plus Johor hyperscale shells form the fastest-filling tender book. Contractors with MEP and fast-track delivery credentials win disproportionately.','MYR 10 bn Selangor DC tenders'],
  ['IMP 02','Anchor to the 13MP infrastructure spine','The 13th Malaysia Plan allocates <strong>MYR 430 bn</strong> of development expenditure for 2026–30 [EPU 2025], with rail, road and grid the highest-velocity segment at ~9.9% CAGR [Kira estimates]. This shelters civil order books from residential swings.','MYR 430 bn 13MP DE pool'],
  ['IMP 03','Industrialise to beat the labour gap','CIDB flags a ~180,000-worker skilled-trade shortfall through 2028 [CIDB 2025]. The 70% IBS public-project mandate makes prefabrication 15–20% cheaper on labour and ~20% faster [Kira estimates] — a margin and schedule edge, not a compliance cost.','180k worker shortfall'],
  ['IMP 04','Price the power and water constraint','Johor’s planned ~5,800 MW of data-centre capacity strains a gas-heavy grid [JLL 2025]; new sustainable-DC guidelines push PUE/WUE limits and reclaimed-water use [MITI 2024]. Power-ready land and on-site utilities become the binding scarce input.','~5,800 MW Johor DC plan'],
  ['IMP 05','Position for consolidation','The proposed Sunway–IJM combination would create a ~<strong>USD 3 bn revenue</strong> group overtaking Gamuda [Fortune 2026]. Mid-tier specialists should choose between scale partnerships or defensible niches in MEP, facade and retrofit.','USD 3 bn merged revenue'],
];
generated_sections['04_exec_summary_p2'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 03 · Executive Summary</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Five strategic implications</h1>
  <p class="page-subhead">Where market participants should concentrate capital, capability and risk attention over the 2026–2028 window.</p>
  <div class="imp-grid">
    ${imps.map(([n,t,b,a])=>`<div class="imp-card"><div class="num">${n}</div><div class="title">${t}</div><div class="body-text">${b}</div><div class="anchor"><span class="num-anchor">${a}</span></div></div>`).join('')}
  </div>
  ${pageFooter()}
</div></div>`;

// =================== 05 MACRO DIVIDER ===================
function divider(num, t1, t2, thesis, pills) {
  return `<div class="page divider-page"><div class="atmosphere"></div><div class="divider-content">
    <div class="divider-section-num">SECTION ${num}</div>
    <h1 class="divider-title">${t1} <span class="accent">${t2}</span></h1>
    <div class="divider-thesis">${thesis}</div>
    <div class="divider-mini-toc">${pills.map(p=>`<div class="toc-pill">${p}</div>`).join('')}</div>
  </div></div>`;
}
generated_sections['05_macro_divider'] = divider('04','Macro context:','Malaysia 2026','A <strong>5.2% 2025 print</strong> normalising to ~4.7% in 2026 sits on top of the largest development-expenditure pool in any Malaysia Plan — fiscal tailwind meets a private investment surge.',['GDP & inflation','Budget 2026','13MP pipeline']);

// =================== 06 MACRO PAGES 1 ===================
const macroTrendSvg = `<svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet">
  <line x1="40" y1="200" x2="350" y2="200" class="axis-line"/>
  ${[0,1,2,3].map(i=>`<line x1="40" y1="${200-i*45}" x2="350" y2="${200-i*45}" class="grid-line"/>`).join('')}
  ${(()=>{const gdp=[[ '2023',3.6],['2024',5.1],['2025',5.2],['2026',4.7]];const pts=gdp.map((d,i)=>`${50+i*95},${200-(d[1]/6)*160}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="2.5"/>`+gdp.map((d,i)=>`<circle cx="${50+i*95}" cy="${200-(d[1]/6)*160}" r="4" fill="var(--primary)"/><text x="${50+i*95}" y="${200-(d[1]/6)*160-10}" text-anchor="middle" class="label-data">${d[1]}</text><text x="${50+i*95}" y="216" text-anchor="middle" class="axis-text">${d[0]}</text>`).join('');})()}
  <text x="40" y="28" class="label-small">Real GDP growth, % — inflation held ~1.4%</text>
</svg>`;
generated_sections['06_macro_pages_1'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 04 · Macro Context</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Macro indicators driving demand</h1>
  <p class="page-subhead">A resilient, low-inflation expansion gives developers and the state room to commit multi-year capital — the precondition for a long construction cycle.</p>
  <div class="exec-body">
    <div class="exec-narrative">
      <h3>Growth normalises, not stalls</h3>
      <p>Malaysia grew <strong>5.2% in 2025</strong> [World Bank 2025]; the IMF lifted its 2026 forecast to <strong>4.7%</strong> [IMF 2026]. Inflation averaged just 1.4% over Jan–Oct 2025 [IMF 2026], keeping financing conditions supportive for construction-heavy investment.</p>
      <h3>Fiscal capacity holds</h3>
      <p>Budget 2026 sets record expenditure of <strong>MYR 419.2 bn</strong> while narrowing the deficit to 3.5% of GDP [UOB 2025]. Discipline plus a development pool keeps public works credible — a contrast to stop-go infrastructure cycles elsewhere in the region.</p>
      <h3>Investment, not consumption, leads</h3>
      <p>The growth mix is tilting to fixed investment — manufacturing, data centres and the SEZ — which is construction-intensive per ringgit of GDP [Kira estimates].</p>
    </div>
    ${chartCard('Real GDP growth trajectory','2023–2026, low-inflation backdrop','% YoY',macroTrendSvg,'World Bank 2025 · IMF 2026')}
  </div>
  ${srcKey('World Bank 2025 = World Bank Malaysia Economic Monitor 2025 · IMF 2026 = IMF Article IV Consultation Malaysia, Feb 2026 · UOB 2025 = UOB Global Economics & Markets Research, Budget 2026 note · Kira estimates = KIRA in-house analyst triangulation')}
  ${pageFooter()}
</div></div>`;

// =================== 06 MACRO PAGES 2 (policy pipeline) ===================
const policyBars = [['13MP development exp. 2026–30',430,'var(--primary)'],['Budget 2026 total exp.',419,'var(--primary-dim)'],['Works Ministry 2025 spend',200,'var(--green)'],['JS-SEZ approvals 9M-25',68,'var(--amber)']];
const policySvg = `<svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet">
  ${policyBars.map((d,i)=>{const y=20+i*52;const w=(d[1]/430)*250;return `<rect x="0" y="${y}" width="${w}" height="26" fill="${d[2]}" rx="2"/><text x="${w+6}" y="${y+18}" class="label-data">${d[1]}</text><text x="0" y="${y-4}" class="label-small">${d[0]}</text>`;}).join('')}
  <text x="0" y="232" class="axis-text">MYR bn</text>
</svg>`;
generated_sections['06_macro_pages_2'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 04 · Macro Context</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">The policy pipeline behind the cycle</h1>
  <p class="page-subhead">Three overlapping commitments — the 13MP, Budget 2026 and the SEZ — convert into a visible multi-year workload for contractors.</p>
  <div class="exec-body">
    <div class="exec-narrative">
      <h3>13MP: the spine</h3>
      <p>The 13th Malaysia Plan allocates <strong>MYR 430 bn</strong> of development expenditure for 2026–30, the highest of any Malaysia Plan at ~MYR 86 bn per year, with the economic sector taking 52.8% [EPU 2025]. Rail, road, public transport and grid dominate.</p>
      <h3>Mega-projects anchor visibility</h3>
      <p>The East Coast Rail Link is ~89% complete, the Penang LRT Mutiara Line (USD 2.9–3.8 bn) and Pan Borneo Sabah upgrade extend long-cycle civil work [GlobalData 2026]. The Gemas–Johor Bahru double-track opened December 2025 [Invest Johor 2025].</p>
      <h3>Private capital amplifies</h3>
      <p>Atop public spend, the Works Ministry guided <strong>~MYR 200 bn</strong> of 2025 construction activity [GlobalData 2026], lifted by data centres and SEZ industrial builds.</p>
    </div>
    ${chartCard('Committed capital pools','Public + cross-border, 2025–2030','MYR bn',policySvg,'EPU 2025 · GlobalData 2026 · MIDA 2025')}
  </div>
  ${srcKey('EPU 2025 = Economic Planning Unit, 13th Malaysia Plan (2026–2030) · GlobalData 2026 = GlobalData Malaysia Construction Industry Report 2026 · MIDA 2025 = Malaysian Investment Development Authority / Invest Johor · Invest Johor 2025 = Invest Johor JS-SEZ briefing 2025')}
  ${pageFooter()}
</div></div>`;

// =================== 07 SECTOR DIVIDER ===================
generated_sections['07_sector_divider'] = divider('05','Sector overview','& sizing','At <strong>MYR 70.4 bn</strong> in 2026 the market is large but unevenly distributed — residential still leads on share, yet non-residential and civil carry the growth.',['Market size','Segment split','Growth velocity']);

// =================== 08 SECTOR SIZING ===================
const sizingStack = `<svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet">
  <line x1="40" y1="200" x2="350" y2="200" class="axis-line"/>
  ${(()=>{const yrs=[['2024',58.8],['2025',66.3],['2026',70.4]];
    // segment shares roughly: residential 44%, non-res 30%, civil 22%, special 4%
    const segs=[[0.443,'var(--primary)'],[0.30,'var(--green)'],[0.22,'var(--amber)'],[0.037,'#6366F1']];
    return yrs.map((d,i)=>{const x=80+i*90;let yb=200;const total=d[1];const fullH=(total/72)*160;
      return segs.map(s=>{const h=fullH*s[0];yb-=h;return `<rect x="${x}" y="${yb}" width="54" height="${h}" fill="${s[1]}"/>`;}).join('')+`<text x="${x+27}" y="${200-fullH-8}" text-anchor="middle" class="label-data">${total}</text><text x="${x+27}" y="216" text-anchor="middle" class="axis-text">${d[0]}</text>`;}).join('');})()}
  <text x="40" y="26" class="label-small">Res · Non-res · Civil · Special trades</text>
</svg>`;
generated_sections['08_sector_sizing_1'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 05 · Sector Sizing</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Market size & growth: construction Malaysia</h1>
  <p class="page-subhead">A <strong>MYR 70.4 bn</strong> market in 2026 [GlobalData 2026], compounding at ~6% as the post-2025 surge cools but the base resets higher.</p>
  <div class="exec-body">
    <div class="exec-narrative">
      <h3>Headline trajectory</h3>
      <p>Work done rose from MYR 58.8 bn (2024) to <strong>MYR 66.3 bn (2025)</strong> [DOSM 2025], with 2026 guided to MYR 70.4 bn [GlobalData 2026]. The five-year 2021–25 CAGR of 10.5% [GlobalData 2026] reflects post-pandemic catch-up plus the industrial and DC wave.</p>
      <h3>Composition is the story</h3>
      <p>Residential held <strong>44.3% of value in 2025</strong> [GlobalData 2026], but non-residential grew 18.6% YoY in Q4 [DOSM 2025], compressing residential’s relative weight as industrial and DC shells scale.</p>
      <h3>Beyond 2026</h3>
      <p>Post-2026 the market is modelled to average ~3.5–4.8% annual growth to 2030, reaching roughly MYR 90 bn [GlobalData 2026].</p>
    </div>
    ${chartCard('Market size by segment','Stacked output, 2024–2026','MYR bn',sizingStack,'GlobalData 2026 · DOSM 2025')}
  </div>
  ${srcKey('GlobalData 2026 = GlobalData Malaysia Construction Industry Report 2026 · DOSM 2025 = Department of Statistics Malaysia, quarterly construction work done')}
  ${pageFooter()}
</div></div>`;

// =================== 09 SEGMENTS ===================
const segCards = [
  ['SEG 01','Non-residential','Fastest-value segment','+18.6% YoY Q4-25 [DOSM 2025]','Industrial factories, data-centre shells and SEZ commercial space drive this segment. Per-MW DC construction runs <strong>USD 8–10 m</strong> [Arizton 2026], lifting non-residential value density well above housing.'],
  ['SEG 02','Civil engineering','Highest-velocity infrastructure','~9.9% CAGR [Kira estimates]','Rail, highway, grid and the RTS Link feed a long-cycle book sheltered from residential swings. The 13MP’s MYR 430 bn DE pool [EPU 2025] underwrites multi-year visibility.'],
  ['SEG 03','Residential','Largest by share, moderating','44.3% share, ~7.5% CAGR [GlobalData 2026]','Affordable-housing programmes (~150,000 planned units) and private launches sustain volume, but urban affordability caps premium expansion. Growth normalises below the headline market rate.'],
  ['SEG 04','Special trades & MEP','Margin-rich niche','15–20% labour saving via IBS [Kira estimates]','Mechanical, electrical, plumbing and facade work — disproportionately demanded by data centres and high-spec industrial. Specialists with retrofit divisions capture an outsized slice of incremental value.'],
];
generated_sections['09_segments'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 06 · Segment Economics</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Segment economics: where the value sits</h1>
  <p class="page-subhead">Share and growth diverge sharply — the segments gaining value density are precisely those tied to data centres, the SEZ and the 13MP spine.</p>
  <div class="ai-usecase-grid">
    ${segCards.map(([n,t,sub,m,b])=>`<div class="ai-usecase"><div class="uc-num">${n} · ${t}</div><div class="uc-title">${sub}</div><div class="uc-body">${b}</div><div class="uc-example">${m}</div></div>`).join('')}
    <div class="ai-usecase" style="grid-column:span 2;background:var(--bg-soft);"><div class="uc-num">READ-ACROSS</div><div class="uc-title">Value is rotating from volume to spec</div><div class="uc-body">The market’s growth is concentrating in <strong>non-residential and civil</strong> work with higher MEP intensity. Contractors weighted to plain residential volume face the slowest lane; those with industrial, DC and infrastructure capability sit in the fast one. [Kira estimates]</div><div class="uc-example">Strategy anchor for Sections 07–08</div></div>
  </div>
  ${srcKey('DOSM 2025 = Department of Statistics Malaysia · GlobalData 2026 = GlobalData Malaysia Construction Industry Report 2026 · Arizton 2026 = Arizton Malaysia Data Center Market 2026 · EPU 2025 = Economic Planning Unit 13MP')}
  ${pageFooter()}
</div></div>`;

// =================== 10 COMPETITIVE DIVIDER ===================
generated_sections['10_competitive_divider'] = divider('07','Competitive','landscape','A <strong>fragmented field</strong> consolidating at the top — the proposed Sunway–IJM merger would create a new leader, while specialists defend MEP and data-centre niches.',['Market structure','Top contractors','Consolidation']);

// =================== 11 COMPETITIVE STRUCTURE ===================
const shareDonut = (()=>{
  const data=[['Gamuda',9,'var(--primary)'],['Sunway',7,'var(--green)'],['IJM',6,'var(--amber)'],['MRCB',5,'#6366F1'],['UEM/Others',73,'#D1D5DB']];
  let acc=0;const cx=110,cy=110,r=80,ir=46;
  const segs=data.map(d=>{const frac=d[1]/100;const a0=acc*2*Math.PI-Math.PI/2;acc+=frac;const a1=acc*2*Math.PI-Math.PI/2;
    const x0=cx+r*Math.cos(a0),y0=cy+r*Math.sin(a0),x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    const xi1=cx+ir*Math.cos(a1),yi1=cy+ir*Math.sin(a1),xi0=cx+ir*Math.cos(a0),yi0=cy+ir*Math.sin(a0);
    const large=frac>0.5?1:0;
    return `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${ir} ${ir} 0 ${large} 0 ${xi0} ${yi0} Z" fill="${d[2]}"/>`;}).join('');
  const legend=data.map((d,i)=>`<g transform="translate(220,${30+i*28})"><rect width="11" height="11" fill="${d[2]}" rx="2"/><text x="18" y="10" class="label-small">${d[0]} ${d[1]}%</text></g>`).join('');
  return `<svg viewBox="0 0 360 230" preserveAspectRatio="xMidYMid meet">${segs}${legend}<text x="${cx}" y="${cy+4}" text-anchor="middle" class="label-data" style="font-size:13px;">&lt;33%</text><text x="${cx}" y="${cy+20}" text-anchor="middle" class="axis-text">top-5</text></svg>`;
})();
generated_sections['11_competitive_structure'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 07 · Competitive Landscape</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Market structure: fragmented, consolidating at the top</h1>
  <p class="page-subhead">The top five contractors control <strong>under one-third</strong> of value [Kira estimates] — leaving room for specialists, even as a landmark merger reshapes the leadership tier.</p>
  <div class="comp-section-wrap">
    <div class="comp-chart-card">
      <div class="chart-header"><div><div class="chart-title">Estimated value share, leading contractors</div><div class="chart-subtitle">2025, listed players</div></div><div class="chart-unit">% share</div></div>
      <div class="chart-body-flex">${shareDonut}</div>
      <div class="chart-source">Company filings 2025 · Kira estimates</div>
    </div>
    <div class="comp-side-text">
      <h3>A contestable top tier</h3>
      <p>No single contractor dominates. The proposed <strong>Sunway–IJM combination</strong> (~USD 2.7 bn deal) would create a ~USD 3 bn-revenue group, overtaking Gamuda [Fortune 2026].</p>
      <div class="stat-stack">
        <div class="stat-line"><span>Top-5 value share</span><span class="val">&lt;33%</span></div>
        <div class="stat-line"><span>Gamuda order book</span><span class="val">MYR 36.6 bn</span></div>
        <div class="stat-line"><span>Merged Sunway-IJM rev.</span><span class="val">~USD 3 bn</span></div>
        <div class="stat-line"><span>DC tenders in play</span><span class="val">MYR 10 bn+</span></div>
      </div>
    </div>
  </div>
  <div class="comp-grid">
    <div class="comp-card leader"><div class="comp-rank">RANK 01</div><div class="comp-name">Gamuda</div><div class="comp-parent">Listed · civil + property + DC infra</div><div class="comp-stat-row"><span>Order book</span><span class="val">MYR 36.6bn</span></div><div class="comp-stat-row"><span>Mkt cap</span><span class="val">~USD 7.2bn</span></div><div class="comp-stat-row"><span>DC angle</span><span class="val">Gamuda DC Infra</span></div><div class="comp-strengths">Record book, tunnelling and DC-infra arm; Google Port Dickson tie-up. [The Star 2024]</div></div>
    <div class="comp-card"><div class="comp-rank">RANK 02</div><div class="comp-name">Sunway Construction</div><div class="comp-parent">Sunway Group · contracting</div><div class="comp-stat-row"><span>Order book</span><span class="val">MYR 6.4bn</span></div><div class="comp-stat-row"><span>2024 rev.</span><span class="val">~USD 1.7bn*</span></div><div class="comp-stat-row"><span>DC angle</span><span class="val">Johor shells</span></div><div class="comp-strengths">RM570m Johor DC core-and-shell win; merger would make it #1. [The Edge 2025]</div></div>
    <div class="comp-card"><div class="comp-rank">RANK 03</div><div class="comp-name">IJM Corporation</div><div class="comp-parent">Listed · contracting + concessions</div><div class="comp-stat-row"><span>2024 rev.</span><span class="val">~USD 1.3bn</span></div><div class="comp-stat-row"><span>Recent win</span><span class="val">NPE2 D&amp;B</span></div><div class="comp-stat-row"><span>DC angle</span><span class="val">Fast-track builds</span></div><div class="comp-strengths">Industrial and DC awards since 2024; merger target of Sunway. [Fortune 2026]</div></div>
    <div class="comp-card"><div class="comp-rank">RANK 04</div><div class="comp-name">MRCB / YTL / WCT</div><div class="comp-parent">Diversified contractors</div><div class="comp-stat-row"><span>YTL Power</span><span class="val">DC + utility</span></div><div class="comp-stat-row"><span>WCT</span><span class="val">NSE2 civil</span></div><div class="comp-stat-row"><span>MRCB</span><span class="val">TOD / rail</span></div><div class="comp-strengths">YTL pairs power with DC; WCT added Johor expressway civil work. [NST 2025]</div></div>
  </div>
  ${srcKey('Fortune 2026 = Fortune SEA-500 coverage of Sunway–IJM merger, Jan 2026 · The Edge 2025 = The Edge Malaysia contractor coverage 2025 · NST 2025 = New Straits Times business desk 2025 · The Star 2024 = The Star Gamuda coverage · *Sunway figure is group revenue incl. property · Kira estimates = KIRA analyst triangulation')}
  ${pageFooter()}
</div></div>`;

// =================== 12 PLAYER PROFILES ===================
function playerProfile(name, sub, tags, stats, leftSecs, rightHead, rightList) {
  return `<div class="page"><div class="page-inner">
    <div class="page-header"><div class="page-section-tag">Section 07 · Player Profile</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
    <div class="profile-hero">
      <div><h2>${name}</h2><div class="sub">${sub}</div><div class="tags">${tags.map(t=>`<span class="data-tag ${t[1]}">${t[0]}</span>`).join('')}</div></div>
      <div class="profile-stats">${stats.map(s=>`<div class="stat"><div class="label">${s[0]}</div><div class="val">${s[1]}<span class="unit">${s[2]}</span></div></div>`).join('')}</div>
    </div>
    <div class="profile-body">
      <div class="profile-col">${leftSecs.map(s=>`<h3>${s[0]}</h3><p>${s[1]}</p>`).join('')}</div>
      <div class="profile-col"><h3>${rightHead}</h3><ul>${rightList.map(li=>`<li>${li}</li>`).join('')}</ul></div>
    </div>
    ${pageFooter()}
  </div></div>`;
}
generated_sections['12_player_gamuda'] = playerProfile('Gamuda Berhad','Civil-engineering leader pivoting into data-centre infrastructure',[['MARKET LEADER','primary'],['DC INFRA','secondary'],['LISTED','estimate']],
  [['Order book','36.6','MYR bn'],['Mkt cap','7.2','USD bn'],['DC arm','Yes',''],['Footprint','Regional','']],
  [['Position','Gamuda runs a <strong>record MYR 36.6 bn order book</strong> [Gamuda 2025], built on tunnelling, rail and water civil works, and is now the most credible local bidder for mega data-centre packages.'],['Data-centre pivot','Through Gamuda DC Infrastructure it expanded with Google in Port Dickson (~USD 236 m) [DCD 2025] and is a top contender for the MYR 10 bn Selangor DC tenders [Maybank IB 2025].']],
  'Strategic implications',['<strong>Scale advantage</strong> — only contractor able to self-deliver civil + DC infra at hyperscale.','Overseas book diversifies away from domestic cyclicality.','MEP and fit-out capability (RM929 m Pearl Computing win) deepens DC credentials.','Key risk: power-ready land and grid timing in Johor.']);
generated_sections['12_player_sunway'] = playerProfile('Sunway Construction Group','Contractor set to become Malaysia’s largest via the IJM combination',[['#2 → #1','primary'],['JOHOR DC','secondary'],['MERGER','estimate']],
  [['Order book','6.4','MYR bn'],['Merged rev.','~3.0','USD bn'],['DC wins','Johor',''],['Status','In play','']],
  [['Position','Suncon carries a <strong>MYR 6.4 bn outstanding order book</strong> [The Edge 2025] and won an RM570 m Johor data-centre core-and-shell package from a US hyperscaler [The Edge 2025].'],['Merger upside','The proposed Sunway–IJM tie-up (~USD 2.7 bn) would lift combined 2024 revenue to ~USD 3 bn, overtaking Gamuda and creating Malaysia’s largest construction group [Fortune 2026].']],
  'Strategic implications',['Merger creates a national champion with property + contracting scale.','Johor DC wins position it for the Singapore-adjacent pipeline.','Integration risk: aligning two large property-and-build cultures.','Watch anti-trust and minority-shareholder approvals.']);
generated_sections['12_player_ijm'] = playerProfile('IJM Corporation','Contractor-concessionaire leaning into fast-track industrial and DC builds',[['#3','primary'],['CONCESSIONS','secondary'],['TARGET','estimate']],
  [['2024 rev.','1.3','USD bn'],['Recent win','NPE2',''],['Exposure','Civil + toll',''],['Status','Bid target','']],
  [['Position','IJM blends contracting with concession assets and has <strong>leaned into fast-track industrial and data-centre awards since 2024</strong> [Fortune 2026], accepting the NPE2 design-and-build award in November 2025 [Kenanga 2026].'],['Merger context','As the Sunway acquisition target, IJM’s standalone trajectory is now framed by the combination; its DC and logistics workload is a core rationale for the deal [Fortune 2026].']],
  'Strategic implications',['Concession cash flows cushion contracting cyclicality.','Fast-track DC and logistics capability is the strategic prize.','A top-three bidder for the MYR 10 bn Selangor DC packages [Maybank IB 2025].','Deal completion reshapes the entire top tier.']);

// =================== 13 DEMAND DIVIDER ===================
generated_sections['13_demand_divider'] = divider('08','Demand drivers:','data centres & SEZ','Two engines pull the cycle: a <strong>~4 GW Johor data-centre pipeline</strong> and a Johor-Singapore SEZ that drew MYR 68 bn of approved investment in nine months.',['DC pipeline','JS-SEZ','RTS Link']);

// =================== 14 DEMAND DATA CENTER ===================
const dcBars = [['Johor pipeline (power)',4000,'var(--primary)','MW'],['Under construction',700,'var(--green)','MW'],['Planned / announced',3300,'var(--amber)','MW'],['Johor planned cap.',5800,'var(--primary-dim)','MW']];
const dcSvg = `<svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet">
  ${dcBars.map((d,i)=>{const y=18+i*54;const w=(d[1]/5800)*250;return `<rect x="0" y="${y}" width="${w}" height="26" fill="${d[2]}" rx="2"/><text x="${w+6}" y="${y+18}" class="label-data">${d[1].toLocaleString()}</text><text x="0" y="${y-4}" class="label-small">${d[0]}</text>`;}).join('')}
  <text x="0" y="234" class="axis-text">MW of data-centre power capacity</text>
</svg>`;
generated_sections['14_demand_data_center'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 08 · Demand Drivers</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">The data-centre and JS-SEZ build-out</h1>
  <p class="page-subhead">Johor has become Southeast Asia’s fastest-growing hyperscale corridor — and the single largest swing factor for non-residential and civil contractors through 2028.</p>
  <div class="exec-body">
    <div class="exec-narrative">
      <h3>A ~4 GW pipeline next door to Singapore</h3>
      <p>Johor’s data-centre pipeline reached <strong>~4.0 GW of power capacity</strong> by Nov 2025, with 700 MW under construction and 3.3 GW planned [JLL 2025]. The state has ~50 data centres operational or in application/construction [Invest Johor 2025]. At <strong>USD 8–10 m per MW</strong> of construction [Arizton 2026], the build value is substantial.</p>
      <h3>Hyperscaler capital commits</h3>
      <p>AWS (USD 6 bn), Microsoft (Southeast Asia 3 region, USD 2.2 bn) and Google (USD 2 bn+) underwrite the demand [DCD 2025]. National data-centre market value is set to climb from USD 6.1 bn (2025) toward USD 11.4 bn by 2031 [Arizton 2026].</p>
      <h3>SEZ multiplies the workload</h3>
      <p>The Johor-Singapore SEZ drew <strong>MYR 68 bn</strong> of approved investment in 9M 2025 — 74.6% of Johor’s total — with Singapore the largest investor [MIDA 2025]. The RTS Link (Dec 2026) and Gemas–JB double-track add cross-border civil work.</p>
    </div>
    ${chartCard('Johor data-centre capacity','Power pipeline, Nov 2025','MW',dcSvg,'JLL 2025 · Arizton 2026')}
  </div>
  ${srcKey('JLL 2025 = JLL Malaysia data-centre tracker, Nov 2025 · Arizton 2026 = Arizton Malaysia Data Center Market 2026–2031 · DCD 2025 = Data Center Dynamics, hyperscaler coverage 2025 · MIDA 2025 = MIDA / Invest Johor 9M-2025 approvals · Invest Johor 2025 = Invest Johor JS-SEZ briefing')}
  ${pageFooter()}
</div></div>`;

// =================== 15 REGULATORY ===================
const regBars = [['IBS score (public projects)',70,'var(--primary)','min'],['IBS score (private &gt;RM50m)',50,'var(--green)','min'],['Target PUE (green DC)',1.4,'var(--amber)','x10'],['Potable-water reliance goal',0,'#6366F1','%']];
const regSvg = `<svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet">
  ${[['2008 · SPP 07/2008','IBS 70% public mandate'],['2024 · MITI','Sustainable DC guideline (PUE/WUE/CUE)'],['2025 · SPAN','Reclaimed-water push for DCs'],['2026 · 13MP','Green + digital DE priorities']].map((d,i)=>{const y=30+i*52;return `<circle cx="20" cy="${y}" r="6" fill="var(--primary)"/><line x1="20" y1="${y+6}" x2="20" y2="${y+46}" class="grid-line"/><text x="38" y="${y-2}" class="label-data" style="font-size:10px;">${d[0]}</text><text x="38" y="${y+12}" class="label-small">${d[1]}</text>`;}).join('')}
</svg>`;
generated_sections['15_regulatory'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 09 · Regulatory & Policy</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Regulatory & policy landscape</h1>
  <p class="page-subhead">Two regimes shape contractor economics: a long-standing <strong>industrialised-building mandate</strong> and a fast-evolving <strong>sustainable data-centre</strong> rulebook.</p>
  <div class="exec-body">
    <div class="exec-narrative">
      <h3>IBS mandate: cost lever, not just compliance</h3>
      <p>Since Treasury Circular SPP 07/2008, public projects above RM10 m must hit a <strong>70 IBS score</strong>; private projects above RM50 m must hit 50 [CIDB 2025]. Against a ~180,000-worker skilled-trade shortfall through 2028 [CIDB 2025], prefabrication is ~15–20% cheaper on labour and ~20% faster [Kira estimates].</p>
      <h3>Green data-centre guidelines</h3>
      <p>MITI’s Guideline for Sustainable Development of Data Centre sets <strong>PUE, WUE and CUE</strong> targets [MITI 2024]. The water regulator is pushing reclaimed, rain and recycled water toward zero potable-water reliance within three years [ISEAS 2025].</p>
      <h3>Net effect</h3>
      <p>Compliance favours contractors with IBS capacity and DC-grade MEP/utility skills — raising barriers for undercapitalised players. [Kira estimates]</p>
    </div>
    ${chartCard('Policy timeline','Regulatory actions shaping build economics','2008–2026',regSvg,'CIDB 2025 · MITI 2024 · ISEAS 2025')}
  </div>
  ${srcKey('CIDB 2025 = Construction Industry Development Board Malaysia, 2025 outlook & IBS guidance · MITI 2024 = Ministry of Investment, Trade and Industry, Guideline for Sustainable Development of Data Centre · ISEAS 2025 = ISEAS Perspective 2025/43 on data-centre energy & water · Kira estimates = KIRA analyst triangulation')}
  ${pageFooter()}
</div></div>`;

// =================== 16 AI DIVIDER ===================
generated_sections['16_ai_divider'] = divider('10','AI impact on','construction','AI is not yet re-pricing build costs — but in design optimisation, schedule control and the <strong>data-centre demand loop itself</strong>, it is already shaping where Malaysian contractors win.',['Design & BIM','Delivery control','The DC demand loop']);

// =================== 17 AI OVERVIEW ===================
const aiBar = `<svg viewBox="0 0 360 240" preserveAspectRatio="xMidYMid meet">
  <line x1="40" y1="200" x2="350" y2="200" class="axis-line"/>
  ${[['Piloting',38,'var(--primary)'],['Not started',47,'#D1D5DB'],['Scaled',15,'var(--green)']].map((d,i)=>{const x=70+i*95;const h=(d[1]/50)*150;const y=200-h;return `<rect x="${x}" y="${y}" width="58" height="${h}" fill="${d[2]}" rx="2"/><text x="${x+29}" y="${y-8}" text-anchor="middle" class="label-data">${d[1]}%</text><text x="${x+29}" y="216" text-anchor="middle" class="axis-text">${d[0]}</text>`;}).join('')}
  <text x="40" y="28" class="label-small">AI adoption among MY contractors</text>
</svg>`;
generated_sections['17_ai_overview'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 10 · AI Impact</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">AI in Malaysia construction: sizing & use cases</h1>
  <p class="page-subhead">Adoption is early and uneven, but the <strong>data-centre demand loop</strong> ties AI directly to the sector’s biggest growth driver.</p>
  <div class="ai-overview-top">
    <div class="ai-narrative">
      <h3>Early, pilot-stage adoption</h3>
      <p>Most Malaysian contractors are <strong>piloting rather than scaling</strong> AI [Kira estimates] — clustered in BIM clash-detection, quantity take-off and programme risk analytics.</p>
      <h3>The demand loop</h3>
      <p>AI compute is the reason the DC pipeline exists. GPU imports hit <strong>USD 6.45 bn</strong> in the first four months of 2025 [Kira estimates], directly feeding hyperscale build demand.</p>
      <h3>Where value lands</h3>
      <p>Near-term gains are in schedule and cost control on complex DC and industrial builds, not in displacing site labour.</p>
    </div>
    ${chartCard('AI adoption stage','MY contractors, 2025–26','% of firms',aiBar,'Kira estimates')}
  </div>
  <div class="ai-callouts">
    <div class="callout"><div class="label">GPU imports Jan–Apr 25</div><div class="num">6.45<span class="unit">USD bn</span></div><div class="change">demand-loop driver</div><div class="source-tag est">Kira est.</div></div>
    <div class="callout"><div class="label">Schedule gain (IBS+AI)</div><div class="num">~20<span class="unit">%</span></div><div class="change">faster delivery</div><div class="source-tag est">Kira est.</div></div>
    <div class="callout"><div class="label">Scaled AI adoption</div><div class="num">15<span class="unit">%</span></div><div class="change down">early stage</div><div class="source-tag est">Kira est.</div></div>
  </div>
  ${srcKey('Kira estimates = KIRA in-house analyst triangulation across contractor channel checks, import data and hyperscaler disclosures')}
  ${pageFooter()}
</div></div>`;

// =================== 18 FORECAST OUTLOOK ===================
const fcSvg = `<svg viewBox="0 0 720 250" preserveAspectRatio="xMidYMid meet">
  <line x1="50" y1="210" x2="700" y2="210" class="axis-line"/>
  ${[0,1,2,3].map(i=>`<line x1="50" y1="${210-i*48}" x2="700" y2="${210-i*48}" class="grid-line"/>`).join('')}
  ${(()=>{const yrs=[['2025',66.3],['2026',70.4],['2027',74.5],['2028',79.0],['2029',84.0],['2030',89.9]];
    const xstep=110;const max=95;const y=v=>210-(v/max)*180;
    const pts=yrs.map((d,i)=>`${70+i*xstep},${y(d[1])}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="var(--primary)" stroke-width="2.5"/>`+yrs.map((d,i)=>`<circle cx="${70+i*xstep}" cy="${y(d[1])}" r="4.5" fill="var(--primary)"/><text x="${70+i*xstep}" y="${y(d[1])-10}" text-anchor="middle" class="label-data">${d[1]}</text><text x="${70+i*xstep}" y="228" text-anchor="middle" class="axis-text">${d[0]}</text>`).join('');})()}
  <text x="50" y="30" class="label-small">Base case · MYR bn construction output</text>
</svg>`;
generated_sections['18_forecast_outlook'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 11 · 5-Year Outlook</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">5-year outlook & forecast to 2030</h1>
  <p class="page-subhead">After the 2025 surge, the base case is steady mid-single-digit growth to ~<strong>MYR 90 bn by 2030</strong> [GlobalData 2026], with data centres and the SEZ the key swing factors.</p>
  <div class="exec-chart" style="height:300px;margin-bottom:14px;">
    <div class="chart-header"><div><div class="chart-title">Construction output forecast</div><div class="chart-subtitle">Base case, 2025–2030</div></div><div class="chart-unit">MYR bn</div></div>
    <div class="chart-body-flex">${fcSvg}</div>
    <div class="chart-source">GlobalData 2026 · DOSM 2025 · Kira estimates</div>
  </div>
  <div class="imp-grid" style="grid-template-columns:repeat(3,1fr);">
    <div class="imp-card"><div class="num">BASE</div><div class="title">~MYR 90 bn by 2030</div><div class="body-text">Mid-single-digit growth (~3.5–4.8% CAGR) as the DC pipeline converts and 13MP civil work delivers steadily. [GlobalData 2026]</div></div>
    <div class="imp-card" style="border-top-color:var(--green);"><div class="num">BULL</div><div class="title">Faster DC + SEZ conversion</div><div class="body-text">Accelerated Johor power roll-out and full SEZ pipeline could push output meaningfully above base, led by non-residential. [Kira estimates]</div></div>
    <div class="imp-card" style="border-top-color:var(--amber);"><div class="num">BEAR</div><div class="title">Power, water & labour bind</div><div class="body-text">Grid constraints, water rules and the ~180k labour gap could delay DC builds and trim civil throughput. [CIDB 2025]</div></div>
  </div>
  ${srcKey('GlobalData 2026 = GlobalData Malaysia Construction Industry Report 2026 · DOSM 2025 = Department of Statistics Malaysia · CIDB 2025 = Construction Industry Development Board · Kira estimates = KIRA analyst triangulation')}
  ${pageFooter()}
</div></div>`;

// =================== 19 METHODOLOGY ENDNOTE ===================
const sources = [
  'GlobalData 2026 — GlobalData, Malaysia Construction Industry Report 2026 (forecasts to 2030)',
  'DOSM 2025 — Department of Statistics Malaysia, quarterly construction work-done statistics',
  'IMF 2026 — IMF Article IV Consultation with Malaysia, Feb 2026',
  'World Bank 2025 — World Bank Malaysia Economic Monitor 2025',
  'UOB 2025 — UOB Global Economics & Markets Research, Budget 2026 macro note',
  'EPU 2025 — Economic Planning Unit, 13th Malaysia Plan (2026–2030)',
  'MIDA 2025 — Malaysian Investment Development Authority / Invest Johor, 9M-2025 approvals',
  'Invest Johor 2025 — Invest Johor, JS-SEZ briefing and project pipeline 2025',
  'JLL 2025 — JLL Malaysia, data-centre capacity tracker, Nov 2025',
  'Arizton 2026 — Arizton, Malaysia Data Center Market 2026–2031',
  'DCD 2025 — Data Center Dynamics, hyperscaler investment coverage 2025',
  'CIDB 2025 — Construction Industry Development Board Malaysia, 2025 outlook & IBS guidance',
  'MITI 2024 — Ministry of Investment, Trade and Industry, Guideline for Sustainable Development of Data Centre',
  'ISEAS 2025 — ISEAS Perspective 2025/43, data-centre energy & sustainability',
  'Fortune 2026 — Fortune, Sunway–IJM merger coverage, Jan 2026',
  'The Edge 2025 — The Edge Malaysia, contractor and data-centre tender coverage 2025',
  'Maybank IB 2025 — Maybank Investment Bank, data-centre contractor notes 2025',
  'Kenanga 2026 — Kenanga Research, construction sector strategy, Apr 2026',
  'NST 2025 — New Straits Times, business desk contractor coverage 2025',
  'The Star 2024 — The Star, Gamuda equity coverage',
  'Gamuda 2025 — Gamuda Berhad, order-book disclosure 2025',
];
generated_sections['19_methodology_endnote'] = `<div class="page"><div class="page-inner">
  <div class="page-header"><div class="page-section-tag">Section 19 · Methodology & Sources</div><div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div></div>
  <h1 class="page-h1">Methodology endnote & source mix</h1>
  <p class="page-subhead">This view triangulates two evidence streams. Where a figure carries a named tag (e.g. [GlobalData 2026], [MIDA 2025]), the data comes from that source; the full citation is below. Where a figure carries [Kira estimates], KIRA analysts derived it from a blend of disclosed inputs. Approximately <strong>35% of quantitative claims are KIRA-derived</strong>; ~65% are externally cited.</p>
  <div style="flex:1;overflow:hidden;min-height:0;">
    <h3 style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--primary);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);font-weight:600;">Source Index</h3>
    <div style="columns:2;column-gap:32px;font-size:10.5px;line-height:1.55;">
      ${sources.map((s,i)=>`<div style="margin-bottom:5px;color:var(--text-mid);break-inside:avoid;"><span class="mono" style="color:var(--primary);margin-right:6px;">[${String(i+1).padStart(2,'0')}]</span>${s}</div>`).join('')}
    </div>
  </div>
  <div class="page-footer"><div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div><div>Estimates are analyst judgement, not guarantees. © 2026 KIRA Research.</div></div>
</div></div>`;

// =================== VALIDATION GATE ===================
const missing = section_plan.filter(id => !(id in generated_sections) || !generated_sections[id] || generated_sections[id].length < 100);
if (missing.length) {
  console.error('VALIDATION GATE FAILED — missing/empty sections:', missing);
  process.exit(1);
}
console.log(`Validation gate PASSED: ${section_plan.length} planned, ${Object.keys(generated_sections).length} generated.`);

// =================== ASSEMBLE + PAGE NUMBERING ===================
let pages = section_plan.map(id => generated_sections[id]);
const total = pages.length;
pages = pages.map((html, i) => html
  .replace(/\{\{PAGE_NUM\}\}/g, String(i + 1).padStart(3, '0'))
  .replace(/\{\{TOTAL_PAGES\}\}/g, String(total).padStart(3, '0')));

let finalHtml = wrapper
  .replace('{{LOCALE}}', 'en')
  .replace(/\{\{REPORT_TITLE\}\}/g, 'Malaysia construction 2026: data-centre pipeline & Johor-Singapore SEZ build-out — KIRA Research')
  .replace(/\{\{REPORT_META_DESCRIPTION\}\}/g, 'KIRA Research market analysis of Malaysia construction in 2026: market sizing, the data-centre pipeline, the Johor-Singapore SEZ, leading contractors, regulation, AI impact and a forecast to 2030.')
  .replace('{{MASTER_STYLES_CSS}}', css)
  .replace('{{PAGES_HTML}}', pages.join('\n'));

// guard: no leftover placeholders, no banned terms
const leftover = finalHtml.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) { console.error('Leftover placeholders:', [...new Set(leftover)]); process.exit(1); }
const banned = ['Claude','McKinsey','Mordor','Frost','Euromonitor','Synovate','Ipsos','IMARC'];
const hit = banned.filter(b => new RegExp('\\b'+b+'\\b').test(finalHtml));
if (hit.length) { console.error('BANNED TERMS PRESENT:', hit); process.exit(1); }

fs.writeFileSync(path.join(OUT_DIR, 'en.html'), finalHtml);
console.log('Wrote en.html —', fs.statSync(path.join(OUT_DIR,'en.html')).size, 'bytes,', total, 'pages.');
console.log('SECTION_PLAN:', section_plan.join(', '));
