// KIRA RESEARCH — api/strategy-builder.js
// Strategy Builder: module selection + optional docs + request → clarify → plan → generate
//
// Phase "discover": module + docs + request → RAG framework lookup → clarify if needed
// Phase "plan":     module + docs + request + answers → section plan + web search decision

export const config = { maxDuration: 55, runtime: 'nodejs' };

const ANT_URL = 'https://api.anthropic.com/v1/messages';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-20250514';
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY;
const OAI_KEY = process.env.OPENAI_API_KEY;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function callClaude(messages, maxTokens, system) {
  const body = { model: MODEL, max_tokens: maxTokens, messages };
  if (system) body.system = system;
  const r = await fetch(ANT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
               'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Claude API ${r.status}: ${await r.text().then(t=>t.slice(0,200))}`);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || '';
}

// Try to pull framework chunks for this module from RAG library.
// Non-blocking: returns '' if library is empty or RPC unavailable.
async function tryModuleFramework(moduleName, moduleKey) {
  try {
    if (!OAI_KEY || !SB_URL) return '';
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OAI_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-large',
                             input: `${moduleName} strategy framework`,
                             dimensions: 1536 })
    });
    const embData = await embRes.json();
    if (embData.error) return '';

    const r = await fetch(`${SB_URL}/rest/v1/rpc/search_report_chunks`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embedding: embData.data[0].embedding,
        match_threshold: 0.58,
        match_count: 4,
        chunk_type_filter: 'framework'
      })
    });
    const chunks = await r.json();
    if (!Array.isArray(chunks) || !chunks.length) return '';
    return `FRAMEWORKS FROM RESEARCH LIBRARY (${moduleName}):\n` +
           chunks.map(c => c.content).join('\n\n');
  } catch { return ''; }
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

function buildDocBlocks(docs) {
  if (!docs?.length) return [];
  return docs.flatMap((doc, i) => [
    { type: 'text', text: `\n--- DOCUMENT ${i+1}: ${doc.name} ---\n` },
    doc.imageBase64
      ? { type: 'image', source: { type: 'base64', media_type: doc.mimeType || 'image/png', data: doc.imageBase64 } }
      : { type: 'text', text: (doc.text || '(empty)').slice(0, 8000) }
  ]);
}

