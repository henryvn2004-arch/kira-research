// ── Browser research — calls server-side proxy (key stays in Vercel env vars) ─
async function browserResearch(industry, country, reportType, questions, companies) {
  const res = await fetch('/api/browser-research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ industry, country, reportType, questions, companies })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.research || '';
}

// ── State ────────────────────────────────────────────────
const MODULES = {
  market_overview: {
    label: 'Market Overview', price: 49,
    desc: 'Environmental context, market sizing & potential, segmentation, growth estimation, forecasting and scenario planning.',
    sections: ['Executive Summary','Market Sizing & Growth','Market Segmentation','Industry Structure & Value Chain','Competitive Landscape','Market Drivers & Restraints','Market Forecast & Scenarios','Recommendations'],
  },
  competitive_analysis: {
    label: 'Competitive Analysis', price: 49,
    desc: 'Industry competitiveness, competitor profiles & strategy tracking, best practices and key success factors.',
    sections: ['Executive Summary','Industry Competitiveness Overview','Competitive Positioning Map','Competitor Profiles (Top 3–5)','Competitive Strategy & Performance','Best Practices & Key Success Factors','Competitive Outlook & Recommendations'],
  },
  customer_intelligence: {
    label: 'Customer Intelligence', price: 49,
    desc: 'Key account targeting, pain points, decision-making cycles, brand perception, willingness to pay.',
    sections: ['Executive Summary','Customer Segmentation','Needs, Pain Points & Unmet Needs','Buying Behavior & Decision Journey','Brand Perception & Loyalty','Willingness to Pay & Price Sensitivity','Channel & Touchpoint Preferences','Recommendations'],
  },
  value_chain: {
    label: 'Value Chain', price: 49,
    desc: 'Industry structure, pricing & margin stack, value-adding activities, supply web efficiencies.',
    sections: ['Executive Summary','Industry Structure & Players','Value Chain Mapping','Pricing & Margin Analysis','Value-Adding Activities & Bottlenecks','Supply Web Efficiencies & Benchmarks','Recommendations'],
  },
  proposition_development: {
    label: 'Proposition Development', price: 49,
    desc: 'Gap analysis, innovation scouting, price-positioning, segment prioritisation, branding & channel strategy.',
    sections: ['Executive Summary','Gap Analysis','Innovation Scouting','Price-Positioning Strategy','Customer Segment Prioritisation','Branding & Communication','Channel Strategy','Recommendations & Roadmap'],
  },
  partner_search: {
    label: 'Partner Search', price: 49,
    desc: 'Partner identification, distribution evaluation, JV/acquisition targets, commercial due diligence.',
    sections: ['Executive Summary','Partner Identification Criteria','Distribution Partner Evaluation','JV & Acquisition Targets','Technology & Manufacturing Partners','Commercial Due Diligence Framework','Recommendations & Shortlist'],
  },
  go_to_market: {
    label: 'Go-To-Market', price: 49,
    desc: 'Barriers & drivers, entry mode options, phased timeline, marketing plan, exit strategy.',
    sections: ['Executive Summary','Market Opportunity Assessment','Barriers & Entry Drivers','Entry Mode Options','Market Entry Phases & Timeline','Marketing & Communications Plan','Exit Strategy & Risk Management','Recommendations & Action Plan'],
  },
};

let currentType = 'market_overview';

function selectModule(moduleId) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('type-' + moduleId);
  if (card) card.classList.add('selected');
  currentType = moduleId;
  const mod = MODULES[moduleId];
  document.getElementById('price-display').textContent = '$' + (mod?.price || 49);
  renderModulePreview(moduleId);
}

function renderModulePreview(moduleId) {
  const strip = document.getElementById('module-desc-strip');
  if (!strip) return;
  const mod = MODULES[moduleId];
  if (!mod) return;
  const secs = mod.sections || [];
  const items = secs.map((s, i) => {
    const cls = i === 0 ? 'first' : i === secs.length - 1 ? 'last' : '';
    return `<div class="module-sec-item">
      <div class="module-sec-num">${String(i+1).padStart(2,'0')}</div>
      <div class="module-sec-name ${cls}">${s}</div>
    </div>`;
  }).join('');
  strip.className = 'module-preview';
  strip.innerHTML = `
    <div class="module-preview-head">
      <div class="module-preview-title">What's included</div>
      <div class="module-preview-count">${secs.length} sections</div>
    </div>
    <div class="module-preview-desc">${mod.desc}</div>
    <div class="module-sections-grid">${items}</div>`;
}

// Init on load
document.addEventListener('DOMContentLoaded', () => renderModulePreview('market_overview'));
// Shared state via window — accessible from both report-view.js and page scripts
if (typeof window.reportId    === 'undefined') window.reportId    = null;
if (typeof window.reportSlug  === 'undefined') window.reportSlug  = null;
if (typeof window.chatHistory === 'undefined') window.chatHistory = [];
// Local aliases for report.html (which doesn't redeclare these)
let reportId     = window.reportId;
let reportSlug   = window.reportSlug;
let chatHistory  = window.chatHistory;
let pollInterval = null;



// ── Tool detection — adds body class for per-tool CSS theming ──
(function detectTool() {
  const path = window.location.pathname;
  let cls = 'tool-market'; // default
  if (path.includes('docreport'))        cls = 'tool-doc';
  else if (path.includes('strategy'))    cls = 'tool-strategy';
  document.body.classList.add(cls);
  document.body.dataset.tool = cls.replace('tool-', '');
})();

// ── Diagram CSS injection ──
(function(){
  const s = document.createElement('style');
  s.textContent = '.visual-box-diagram{min-height:80px}.diagram-wrap{background:#0A0D13;border-radius:8px;padding:12px;overflow:auto;text-align:center}.diagram-wrap svg{max-width:100%;height:auto}';
  document.head.appendChild(s);
})();

// ── Mermaid.js initialization (diagrams for doc intelligence + all tools) ──
(function initMermaid() {
  if (typeof mermaid === 'undefined') return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1E6FFF',
      primaryTextColor: '#E8EDF5',
      primaryBorderColor: '#242A35',
      lineColor: '#5A6278',
      background: '#0B0D10',
      mainBkg: '#11151C',
      nodeBorder: '#242A35',
      clusterBkg: '#0A0D13',
      titleColor: '#E8EDF5',
      edgeLabelBackground: '#11151C',
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
    },
    flowchart: { curve: 'basis', padding: 16, htmlLabels: true },
    quadrantChart: { chartWidth: 400, chartHeight: 300, pointRadius: 5 },
  });
})();

// ── Type selection ───────────────────────────────────────
// (handled by selectModule above)

// ── Step indicator ───────────────────────────────────────
function setStep(n) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('step-' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < n) el.classList.add('done');
    else if (i === n) el.classList.add('active');
    if (i < 4) {
      const line = document.getElementById('line-' + i);
      if (line) line.classList.toggle('done', i < n);
    }
  }
}

// ── Validation ───────────────────────────────────────────
function validate() {
  const industry = document.getElementById('f-industry').value.trim();
  const country  = document.getElementById('f-country').value;
  if (!industry) return 'Please enter an industry or product category.';
  if (!country)  return 'Please select a target market.';
  return null;
}

function handleLangChange(sel) {
  const other = document.getElementById('confirm-lang-other');
  other.style.display = sel.value === 'other' ? 'inline-block' : 'none';
  if (sel.value !== 'other') other.value = '';
}

function getSelectedLanguage() {
  const sel = document.getElementById('confirm-lang-select');
  if (sel.value === 'other') {
    return document.getElementById('confirm-lang-other').value.trim() || 'English';
  }
  return sel.value || 'English';
}
function detectLanguage(text) {
  if (!text) return 'English';
  // Vietnamese
  if (/[àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text)) return 'Vietnamese';
  // Chinese
  if (/[\u4e00-\u9fff]/.test(text)) return 'Chinese';
  // Japanese
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'Japanese';
  // Korean
  if (/[\uac00-\ud7af]/.test(text)) return 'Korean';
  // Thai
  if (/[\u0e00-\u0e7f]/.test(text)) return 'Thai';
  return 'English';
}

let _pendingParams = null;

async function handlePay() {
  const err = validate();
  if (err) return showAlert('alert-form', err);

  const params = {
    reportType: currentType,
    industry:   document.getElementById('f-industry').value.trim(),
    country:    document.getElementById('f-country').value,
    questions:  document.getElementById('f-questions').value.trim(),
    companies:  '',
  };

  // Detect language from user input
  const allText = [params.industry, params.questions, params.companies].join(' ');
  const detectedLang = detectLanguage(allText);

  // Store pending params
  _pendingParams = params;

  // Populate modal
  const typeLabels = { industry_deep_dive: 'Industry Deep Dive', competitive_comparison: 'Competitive Analysis', market_entry_brief: 'Market Entry Brief' };
  document.getElementById('confirm-title').textContent = `${params.industry} — ${params.country}`;
  document.getElementById('confirm-type').textContent = typeLabels[currentType] || currentType;
  document.getElementById('confirm-industry').textContent = params.industry;
  document.getElementById('confirm-country').textContent = params.country;

  const companiesRow = document.getElementById('confirm-companies-row');
  if (params.companies) {
    document.getElementById('confirm-companies').textContent = params.companies;
    companiesRow.style.display = 'flex';
  } else { companiesRow.style.display = 'none'; }

  const questionsRow = document.getElementById('confirm-questions-row');
  if (params.questions) {
    document.getElementById('confirm-questions').textContent = params.questions;
    questionsRow.style.display = 'flex';
  } else { questionsRow.style.display = 'none'; }

  // Set detected language in dropdown
  document.getElementById('confirm-lang').textContent = detectedLang;
  const langSel = document.getElementById('confirm-lang-select');
  // Check if detected lang is in options, otherwise select Other
  const opts = Array.from(langSel.options).map(o => o.value);
  if (opts.includes(detectedLang)) {
    langSel.value = detectedLang;
  } else {
    langSel.value = 'other';
    document.getElementById('confirm-lang-other').style.display = 'inline-block';
    document.getElementById('confirm-lang-other').value = detectedLang;
  }

  // Show modal
  const modal = document.getElementById('confirm-modal');
  modal.style.display = 'flex';
}

function closeConfirm() {
  document.getElementById('confirm-modal').style.display = 'none';
  _pendingParams = null;
}

