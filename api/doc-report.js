// KIRA RESEARCH — api/doc-report.js
// Document Intelligence: analyze uploaded files + user request → plan report sections
//
// Phase "clarify": Claude reads docs + request → returns clarifying question if needed
// Phase "plan":    Claude plans sections + determines if web search needed
//
// File content is extracted browser-side (PDF.js, mammoth, SheetJS) and sent as text.
// Claude never receives raw binary — only extracted text + optional base64 images.

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

// Build Claude message content from file docs
// Supports: text content, and base64 images
function buildDocMessages(docs) {
  const content = [];
  (docs || []).forEach((doc, i) => {
    content.push({ type: 'text', text: `\n--- FILE ${i+1}: ${doc.name} (${doc.type}) ---\n` });
    if (doc.imageBase64) {
      // Image file — send natively for Claude vision
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: doc.mimeType || 'image/png', data: doc.imageBase64 }
      });
    } else {
      // Text content from extraction
      content.push({ type: 'text', text: doc.text || '(empty file)' });
    }
  });
  return content;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { phase, docs, request, answers, language, slug, userId } = req.body;

  if (!docs?.length || !request) {
    return res.status(400).json({ error: 'Missing docs or request' });
  }

  const langNote = language && language !== 'English'
    ? `\nIMPORTANT: Respond entirely in ${language}. All section titles, questions, and content must be in ${language}.`
    : '';

  const docContent = buildDocMessages(docs);
  const docSummary = docs.map(d => `• ${d.name} (${d.pages || '?'} pages, ${d.type})`).join('\n');

  // ── Phase: CLARIFY ────────────────────────────────────────
  // Claude reads docs + request → determines if clarification needed
  if (phase === 'clarify') {
    try {
      const clarifyPrompt = [
        ...docContent,
        {
          type: 'text',
          text: `\nUser request: "${request}"${langNote}

Analyze the documents above and the user's request.

Determine: is the request clear enough to generate a high-quality consulting report, or do you need ONE clarifying question first?

Return ONLY valid JSON:
{
  "clear": true,
  "docInsight": "1-2 sentences summarizing what the documents contain",
  "suggestedTitle": "Proposed report title"
}

OR if clarification needed:
{
  "clear": false,
  "docInsight": "1-2 sentences summarizing what the documents contain",
  "question": "One focused clarifying question",
  "options": ["Option A", "Option B", "Option C", "Other (specify)"]
}

Rules:
- Ask at MOST one question — choose the most important ambiguity
- If request is reasonably clear, set clear: true and proceed
- options: 3-4 short choices covering main scenarios
- Return ONLY the JSON object`
        }
      ];

      const raw  = await callClaude([{ role: 'user', content: clarifyPrompt }], 400);
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.json(parsed);

    } catch (e) {
      // If clarification fails, just proceed as clear
      return res.json({ clear: true, docInsight: 'Documents analyzed.', suggestedTitle: request });
    }
  }

  // ── Phase: PLAN ────────────────────────────────────────────
  // Claude analyzes docs + request + any answers → plans sections
  if (phase === 'plan') {
    try {
      const answersText = answers?.length
        ? `\nUser clarification answers: ${answers.join('; ')}`
        : '';

      const planPrompt = [
        ...docContent,
        {
          type: 'text',
          text: `\nUser request: "${request}"${answersText}${langNote}

You are a senior strategy consultant. Based on the documents above and the user's request:

STEP 1 — EXTRACT KEY INSIGHTS
Summarize the most important data, findings, and facts from the documents that are relevant to the user's request. Be specific: numbers, company names, strategies, performance data.

STEP 2 — ASSESS WEB SEARCH NEED
Does this request require current external data NOT in the documents? 
(e.g. market trends, competitor data, industry benchmarks, regulatory changes)

STEP 3 — PLAN SECTIONS
Design 6-9 sections for a consulting-grade report addressing the request.
- Start with "Executive Summary"
- End with "Recommendations" or "Strategic Roadmap"
- Sections should directly address the request
- Use RAG frameworks if available: draw on consulting best practices
${language && language !== 'English' ? `- Section titles in ${language}` : ''}

Return ONLY valid JSON:
{
  "reportTitle": "Specific title for this report",
  "docSummary": "2-3 paragraph summary of key findings from the documents",
  "needsWebSearch": true,
  "searchFocus": "What external data is needed (if needsWebSearch is true)",
  "sections": ["Section 1 title", "Section 2 title", ...]
}`
        }
      ];

      const raw    = await callClaude([{ role: 'user', content: planPrompt }], 700);
      const clean  = raw.replace(/```json|```/g, '').trim();
      const plan   = JSON.parse(clean);

      if (!plan.sections?.length) throw new Error('No sections returned');

      // Create DB record
      let reportId = null;
      try {
        const job = await sbPost('custom_reports', {
          user_id:      userId || null,
          slug:         slug || `doc-report-${Date.now()}`,
          report_type:  'document_intelligence',
          input_params: { request, language, docSummary, docNames: docs.map(d=>d.name) },
          sections:     plan.sections.map(t => ({ title: t, content: '', status: 'pending' })),
          status:       'generating',
        });
        reportId = job?.id;
      } catch (e) { console.warn('DB save failed:', e.message); }

      return res.json({
        reportId,
        reportTitle:   plan.reportTitle || request,
        docSummary:    plan.docSummary || '',
        sections:      plan.sections,
        needsWebSearch: plan.needsWebSearch || false,
        searchFocus:   plan.searchFocus || '',
        researchSummary: plan.docSummary || '', // used as base research
      });

    } catch (e) {
      return res.status(500).json({ error: 'Planning failed: ' + e.message });
    }
  }

  return res.status(400).json({ error: 'Unknown phase: ' + phase });
}