// Module descriptions — used as context for Claude even before RAG is populated
const MODULE_CONTEXT = {
  sales_planning:         'Sales planning: revenue target-setting, pipeline management, quota design, territory strategy, channel mix, sales process optimization.',
  go_to_market:           'Go-to-market: product/service launch strategy, target customer definition, channel selection, messaging, activation sequencing, GTM metrics.',
  pricing_strategy:       'Pricing strategy: price positioning, value-based pricing, tier design, competitive price analysis, willingness to pay, pricing model selection.',
  growth_strategy:        'Growth strategy: growth vector identification, market expansion vs. product expansion, organic vs. inorganic, investment prioritization, growth roadmap.',
  market_entry:           'Market entry: entry mode evaluation (organic/JV/acquisition), barrier analysis, entry sequencing, localization requirements, risk mitigation.',
  competitive_response:   'Competitive response: threat assessment, differentiation strategy, defensive moves, counter-positioning, resource allocation for competitive battles.',
  digital_transformation: 'Digital transformation: current state assessment, digital capability gaps, technology roadmap, change management, digital P&L impact.',
  operational_excellence: 'Operational excellence: process mapping, efficiency opportunities, cost reduction, quality improvement, lean/agile implementation.',
  partnership_bd:         'Partnership & BD: partner identification criteria, deal structure, negotiation approach, alliance management, build-buy-partner decisions.',
  org_talent:             'Org & talent: organizational design, capability assessment, talent acquisition strategy, leadership development, culture and performance.',
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { phase, moduleKey, moduleName, docs, request, answers, language, slug, userId } = req.body;
  if (!request || !moduleKey) return res.status(400).json({ error: 'Missing request or module' });

  const hasDocs   = docs?.length > 0;
  const modCtx    = MODULE_CONTEXT[moduleKey] || `${moduleName} strategy`;
  const langNote  = language && language !== 'English'
    ? `\nRespond entirely in ${language}. All section titles and text in ${language}.`
    : '';

  // ── Phase: DISCOVER ───────────────────────────────────────
  // Check if request is clear; clarify if needed
  if (phase === 'discover') {
    try {
      // Pull module framework from RAG (non-blocking)
      const ragFramework = await tryModuleFramework(moduleName, moduleKey);

      const content = [
        ...buildDocBlocks(docs),
        {
          type: 'text',
          text: `MODULE: ${moduleName}
MODULE CONTEXT: ${modCtx}
${ragFramework ? `\n${ragFramework}\n` : ''}
USER REQUEST: "${request}"${langNote}

You are a senior strategy consultant.

Task: Assess whether the request is specific enough to build a high-quality ${moduleName} report.

A request is CLEAR if it specifies: what the user wants to achieve (even roughly) and enough context to plan meaningful sections.
A request is UNCLEAR if it's so vague that sections could go in completely different directions (e.g. "help me with sales" with zero context).

${hasDocs ? `Documents provided: ${docs.map(d=>d.name).join(', ')}` : 'No documents provided.'}

If unclear, ask ONE focused clarifying question with 3-4 options.
If clear, proceed.

Return ONLY valid JSON:
{
  "clear": true,
  "docInsight": "${hasDocs ? 'Brief: what the docs reveal relevant to this module (1-2 sentences)' : null}"
}
OR
{
  "clear": false,
  "docInsight": "${hasDocs ? 'Brief doc summary' : null}",
  "question": "One focused clarifying question",
  "options": ["Option A", "Option B", "Option C", "Option D (specify)"]
}`
        }
      ];

      const raw    = await callClaude([{ role: 'user', content }], 400);
      const clean  = raw.replace(/```json|```/g,'').trim();
      const result = JSON.parse(clean);
      return res.json(result);

    } catch (e) {
      // If discover fails, proceed as clear (don't block user)
      return res.json({ clear: true, docInsight: null });
    }
  }

  // ── Phase: PLAN ───────────────────────────────────────────
  // Plan sections tailored to module + context
  if (phase === 'plan') {
    try {
      const ragFramework  = await tryModuleFramework(moduleName, moduleKey);
      const answersText   = answers?.length ? `\nUser clarifications: ${answers.join('; ')}` : '';

      const content = [
        ...buildDocBlocks(docs),
        {
          type: 'text',
          text: `MODULE: ${moduleName}
MODULE CONTEXT: ${modCtx}
${ragFramework ? `\n${ragFramework}\n` : ''}
USER REQUEST: "${request}"${answersText}${langNote}

Build a ${moduleName} strategy report plan.

${hasDocs ? 'The documents above provide background context — extract what\'s strategically relevant.' : 'No documents provided — plan based on the request and your expertise.'}

Instructions:
1. Design 6-9 sections that directly address this specific ${moduleName} challenge
2. Section titles must be SPECIFIC to this situation — not generic headings
   Good: "Pricing Reboot: Moving from Cost-Plus to Value-Based in Vietnam Retail"
   Bad: "Pricing Analysis"
3. Determine if external web data would meaningfully improve the output
4. ${hasDocs ? 'Summarize key insights from documents' : 'Note what key information would strengthen the analysis'}

Return ONLY valid JSON:
{
  "reportTitle": "Specific, compelling title",
  "docSummary": "${hasDocs ? 'Key strategic insights from the documents (3-4 sentences)' : 'Key context and assumptions for this analysis (2-3 sentences)'}",
  "needsWebSearch": true,
  "searchFocus": "What external data to research (benchmarks, market data, competitor moves)",
  "sections": ["Section 1", "Section 2", ...]
}`
        }
      ];

      const raw   = await callClaude([{ role: 'user', content }], 700);
      const clean = raw.replace(/```json|```/g,'').trim();
      const plan  = JSON.parse(clean);

      if (!plan.sections?.length) throw new Error('No sections returned');

      // Save DB record
      let reportId = null;
      try {
        const job = await sbPost('custom_reports', {
          user_id:      userId || null,
          slug:         slug || `sb-${Date.now()}`,
          report_type:  'strategy_builder',
          input_params: { moduleKey, moduleName, request, language,
                          docNames: (docs||[]).map(d=>d.name) },
          sections:     plan.sections.map(t => ({ title: t, content: '', status: 'pending' })),
          status:       'generating',
        });
        reportId = job?.id;
      } catch(e) { console.warn('DB save:', e.message); }

      return res.json({
        reportId,
        reportTitle:    plan.reportTitle    || request,
        docSummary:     plan.docSummary     || '',
        sections:       plan.sections,
        needsWebSearch: plan.needsWebSearch || false,
        searchFocus:    plan.searchFocus    || request,
        researchSummary: plan.docSummary    || '',
      });

    } catch (e) {
      return res.status(500).json({ error: 'Planning failed: ' + e.message });
    }
  }

  return res.status(400).json({ error: 'Unknown phase: ' + phase });
}