async function confirmGenerate() {
  if (!_pendingParams) return;
  document.getElementById('confirm-modal').style.display = 'none';

  const params    = _pendingParams;
  const language  = getSelectedLanguage();
  params.language = language; // attach language to params
  _pendingParams  = null;

  const slug = currentType.split('_')[0] + '-' +
    params.industry.toLowerCase().replace(/\s+/g,'-') + '-' +
    params.country.toLowerCase().replace(/\s+/g,'-') + '-' + Date.now();

  sessionStorage.setItem('kira_pending_report', JSON.stringify(params));
  sessionStorage.setItem('kira_pending_slug', slug);

  // Show progress immediately
  setStep(3);
  showView('progress');
  startTime = Date.now();
  elapsedTimer = setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('time-elapsed').textContent = `Elapsed: ${s}s`;
  }, 1000);

  document.getElementById('prog-title').textContent = 'Planning report structure...';
  document.getElementById('prog-subtitle').textContent = 'Claude is deciding which sections fit your request';
  document.getElementById('time-remaining').textContent = 'Estimating...';
  document.getElementById('section-progress-list').innerHTML =
    `<div class="sec-prog-item active" style="justify-content:center;padding:16px">
      <span class="sec-prog-dot"></span>
      <span style="color:#A3A9B6">Analyzing your request and planning sections...</span>
    </div>`;

  await startGeneration(params, slug);
}

// ── Generation flow (client-driven) ─────────────────────
const SEC_PER_SECTION = 12; // estimated seconds per section
let startTime, elapsedTimer;

async function startGeneration(params, slug) {
  if (!params) {
    params = JSON.parse(sessionStorage.getItem('kira_pending_report') || '{}');
    slug   = sessionStorage.getItem('kira_pending_slug');
  }
  if (!params.industry || !slug) return;

  try {
    const user = await window.kiraAuth?.getUser();

    // Phase 0: Browser web_search — live data, no timeout
    document.getElementById('prog-title').textContent = 'Searching live market data...';
    document.getElementById('prog-subtitle').textContent = 'Web search in progress — ~60-90 seconds';
    document.getElementById('progress-bar').style.width = '5%';
    setStatus('🔍 <strong>Searching live market data</strong> — gathering latest figures & sources...', 5);

    let liveResearch = '';
    try {
      liveResearch = await browserResearch(
        params.industry, params.country, params.reportType,
        params.questions, params.companies
      );
      document.getElementById('prog-subtitle').textContent = '✓ Live data collected';
      setStatus('✓ <strong>Market data collected</strong> — planning report structure...', 15);
    } catch(e) {
      console.warn('Web search failed, falling back to knowledge:', e.message);
      document.getElementById('prog-subtitle').textContent = 'Using knowledge base...';
      setStatus('⚠ Web search unavailable — using knowledge base...', 10);
    }

    // Phase 1: Plan sections + RAG (Vercel — lightweight, no search)
    document.getElementById('prog-title').textContent = 'Planning report structure...';
    document.getElementById('progress-bar').style.width = '10%';
    setStatus('📋 <strong>Planning sections</strong> — analyzing research to determine report structure...', 15);

    const initRes = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params, slug, userId: user?.id,
        liveResearch: liveResearch.slice(0, 6000) // truncate for Vercel payload
      })
    });
    const initData = await initRes.json();
    if (!initData.reportId) throw new Error(initData.error || 'Planning phase failed');

    reportId = initData.reportId;
    reportSlug = slug;
    currentParams = params; // store for PPTX export
    const sections        = initData.sections || [];
    // Truncate researchSummary — full text is too large for section payloads
    const researchSummary = (initData.researchSummary || '').slice(0, 4000);
    const ragContext      = {
      chunkText:   (initData.ragContext?.chunkText   || '').slice(0, 2000),
      patternText: (initData.ragContext?.patternText || '').slice(0, 1000),
    };
    // Store competencyTemplate — passed to each section so Claude knows module structure
    const competencyTemplate = initData.competencyTemplate || null;
    // Per-section localized queries from generate-report — each section knows what to search for
    const sectionQueries = initData.sectionQueries || {};
    const totalSections   = sections.length;

    // Now build section list from dynamic response
    buildSectionProgressList(sections);
    document.getElementById('time-total').textContent =
      `Est. total: ~${Math.ceil((totalSections * SEC_PER_SECTION) / 60)} min`;
    document.getElementById('time-remaining').textContent =
      `~${Math.ceil((totalSections * SEC_PER_SECTION) / 60)} min remaining`;
    document.getElementById('prog-title').textContent = 'Writing report sections...';
    document.getElementById('prog-subtitle').textContent =
      `${totalSections} sections · ~${SEC_PER_SECTION}s each`;
    document.getElementById('progress-bar').style.width = '10%';
    const completedSections = new Array(totalSections).fill(null);

    // Generate all sections in order — Executive Summary first (independent)
    // It gets full research context so it doesn't need other sections
    const generateOrder = sections.map((_, i) => i);

    for (let gi = 0; gi < generateOrder.length; gi++) {
      const i     = generateOrder[gi];
      const title = sections[i];
      setSectionStatus(i, 'active');

      const pct = Math.round(10 + (gi / totalSections) * 85);
      document.getElementById('progress-bar').style.width = pct + '%';
      setStatus(`✍️ <strong>Writing section ${gi+1}/${totalSections}</strong> — ${title}`, pct);

      // Switch to report view on first generate call
      if (gi === 0) {
        setStep(4);
        showView('report');
        renderReportMeta(params, slug);
        const pptxBtn = document.getElementById('btn-export-pptx');
        const presBtn0 = document.getElementById('btn-present');
        const pdfBtn  = document.getElementById('btn-export-pdf');
        if (pptxBtn) pptxBtn.style.display = 'inline-flex';
        if (pdfBtn)  pdfBtn.style.display  = 'inline-flex';
        if (presBtn0) presBtn0.style.display = 'inline-flex';
      }

      // Render skeleton at correct display position
      renderSection({ title, content: null, status: 'generating' }, i, totalSections);

      // Build prevSections context from ALL already-completed sections (not just last 2)
      // This prevents Claude from repeating data covered in earlier sections
      const prevDone = completedSections.filter(Boolean);

      // Stream section — with per-section error handling
      let sectionContent;
      try {
        console.log(`[Section ${i+1} "${title}"] Calling generate-section...`);
        sectionContent = await streamSection({
          reportId, sectionIndex: i, sectionTitle: title,
          totalSections, ...params, researchSummary, ragContext,
          prevSections: prevDone,
          competencyTemplate,
          sectionQuery: sectionQueries[title] || null,
        }, i);
        console.log(`[Section ${i+1}] Done`);
      } catch (sErr) {
        console.error(`[Section ${i+1}] Error:`, sErr);
        setStatus(`⚠ Section "${title}" failed: ${sErr.message}`, pct);
        sectionContent = JSON.stringify({
          headline: '', stats: [], chart: null, table: null,
          commentary: `Could not generate this section. Error: ${sErr.message}`,
          sources: []
        });
      }

      completedSections[i] = { title, content: sectionContent, status: 'completed' };
      window._completedSections = completedSections.filter(Boolean);
      setSectionStatus(i, 'done');
    }

    // Done
    clearInterval(elapsedTimer);
    document.getElementById('progress-bar').style.width = '100%';
    setStatus('✓ <strong>Report complete</strong>', 100);
    setTimeout(() => setStatus(null, null, false), 3000);
    sessionStorage.removeItem('kira_pending_report');
    sessionStorage.removeItem('kira_pending_slug');

    setTimeout(() => {
      document.getElementById('chatbox').style.display = 'block';
    }, 500);

  } catch (e) {
    clearInterval(elapsedTimer);
    console.error('[Generation] Fatal error:', e);
    setStatus(`✗ <strong>Error:</strong> ${e.message}`, null);
  }
}

