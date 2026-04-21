// KIRA RESEARCH — api/doc-report.js
// Phase "clarify": Claude reads docs → asks clarifying question if needed + evaluates data sufficiency
// Phase "plan":    Claude identifies data gaps → targeted Perplexity search → plans sections with full context

export const config = { maxDuration: 55, runtime: 'nodejs' };

const ANT_URL        = 'https://api.anthropic.com/v1/messages';
const ANT_KEY        = process.env.ANTHROPIC_API_KEY;
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const MODEL          = 'claude-sonnet-4-20250514';
const SB_URL         = process.env.SUPABASE_URL;
const SB_KEY         = process.env.SUPABASE_SERVICE_KEY;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
               'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  return Array.isArray(d) ? d[0] : d;
}

async function callClaude(messages, maxTokens) {
  const r = await fetch(ANT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages })
  });
  if (!r.ok) throw new Error(`Claude API ${r.status}: ${await r.text().then(t=>t.slice(0,200))}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || '';
}

// Targeted Perplexity search for a specific query
async function searchPerplexity(query) {
  if (!PERPLEXITY_KEY) return '';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const r = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_KEY}` },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'Provide specific data with numbers, percentages, company names. Recent data only. Max 200 words.' },
          { role: 'user', content: query }
        ],
        max_tokens: 400,
        temperature: 0.1,
      })
    });
    clearTimeout(timeout);
    if (!r.ok) return '';
    const d = await r.json();
    return d.choices?.[0]?.message?.content || '';
  } catch { return ''; }
}

function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON found');
  return JSON.parse(match[0]);
}

function buildClarifyMessages(docs) {
  return (docs || []).flatMap((doc, i) => {
    const items = [{ type: 'text', text: `\n--- FILE ${i+1}: ${doc.name} ---\n` }];
    if (doc.imageBase64) items.push({ type: 'image', source: { type: 'base64', media_type: doc.mimeType || 'image/png', data: doc.imageBase64 } });
    else items.push({ type: 'text', text: (doc.text || '(empty)').slice(0, 3000) });
    return items;
  });
}

function buildPlanMessages(docs) {
  return (docs || []).flatMap((doc, i) => {
    const items = [{ type: 'text', text: `\n--- FILE ${i+1}: ${doc.name} (${doc.type}) ---\n` }];
    if (doc.imageBase64) items.push({ type: 'image', source: { type: 'base64', media_type: doc.mimeType || 'image/png', data: doc.imageBase64 } });
    else items.push({ type: 'text', text: doc.text || '(empty file)' });
    return items;
  });
}

