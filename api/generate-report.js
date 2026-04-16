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
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n\n');
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

const SECTION_TEMPLATES = {
  industry_deep_dive: [
    'Executive Summary', 'Market Assessment', 'Market Segmentation',
    'Industry Structure', 'Competitive Landscape', 'Competitor Profiles',
    'Market Drivers & Trends', 'Consumer Insights', 'Pricing Analysis',
    'Regulatory Environment', 'Market Forecast', 'Recommendations'
  ],
  competitive_comparison: [
    'Companies Overview', 'Product & Service Comparison', 'Market Position & Share',
    'Competitive Strengths & Weaknesses', 'Strategic Moves & Developments', 'Competitive Outlook'
  ],
  market_entry_brief: [
    'Market Opportunity Summary', 'Regulatory & Compliance', 'Distribution & Channels',
    'Competitive Environment', 'Pricing & Positioning', 'Potential Partners', 'Entry Strategy'
  ]
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

  let report;
  try {
    const created = await sb('custom_reports', 'POST', {
      user_id:      userId || null,
      slug:         slug || `${reportType}-${Date.now()}`,
      report_type:  reportType,
      input_params: { industry, country, reportType, questions, companies },
      sections:     sections.map(t => ({ title: t, content: '', status: 'pending' })),
      status:       'researching'
    });
    report = Array.isArray(created) ? created[0] : created;
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create job: ' + e.message });
  }

  try {
    const [researchSummary, rag] = await Promise.all([
      claudeResearch(`Research ${reportType.replace(/_/g,' ')} for ${industry} in ${country}.
Compile: market size & growth rate, key players & market share, distribution channels, pricing landscape, recent trends, regulations.
${companies ? 'Companies to include: ' + companies : ''}${questions ? '\nClient focus: ' + questions : ''}
Be specific and data-rich. Cite data years where known.`),
      ragSearch(industry, country, reportType)
    ]);

    await sbUpdate('custom_reports', report.id, {
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