// ── Stream one section via SSE ────────────────────────────
async function streamSection(payload, sectionIndex) {
  const res = await fetch('/api/generate-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error('Section failed: ' + await res.text());

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let headlineData  = null;
  let commentary    = '';
  let visuals       = { chart: null, table: null };
  let metaSucceeded = false; // true when Phase 2 ran (even if chart/table were null)

  const block = document.getElementById('sec-' + sectionIndex);
  let commentaryEl = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const evt = JSON.parse(line.slice(6));

        // Phase 1: tokens stream — show commentary live
        if (evt.type === 'token' && evt.text) {
          // Init skeleton on first token
          if (!commentaryEl && block) {
            block.classList.remove('generating');
            block.innerHTML = `
              <div class="slide-header" data-num="${String(sectionIndex+1).padStart(2,'0')}">
                <span class="slide-num">Section ${String(sectionIndex+1).padStart(2,'0')}</span>
                <span class="slide-title">${payload.sectionTitle}</span>
              </div>
              <div class="slide-commentary"></div>`;
            commentaryEl = block.querySelector('.slide-commentary');
          }
          commentary += evt.text;
          if (commentaryEl) {
            commentaryEl.innerHTML = formatCommentary(commentary) + '<span class="stream-cursor">|</span>';
          }
        }

        // Phase 3: meta arrives after stream — add headline, sub-sections, visuals
        if (evt.type === 'meta') {
          headlineData = evt;
          metaSucceeded = true;

          setStatus(`📊 <strong>Building visuals</strong>...`, null);

          // Wrap streaming commentary in collapsible (keep it at bottom)
          if (commentaryEl) {
            commentaryEl.innerHTML = formatCommentary(commentary);
            const secIdx = sectionIndex;
            const existingComm = block?.querySelector('.slide-commentary');
            if (existingComm) {
              const commHtml = existingComm.innerHTML;
              existingComm.outerHTML = `
                <div class="slide-commentary">
                  <div class="commentary-preview collapsed" id="cp-${secIdx}">${commHtml}</div>
                </div>
                <div class="commentary-toggle" id="ct-${secIdx}" onclick="toggleCommentary(${secIdx})">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <span>Read full analysis</span>
                </div>`;
              commentaryEl = null;
            }
          }

          if (!block) return;
          const header = block.querySelector('.slide-header');
          const commEl = block.querySelector('.slide-commentary');

          // ── Phase 3: sub_sections format ──
          if (evt.sub_sections?.length) {
            // Insert headline after header
            if (evt.headline && header) {
              header.insertAdjacentHTML('afterend', `
                <div class="block-headline">
                  <div class="block-headline-label">Key Finding</div>
                  <div class="block-headline-text">${evt.headline}</div>
                </div>`);
            }
            // Insert each sub-section's visuals BEFORE the commentary
            const insertBefore = block.querySelector('.block-headline')?.nextElementSibling || commEl || null;
            evt.sub_sections.forEach((ss, si) => {
              if (si > 0) {
                const sep = document.createElement('div');
                sep.className = 'sub-section-sep';
                block.insertBefore(sep, insertBefore);
              }
              const ssDiv = document.createElement('div');
              ssDiv.className = 'sub-section';
              if (ss.subtitle) {
                const t = document.createElement('div');
                t.className = 'sub-section-title';
                t.textContent = ss.subtitle;
                ssDiv.appendChild(t);
              }
              (ss.blocks || []).forEach(b => {
                const el = renderBlock(b, sectionIndex * 100 + si);
                if (el) ssDiv.appendChild(el);
              });
              block.insertBefore(ssDiv, insertBefore);
            });
            if (evt.sources?.length) appendSources(block, evt.sources);

          // ── Legacy flat format ──
          } else {
            const statsHtml = (evt.stats?.length)
              ? `<div class="slide-stats">${evt.stats.map(s => `
                  <div class="stat-pill">
                    <div class="stat-value">${s.value}</div>
                    <div class="stat-label">${s.label}</div>
                  </div>`).join('')}</div>` : '';
            if (header) header.insertAdjacentHTML('afterend',
              (evt.headline ? `<div class="block-headline"><div class="block-headline-label">Key Finding</div><div class="block-headline-text">${evt.headline}</div></div>` : '') + statsHtml);

            const hasChart = evt.chart && (evt.chart.labels?.length || evt.chart.datasets?.length);
            const hasTable = evt.table?.headers?.length;
            if (hasChart || hasTable) {
              const anchor = block.querySelector('.commentary-toggle') || commEl || null;
              appendVisualsAt(block, sectionIndex, hasChart ? evt.chart : null, hasTable ? evt.table : null, anchor, evt.diagram);
            }
            if (evt.sources?.length) appendSources(block, evt.sources);
          }
        }

        if (evt.type === 'done') {
          if (commentaryEl) {
            // commentary never got collapsed (no meta event) — wrap now
            commentaryEl.innerHTML = formatCommentary(commentary);
            const secIdx = sectionIndex;
            const existingComm = block?.querySelector('.slide-commentary');
            if (existingComm && commentary.length > 60) {
              const commHtml = existingComm.innerHTML;
              existingComm.outerHTML = `
                <div class="slide-commentary">
                  <div class="commentary-preview collapsed" id="cp-${secIdx}">${commHtml}</div>
                </div>
                <div class="commentary-toggle" id="ct-${secIdx}" onclick="toggleCommentary(${secIdx})">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                  <span>Read full analysis</span>
                </div>`;
            }
          }

          // ── Post-process: extract visuals only when Phase 2 failed entirely ──
          // metaSucceeded = Phase 2 ran and returned (chart may be null by design for
          // narrative sections like Executive Summary — that's intentional, not a failure).
          // Only call extract-visuals when meta never fired at all (network error, timeout).
          const hasVisuals = block?.querySelector('.slide-visuals');
          if (!hasVisuals && !metaSucceeded && commentary.length > 120) {
            console.log(`[Section] Phase 2 never fired — calling extract-visuals fallback`);
            extractVisualsFromCommentary(commentary, payload.sectionTitle, sectionIndex, block);
          }
        }
      } catch {}
    }
  }

  return JSON.stringify({
    headline:  headlineData?.headline || '',
    stats:     headlineData?.stats    || [],
    chart:     headlineData?.chart    || null,
    table:     headlineData?.table    || null,
    sources:   headlineData?.sources  || [],
    commentary
  });
}

// Render headline + stats immediately (no chart yet)

// ════════════════════════════════════════════════
// BLOCKS RENDERER — Claude-driven flexible layout
// ════════════════════════════════════════════════

const CALLOUT_ICONS = { insight: '💡', action: '🎯', warning: '⚠️', default: '✦' };

function renderBlock(block, sectionIndex) {
  const div = document.createElement('div');

  switch (block.type) {

    case 'headline': {
      div.className = 'block-headline';
      div.innerHTML = `
        <div class="block-headline-label">Key Finding</div>
        <div class="block-headline-text">${block.text || ''}</div>`;
      break;
    }

    case 'stats': {
      div.className = 'block-stats';
      div.innerHTML = (block.items || []).map(s => `
        <div class="stat-pill">
          <div class="stat-value">${s.value || ''}</div>
          <div class="stat-label">${s.label || ''}</div>
        </div>`).join('');
      break;
    }

    case 'chart': {
      const chartId = `chart-${sectionIndex}-${Date.now()}`;
      div.className = 'block-visual';
      div.innerHTML = `
        ${block.title ? `<div class="visual-title">${block.title}</div>` : ''}
        <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>`;
      // Render chart after DOM insert
      requestAnimationFrame(() => {
        const chartData = {
          type: block.chartType || block.type_hint || 'bar',
          title: block.title || '',
          labels: block.labels || [],
          datasets: block.datasets || [],
          horizontal: block.horizontal,
        };
        if (chartData.labels.length) renderChart(chartId, chartData);
      });
      break;
    }

    case 'diagram': {
      const diagId = `diagram-${sectionIndex}-${Date.now()}`;
      div.className = 'block-visual block-diagram';
      div.innerHTML = `
        ${block.title ? `<div class="visual-title">${block.title}</div>` : ''}
        <div class="block-visual block-diagram">
          <div class="diagram-wrap" id="${diagId}">
            <div style="color:#5A6278;font-size:12px;padding:16px;text-align:center">Rendering diagram...</div>
          </div>
        </div>`;
      if (block.code && typeof mermaid !== 'undefined') {
        setTimeout(async () => {
          const el = document.getElementById(diagId);
          if (!el) return;
          try {
            const { svg } = await mermaid.render('svg-' + diagId, block.code);
            el.innerHTML = svg;
            const svgEl = el.querySelector('svg');
            if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto'; }
          } catch(e) {
            el.innerHTML = '<div style="color:#FC8181;font-size:11px;padding:8px">Diagram unavailable</div>';
          }
        }, 150);
      }
      break;
    }

    case 'table': {
      div.className = 'block-visual';
      const headers = (block.headers || []).map(h => `<th>${h}</th>`).join('');
      const rows    = (block.rows || []).map(r =>
        `<tr>${(Array.isArray(r) ? r : [r]).map(c => `<td>${c}</td>`).join('')}</tr>`
      ).join('');
      div.innerHTML = `
        ${block.title ? `<div class="visual-title">${block.title}</div>` : ''}
        <div style="overflow-x:auto">
          <table class="slide-table">
            <thead><tr>${headers}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
      break;
    }

    case 'callout': {
      const style = block.style || 'insight';
      const icon  = CALLOUT_ICONS[style] || CALLOUT_ICONS.default;
      div.className = `block-callout callout-${style}`;
      div.innerHTML = `
        <div class="callout-icon">${icon}</div>
        <div class="callout-text">${formatCommentary(block.text || '')}</div>`;
      break;
    }

    case 'prose': {
      const html = formatCommentary(block.text || '');
      const id   = `cp-${sectionIndex}`;
      const tid  = `ct-${sectionIndex}`;
      div.className = 'block-prose';
      div.innerHTML = `
        <div class="block-prose-text commentary-preview collapsed" id="${id}">${html}</div>`;
      // Add toggle if prose is long
      if ((block.text || '').length > 300) {
        const toggle = document.createElement('div');
        toggle.className = 'commentary-toggle';
        toggle.id = tid;
        toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg><span>Read full analysis</span>`;
        toggle.onclick = () => toggleCommentary(sectionIndex);
        div.appendChild(toggle);
      } else {
        // Short prose — expand immediately
        const el = div.querySelector('.commentary-preview');
        if (el) { el.classList.remove('collapsed'); el.style.maxHeight = 'none'; el.style.maskImage = 'none'; el.style.webkitMaskImage = 'none'; }
      }
      break;
    }

    case 'sources': {
      div.className = 'block-sources';
      const tags = (block.items || []).map(s => `<span class="source-tag">${s}</span>`).join('');
      div.innerHTML = `<span class="sources-label">Sources</span>${tags}`;
      break;
    }

    default:
      return null;
  }

  return div;
}

function renderBlocks(blocksData, sectionIndex, container) {
  const blocks = Array.isArray(blocksData) ? blocksData : [];
  blocks.forEach(block => {
    const el = renderBlock(block, sectionIndex);
    if (el) container.appendChild(el);
  });
}

