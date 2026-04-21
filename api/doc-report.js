// KIRA RESEARCH — api/doc-report.js
// Document Intelligence: analyze uploaded files + user request → plan report sections
// Documents are OPTIONAL — if none, runs as pure AI report generator via web research.

export const config = { maxDuration: 55, runtime: 'nodejs' };

const ANT_URL = 'https://api.anthropic.com/v1/messages';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-20250514';
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY;

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

async function callClaude(messages, maxTokens, system) {
  const body = { model: MODEL, max_tokens: maxTokens, messages };
  if (system) body.system = system;
  const r = await fetch(ANT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Claude API ${r.status}: ${await r.text().then(t=>t.slice(0,200))}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || '';
}

// Robust JSON extraction — handles markdown fences or extra text around JSON
function extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in response');
  return JSON.parse(match[0]);
}

// Build message content array from docs for clarify phase
// Truncated to 3K chars/doc — clarify only needs a quick read
function buildClarifyMessages(docs) {
  const content = [];
  (docs || []).forEach((doc, i) => {
    content.push({ type: 'text', text: `\n--- FILE ${i+1}: ${doc.name} ---\n` });
    if (doc.imageBase64) {
      content.push({ type: 'image', source: { type: 'base64', media_type: doc.mimeType || 'image/png', data: doc.imageBase64 } });
    } else {
      // Truncate heavily for clarify — just need document gist
      content.push({ type: 'text', text: (doc.text || '(empty)').slice(0, 3000) });
    }
  });
  return content;
}

// Build full message content for plan phase — needs complete context
function buildPlanMessages(docs) {
  const content = [];
  (docs || []).forEach((doc, i) => {
    content.push({ type: 'text', text: `\n--- FILE ${i+1}: ${doc.name} (${doc.type}) ---\n` });
    if (doc.imageBase64) {
      content.push({ type: 'image', source: { type: 'base64', media_type: doc.mimeType || 'image/png', data: doc.imageBase64 } });
    } else {
      content.push({ type: 'text', text: doc.text || '(empty file)' });
    }
  });
  return content;
}

