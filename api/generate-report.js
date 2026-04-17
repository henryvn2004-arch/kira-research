// KIRA RESEARCH — api/generate-report.js
// POST /api/generate-report
// Phase 1: plan sections + research → return to browser
// Browser drives section generation via /api/generate-section

export const config = { maxDuration: 60 };

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL  = 'claude-sonnet-4-5';
const SB_URL        = process.env.SUPABASE_URL;
const SB_KEY        = process.env.SUPABASE_SERVICE_KEY;
const OAI_KEY       = process.env.OPENAI_API_KEY;
const ANT_KEY       = process.env.ANTHROPIC_API_KEY;

// ── Helpers ───────────────────────────────────────────────
async function sbPost(table, body) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  return Array.isArray(d) ? d[0] : d;
}

async function sbPatch(table, id, body) {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

async function callClaude(prompt, maxTokens) {
  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || '';
}

async function getEmbedding(text) {
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OAI_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-large', input: text, dimensions: 1536 })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.data[0].embedding;
}

async function ragSearch(industry, country, reportType) {
  try {
    const vec = await getEmbedding(`${industry} ${country} ${reportType}`);
    const opts = { method: 'POST', headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' } };
    const [c, p] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/rpc/search_report_chunks`, { ...opts, body: JSON.stringify({ query_embedding: vec, match_threshold: 0.65, match_count: 8 }) }).then(r => r.json()),
      fetch(`${SB_URL}/rest/v1/rpc/search_industry_patterns`, { ...opts, body: JSON.stringify({ query_embedding: vec, match_threshold: 0.65, match_count: 5 }) }).then(r => r.json())
    ]);
    return {
      chunkText:   (c || []).map(x => `[${x.chunk_type}] ${x.content}`).join('\n\n'),
      patternText: (p || []).map(x => `[${x.pattern_type}] ${x.description}`).join('\n\n')
    };
  } catch {
    return { chunkText: '', patternText: '' };
  }
}

// ── CORS ──────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// ── Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { industry, country, reportType, questions, companies, slug, userId, liveResearch } = req.body;
  if (!industry || !country || !reportType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Step 1: Create job record
  let reportId;
  try {
    const job = await sbPost('custom_reports', {
      user_id:      userId || null,
      slug:         slug || `${reportType}-${Date.now()}`,
      report_type:  reportType,
      input_params: { industry, country, reportType, questions, companies },
      sections:     [],
      status:       'researching'
    });
    reportId = job.id;
    if (!reportId) throw new Error('No ID returned from DB');
  } catch (e) {
    return res.status(500).json({ error: 'DB error: ' + e.message });
  }

  // Step 2: Research + RAG + Plan sections
  let plannedSections, research, rag;
  try {
    const typeNames = { industry_deep_dive: 'full market analysis', competitive_comparison: 'competitive comparison', market_entry_brief: 'market entry brief' };
    const typeName  = typeNames[reportType] || 'market research report';

    // Use live research from browser if provided, otherwise call Claude knowledge
    if (liveResearch) {
      research = liveResearch;
      rag = await ragSearch(industry, country, reportType);
    } else {
      [research, rag] = await Promise.all([
        callClaude(`Compile market intelligence for a ${typeName}: ${industry} in ${country}.
${companies ? 'Companies: ' + companies : ''}${questions ? '\nFocus: ' + questions : ''}
Include: market size & growth, key players & share, channels, pricing, trends, regulations.
Be specific and data-rich.`, 1500),
        ragSearch(industry, country, reportType)
      ]);
    }

    // Plan sections informed by research
    const planPrompt = `You are planning a ${typeName} report for: ${industry} in ${country}.
${questions ? 'Client focus: ' + questions : ''}
${companies ? 'Companies: ' + companies : ''}

WHAT THE RESEARCH FOUND:
${research}

RAG PATTERNS FROM SIMILAR REPORTS:
${rag.patternText || 'None available'}

Decide the most relevant sections for THIS specific report based on what research surfaced.
Return ONLY a JSON array of 8-12 section titles.
Rules: start with "Executive Summary", end with "Recommendations" or "Strategic Outlook".
${reportType === 'competitive_comparison' ? 'Use 6-8 sections focused on competitive comparison.' : ''}
${reportType === 'market_entry_brief' ? 'Use 7-8 sections focused on entry decision-making.' : ''}
Return ONLY the JSON array: ["Title 1", "Title 2", ...]`;

    plannedSections = await callClaude(planPrompt, 500)
      .then(t => JSON.parse(t.replace(/```json|```/g, '').trim()));

  } catch (e) {
    await sbPatch('custom_reports', reportId, { status: 'failed' });
    return res.status(500).json({ error: 'Planning/research failed: ' + e.message });
  }

  // Step 3: Save context to DB
  try {
    await sbPatch('custom_reports', reportId, {
      sections:      plannedSections.map(t => ({ title: t, content: '', status: 'pending' })),
      research_data: { summary: research },
      rag_context:   { chunkText: rag.chunkText, patternText: rag.patternText },
      status:        'generating'
    });
  } catch (e) {
    // non-fatal — still return data to browser
    console.warn('DB update failed:', e.message);
  }

  return res.json({
    reportId,
    sections:        plannedSections,
    researchSummary: research,
    ragContext:      rag,
    status:          'generating'
  });
}