function renderSectionHeadline(block, i, title, data) {
  block.classList.remove('generating');

  block.innerHTML = `
    <div class="slide-header" data-num="${String(i+1).padStart(2,'0')}">
      <span class="slide-num">Section ${String(i+1).padStart(2,'0')}</span>
      <span class="slide-title">${title}</span>
    </div>
    <div class="section-body"></div>`;

  const body = block.querySelector('.section-body');

  // ── Phase 3: sub_sections layout ──
  if (data.sub_sections?.length) {
    // Section key finding
    if (data.headline) {
      const hDiv = document.createElement('div');
      hDiv.className = 'block-headline';
      hDiv.innerHTML = `<div class="block-headline-label">Key Finding</div><div class="block-headline-text">${data.headline}</div>`;
      body.appendChild(hDiv);
    }
    // Render each sub-section
    data.sub_sections.forEach((ss, si) => {
      if (si > 0) {
        const sep = document.createElement('div');
        sep.className = 'sub-section-sep';
        body.appendChild(sep);
      }
      const ssDiv = document.createElement('div');
      ssDiv.className = 'sub-section';
      if (ss.subtitle) {
        const subHdr = document.createElement('div');
        subHdr.className = 'sub-section-title';
        subHdr.textContent = ss.subtitle;
        ssDiv.appendChild(subHdr);
      }
      renderBlocks(ss.blocks || [], i * 100 + si, ssDiv);
      body.appendChild(ssDiv);
    });
    // Sources
    if (data.sources?.length) {
      const srcDiv = document.createElement('div');
      srcDiv.className = 'block-sources';
      srcDiv.innerHTML = `<span class="sources-label">Sources</span>${data.sources.map(s=>`<span class="source-tag">${s}</span>`).join('')}`;
      body.appendChild(srcDiv);
    }
    return;
  }

  // ── Legacy blocks mode ──
  if (data.blocks?.length) {
    renderBlocks(data.blocks, i, body);
    return;
  }

  // ── Legacy flat format (backward compat) ──
  const statsHtml = (data.stats?.length)
    ? `<div class="block-stats">${data.stats.map(s => `
        <div class="stat-pill"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('')}</div>`
    : '';
  body.innerHTML = `
    ${data.headline ? `<div class="block-headline"><div class="block-headline-label">Key Finding</div><div class="block-headline-text">${data.headline}</div></div>` : ''}
    ${statsHtml}
    <div class="slide-commentary"></div>`;
}

// Append visuals before a specific anchor element (e.g. before commentary)
function appendVisualsAt(block, i, chart, table, anchor, diagram = null) {
  const chartId  = `chart-${i}`;

  // Normalize chart: backend may return {data:[...]} or {labels, datasets:[...]}
  let normalizedChart = null;
  if (chart) {
    // Already in Chart.js format (has labels + datasets)
    if (chart.labels?.length && chart.datasets?.length) {
      normalizedChart = chart;
    }
    // Alternative: has labels but no datasets (bare format) → wrap
    else if (chart.labels?.length && chart.data?.length) {
      normalizedChart = {
        ...chart,
        datasets: [{ label: chart.title || 'Data', data: chart.data, borderColor: '#1E6FFF' }],
      };
    }
    // Alternative: has data array on datasets items (pptx export format)
    else if (Array.isArray(chart.data) && chart.data[0]?.labels?.length) {
      const firstSeries = chart.data[0];
      normalizedChart = {
        type: chart.type || 'bar',
        title: chart.title || '',
        labels: firstSeries.labels,
        datasets: chart.data.map((s, di) => ({
          label:       s.name || '',
          data:        s.values || [],
          borderColor: ['#1E6FFF','#00C9A7','#F6AD55','#FC8181'][di % 4],
        })),
      };
    }
  }

  const hasChart   = !!(normalizedChart?.labels?.length && normalizedChart?.datasets?.length);
  const hasTable   = table?.headers?.length;
  const hasDiagram = !!(diagram?.code && !hasChart); // diagram only if no chart

  const diagramId = `diagram-${i}-${Date.now()}`;
  const chartHtml = hasChart ? `
    <div class="visual-box">
      <div class="visual-title">${normalizedChart.title || ''}</div>
      <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
    </div>` : '';

  const diagramHtml = hasDiagram ? `
    <div class="visual-box visual-box-diagram">
      ${diagram.title ? `<div class="visual-title">${diagram.title}</div>` : ''}
      <div class="diagram-wrap" id="${diagramId}">
        <div style="color:#5A6278;font-size:12px;padding:16px 0;text-align:center">Rendering diagram...</div>
      </div>
    </div>` : '';

  const tableHtml = hasTable ? `
    <div class="visual-box">
      <div class="visual-title">${table.title || ''}</div>
      <div style="overflow-x:auto">
        <table class="slide-table">
          <thead><tr>${table.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
          <tbody>${(table.rows||[]).map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    </div>` : '';

  if (!chartHtml && !diagramHtml && !tableHtml) return;

  const div = document.createElement('div');
  div.className = 'slide-visuals';
  div.innerHTML = chartHtml + diagramHtml + tableHtml;

  if (anchor) {
    block.insertBefore(div, anchor);
  } else {
    block.appendChild(div);
  }

  if (hasChart) setTimeout(() => renderChart(chartId, normalizedChart), 50);

  // Mermaid diagram rendering (async)
  if (hasDiagram && typeof mermaid !== 'undefined') {
    const svgId = 'svg-' + diagramId;
    setTimeout(async () => {
      const container = document.getElementById(diagramId);
      if (!container) return;
      try {
        const { svg } = await mermaid.render(svgId, diagram.code);
        container.innerHTML = svg;
        // Make SVG responsive
        const svgEl = container.querySelector('svg');
        if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto'; }
      } catch(e) {
        container.innerHTML = `<div style="color:#FC8181;font-size:11px;padding:8px 0">Diagram unavailable</div>`;
        console.warn('[Mermaid]', e.message, '\nCode:', diagram.code?.slice(0, 100));
      }
    }, 150);
  }
}

function appendVisuals(block, i, chart, table, diagram = null) {
  appendVisualsAt(block, i, chart, table, null, diagram);
}

// ── Post-process: Claude extracts best visual from commentary ─────────────
async function extractVisualsFromCommentary(commentary, sectionTitle, sectionIndex, block) {
  if (!block || !commentary) return;
  try {
    setStatus(`🔍 <strong>Extracting visuals</strong> for "${sectionTitle}"...`, null);
    const res = await fetch('/api/extract-visuals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentary, sectionTitle, sectionIndex }),
    });
    if (!res.ok) return;
    const data = await res.json();

    const hasChart = data.chart?.labels?.length && data.chart?.datasets?.length;
    const hasTable = data.table?.headers?.length && data.table?.rows?.length;

    if (hasChart || hasTable) {
      // Insert before commentary toggle (or append if not found)
      const toggle = block.querySelector('.commentary-toggle');
      const comm   = block.querySelector('.slide-commentary');
      const anchor = toggle || comm || null;
      appendVisualsAt(block, sectionIndex, hasChart ? data.chart : null, hasTable ? data.table : null, anchor, data.diagram || null);
      setStatus(`✓ <strong>Visual extracted</strong>`, null);
    }
  } catch(e) {
    // fail silently — visual extraction is best-effort
  }
}

function toggleCommentary(i) {
  const preview = document.getElementById('cp-' + i);
  const toggle  = document.getElementById('ct-' + i);
  if (!preview || !toggle) return;

  const isExpanded = toggle.classList.contains('expanded');

  if (!isExpanded) {
    // Expand — set explicit pixel height so transition is smooth and visible
    const fullH = Math.max(preview.scrollHeight, 120);
    preview.style.maxHeight  = fullH + 'px';
    preview.style.maskImage  = 'none';
    preview.style.webkitMaskImage = 'none';
    preview.classList.remove('collapsed');
    toggle.classList.add('expanded');
    toggle.querySelector('span').textContent = 'Collapse';
    // After transition, let it grow freely (handles dynamic content)
    setTimeout(() => { if (toggle.classList.contains('expanded')) preview.style.maxHeight = 'none'; }, 450);
  } else {
    // Collapse — first set explicit height so transition has a start point
    preview.style.maxHeight  = preview.scrollHeight + 'px';
    // Force reflow so browser registers the start value
    preview.offsetHeight; // eslint-disable-line no-unused-expressions
    requestAnimationFrame(() => {
      preview.style.maxHeight  = '52px';
      preview.style.maskImage  = 'linear-gradient(to bottom,#000 30%,transparent 100%)';
      preview.style.webkitMaskImage = 'linear-gradient(to bottom,#000 30%,transparent 100%)';
      preview.classList.add('collapsed');
      toggle.classList.remove('expanded');
      toggle.querySelector('span').textContent = 'Read full analysis';
    });
  }
}

function appendSources(block, sources) {
  if (!sources?.length) return;
  const div = document.createElement('div');
  div.className = 'slide-sources';
  div.innerHTML = `<span class="sources-label">Sources</span>${sources.map(s=>`<span class="source-tag">${s}</span>`).join('')}`;
  block.appendChild(div);
}




function formatCommentary(text) {
  if (!text) return '';
  return text
    .split('\n\n').filter(Boolean)
    .map(p => `<p>${p
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    }</p>`)
    .join('');
}

// ── Progress UI helpers ───────────────────────────────────
function buildSectionProgressList(sections) {
  const list = document.getElementById('section-progress-list');
  list.innerHTML = sections.map((title, i) => `
    <div class="sec-prog-item pending" id="secprog-${i}">
      <span class="sec-prog-dot"></span>
      <span>${title}</span>
      <span class="sec-prog-time" id="secprog-time-${i}">~${SEC_PER_SECTION}s</span>
    </div>`).join('');
}

const sectionStartTimes = {};
function setSectionStatus(i, status, tookSecs = null) {
  const el = document.getElementById(`secprog-${i}`);
  const timeEl = document.getElementById(`secprog-time-${i}`);
  if (!el) return;
  el.classList.remove('pending', 'active', 'done');
  el.classList.add(status);
  if (status === 'active') {
    sectionStartTimes[i] = Date.now();
    timeEl.textContent = 'writing...';
  }
  if (status === 'done') {
    const took = sectionStartTimes[i] ? Math.round((Date.now() - sectionStartTimes[i]) / 1000) : tookSecs;
    timeEl.textContent = `✓ ${took}s`;
  }
}

// ── Render functions ──────────────────────────────────────
const chartInstances = {};

function renderReportMeta(params, slug) {
  document.getElementById('report-title').textContent =
    (params.industry || '—') + ' Market — ' + (params.country || '—');
  document.getElementById('report-meta-sub').textContent =
    params.country + ' · ' + (params.industry || '').toUpperCase() + ' · 2026';

  // Show report URL for easy access later
  if (slug) {
    const url = `${location.origin}/report.html?slug=${slug}`;
    const urlEl = document.getElementById('report-url-text');
    const row   = document.getElementById('report-url-row');
    if (urlEl) urlEl.textContent = url;
    if (row)   row.style.display = 'flex';
  }
  const badges = document.getElementById('report-badges');
  // Remove only meta-badge spans, keep export buttons
  badges.querySelectorAll('.meta-badge').forEach(el => el.remove());
  [params.country, params.reportType?.replace(/_/g,' '), '2026'].forEach(b => {
    if (!b) return;
    const span = document.createElement('span');
    span.className = 'meta-badge';
    span.textContent = b.charAt(0).toUpperCase() + b.slice(1);
    badges.insertBefore(span, badges.firstChild);
  });
}

function renderReport(data) {
  // Called when loading existing completed report
  setStep(4);
  showView('report');
  renderReportMeta(data.inputParams || {}, data.slug || '');
  currentParams = data.inputParams || {};
  window._completedSections = data.sections || [];

  const container = document.getElementById('sections-container');
  const tocList   = document.getElementById('toc-list');
  container.innerHTML = '';
  tocList.innerHTML   = '';

  (data.sections || []).forEach((sec, i) => {
    addTocItem(sec.title, i);
    renderSection(sec, i, data.sections.length);
  });

  setTimeout(() => {
    const chatbox = document.getElementById('chatbox');
    const pptxBtn = document.getElementById('btn-export-pptx');
    const pdfBtn  = document.getElementById('btn-export-pdf');
    const presBtn = document.getElementById('btn-present');
    if (chatbox) chatbox.style.display = 'block';
    if (pptxBtn) pptxBtn.style.display = 'inline-flex';
    if (pdfBtn)  pdfBtn.style.display  = 'inline-flex';
    if (presBtn) presBtn.style.display = 'inline-flex';
  }, 500);
  reportSlug = data.slug;
}

function addTocItem(title, i) {
  const tocList = document.getElementById('toc-list');
  const el = document.createElement('div');
  el.className = 'toc-item done';
  el.id = 'toc-' + i;
  el.innerHTML = `<span class="toc-dot"></span><span>${title}</span>`;
  el.onclick = () => document.getElementById('sec-' + i)?.scrollIntoView({ behavior: 'smooth' });
  tocList.appendChild(el);
}

function renderSection(sec, i, total) {
  const container = document.getElementById('sections-container');
  addTocItem(sec.title, i);

  let parsed = null;
  try { parsed = JSON.parse(sec.content); } catch { parsed = null; }

  const block = document.createElement('div');
  block.className = 'section-block';
  block.id = 'sec-' + i;

  if (!parsed || sec.status === 'generating') {
    block.classList.add('generating');
    block.innerHTML = `
      <div class="slide-header" data-num="${String(i+1).padStart(2,'0')}">
        <span class="slide-num">Section ${String(i+1).padStart(2,'0')}</span>
        <span class="slide-title">${sec.title}</span>
      </div>
      <div class="generating-pulse"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span style="margin-left:6px">Writing...</span></div>`;
    container.appendChild(block);
    setTimeout(() => block.classList.add('visible'), 50);
    return;
  }

  // ── Stats row ──
  const statsHtml = (parsed.stats?.length)
    ? `<div class="slide-stats">${parsed.stats.map(s => `
        <div class="stat-pill">
          <div class="stat-icon">${getStatIcon(s.icon)}</div>
          <div>
            <div class="stat-value">${s.value}</div>
            <div class="stat-label">${s.label}</div>
          </div>
        </div>`).join('')}</div>`
    : '';

  // ── Chart + Diagram + Table — rendered BEFORE commentary ──
  const hasChart   = parsed.chart?.labels?.length;
  const hasTable   = parsed.table?.headers?.length;
  const hasDiagram = !!(parsed.diagram?.code && !hasChart);
  const chartId    = `chart-${i}`;
  const diagramId  = `diagram-${i}`;
  let visualsHtml = '';
  if (hasChart || hasTable || hasDiagram) {
    const chartHtml = hasChart ? `
      <div class="visual-box">
        <div class="visual-title">${parsed.chart.title || ''}</div>
        <div class="chart-wrap"><canvas id="${chartId}"></canvas></div>
      </div>` : '';
    const diagramHtml = hasDiagram ? `
      <div class="visual-box visual-box-diagram">
        ${parsed.diagram.title ? `<div class="visual-title">${parsed.diagram.title}</div>` : ''}
        <div class="diagram-wrap" id="${diagramId}">
          <div style="color:#5A6278;font-size:12px;padding:16px 0;text-align:center">Rendering diagram...</div>
        </div>
      </div>` : '';
    const tableHtml = hasTable ? `
      <div class="visual-box">
        <div class="visual-title">${parsed.table.title || ''}</div>
        <div style="overflow-x:auto">
          <table class="slide-table">
            <thead><tr>${parsed.table.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${(parsed.table.rows||[]).map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      </div>` : '';
    visualsHtml = `<div class="slide-visuals">${chartHtml}${diagramHtml}${tableHtml}</div>`;
  }

  // ── Commentary — collapsible, visual-first ──
  const commentaryParagraphs = (parsed.commentary || '')
    .split('\n\n').filter(Boolean)
    .map(p => `<p>${p.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/^### (.+)$/gm,'<h3>$1</h3>')}</p>`)
    .join('');

  const commentaryHtml = commentaryParagraphs ? `
    <div class="slide-commentary">
      <div class="commentary-preview collapsed" id="cp-${i}">${commentaryParagraphs}</div>
    </div>
    <div class="commentary-toggle" id="ct-${i}" onclick="toggleCommentary(${i})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      <span>Read full analysis</span>
    </div>` : '';

  // ── Sources ──
  const sourcesHtml = (parsed.sources?.length)
    ? `<div class="slide-sources">
        <span class="sources-label">Sources</span>
        ${parsed.sources.map(s => `<span class="source-tag">${s}</span>`).join('')}
       </div>` : '';

  // ── Layout: finding → stats → visuals → commentary (collapsed) → sources ──
  block.innerHTML = `
    <div class="slide-header" data-num="${String(i+1).padStart(2,'0')}">
      <span class="slide-num">Section ${String(i+1).padStart(2,'0')}</span>
      <span class="slide-title">${sec.title}</span>
    </div>
    ${parsed.headline ? `
    <div class="slide-headline">
      <div class="slide-headline-label">Key Finding</div>
      <div class="slide-headline-text">${parsed.headline}</div>
    </div>` : ''}
    ${statsHtml}
    ${visualsHtml}
    ${commentaryHtml}
    ${sourcesHtml}`;

  container.appendChild(block);
  setTimeout(() => {
    block.classList.add('visible');
    if (hasChart) renderChart(chartId, parsed.chart);
    // Mermaid diagram rendering
    if (hasDiagram && typeof mermaid !== 'undefined') {
      const svgId = 'svg-' + diagramId + '-' + Date.now();
      const container2 = document.getElementById(diagramId);
      if (container2) {
        mermaid.render(svgId, parsed.diagram.code).then(({ svg }) => {
          container2.innerHTML = svg;
          const svgEl = container2.querySelector('svg');
          if (svgEl) { svgEl.style.maxWidth = '100%'; svgEl.style.height = 'auto'; }
        }).catch(e => {
          container2.innerHTML = '<div style="color:#FC8181;font-size:11px;padding:8px 0">Diagram unavailable</div>';
          console.warn('[Mermaid]', e.message);
        });
      }
    }
  }, 80);
}

// ── Stat icons (line art SVG) ─────────────────────────────
function getStatIcon(type) {
  const icons = {
    pie:     `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
    growth:  `<svg viewBox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    trend:   `<svg viewBox="0 0 24 24"><polyline points="3 17 9 11 13 15 21 7"/></svg>`,
    users:   `<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    channel: `<svg viewBox="0 0 24 24"><rect x="2" y="7" width="6" height="10" rx="1"/><rect x="9" y="4" width="6" height="16" rx="1"/><rect x="16" y="9" width="6" height="8" rx="1"/></svg>`,
    price:   `<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    globe:   `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    check:   `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  };
  return icons[type] || icons.trend;
}

// ── Chart.js renderer ─────────────────────────────────────
function renderChart(canvasId, chartDef) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  const COLORS = ['#1E6FFF','#00C9A7','#F6AD55','#FC8181','#B794F4','#4FD1C5','#F687B3','#68D391','#60A5FA','#34D399'];
  const rawType = chartDef.type || 'bar';
  const isHorizontalBar = rawType === 'horizontalBar' || rawType === 'bar_horizontal';
  const isStacked = chartDef.stacked || (chartDef.datasets?.length > 1 && rawType === 'bar');
  const type = (rawType === 'donut') ? 'doughnut'
             : (isHorizontalBar)     ? 'bar'
             : rawType;
  const isPie    = type === 'pie' || type === 'doughnut';
  const isRadar  = type === 'radar';
  const isLine   = type === 'line';

  const datasets = (chartDef.datasets || []).map((ds, di) => ({
    label:            ds.label || '',
    data:             ds.data  || [],
    backgroundColor:  isPie    ? COLORS
                    : isRadar  ? COLORS[di % COLORS.length] + '33'
                    : COLORS[di % COLORS.length],
    borderColor:      COLORS[di % COLORS.length],
    borderWidth:      isLine   ? 2 : isRadar ? 1.5 : 0,
    fill:             isLine && di === 0,
    tension:          0.4,
    borderRadius:     (!isPie && !isRadar && !isLine) ? 4 : 0,
    pointBackgroundColor: isRadar ? COLORS[di % COLORS.length] : undefined,
    pointRadius:          isRadar ? 4 : undefined,
  }));

  const scalesConfig = isPie || isRadar ? {} : {
    x: {
      ticks:  { color: '#5A6278', font: { size: 11 } },
      grid:   { color: '#1A1D24' },
      stacked: isStacked,
      ...(isHorizontalBar ? {} : {}),
    },
    y: {
      ticks:  { color: '#5A6278', font: { size: 11 } },
      grid:   { color: '#1A1D24' },
      beginAtZero: true,
      stacked: isStacked,
    }
  };

  const radarScales = isRadar ? {
    r: {
      ticks:        { color: '#5A6278', font: { size: 10 }, backdropColor: 'transparent' },
      grid:         { color: '#1A1D24' },
      pointLabels:  { color: '#A3A9B6', font: { size: 11 } },
      angleLines:   { color: '#1A1D24' },
    }
  } : {};

  chartInstances[canvasId] = new Chart(canvas, {
    type,
    data: { labels: chartDef.labels || [], datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isHorizontalBar ? 'y' : 'x',
      plugins: {
        legend: {
          display: datasets.length > 1 || isPie || isRadar,
          labels: { color: '#A3A9B6', font: { size: 11, family: 'Arial' }, boxWidth: 12, padding: 14 }
        },
        tooltip: {
          backgroundColor: '#161B24', titleColor: '#fff',
          bodyColor: '#A3A9B6', borderColor: '#242A35', borderWidth: 1
        }
      },
      scales: isRadar ? radarScales : scalesConfig,
    }
  });
}

// ── Status bar ────────────────────────────────────────────
function setStatus(text, pct, visible = true) {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.style.display = visible ? 'flex' : 'none';
  if (text !== null) document.getElementById('status-text').innerHTML = text;
  if (pct !== null) {
    document.getElementById('status-pbar-fill').style.width = pct + '%';
    document.getElementById('status-pct').textContent = pct + '%';
  }
}

// ── Export modal ──────────────────────────────────────────
let _expFmt = 'pptx', _expTheme = 'dark';

function openExpModal(fmt) {
  _expFmt = fmt || 'pptx';
  setExpFmt(_expFmt);
  // Populate preview
  const title = (document.getElementById('report-title')?.textContent || 'Report').slice(0, 52) + '…';
  const secs  = String((window._completedSections || []).length);
  ['eprev-title','eprev-title-l'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = title; });
  ['eprev-secs','eprev-secs-l'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = secs; });
  updateExpFname();
  document.getElementById('expOv').classList.add('open');
}

function closeExpModal() { document.getElementById('expOv').classList.remove('open'); }
function expBgClose(e) { if (e.target === document.getElementById('expOv')) closeExpModal(); }

function setExpFmt(f) {
  _expFmt = f;
  document.getElementById('efmt-pptx')?.classList.toggle('on', f === 'pptx');
  document.getElementById('efmt-pdf')?.classList.toggle('on', f === 'pdf');
  // Legacy IDs (docreport.html, older pages)
  document.getElementById('expFmtPptx')?.classList.toggle('active', f === 'pptx');
  document.getElementById('expFmtPdf')?.classList.toggle('active', f === 'pdf');
  const themesBlock = document.getElementById('exp-themes-block');
  const headSub = document.getElementById('exp-head-sub');
  if (f === 'pdf') {
    if (themesBlock) themesBlock.style.display = 'none';
    if (headSub) headSub.textContent = 'Print-ready PDF — light theme';
    _expTheme = 'light';
  } else {
    if (themesBlock) themesBlock.style.display = 'grid';
    if (headSub) headSub.textContent = 'Choose format and visual style';
    // Restore the visually-selected theme (whichever card has .sel)
    _expTheme = document.getElementById('etc-dark')?.classList.contains('sel') ? 'dark' : 'light';
  }
  updateExpFname();
}

function setExpTheme(t) {
  _expTheme = t;
  ['dark','light'].forEach(th => {
    document.getElementById('etc-' + th)?.classList.toggle('sel', th === t);
    const ck = document.getElementById('etck-' + th);
    if (ck) {
      ck.classList.toggle('on', th === t);
      ck.innerHTML = th === t ? '<svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.5"><polyline points="2 6 5 9 10 3"/></svg>' : '';
    }
    // Legacy IDs
    document.getElementById('expTheme' + th.charAt(0).toUpperCase() + th.slice(1))?.classList.toggle('active', th === t);
  });
  updateExpFname();
}

function updateExpFname() {
  const slug = (reportSlug || 'report').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const el = document.getElementById('expFname');
  if (el) el.textContent = `${slug}-${_expTheme}.${_expFmt}`;
}

async function doExpDownload() {
  if (_expFmt === 'pdf') { exportPdf(); closeExpModal(); return; }

  const btn = document.getElementById('expDlBtn');
  btn.disabled = true;
  btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Preparing…';

  try {
    const rawSections = window._completedSections || [];
    const cp = window.currentParams || currentParams || {};

    const sections = rawSections.map(sec => {
      let p = {};
      try { p = JSON.parse(sec.content || '{}'); } catch {}

      // Phase 3 format: flatten sub_sections into charts/tables for PPTX
      let chart = p.chart, tableHeaders = p.table?.headers, tableRows = p.table?.rows, stats = p.stats || [];
      if (p.sub_sections?.length) {
        // Use first chart found across sub-sections
        for (const ss of p.sub_sections) {
          const chartBlk = (ss.blocks||[]).find(b => b.type === 'chart');
          const tableBlk = (ss.blocks||[]).find(b => b.type === 'table');
          const statsBlk = (ss.blocks||[]).find(b => b.type === 'stats');
          if (!chart && chartBlk) chart = { type: chartBlk.chartType, title: chartBlk.title, labels: chartBlk.labels, datasets: chartBlk.datasets, horizontal: chartBlk.horizontal };
          if (!tableHeaders && tableBlk) { tableHeaders = tableBlk.headers; tableRows = tableBlk.rows; }
          if (!stats.length && statsBlk) stats = statsBlk.items || [];
        }
      }

      return {
        label:   sec.title || '',
        title:   p.headline || sec.title || '',
        source:  (p.sources || []).slice(0,3).join('; '),
        finding: p.headline || '',
        stats:   (stats).slice(0, 6).map(s => ({
          label: s.label || '', value: s.value || '', change: '',
          accentColor: s.icon === 'growth' || s.icon === 'trend' ? '00C9A7'
                     : s.icon === 'price'  || s.icon === 'channel' ? 'C9A84C' : '1E6FFF',
        })),
        chart:        chart ? buildExpChart(chart) : undefined,
        tableHeaders: tableHeaders,
        tableRows:    (tableRows || []).slice(0, 20),
        commentary:   (p.commentary || '').slice(0, 800),
      };
    });

    const res = await fetch('/api/export-pptx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug:      reportSlug || 'report',
        title:     document.getElementById('report-title')?.textContent || '',
        country:   cp.country    || '',
        industry:  cp.industry   || '',
        type:      cp.reportType || '',
        generated: new Date().getFullYear().toString(),
        theme:     _expTheme,
        sections,
      })
    });

    if (!res.ok) throw new Error('Export failed: ' + res.status);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(reportSlug || 'report')}-${_expTheme}.pptx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeExpModal();
  } catch (e) {
    alert('Export error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download';
  }
}

