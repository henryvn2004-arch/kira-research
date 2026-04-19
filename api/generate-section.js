// KIRA RESEARCH — api/generate-section.js
// 2-phase per section:
//   Phase 1: stream commentary (~15s)
//   Phase 2: extract headline + stats + chart + table from text (~3s)
// SSE events: token | meta | done
//
// CHANGES:
// 4. Anti-overlap: full headline summary of ALL completed sections (was slice(-2))
// 5. Competency template section guidance injected per section

export const config = { maxDuration: 55, runtime: 'nodejs' };

const ANT_URL = 'https://api.anthropic.com/v1/messages';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-5';
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY;

async function sbGet(table, id) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  return (await r.json())?.[0];
}

async function sbPatch(table, id, body) {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

async function callClaude(prompt, maxTokens) {
  const r = await fetch(ANT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || '';
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// CHANGE 4: Build full anti-overlap context from ALL completed sections
// (was slice(-2) — only last 2 sections)
function buildAntiOverlapContext(prevSections) {
  if (!prevSections?.length) return '';
  const completed = prevSections
    .filter(s => s.status === 'completed' && s.content)
    .map(s => {
      try {
        const p = JSON.parse(s.content);
        return `• ${s.title}: ${p.headline || '(no headline)'}`;
      } catch {
        return `• ${s.title}`;
      }
    });
  if (!completed.length) return '';
  return `SECTIONS ALREADY COVERED — do NOT repeat these topics or data points:
${completed.join('\n')}

Each section must introduce UNIQUE insights not covered above.`;
}

// CHANGE 5: Extract per-section guidance from competency template
// Finds the matching section in section_structure by title similarity
function getSectionGuidance(competencyTemplate, sectionTitle) {
  if (!competencyTemplate?.section_structure) return '';
  const sections = Array.isArray(competencyTemplate.section_structure)
    ? competencyTemplate.section_structure
    : [];
  // fuzzy match by checking if section title words appear in template section name
  const titleWords = sectionTitle.toLowerCase().split(/\s+/);
  const match = sections.find(s => {
    const sName = (s.section || '').toLowerCase();
    return titleWords.some(w => w.length > 3 && sName.includes(w));
  });
  if (!match) return '';
  const parts = [
    match.purpose ? `Purpose: ${match.purpose}` : '',
    match.typical_content ? `Expected content: ${match.typical_content}` : '',
    match.data_points ? `Key data points to include: ${Array.isArray(match.data_points) ? match.data_points.join(', ') : match.data_points}` : '',
    match.sub_sections?.length ? `Sub-sections: ${match.sub_sections.join(', ')}` : '',
  ].filter(Boolean);
  return parts.length ? `MODULE GUIDANCE FOR THIS SECTION:\n${parts.join('\n')}` : '';
}

function buildContext(params, ragContext, researchSummary, prevSections, competencyTemplate, sectionTitle) {
  const { industry, country, reportType, questions, companies, language } = params;
  const langInstruction = (language && language !== 'English')
    ? `\nOUTPUT LANGUAGE: Write ALL content in ${language}. This includes headlines, commentary, table headers, chart labels, and all text.`
    : '';

  const rag = [
    ragContext?.chunkText   ? `RESEARCH LIBRARY:\n${ragContext.chunkText}`   : '',
    ragContext?.patternText ? `INDUSTRY PATTERNS:\n${ragContext.patternText}` : ''
  ].filter(Boolean).join('\n\n');

  // CHANGE 4: Full anti-overlap context instead of slice(-2)
  const antiOverlap = buildAntiOverlapContext(prevSections);

  // CHANGE 5: Per-section guidance from competency template
  const sectionGuidance = getSectionGuidance(competencyTemplate, sectionTitle);

  return `Industry: ${industry} | Market: ${country} | Report: ${reportType.replace(/_/g,' ')}
${questions ? `Client focus: ${questions}` : ''}${companies ? `\nCompanies: ${companies}` : ''}${langInstruction}

RESEARCH DATA:
${researchSummary || 'Draw on your knowledge.'}
${rag ? `\n${rag}` : ''}
${sectionGuidance ? `\n${sectionGuidance}` : ''}
${antiOverlap ? `\n${antiOverlap}` : ''}`;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    reportId, sectionIndex, sectionTitle, totalSections,
    industry, country, reportType, questions, companies, language,
    researchSummary, ragContext,
    prevSections = [],
    competencyTemplate = null,   // CHANGE 5: new param from generate-report
  } = req.body;

  if (!sectionTitle) return res.status(400).json({ error: 'Missing sectionTitle' });

  const context = buildContext(
    { industry, country, reportType, questions, companies, language },
    ragContext, researchSummary, prevSections, competencyTemplate, sectionTitle
  );

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (type, data) => {
    try { res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`); } catch {}
  };

  // ── Phase 1: Stream commentary ─────────────────────────
  let fullCommentary = '';
  try {
    const prompt = `Write section "${sectionTitle}" (${sectionIndex + 1} of ${totalSections}) of a market research report.

${context}

Write 250-350 words of consulting-grade analytical prose:
- Lead with the key strategic insight
- Reference specific data, companies, numbers from the research
- For estimated numbers, prefix with "est." or "approx."
- If a number comes from a named source, attribute it: "According to X, ..."
- Use **bold** for key terms and company names
- End with strategic implication
- No AI disclaimers. Flowing paragraphs only.`;

    const streamRes = await fetch(ANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, stream: true, messages: [{ role: 'user', content: prompt }] })
    });

    const reader  = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            fullCommentary += evt.delta.text;
            send('token', { text: evt.delta.text });
          }
        } catch {}
      }
    }
  } catch (e) {
    send('token', { text: '\n\n*Generation error: ' + e.message + '*' });
  }

  // ── Phase 2: Extract meta + visuals from commentary ────
  let meta = { headline: '', stats: [], chart: null, table: null, sources: [] };
  try {
    const isNarrativeSection = /executive summary|recommendation|strategic outlook|conclusion/i.test(sectionTitle);

    // Section-title-based chart hints
    const secLower = sectionTitle.toLowerCase();
    let chartHint = '';
    if (/market size|market.*value|revenue.*forecast|growth.*projection/.test(secLower)) {
      chartHint = 'This is a MARKET SIZE section → use "line" chart with years as labels and projected values as data. Extrapolate to 5-year series using CAGR if mentioned.';
    } else if (/market share|competitive landscape|player.*share/.test(secLower)) {
      chartHint = 'This is a MARKET SHARE section → use "doughnut" chart with each player as a label and their share % as data. Add "Others" to reach 100%.';
    } else if (/competitor|competitive|player.*profile|company.*comparison/.test(secLower)) {
      chartHint = 'This is a COMPETITOR COMPARISON section → use "radar" chart: labels = 4-6 attributes (Price Competitiveness, Distribution, Brand Strength, Innovation, etc.), datasets = one per competitor with scores 1-10.';
    } else if (/channel|distribution|retail.*channel/.test(secLower)) {
      chartHint = 'This is a CHANNEL section → use "bar" (horizontal) with channel names as labels and share % or index as data.';
    } else if (/pric|price|pricing/.test(secLower)) {
      chartHint = 'This is a PRICING section → use "bar" (horizontal) sorted by price, showing price points for key brands/segments.';
    } else if (/segment|segmentation|consumer.*type/.test(secLower)) {
      chartHint = 'This is a SEGMENTATION section → use "doughnut" chart showing segment sizes, OR "bar" showing segment characteristics.';
    } else if (/driver|trend|factor/.test(secLower)) {
      chartHint = 'This is a DRIVERS section → use "bar" (horizontal) with drivers/factors as labels and importance scores 1-10 as data.';
    } else if (/consumer|customer|buyer|shopper/.test(secLower)) {
      chartHint = 'This is a CONSUMER section → use "bar" (horizontal) for preferences/attributes or "radar" for comparing consumer segments across needs.';
    }

    const langNote = (language && language !== 'English')
      ? `\nIMPORTANT: All text (headline, stat labels, chart title, chart labels, table headers) must be in ${language}.`
      : '';

    const extractPrompt = `You wrote this market research section titled "${sectionTitle}":
${langNote}

${fullCommentary}

Extract structured data. Return ONLY valid JSON with this exact structure:
{
  "headline": "Key strategic finding in 1-2 sentences, specific and data-driven",
  "stats": [
    {"value": "~$2.4B", "label": "Market size 2024", "icon": "globe"},
    {"value": "18%", "label": "CAGR 2024-2029", "icon": "growth"},
    {"value": "3", "label": "Dominant players", "icon": "users"}
  ],
  "chart": {
    "type": "line",
    "title": "Market Size (USD Billion), 2022-2027",
    "labels": ["2022", "2023", "2024", "2025", "2026", "2027"],
    "datasets": [{"label": "Market Size ($B)", "data": [1.2, 1.5, 1.9, 2.3, 2.8, 3.4]}]
  },
  "table": {
    "title": "Competitive Landscape Overview",
    "headers": ["Player", "Est. Share", "Strengths", "Price Tier"],
    "rows": [
      ["Company A", "~35%", "Strong distribution", "Premium"],
      ["Company B", "~22%", "Price leader", "Mid-range"]
    ]
  },
  "sources": ["Industry report 2024", "Analyst estimate"]
}

RULES — read carefully:

headline: 1-2 sentences, specific numbers, strategic insight.

stats: exactly 2-4 metrics. icon options: pie|growth|trend|users|channel|price|globe|check

chart: ${isNarrativeSection ? 'set to null for this narrative section.' : `REQUIRED — must NOT be null. ${chartHint}

Chart type decision:
- Market size over time → "line" with year labels
- Market share / composition → "doughnut" (add "Others" to reach 100%)
- Competitor rankings → "bar" (horizontal, sorted by value)
- Multi-attribute competitor comparison → "radar"
- Growth rates or segment volumes → "bar" (vertical)
- Price positioning → "bar" (horizontal, sorted by price)

datasets[].data values MUST be numbers (no strings, no currency symbols).
labels length MUST equal datasets[0].data length.
Max 8 labels. For multi-series bar/line, include all series in datasets array.`}

table: ${isNarrativeSection ? 'set to null for this narrative section.' : `REQUIRED — must NOT be null. Most useful table for this section type:
- Competitive section → players × share/strengths/price/distribution
- Channel section → channels × share/growth/dominant players/margin
- Consumer section → segments × size/needs/willingness to pay/channel
- Pricing section → tiers × price range/key brands/target buyer
- Regulatory section → requirements × details/timeline/impact
- Default → 3-col key facts table (Metric | Value | Source)
Max 8 rows. All values as short strings.`}

sources: 1-3 sources referenced in text, or "Industry estimate" / "Analyst projection".

CRITICAL: Return ONLY the JSON object. No explanation. No markdown fences.`;

    const raw = await callClaude(extractPrompt, 1500); // was 1000 — too tight for chart+table JSON

    // Robust JSON parsing — handle truncated or fence-wrapped responses
    let parsed = null;
    const clean = raw.replace(/```json\s*/g,'').replace(/```/g,'').trim();
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Try to find a complete JSON object even if response was truncated
      const objStart = clean.indexOf('{');
      if (objStart >= 0) {
        // Walk backwards to find the outermost closing brace
        let depth = 0, lastClose = -1;
        for (let ci = objStart; ci < clean.length; ci++) {
          if (clean[ci] === '{' || clean[ci] === '[') depth++;
          if (clean[ci] === '}' || clean[ci] === ']') { depth--; if (depth === 0) lastClose = ci; }
        }
        if (lastClose > objStart) {
          try { parsed = JSON.parse(clean.slice(objStart, lastClose + 1)); } catch {}
        }
      }
    }

    if (parsed) {
      // Sanitize chart: ensure data arrays are numbers
      if (parsed.chart?.datasets) {
        parsed.chart.datasets = parsed.chart.datasets.map(ds => ({
          ...ds,
          data: (ds.data||[]).map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g,''))||0),
        }));
        // Normalize type names
        if (parsed.chart.type === 'donut') parsed.chart.type = 'doughnut';
        if (parsed.chart.type === 'pie')   parsed.chart.type = 'doughnut';
        if (parsed.chart.type === 'horizontal_bar' || parsed.chart.type === 'bar_horizontal') {
          parsed.chart.type = 'bar';
          parsed.chart.horizontal = true;
        }
      }
      meta = { ...meta, ...parsed };
    } else {
      console.warn(`[generate-section] JSON parse failed for section "${sectionTitle}". Raw (first 200): ${raw.slice(0,200)}`);
    }
  } catch (e) {
    console.warn('Meta extraction failed:', e.message);
  }

  send('meta', meta);

  // ── Save to DB ─────────────────────────────────────────
  if (reportId) {
    try {
      const report = await sbGet('custom_reports', reportId);
      if (report) {
        const content = JSON.stringify({ ...meta, commentary: fullCommentary });
        const updatedSections = (report.sections || []).map((s, i) =>
          i === sectionIndex ? { ...s, content, status: 'completed' } : s
        );
        await sbPatch('custom_reports', reportId, {
          sections:   updatedSections,
          status:     updatedSections.every(s => s.status === 'completed') ? 'completed' : 'generating',
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) { console.warn('DB save failed:', e.message); }
  }

  send('done', { sectionIndex });
  res.end();
}
