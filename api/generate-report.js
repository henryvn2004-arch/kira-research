// ============================================================
// KIRA RESEARCH — api/generate-report.js
// Flow: Create job → Research (Claude web_search) → RAG →
//       Generate sections (Claude Sonnet) → Save to Supabase
// POST /api/generate-report
// ============================================================

export const config = { maxDuration: 60 };

const ANTHROPIC_URL        = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_KEY        = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL         = 'claude-sonnet-4-5';
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY           = process.env.OPENAI_API_KEY;

// ── Supabase helper ──────────────────────────────────────
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  });
  return res;
}

// ── Claude call (no tools) ───────────────────────────────
async function claude(systemPrompt, userPrompt, maxTokens = 1500) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error('Claude error: ' + data.error.message);
  return data.content?.[0]?.text || '';
}

// ── Claude with web_search tool ─────────────────────────
async function claudeResearch(prompt, maxTokens = 2000) {
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
      max_tokens: maxTokens,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error('Claude research error: ' + data.error.message);
  // Extract text blocks from response (web_search may return multiple blocks)
  const texts = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n\n');
  return texts;
}

// ── OpenAI embeddings ────────────────────────────────────
async function embed(text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text })
  });
  const data = await res.json();
  if (data.error) throw new Error('Embedding error: ' + data.error.message);
  return data.data[0].embedding;
}

// ── RAG: search relevant chunks + patterns ───────────────
async function ragSearch(industry, country, reportType) {
  try {
    const query   = `${industry} ${country} ${reportType} market analysis`;
    const vector  = await embed(query);

    // RPC calls to pgvector functions defined in schema
    const [chunks, patterns] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/rpc/search_report_chunks`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_embedding: vector,
          match_threshold: 0.65,
          match_count: 8
        })
      }).then(r => r.json()),

      fetch(`${SUPABASE_URL}/rest/v1/rpc/search_industry_patterns`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query_embedding: vector,
          match_threshold: 0.65,
          match_count: 5
        })
      }).then(r => r.json())
    ]);

    const chunkText   = (chunks || []).map(c => `[${c.chunk_type}] ${c.content}`).join('\n\n');
    const patternText = (patterns || []).map(p => `[${p.pattern_type}] ${p.description}`).join('\n\n');
    return { chunkText, patternText };

  } catch (e) {
    console.warn('RAG search failed (non-fatal):', e.message);
    return { chunkText: '', patternText: '' };
  }
}

// ── Section templates ────────────────────────────────────
const SECTION_TEMPLATES = {
  industry_deep_dive: [
    { title: 'Executive Summary',         tokens: 2000 },
    { title: 'Market Assessment',         tokens: 1500 },
    { title: 'Market Segmentation',       tokens: 1500 },
    { title: 'Industry Structure',        tokens: 1500 },
    { title: 'Competitive Landscape',     tokens: 1500 },
    { title: 'Competitor Profiles',       tokens: 1800 },
    { title: 'Market Drivers & Trends',   tokens: 1500 },
    { title: 'Consumer Insights',         tokens: 1500 },
    { title: 'Pricing Analysis',          tokens: 1200 },
    { title: 'Regulatory Environment',    tokens: 1200 },
    { title: 'Market Forecast',           tokens: 1200 },
    { title: 'Recommendations',           tokens: 1500 }
  ],
  competitive_comparison: [
    { title: 'Companies Overview',                      tokens: 1800 },
    { title: 'Product & Service Comparison',            tokens: 1500 },
    { title: 'Market Position & Share',                 tokens: 1500 },
    { title: 'Competitive Strengths & Weaknesses',      tokens: 1500 },
    { title: 'Strategic Moves & Recent Developments',   tokens: 1500 },
    { title: 'Competitive Outlook & Recommendations',   tokens: 1500 }
  ],
  market_entry_brief: [
    { title: 'Market Opportunity Summary',          tokens: 1800 },
    { title: 'Regulatory & Compliance Requirements',tokens: 1500 },
    { title: 'Distribution & Channel Landscape',    tokens: 1500 },
    { title: 'Competitive Environment',             tokens: 1500 },
    { title: 'Pricing & Positioning Benchmarks',    tokens: 1200 },
    { title: 'Potential Partners & Service Providers', tokens: 1500 },
    { title: 'Entry Strategy Recommendations',      tokens: 1500 }
  ]
};

// ── CORS ─────────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Main handler ─────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { industry, country, reportType, questions, companies, slug, userId } = req.body;

  if (!industry || !country || !reportType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sections  = SECTION_TEMPLATES[reportType] || SECTION_TEMPLATES.industry_deep_dive;
  const inputParams = { industry, country, reportType, questions, companies };

  // ── Create job record in Supabase ─────────────────────
  let report;
  try {
    const created = await sb('custom_reports', 'POST', {
      user_id: userId || null,
      slug: slug || `${reportType}-${Date.now()}`,
      report_type: reportType,
      input_params: inputParams,
      sections: sections.map(s => ({ title: s.title, content: '', status: 'pending' })),
      status: 'pending'
    });
    report = Array.isArray(created) ? created[0] : created;
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create report job: ' + e.message });
  }

  // ── Return reportId immediately so client can start polling ──
  res.json({ reportId: report.id, status: 'pending' });

  // ── Heavy lifting happens after response is sent ──────
  // (Vercel will keep function alive until complete or maxDuration)
  generateInBackground(report, sections, inputParams).catch(async (e) => {
    console.error('[generate-report] background error:', e);
    await sbUpdate('custom_reports', report.id, { status: 'failed' }).catch(() => {});
  });
}

// ── Background generation ────────────────────────────────
async function generateInBackground(report, sections, inputParams) {
  const { industry, country, reportType, questions, companies } = inputParams;
  const reportId = report.id;

  // ── Phase 1: Update status → researching ─────────────
  await sbUpdate('custom_reports', reportId, { status: 'researching' });

  // ── Phase 2: Research via Claude web_search ───────────
  let researchData = '';
  try {
    const researchPrompt = buildResearchPrompt(industry, country, reportType, questions, companies);
    researchData = await claudeResearch(researchPrompt, 3000);
  } catch (e) {
    console.warn('Research phase failed, continuing without web data:', e.message);
    researchData = `Market: ${industry} in ${country}. Research data unavailable — generating from knowledge base.`;
  }

  await sbUpdate('custom_reports', reportId, {
    research_data: { summary: researchData },
    status: 'generating'
  });

  // ── Phase 3: RAG context ──────────────────────────────
  const { chunkText, patternText } = await ragSearch(industry, country, reportType);

  // ── Phase 4: Generate sections sequentially ───────────
  const completedSections = [];
  const systemPrompt = buildSystemPrompt(industry, country, reportType, researchData, chunkText, patternText, questions);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    // Mark this section as generating
    const updatedSections = sections.map((s, idx) => ({
      title: s.title,
      content: idx < i ? completedSections[idx]?.content || '' : '',
      status: idx < i ? 'completed' : idx === i ? 'generating' : 'pending'
    }));
    await sbUpdate('custom_reports', reportId, { sections: updatedSections });

    // Build user prompt with context from previous sections
    const prevContext = completedSections.slice(-2)
      .map(s => `## ${s.title}\n${s.content.substring(0, 400)}...`)
      .join('\n\n');

    const userPrompt = buildSectionPrompt(section.title, i + 1, sections.length, prevContext, inputParams);

    try {
      const content = await claude(systemPrompt, userPrompt, section.tokens);
      completedSections.push({ title: section.title, content, status: 'completed' });
    } catch (e) {
      console.error(`Section "${section.title}" failed:`, e.message);
      completedSections.push({
        title: section.title,
        content: `This section could not be generated. Please contact support.`,
        status: 'failed'
      });
    }
  }

  // ── Phase 5: Save completed report ───────────────────
  await sbUpdate('custom_reports', reportId, {
    sections: completedSections,
    rag_context: { chunks_used: !!chunkText, patterns_used: !!patternText },
    status: 'completed',
    updated_at: new Date().toISOString()
  });
}