function buildExpChart(ch) {
  if (!ch?.type) return null;
  const hex = c => (c || '1E6FFF').replace('#', '');
  const COLS = ['1E6FFF','00C9A7','F6AD55','FC8181','B794F4','4FD1C5'];
  if (ch.type === 'bar' || ch.type === 'horizontalBar' || ch.type === 'bar_horizontal') {
    const dir = (ch.type === 'horizontalBar' || ch.type === 'bar_horizontal') ? 'bar' : 'col';
    if (ch.datasets?.length) {
      return { type:'bar', dir, title:ch.title,
        data: ch.datasets.map(ds => ({ name:ds.label, labels:ch.labels, values:ds.data })),
        colors: ch.datasets.map((ds,i) => hex(ds.borderColor || COLS[i])) };
    }
    return { type:'bar', dir, title:ch.title,
      data: [{ name:'Data', labels:ch.labels||[], values:ch.data||[] }],
      colors: (ch.labels||[]).map((_,i) => COLS[i % COLS.length]) };
  }
  if (ch.type === 'doughnut' || ch.type === 'donut' || ch.type === 'pie') {
    return { type:'doughnut', title:ch.title,
      data: [{ name:'Mix', labels:ch.labels||[], values:(ch.datasets?.[0]?.data || ch.data || []) }],
      colors: (ch.labels||[]).map((_,i) => COLS[i % COLS.length]) };
  }
  if (ch.type === 'line') {
    return { type:'line', title:ch.title, labels:ch.labels||[],
      datasets: (ch.datasets||[]).map((ds,i) => ({ name:ds.label, values:ds.data, color:hex(ds.borderColor||COLS[i]) })) };
  }
  if (ch.type === 'radar') {
    return { type:'radar', title:ch.title, labels:ch.labels||[],
      datasets: (ch.datasets||[]).map((ds,i) => ({ name:ds.label, values:ds.data, color:hex(ds.borderColor||COLS[i]) })) };
  }
  return null;
}

