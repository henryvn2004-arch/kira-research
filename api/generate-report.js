// ============================================================
// KIRA RESEARCH — api/generate-report.js
// POST /api/generate-report
// Phase 1 only: create job + research via web_search (~20s)
// Returns { reportId, sections, researchSummary, ragContext }
// Browser then drives /api/generate-section per section
// ============================================================

export const config = { maxDuration: 60 };

const ANTHROPIC_URL        = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_KEY        = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL         = 'claude-sonnet-4-5';
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY           = process.env.OPENAI_API_KEY;

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 204) return null;
  return res.json();
}

async function sbUpdate(table, id, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  });
}

async function claudeResearch(prompt) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.[0]?.text || '';
}

async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-large', input: text, dimensions: 1536 })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data[0].embedding;
}

async function ragSearch(industry, country, reportType) {
  try {
    const vector = await embed(`${industry} ${country} ${reportType} market analysis`);
    const [chunks, patterns] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/rpc/search_report_chunks`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_embedding: vector, match_threshold: 0.65, match_count: 8 })
      }).then(r => r.json()),
      fetch(`${SUPABASE_URL}/rest/v1/rpc/search_industry_patterns`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_embedding: vector, match_threshold: 0.65, match_count: 5 })
      }).then(r => r.json())
    ]);
    return {
      chunkText:   (chunks   || []).map(c => `[${c.chunk_type}] ${c.content}`).join('\n\n'),
      patternText: (patterns || []).map(p => `[${p.pattern_type}] ${p.description}`).join('\n\n')
    };
  } catch { return { chunkText: '', patternText: '' }; }
}

// ── Section planning — Claude decides sections dynamically ──
async function planSections(industry, country, reportType, questions, companies) {
  const typeDescriptions = {
    industry_deep_dive:      'full market analysis report',
    competitive_comparison:  'competitive comparison report',
    market_entry_brief:      'market entry brief'
  };
  const typeDesc = typeDescriptions[reportType] || 'market research report';

  const prompt = `You are planning a ${typeDesc} for: ${industry} in ${country}.
${questions ? `Client focus: ${questions}` : ''}
${companies ? `Companies: ${companies}` : ''}

Decide the most relevant sections for THIS specific report. Think about what a consulting client actually needs for this industry and market.

Return ONLY a JSON array of section title strings (6-12 sections), no explanation:
["Section Title 1", "Section Title 2", ...]

Rules:
- Tailor to the industry (e.g. for fintech include Regulatory & Licensing; for FMCG include Shopper Behavior; for EV include Infrastructure & Charging)
- Always start with Executive Summary
- Always end with Recommendations or Strategic Implications  
- ${reportType === 'competitive_comparison' ? 'Focus on comparison sections: profiles, positioning, strengths/weaknesses, strategic moves' : ''}
- ${reportType === 'market_entry_brief' ? 'Focus on entry-relevant sections: opportunity, barriers, channels, partners, entry strategy' : ''}
- Between 8-12 sections for deep dive, 6-8 for others
- Return ONLY the JSON array`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text  = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { industry, country, reportType, questions, companies, slug, userId } = req.body;
  if (!industry || !country || !reportType) return res.status(400).json({ error: 'Missing required fields' });

  const sections = SECTION_TEMPLATES[reportType] || SECTION_TEMPLATES.industry_deep_dive;

  // Create job record (sections TBD after planning)
  let report;
  try {
    const created = await sb('custom_reports', 'POST', {
      user_id:      userId || null,
      slug:         slug || `${reportType}-${Date.now()}`,
      report_type:  reportType,
      input_params: { industry, country, reportType, questions, companies },
      sections:     [],
      status:       'researching'
    });
    report = Array.isArray(created) ? created[0] : created;
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create job: ' + e.message });
  }

  // Plan sections + research in parallel
  let sections, researchSummary, rag;
  try {
    [sections, researchSummary, rag] = await Promise.all([
      planSections(industry, country, reportType, questions, companies),
      claudeResearch(`Compile market intelligence for a ${reportType.replace(/_/g,' ')} on ${industry} in ${country}.
Include: market size & growth, key players & share, distribution channels, pricing, recent trends, regulations.
${companies ? 'Companies: ' + companies : ''}${questions ? '\nFocus: ' + questions : ''}
Be specific and data-rich.`),
      ragSearch(industry, country, reportType)
    ]);

    await sbUpdate('custom_reports', report.id, {
      sections:      sections.map(t => ({ title: t, content: '', status: 'pending' })),
      research_data: { summary: researchSummary },
      rag_context:   { chunkText: rag.chunkText, patternText: rag.patternText },
      status:        'generating'
    });

    return res.json({
      reportId:        report.id,
      sections,
      researchSummary,
      ragContext:      rag,
      status:          'generating'
    });

  } catch (e) {
    await sbUpdate('custom_reports', report.id, { status: 'failed' });
    return res.status(500).json({ error: 'Research failed: ' + e.message });
  }
}