// ── Prompt builders ──────────────────────────────────────
function buildResearchPrompt(industry, country, reportType, questions, companies) {
  const typeLabel = reportType.replace(/_/g, ' ');
  const focus = questions ? `\nFocus areas: ${questions}` : '';
  const comps  = companies ? `\nCompanies to research: ${companies}` : '';

  return `You are a market research analyst. Research the following for a ${typeLabel} report.

Industry: ${industry}
Country/Market: ${country}${comps}${focus}

Search for and compile:
1. Current market size and growth rate (2024-2026 data preferred)
2. Key players and their approximate market share
3. Major distribution channels and how they work in this market
4. Current pricing landscape and price ranges
5. Key market trends and recent developments (last 12 months)
6. Relevant regulations or policy changes
7. Consumer/customer behavior patterns
${companies ? '8. Specific data on each company: ' + companies : ''}

Provide specific data points, statistics, and facts where available. Cite the year of data when known. Be concise but data-rich.`;
}

function buildSystemPrompt(industry, country, reportType, researchData, chunkText, patternText, questions) {
  const ragContext = [
    chunkText ? `RELEVANT FRAMEWORKS FROM RESEARCH LIBRARY:\n${chunkText}` : '',
    patternText ? `INDUSTRY PATTERNS FOR THIS TYPE OF MARKET:\n${patternText}` : ''
  ].filter(Boolean).join('\n\n---\n\n');

  return `You are a senior market research consultant writing a professional ${reportType.replace(/_/g,' ')} report.

CLIENT BRIEF:
- Industry: ${industry}
- Market: ${country}
- Report type: ${reportType.replace(/_/g,' ')}
${questions ? `- Client focus areas: ${questions}` : ''}

CURRENT MARKET RESEARCH DATA:
${researchData || 'Limited data available — draw on industry knowledge.'}

${ragContext ? `PROPRIETARY RESEARCH LIBRARY CONTEXT:\n${ragContext}` : ''}

WRITING STANDARDS:
- Write in clear, professional consulting prose
- Lead each section with the most important finding or insight
- Use specific data points and numbers where available
- Structure content with logical flow — insight → evidence → implication
- Use **bold** for key terms, data points, and company names
- Use ### for sub-headers within a section
- Be analytical, not just descriptive — explain what data means
- Length: match the depth expected for a paid consulting report
- Do NOT add disclaimers, caveats about AI, or mention data limitations
- Do NOT start with "In this section..." — lead with the insight directly`;
}

function buildSectionPrompt(sectionTitle, sectionNum, totalSections, prevContext, inputParams) {
  const { industry, country, companies } = inputParams;
  const companiesTip = companies && sectionTitle.toLowerCase().includes('compet')
    ? `\nFocus on these companies: ${companies}` : '';

  return `Write Section ${sectionNum} of ${totalSections}: "${sectionTitle}"

Market: ${industry} in ${country}${companiesTip}

${prevContext ? `CONTEXT FROM PREVIOUS SECTIONS (for continuity):\n${prevContext}` : ''}

Write a thorough, consulting-grade "${sectionTitle}" section. Be specific, data-driven, and analytical. Do not repeat what was covered in previous sections.`;
}