// ── Export PDF ────────────────────────────────────────────
function exportPdf() {
  // Expand all collapsed commentary so full text prints
  document.querySelectorAll('.commentary-preview').forEach(el => {
    el.style.maxHeight  = 'none';
    el.style.maskImage  = 'none';
    el.style.webkitMaskImage = 'none';
    el.classList.remove('collapsed');
  });
  document.querySelectorAll('.commentary-toggle').forEach(el => { el.style.display = 'none'; });

  // Force all Chart.js instances to resize to container (prevents overflow in PDF)
  document.querySelectorAll('.chart-wrap canvas').forEach(canvas => {
    const wrap = canvas.parentElement;
    if (wrap) {
      canvas.style.maxWidth  = '100%';
      canvas.style.maxHeight = '200px';
      canvas.style.width     = '100%';
      canvas.style.height    = 'auto';
    }
    // Trigger Chart.js resize if instance exists
    const chartInst = Chart.getChart?.(canvas);
    if (chartInst) { try { chartInst.resize(canvas.offsetWidth || 600, 200); } catch {} }
  });

  const title = document.getElementById('report-title')?.textContent || 'KIRA Report';
  const origTitle = document.title;
  document.title = title;

  setTimeout(() => {
    window.print();
    document.title = origTitle;
    // Restore state after print dialog closes
    setTimeout(() => {
      document.querySelectorAll('.commentary-preview').forEach(el => {
        el.style.maxHeight = '52px';
        el.style.maskImage = '';
        el.style.webkitMaskImage = '';
        el.classList.add('collapsed');
      });
      document.querySelectorAll('.commentary-toggle').forEach(el => { el.style.display = ''; });
      document.querySelectorAll('.chart-wrap canvas').forEach(canvas => {
        canvas.style.maxWidth = '';
        canvas.style.maxHeight = '';
        canvas.style.width = '';
        canvas.style.height = '';
      });
    }, 1500);
  }, 200);
}

// Keep old exportPptx as alias in case called elsewhere
function exportPptx() { openExpModal('pptx'); }

// ── Chat ─────────────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;

  input.value = '';
  addChatMessage('user', msg);
  // Use window.chatHistory so page scripts sharing window scope work correctly
  window.chatHistory = window.chatHistory || [];
  window.chatHistory.push({ role: 'user', content: msg });

  const send = document.getElementById('chat-send');
  send.disabled = true;

  const aiMsg = addChatMessage('ai', '');
  const dotHtml = '<span class="generating-pulse"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>';
  aiMsg.innerHTML = dotHtml;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: window.reportId, messages: window.chatHistory })
    });
    const data = await res.json();
    const reply = data.reply || 'Sorry, I could not generate a response.';
    aiMsg.innerHTML = formatCommentary(reply);
    window.chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) {
    aiMsg.textContent = 'Error: ' + e.message;
  }

  send.disabled = false;
  input.focus();
}

function addChatMessage(role, text) {
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

// ── View helpers ─────────────────────────────────────────
function showView(name) {
  ['form','progress','report'].forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.style.display = v === name ? 'block' : 'none';
  });
}

function showAlert(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 5000);
}

// ── Init ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);

  // Returning from PayPal
  if (params.get('unlocked') === '1') {
    setStep(2);
    // Mark step 2 done, move to 3
    const step2 = document.getElementById('step-2');
    if (step2) step2.classList.add('done');
    await startGeneration();
    return;
  }

  // Direct link to existing report
  const slug = params.get('slug');
  if (slug) {
    const hasPurchase = await window.kiraAuth.hasPurchased(slug);
    if (hasPurchase) {
      showView('progress');
      setStep(3);
      // Fetch completed report
      const res  = await fetch('/api/get-report?slug=' + slug);
      const data = await res.json();
      if (data.status === 'completed') renderReport(data);
      else { reportId = data.id; pollInterval = setInterval(pollStatus, 3000); }
      return;
    }
  }

  // Default: show form (only for pages that have view-form)
  if (document.getElementById('view-form')) {
    showView('form');
    setStep(1);
  }
});

