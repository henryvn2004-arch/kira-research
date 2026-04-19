// KIRA RESEARCH — api/generate-report.js
// POST /api/generate-report
// Phase 1: plan sections + research → return to browser
// Browser drives section generation via /api/generate-section
//
// CHANGES:
// 1. Query competency_templates by reportType → real module section_structure informs planning
// 2. chunkText now included in planning prompt (was missing before)
// 3. competencyTemplate returned to browser for generate-section to use

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
      fetch(`${SB_URL}/rest/v1/rpc/search_report_chunks`, {
        ...opts,
        body: JSON.stringify({ query_embedding: vec, match_threshold: 0.65, match_count: 8 })
      }).then(r => r.json()),
      fetch(`${SB_URL}/rest/v1/rpc/search_industry_patterns`, {
        ...opts,
        body: JSON.stringify({ query_embedding: vec, match_threshold: 0.65, match_count: 5 })
      }).then(r => r.json())
    ]);
    return {
      chunkText:   (c || []).map(x => `[${x.chunk_type}] ${x.content}`).join('\n\n'),
      patternText: (p || []).map(x => `[${x.pattern_type}] ${x.description}`).join('\n\n')
    };
  } catch {
    return { chunkText: '', patternText: '' };
  }
}

// ── CHANGE 1: Query competency_templates from Supabase ────
// Uses real module section_structure uploaded by admin
// Falls back to hardcoded guidance strings if not found
async function getCompetencyTemplate(reportType) {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/competency_templates?competency_type=eq.${reportType}&limit=1`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const data = await r.json();
    return Array.isArray(data) && data[0] ? data[0] : null;
  } catch {
    return null;
  }
}

// Fallback hardcoded guidance (used only if competency_templates is empty)
const FALLBACK_GUIDANCE = {
  market_overview:         'Focus on: market sizing & potential, environmental overview, segmentation, growth estimation, forecasting & scenario planning. 8-10 sections.',
  competitive_analysis:    'Focus on: industry competitiveness, competitor profiles & tracking, strategy & performance, pipeline & alliances, best practices & key success factors. 8-10 sections.',
  customer_intelligence:   'Focus on: key account targeting, installed base & usage patterns, pain points, decision-making cycles, budgets, switching costs, brand perceptions & preferences. 8-10 sections.',
  value_chain:             'Focus on: industry structure, value chain mapping, pricing & margin analysis, value-adding activities prioritisation, supply web efficiencies. 7-9 sections.',
  proposition_development: 'Focus on: gap analysis, innovation scouting, price-positioning, customer segment prioritisation, branding & promotions, channel strategy. 8-10 sections.',
  partner_search:          'Focus on: partner identification criteria, distribution partner evaluation, JV/acquisition targets, technology & manufacturing partners, commercial due diligence framework. 7-9 sections.',
  go_to_market:            'Focus on: barriers & drivers, entry mode options, market entry phases & timeline, exit strategy, marketing & communications, product launch roadmap. 7-9 sections.',
};

const TYPE_NAMES = {
  market_overview:          'Market Overview analysis',
  competitive_analysis:     'Competitive Analysis',
  customer_intelligence:    'Customer Intelligence report',
  value_chain:              'Value Chain Consulting report',
  proposition_development:  'Proposition Development report',
  partner_search:           'Partner Search report',
  go_to_market:             'Go-To-Market report',
};

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

  const { industry, country, reportType, questions, companies, slug, userId, liveResearch, language } = req.body;
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

  // Step 2: Research + RAG + Competency template (parallel)
  let plannedSections, research, rag, competencyTemplate;
  try {
    const typeName = TYPE_NAMES[reportType] || 'market research report';

    // CHANGE 1 + 2: Run competency template query alongside research + RAG
    if (liveResearch) {
      [rag, competencyTemplate] = await Promise.all([
        ragSearch(industry, country, reportType),
        getCompetencyTemplate(reportType),
      ]);
      research = liveResearch;
    } else {
      [research, rag, competencyTemplate] = await Promise.all([
        callClaude(`Compile market intelligence for a ${typeName}: ${industry} in ${country}.
${companies ? 'Companies: ' + companies : ''}${questions ? '\nFocus: ' + questions : ''}
Include: market size & growth, key players & share, channels, pricing, trends, regulations.
Be specific and data-rich.`, 1500),
        ragSearch(industry, country, reportType),
        getCompetencyTemplate(reportType),
      ]);
    }

    // Build module guidance from real template or fallback
    let moduleGuidanceText;
    if (competencyTemplate?.section_structure) {
      // Use real section_structure from uploaded module content
      const sections = Array.isArray(competencyTemplate.section_structure)
        ? competencyTemplate.section_structure
        : [];
      moduleGuidanceText = `MODULE SECTION STRUCTURE (from proprietary research library):
${sections.map((s, i) => `${i + 1}. ${s.section}${s.purpose ? ` — ${s.purpose}` : ''}${s.typical_content ? `: ${s.typical_content}` : ''}`).join('\n')}

Methodology: ${competencyTemplate.methodology || 'standard consulting methodology'}
Use this structure as the backbone. Adapt section titles to reflect what the research actually found.`;
    } else {
      // Fallback to hardcoded
      moduleGuidanceText = `Module guidance: ${FALLBACK_GUIDANCE[reportType] || '8-10 sections.'}`;
    }

    // CHANGE 2: Include chunkText in planning prompt (was missing before)
    // Truncate to avoid hitting token limits
    const chunkSample = rag.chunkText
      ? rag.chunkText.split('\n\n').slice(0, 4).join('\n\n')
      : '';

    const planPrompt = `You are planning a ${typeName} report for: ${industry} in ${country}.
${questions ? 'Client focus: ' + questions : ''}
${companies ? 'Companies: ' + companies : ''}

WHAT THE RESEARCH FOUND:
${research}

${chunkSample ? `RELEVANT CHUNKS FROM RESEARCH LIBRARY (use to identify what data is available):
${chunkSample}

` : ''}RAG PATTERNS FROM SIMILAR REPORTS:
${rag.patternText || 'None available'}

${moduleGuidanceText}

Decide the most relevant sections for THIS specific report based on what the research actually surfaced.
Rules:
- Start with "Executive Summary"
- End with "Recommendations" or "Strategic Outlook"
- Each section must cover DISTINCT ground — no overlap
- Reflect actual data found, not generic topics
${reportType === 'competitive_analysis' ? '- Use 6-8 sections focused on competitive comparison.' : ''}
${reportType === 'go_to_market' ? '- Use 7-8 sections focused on entry decision-making.' : ''}
${language && language !== 'English' ? `- Section titles must be in ${language}.` : ''}

Return ONLY a JSON array: ["Title 1", "Title 2", ...]`;

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
    console.warn('DB update failed:', e.message);
  }

  // CHANGE 3: Return competencyTemplate to browser so generate-section can use it
  return res.json({
    reportId,
    sections:            plannedSections,
    researchSummary:     research,
    ragContext:          rag,
    competencyTemplate:  competencyTemplate || null,
    status:              'generating'
  });
}