// Map reportLength value → section count guidance for plan prompt
const LENGTH_CONFIG = {
  concise:       { min: 4, max: 5, label: 'EXACTLY 4 sections. No more, no less.' },
  standard:      { min: 6, max: 8, label: '6 to 8 sections.' },
  comprehensive: { min: 9, max: 12, label: '9 to 12 sections.' },
};
const LENGTH_GUIDANCE = {
  concise:       'CRITICAL: Output EXACTLY 4 sections in the "sections" array. Count: 4. No more.',
  standard:      'Output 6-8 sections in the "sections" array.',
  comprehensive: 'Output 9-12 sections in the "sections" array.',
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { phase, docs, request, answers, language, reportLength, webResearch, slug, userId } = req.body;

  if (!request) return res.status(400).json({ error: 'Missing request' });

  const hasDocs  = Array.isArray(docs) && docs.length > 0;
  const langNote = language && language !== 'English'
    ? `\nIMPORTANT: Respond entirely in ${language}. All content must be in ${language}.`
    : '';
  const sectionCountGuide = LENGTH_GUIDANCE[reportLength] || LENGTH_GUIDANCE.standard;
  const docSummary = hasDocs ? docs.map(d => `• ${d.name} (${d.pages||'?'} pages)`).join('\n') : '';

  // ── Phase: CLARIFY ─────────────────────────────────────────
  if (phase === 'clarify') {
    // No docs → skip clarification entirely
    if (!hasDocs) {
      return res.json({ clear: true, docInsight: '', suggestedTitle: request });
    }
    try {
      const prompt = [
        ...buildClarifyMessages(docs),  // truncated 3K/doc — fast
        { type: 'text', text: `\nUser request: "${request}"${langNote}

Briefly scan the documents. Is the request clear enough to generate a high-quality report, or do you need ONE clarifying question?

Return ONLY valid JSON:
{ "clear": true, "docInsight": "1-2 sentence summary of what the documents contain", "suggestedTitle": "Proposed report title" }
OR:
{ "clear": false, "docInsight": "1-2 sentence summary", "question": "One focused question", "options": ["Option A", "Option B", "Option C"] }

Return ONLY the JSON object.` }
      ];
      const raw    = await callClaude([{ role: 'user', content: prompt }], 400);
      const parsed = extractJson(raw);
      return res.json(parsed);
    } catch (e) {
      // Non-fatal: just proceed as clear
      return res.json({ clear: true, docInsight: '', suggestedTitle: request });
    }
  }

  // ── Phase: PLAN ────────────────────────────────────────────
  if (phase === 'plan') {
    try {
      const answersText = answers?.length ? `\nUser clarification: ${answers.join('; ')}` : '';
      let messages;

      if (hasDocs) {
        messages = [{
          role: 'user',
          content: [
            ...buildPlanMessages(docs),  // full content
            { type: 'text', text: `\nUser request: "${request}"${answersText}${langNote}

You are a senior strategy consultant. Based on these documents and the user's request:

1. Summarize key insights from the documents (2-3 sentences, specific data points)
2. Determine if web research is needed for current external data not in the documents
3. ${sectionCountGuide} Start with "Executive Summary", end with "Recommendations" or "Strategic Roadmap".
${language && language !== 'English' ? '   Section titles in ' + language + '.' : ''}

Return ONLY valid JSON:
{
  "reportTitle": "Specific report title",
  "docSummary": "2-3 sentence summary of key findings",
  "needsWebSearch": true,
  "searchFocus": "What to research externally",
  "sections": ["Executive Summary", "...", "Recommendations"]
}` }
          ]
        }];
      } else {
        // No-doc mode: plan from request + web research
        const webContext = webResearch
          ? `\n\nLIVE DATA AVAILABLE:\n${webResearch.slice(0, 3000)}\n\nPlan sections that leverage this data.`
          : '\n\nNo live data pre-fetched — plan sections based on the request.';

        messages = [{
          role: 'user',
          content: `You are a senior strategy consultant. Plan a consulting-grade report.

User request: "${request}"${answersText}${langNote}${webContext}

${sectionCountGuide} Start with "Executive Summary", end with "Recommendations" or "Strategic Roadmap".
Base your section plan on what the live data actually covers — plan sections that fit the available data.
${language && language !== 'English' ? 'Section titles in ' + language + '.' : ''}

Return ONLY valid JSON:
{
  "reportTitle": "Specific report title based on the request and data",
  "docSummary": "",
  "needsWebSearch": false,
  "searchFocus": "",
  "sections": ["Executive Summary", "...", "Recommendations"]
}`
        }];
      }

      const raw = await callClaude(messages, 1500);

      let plan;
      try {
        plan = extractJson(raw);
      } catch (jsonErr) {
        console.error('[doc-report plan] JSON parse failed:', jsonErr.message, '\nRaw:', raw.slice(0, 500));
        throw new Error('Plan parse failed: ' + jsonErr.message);
      }

      if (!plan.sections?.length) throw new Error('No sections in plan');

      // If web research was already done in planning phase, don't re-search at generation
      if (webResearch && !hasDocs) plan.needsWebSearch = false;
      // Enforce section count from reportLength setting
      const lenCfg = LENGTH_CONFIG[reportLength];
      if (lenCfg && plan.sections.length > lenCfg.max) {
        plan.sections = plan.sections.slice(0, lenCfg.max);
      } else if (lenCfg && plan.sections.length < lenCfg.min) {
        // too few — just proceed, don't add fake sections
      }

      if (!hasDocs) plan.needsWebSearch = true;

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
        needsWebSearch: plan.needsWebSearch !== false,
        searchFocus:    plan.searchFocus  || request,
        researchSummary: plan.docSummary  || '',
      });

    } catch (e) {
      console.error('[doc-report plan] Error:', e.message);
      return res.status(500).json({ error: 'Planning failed: ' + e.message });
    }
  }

  return res.status(400).json({ error: 'Unknown phase: ' + phase });
}