// ── PRESENTATION MODE ─────────────────────────────────────
const presCharts = {};
let presSlides = [], presIdx = 0;

// Extract 3-4 key insight sentences from commentary prose
function extractKeyPoints(commentary, max) {
  if (!commentary) return [];
  const clean = commentary.replace(/\*\*(.*?)\*\*/g, '$1').replace(/###\s*/g, '');
  const paras = clean.split(/\n\n+/).filter(p => p.trim().length > 40).slice(0, max + 1);
  return paras.map(p => {
    // First 2 sentences of each paragraph
    const sentences = p.match(/[^.!?]+[.!?]+/g) || [p];
    return sentences.slice(0, 2).join(' ').trim().slice(0, 220);
  }).filter(Boolean).slice(0, max);
}

function buildPresentationSlides(sections) {
  const slides = [];

  sections.forEach((sec, si) => {
    let p = {};
    try { p = JSON.parse(sec.content || '{}'); } catch {}
    const sectionNum   = String(si + 1).padStart(2, '0');
    const sectionTitle = sec.title || '';
    const headline     = p.headline || '';
    const sources      = (p.sources || []).slice(0, 2).join('; ') || '';

    // ── Divider: section opener ──────────────────────────────
    slides.push({ type: 'divider', sectionNum, sectionTitle, headline, sources });

    // ── Phase 3: sub_sections → each becomes a content slide ─
    if (p.sub_sections?.length) {
      p.sub_sections.forEach((ss, ssi) => {
        const ssBlocks  = ss.blocks || [];
        const subtitle  = ss.subtitle || sectionTitle;
        const chart     = ssBlocks.find(b => b.type === 'chart');
        const diagram   = ssBlocks.find(b => b.type === 'diagram');
        const table     = ssBlocks.find(b => b.type === 'table');
        const statsBlk  = ssBlocks.find(b => b.type === 'stats');
        const callout   = ssBlocks.find(b => b.type === 'callout');
        const proseBlks = ssBlocks.filter(b => b.type === 'prose');
        const keyPoints = extractKeyPoints(proseBlks.map(b => b.text||'').join('\n'), 3);

        if (chart) {
          slides.push({
            type: 'analysis', sectionNum, sectionTitle, headline, sources,
            subtitle, chart, keyPoints,
            stats: statsBlk?.items || [],
          });
        } else if (diagram) {
          slides.push({
            type: 'diagram_slide', sectionNum, sectionTitle, headline, sources,
            subtitle, diagram, keyPoints,
          });
        } else if (table) {
          slides.push({
            type: 'data', sectionNum, sectionTitle, headline, sources,
            subtitle, table,
            keyPoints,
          });
        } else if (statsBlk || callout || keyPoints.length) {
          slides.push({
            type: 'insight', sectionNum, sectionTitle, headline, sources,
            subtitle: callout ? callout.text.slice(0,80) : subtitle,
            keyPoints,
            stats: statsBlk?.items || [],
          });
        }
      });

    // ── Legacy fallback: old flat format ─────────────────────
    } else {
      const commentary = p.commentary || '';
      const stats      = p.stats || [];
      const keyPoints  = extractKeyPoints(commentary, 4);
      const hasChart   = p.chart?.labels?.length && p.chart?.datasets?.length;
      const hasTable   = p.table?.headers?.length && p.table?.rows?.length;

      if (stats.length || headline) {
        slides.push({
          type: 'dashboard', variant: si % 3,
          sectionNum, sectionTitle, headline, stats, sources,
          subtitle: headline || sectionTitle,
          keyPoints: keyPoints.slice(0, 2),
        });
      }
      if (hasChart) {
        slides.push({
          type: 'analysis', sectionNum, sectionTitle, headline, sources,
          subtitle: p.chart.title || sectionTitle,
          chart: p.chart, keyPoints: keyPoints.slice(0, 3),
        });
      }
      if (hasTable) {
        slides.push({
          type: 'data', sectionNum, sectionTitle, headline, sources,
          subtitle: p.table.title || sectionTitle,
          table: p.table,
          keyPoints: keyPoints.slice(hasChart ? 2 : 0, hasChart ? 4 : 3),
        });
      }
      if (!stats.length && !hasChart && !hasTable && keyPoints.length) {
        slides.push({
          type: 'insight', sectionNum, sectionTitle, headline, sources,
          subtitle: headline || sectionTitle, keyPoints,
        });
      }
    }
  });

  return slides;
}

function renderPresentSlide(idx) {
  Object.values(presCharts).forEach(c => { try { c.destroy(); } catch {} });
  Object.keys(presCharts).forEach(k => delete presCharts[k]);

  const slide = presSlides[idx];
  if (!slide) return;
  const el = document.getElementById('pres-slide');

  document.getElementById('pres-cur').textContent = idx + 1;
  document.getElementById('pres-tot').textContent = presSlides.length;
  document.getElementById('pres-section-hint').textContent =
    `Section ${slide.sectionNum} — ${slide.sectionTitle}`;
  document.getElementById('pres-prev').disabled = idx === 0;
  document.getElementById('pres-next').disabled = idx === presSlides.length - 1;

  const dots = document.getElementById('pres-dots');
  dots.innerHTML = presSlides.map((_, i) =>
    `<div class="pres-dot ${i < idx ? 'done' : i === idx ? 'active' : ''}"></div>`
  ).join('');

  const reportTitle = document.getElementById('pres-report-title').textContent || 'KIRA RESEARCH';
  const pageLabel   = `${idx + 1} / ${presSlides.length}`;
  const src         = slide.sources || 'Proprietary research library';

  // ── Shared sub-components ──
  const slideHead = (secNum, meta) => `
    <div class="mc-slide-head">
      <div class="mc-slide-brand"><div class="mc-brand-mark"></div><div class="mc-brand-name">KIRA RESEARCH</div></div>
      <div class="mc-slide-meta"><strong>${secNum}</strong>${meta ? ` &mdash; ${meta}` : ''}</div>
    </div>`;

  const slideFoot = () => `
    <div class="mc-slide-foot">
      <div class="mc-foot-source">Source: ${src}</div>
      <div class="mc-foot-right"><div class="mc-foot-brand">KIRA RESEARCH</div><div class="mc-foot-pager">${pageLabel}</div></div>
    </div>`;

  const msgBar = (text) => text ? `
    <div class="mc-msg-bar"><div class="mc-msg-text">"${text}"</div></div>` : '';

  const findingBox = (headline) => headline ? `
    <div class="mc-col-find">
      <div class="mc-col-find-lbl">Key Finding</div>
      <div class="mc-col-find-txt">${headline}</div>
    </div>` : '';

  // Numbered key points — McKinsey circles
  const keyPointsHtml = (pts) => pts?.length ? `
    <div class="mc-keypts">${pts.map((pt, i) =>
      `<div class="mc-keypt">
        <div class="mc-keypt-num">${i + 1}</div>
        <div class="mc-keypt-txt">${pt}</div>
      </div>`
    ).join('')}</div>` : '';

  const VARIANT = ['', 'v2', 'v3', 'v4', 'v5', '', 'v2', 'v3'];

  // ─────────────────────────────────────────────────────
  // DIVIDER slide — dark navy, section opener
  // ─────────────────────────────────────────────────────
  if (slide.type === 'divider') {
    el.innerHTML = `
      <div class="mc-divider-slide">
        <div class="mc-div-grid"></div>
        <div class="mc-div-stripe"></div>
        <div class="mc-div-head">
          <div class="mc-div-brand"><div class="mc-div-brand-mark"></div><div class="mc-div-brand-name">KIRA RESEARCH</div></div>
          <div class="mc-div-meta">Market Intelligence</div>
        </div>
        <div class="mc-div-body">
          <div class="mc-div-num-bg">${slide.sectionNum}</div>
          <div class="mc-div-secnum">SECTION ${slide.sectionNum}</div>
          <div class="mc-div-rule"></div>
          <div class="mc-div-title">${slide.sectionTitle}</div>
          ${slide.headline ? `
          <div class="mc-div-finding">
            <div class="mc-div-finding-lbl">Key Finding</div>
            <div class="mc-div-finding-text">${slide.headline}</div>
          </div>` : ''}
        </div>
        <div class="mc-div-foot">
          <div class="mc-div-foot-src">Source: ${src}</div>
          <div class="mc-div-foot-pg">${pageLabel}</div>
        </div>
      </div>`;
    return;
  }

  // ─────────────────────────────────────────────────────
  // DASHBOARD slide — stats grid + finding + key points
  // ─────────────────────────────────────────────────────
  if (slide.type === 'dashboard') {
    const n = (slide.stats || []).slice(0, 4).length;
    const variant = slide.variant ?? 0;

    const statsGrid = (slide.stats || []).slice(0, 4).map((s, i) => `
      <div class="mc-stat ${VARIANT[i]}">
        <div class="mc-stat-lbl">${s.label || ''}</div>
        <div class="mc-stat-val">${s.value || ''}</div>
      </div>`).join('');

    let bodyHtml = '';

    if (variant === 0) {
      // Stats row + numbered key points
      bodyHtml = `
        <div class="mc-dash">
          <div class="mc-dash-stats">${statsGrid}</div>
          <div class="mc-dash-comm">
            <div class="mc-col-tag">Key Insights</div>
            ${keyPointsHtml(slide.keyPoints)}
          </div>
        </div>`;
    } else if (variant === 1) {
      // Large finding left + 2×2 stats right
      bodyHtml = `
        <div style="flex:1;display:grid;grid-template-columns:42% 1fr;overflow:hidden;min-height:0">
          <div style="padding:12px 16px 10px 28px;border-right:1px solid #E2E8F0;display:flex;flex-direction:column;gap:8px;overflow:hidden">
            <div class="mc-col-tag">Key Finding</div>
            ${findingBox(slide.headline)}
            ${keyPointsHtml(slide.keyPoints?.slice(0,2))}
          </div>
          <div style="padding:12px 28px 10px 16px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;overflow:hidden">
            ${statsGrid}
          </div>
        </div>`;
    } else {
      // Hero single large stat + row of 3 smaller + key points
      const [hero, ...rest] = (slide.stats || []).slice(0, 4);
      bodyHtml = `
        <div class="mc-dash">
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px;flex-shrink:0">
            ${hero ? `<div class="mc-stat" style="padding:14px;"><div class="mc-stat-lbl">${hero.label}</div><div class="mc-stat-val" style="font-size:28px">${hero.value}</div></div>` : ''}
            ${rest.map((s,i) => `<div class="mc-stat ${VARIANT[i+1]}"><div class="mc-stat-lbl">${s.label}</div><div class="mc-stat-val">${s.value}</div></div>`).join('')}
          </div>
          <div class="mc-dash-comm">
            <div class="mc-col-tag">Key Insights</div>
            ${keyPointsHtml(slide.keyPoints?.slice(0,2))}
          </div>
        </div>`;
    }

    el.innerHTML = `
      <div class="mc-slide">
        ${slideHead(slide.sectionNum, slide.sectionTitle)}
        ${msgBar(slide.headline)}
        ${bodyHtml}
        ${slideFoot()}
      </div>`;
    return;
  }

  // ─────────────────────────────────────────────────────
  // ANALYSIS slide — 2-col McKinsey: commentary | chart
  // ─────────────────────────────────────────────────────
  if (slide.type === 'analysis') {
    const chartId = `pc-${idx}`;
    el.innerHTML = `
      <div class="mc-slide">
        ${slideHead(slide.sectionNum, slide.sectionTitle)}
        ${msgBar(slide.subtitle)}
        <div class="mc-2col">
          <div class="mc-2col-left">
            <div class="mc-col-tag">Analysis</div>
            ${findingBox(slide.headline)}
            ${keyPointsHtml(slide.keyPoints)}
          </div>
          <div class="mc-2col-right">
            <div class="mc-col-vis-title">${slide.chart?.title || 'Data Visualization'}</div>
            <div class="mc-chart-2col"><canvas id="${chartId}"></canvas></div>
          </div>
        </div>
        ${slideFoot()}
      </div>`;

    setTimeout(() => {
      const canvas = document.getElementById(chartId);
      if (!canvas || !slide.chart) return;
      renderPresChart(chartId, slide.chart);
    }, 60);
    return;
  }

  // ─────────────────────────────────────────────────────
  // DIAGRAM slide — full-width Mermaid diagram
  // ─────────────────────────────────────────────────────
  if (slide.type === 'diagram_slide') {
    const diagId = `pd-${idx}`;
    el.innerHTML = `
      <div class="mc-slide">
        ${slideHead(slide.sectionNum, slide.sectionTitle)}
        ${msgBar(slide.subtitle)}
        <div class="mc-2col">
          <div class="mc-2col-left">
            <div class="mc-col-tag">Analysis</div>
            ${findingBox(slide.headline)}
            ${keyPointsHtml(slide.keyPoints)}
          </div>
          <div class="mc-2col-right" style="display:flex;flex-direction:column;justify-content:center;padding:16px">
            <div class="mc-col-vis-title">${slide.diagram?.title || ''}</div>
            <div id="${diagId}" style="flex:1;min-height:120px;display:flex;align-items:center;justify-content:center">
              <div style="color:#8896A8;font-size:11px">Rendering diagram...</div>
            </div>
          </div>
        </div>
        ${slideFoot()}
      </div>`;
    if (slide.diagram?.code && typeof mermaid !== 'undefined') {
      setTimeout(async () => {
        const container = document.getElementById(diagId);
        if (!container) return;
        try {
          const { svg } = await mermaid.render('svg-pres-' + idx, slide.diagram.code);
          container.innerHTML = svg;
          const svgEl = container.querySelector('svg');
          if (svgEl) { svgEl.style.maxWidth='100%'; svgEl.style.maxHeight='220px'; svgEl.style.height='auto'; }
        } catch(e) {
          container.innerHTML = '<div style="color:#FC8181;font-size:11px">Diagram unavailable</div>';
        }
      }, 100);
    }
    return;
  }

  // ─────────────────────────────────────────────────────
  // DATA slide — 2-col McKinsey: commentary | table
  // ─────────────────────────────────────────────────────
  if (slide.type === 'data') {
    const t = slide.table;

    // Auto-badge: wrap % / probability / tier values in colored spans
    const badgeCell = (val) => {
      const s = String(val || '');
      const n = parseFloat(s);
      if (/^\d+[-–]\d+%?$/.test(s.trim()) || (s.includes('%') && n >= 0)) {
        const cls = n >= 60 ? 'green' : n >= 30 ? 'blue' : n >= 10 ? 'amber' : 'gray';
        return `<span class="mc-badge mc-badge-${cls}">${s}</span>`;
      }
      const lower = s.toLowerCase();
      if (/high|strong|leader/.test(lower)) return `<span class="mc-badge mc-badge-green">${s}</span>`;
      if (/medium|growing|mid/.test(lower)) return `<span class="mc-badge mc-badge-blue">${s}</span>`;
      if (/low|weak|declining/.test(lower)) return `<span class="mc-badge mc-badge-amber">${s}</span>`;
      return s;
    };

    const tableHtml = `
      <table class="mc-table">
        <thead><tr>${(t.headers||[]).map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${(t.rows||[]).map((r,ri)=>`<tr>${r.map((c,ci)=>`<td>${ci>0?badgeCell(c):c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;

    el.innerHTML = `
      <div class="mc-slide">
        ${slideHead(slide.sectionNum, slide.sectionTitle)}
        ${msgBar(slide.subtitle)}
        <div class="mc-2col">
          <div class="mc-2col-left">
            <div class="mc-col-tag">Analysis</div>
            ${findingBox(slide.headline)}
            ${keyPointsHtml(slide.keyPoints)}
          </div>
          <div class="mc-2col-right">
            <div class="mc-col-vis-title">${t.title || 'Data Table'}</div>
            <div class="mc-table-2col">${tableHtml}</div>
          </div>
        </div>
        ${slideFoot()}
      </div>`;
    return;
  }

  // ─────────────────────────────────────────────────────
  // INSIGHT slide — full-width key points (no visual)
  // ─────────────────────────────────────────────────────
  if (slide.type === 'insight') {
    el.innerHTML = `
      <div class="mc-slide">
        ${slideHead(slide.sectionNum, slide.sectionTitle)}
        ${msgBar(slide.headline)}
        <div class="mc-slide-body">
          <div class="mc-col-tag" style="margin-bottom:16px">Key Insights</div>
          <div class="mc-keypts" style="gap:14px">
            ${(slide.keyPoints||[]).map(pt=>`
              <div class="mc-keypt" style="font-size:11px;padding:10px 14px">${pt}</div>
            `).join('')}
          </div>
        </div>
        ${slideFoot()}
      </div>`;
    return;
  }
}

// ── Chart renderer for presentation mode (light theme) ──
function renderPresChart(chartId, chartDef) {
  const canvas = document.getElementById(chartId);
  if (!canvas || !chartDef) return;
  if (presCharts[chartId]) { try { presCharts[chartId].destroy(); } catch {} }

  const COLORS = ['#1565D8','#00A878','#D4820A','#C93535','#6B3DC9','#0891B2'];
  const rawType = chartDef.type || 'bar';
  const isHoriz = rawType === 'horizontalBar' || rawType === 'bar_horizontal' || chartDef.horizontal;
  const type    = rawType === 'donut' ? 'doughnut' : rawType === 'pie' ? 'doughnut' : isHoriz ? 'bar' : rawType;
  const isPie   = type === 'pie' || type === 'doughnut';
  const isRadar = type === 'radar';
  const isLine  = type === 'line';
  const isStacked = chartDef.stacked;

  const datasets = (chartDef.datasets || []).map((ds, di) => ({
    label:           ds.label || '',
    data:            (ds.data || []).map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g,''))||0),
    backgroundColor: isPie ? COLORS : isRadar ? COLORS[di % COLORS.length] + '22' : COLORS[di % COLORS.length],
    borderColor:     COLORS[di % COLORS.length],
    borderWidth:     isLine ? 2 : isRadar ? 1.5 : 0,
    fill:            false, tension: 0.4,
    borderRadius:    (!isPie && !isRadar && !isLine) ? 3 : 0,
  }));

  presCharts[chartId] = new Chart(canvas, {
    type,
    data: { labels: chartDef.labels || [], datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: isHoriz ? 'y' : 'x',
      plugins: {
        legend: {
          display: datasets.length > 1 || isPie || isRadar,
          labels: { color: '#4A5568', font: { size: 10, family: 'Arial' }, boxWidth: 10, padding: 12 }
        },
        tooltip: { backgroundColor: '#0A1E4A', titleColor: '#fff', bodyColor: '#E2E8F0', borderColor: '#1565D8', borderWidth: 1 }
      },
      scales: isPie || isRadar ? (isRadar ? {
        r: { ticks:{ color:'#8896A8',backdropColor:'transparent',font:{size:9} }, grid:{color:'#E2E8F0'},
             pointLabels:{color:'#374151',font:{size:10}}, angleLines:{color:'#E2E8F0'} }
      } : {}) : {
        x: { ticks:{color:'#6B7280',font:{size:9}}, grid:{color:'#F3F4F6'}, stacked:isStacked },
        y: { ticks:{color:'#6B7280',font:{size:9}}, grid:{color:'#F3F4F6'}, beginAtZero:true, stacked:isStacked }
      }
    }
  });
}

function openPresentation() {
  const sections = window._completedSections || [];
  if (!sections.length) { console.warn('No sections to present'); return; }
  if (!sections.length) return alert('Report is still generating. Please wait.');
  presSlides = buildPresentationSlides(sections);
  presIdx = 0;
  document.getElementById('pres-report-title').textContent =
    document.getElementById('report-title')?.textContent || 'KIRA RESEARCH';
  document.getElementById('presOv').classList.add('open');
  renderPresentSlide(0);
  document.body.style.overflow = 'hidden';
}

function closePresentation() {
  document.getElementById('presOv').classList.remove('open');
  document.body.style.overflow = '';
  Object.values(presCharts).forEach(c => { try { c.destroy(); } catch {} });
  Object.keys(presCharts).forEach(k => delete presCharts[k]);
}

function navPresent(dir) {
  const n = presIdx + dir;
  if (n >= 0 && n < presSlides.length) {
    presIdx = n;
    renderPresentSlide(presIdx);
  }
}

// Keyboard nav in presentation mode
document.addEventListener('keydown', e => {
  if (!document.getElementById('presOv').classList.contains('open')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') navPresent(1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')  navPresent(-1);
  if (e.key === 'Escape') closePresentation();
});

function copyReportUrl() {
  const url = document.getElementById('report-url-text')?.textContent;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    const el = document.getElementById('copy-confirm');
    el.style.display = 'inline';
    setTimeout(() => el.style.display = 'none', 2000);
  });
}