const LENGTH_CONFIG = {
  concise:       { min: 4, max: 5 },
  standard:      { min: 6, max: 8 },
  comprehensive: { min: 9, max: 12 },
};
const LENGTH_GUIDANCE = {
  concise:       'EXACTLY 4 sections. No more.',
  standard:      '6-8 sections.',
  comprehensive: '9-12 sections.',
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { phase, docs, request, answers, language, reportLength, slug, userId } = req.body;
  if (!request) return res.status(400).json({ error: 'Missing request' });

  const hasDocs  = Array.isArray(docs) && docs.length > 0;
  const langNote = language && language !== 'English'
    ? `\nIMPORTANT: Respond entirely in ${language}.`
    : '';
  const sectionGuide = LENGTH_GUIDANCE[reportLength] || LENGTH_GUIDANCE.standard;
  const docSummary   = hasDocs ? docs.map(d => `• ${d.name} (${d.pages||'?'} pages)`).join('\n') : '';

  // ── Phase: CLARIFY ─────────────────────────────────────────
  if (phase === 'clarify') {
    if (!hasDocs) {
      // No docs: Claude evaluates if current data is needed
      try {
        const raw = await callClaude([{ role: 'user', content:
          `Request: "${request}"${langNote}
Does this require CURRENT data (post-2023) that benefits from live web search?
Return ONLY JSON: {"needsWebSearch": true/false, "suggestedTitle": "short title"}` }], 150);
        const r = extractJson(raw);
        return res.json({ clear: true, needsWebSearch: r.needsWebSearch !== false, docInsight: '', suggestedTitle: r.suggestedTitle || request });
      } catch {
        return res.json({ clear: true, needsWebSearch: true, docInsight: '', suggestedTitle: request });
      }
    }

    try {
      const prompt = [
        ...buildClarifyMessages(docs),
        { type: 'text', text: `\nUser request: "${request}"${langNote}

1. CLARITY: Is the request clear enough, or do you need ONE clarifying question?
2. DATA SUFFICIENCY: Do the documents contain enough data, or is web search needed?

Return ONLY JSON:
{"clear":true,"needsWebSearch":false,"docInsight":"1-2 sentence doc summary","suggestedTitle":"title"}
OR {"clear":false,"needsWebSearch":true,"docInsight":"...","question":"One question","options":["A","B","C"]}` }
      ];
      const raw = await callClaude([{ role: 'user', content: prompt }], 500);
      return res.json(extractJson(raw));
    } catch {
      return res.json({ clear: true, needsWebSearch: false, docInsight: '', suggestedTitle: request });
    }
  }

  // ── Phase: PLAN ────────────────────────────────────────────
  if (phase === 'plan') {
    try {
      const answersText = answers?.length ? `\nUser clarification: ${answers.join('; ')}` : '';

      // ── Step 1: Gap Analysis ──────────────────────────────
      // Claude reads request + docs (if any) → identifies SPECIFIC data gaps for web search
      let webResearch = '';
      let gapQueries  = [];

      const gapContent = hasDocs
        ? [...buildClarifyMessages(docs), { type: 'text', text: `\nRequest: "${request}"${answersText}` }]
        : [{ type: 'text', text: `Request: "${request}"${answersText}` }];

      try {
        const gapRaw = await callClaude([{ role: 'user', content: [
          ...gapContent.slice(-2), // just last parts to keep fast
          { type: 'text', text: `
Identify SPECIFIC data gaps requiring current web data to fulfill this request.
Only include gaps for:
- Current market sizes, growth rates, market share (post-2023)
- Recent company financials or news
- Current regulations or policies
- Real-time competitor data

DO NOT search for: frameworks, methodologies, strategy concepts, historical analysis.
Max 3 queries. Be specific — not "OKR market" but "Vietnam telecom market size 2025".

Return ONLY JSON:
{"needsSearch":true,"queries":["specific search query 1","specific search query 2"]}
OR {"needsSearch":false,"queries":[]}` }
        ]}], 300);
        const gap = extractJson(gapRaw);
        if (gap.needsSearch && gap.queries?.length) {
          gapQueries = gap.queries.slice(0, 3);
        }
      } catch { /* non-fatal */ }

      // ── Step 2: Targeted Search (parallel) ────────────────
      if (gapQueries.length > 0) {
        const results = await Promise.all(gapQueries.map(q => searchPerplexity(q)));
        const combined = results.filter(Boolean);
        if (combined.length) {
          webResearch = gapQueries.map((q, i) => combined[i] ? `[${q}]\n${combined[i]}` : '').filter(Boolean).join('\n\n');
        }
      }

      // ── Step 3: Plan Sections ────────────────────────────
      let messages;
      const webBlock = webResearch
        ? `\n\nCURRENT DATA FROM WEB SEARCH:\n${webResearch.slice(0, 3000)}`
        : '';

      if (hasDocs) {
        messages = [{ role: 'user', content: [
          ...buildPlanMessages(docs),
          { type: 'text', text: `\nRequest: "${request}"${answersText}${langNote}${webBlock}

Plan a consulting report: ${sectionGuide}
Start with "Executive Summary", end with "Recommendations".
${language && language !== 'English' ? 'Section titles in ' + language + '.' : ''}

Return ONLY JSON:
{"reportTitle":"...","docSummary":"2-3 sentence summary","sections":["..."],"searchFocus":""}` }
        ]}];
      } else {
        messages = [{ role: 'user', content:
          `Request: "${request}"${answersText}${langNote}${webBlock}

Plan a consulting report: ${sectionGuide}
Start with "Executive Summary", end with "Recommendations".
${language && language !== 'English' ? 'Section titles in ' + language + '.' : ''}

Return ONLY JSON:
{"reportTitle":"...","docSummary":"","sections":["..."],"searchFocus":""}` }];
      }

      const raw  = await callClaude(messages, 1500);
      let plan;
      try { plan = extractJson(raw); }
      catch (e) {
        console.error('[doc-report plan] JSON parse failed:', e.message, raw.slice(0, 300));
        throw new Error('Plan parse failed');
      }

      if (!plan.sections?.length) throw new Error('No sections in plan');

      // Enforce section count
      const lenCfg = LENGTH_CONFIG[reportLength];
      if (lenCfg && plan.sections.length > lenCfg.max) plan.sections = plan.sections.slice(0, lenCfg.max);

      // Save to DB
      let reportId = null;
      try {
        const job = await sbPost('custom_reports', {
          user_id:      userId || null,
          slug:         slug || `doc-report-${Date.now()}`,
          report_type:  'document_intelligence',
          input_params: { request, language, reportLength, docSummary, docNames: (docs||[]).map(d=>d.name) },
          sections:     plan.sections.map(t => ({ title: t, content: '', status: 'pending' })),
          status:       'generating',
        });
        reportId = job?.id;
      } catch (e) { console.warn('[doc-report] DB save failed:', e.message); }

      return res.json({
        reportId,
        reportTitle:    plan.reportTitle || request,
        docSummary:     plan.docSummary  || '',
        sections:       plan.sections,
        needsWebSearch: false,  // search already done here
        searchFocus:    plan.searchFocus || '',
        researchSummary: [plan.docSummary, webResearch].filter(Boolean).join('\n\n'),
        webResearch,
      });

    } catch (e) {
      console.error('[doc-report plan] Error:', e.message);
      return res.status(500).json({ error: 'Planning failed: ' + e.message });
    }
  }

  return res.status(400).json({ error: 'Unknown phase: ' + phase });
}
