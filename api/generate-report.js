// KIRA RESEARCH — api/generate-report.js
// Lightweight planning endpoint — does NOT do heavy research (that causes 504).
// Flow:
//   1. Receive liveResearch from browser (already done client-side)
//   2. RAG search + competency template (parallel, ~3s)
//   3. Plan sections with Claude (~5s)
//   4. Build localized queries (sync, no extra API call)
//   5. Return { reportId, sections, sectionQueries, ... }
//
// Total budget: ~15-20s, well under 60s Vercel limit.
// No local research pass here — that runs inside generate-section per section.

export const config = { maxDuration: 55, runtime: 'nodejs' };

const ANTHROPIC_URL  = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-sonnet-4-20250514';
const SB_URL         = process.env.SUPABASE_URL;
const SB_KEY         = process.env.SUPABASE_SERVICE_KEY;
const OAI_KEY        = process.env.OPENAI_API_KEY;
const ANT_KEY        = process.env.ANTHROPIC_API_KEY;

// ── Helpers ──────────────────────────────────────────────
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

async function sbPatch(table, id, body) {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
               'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

async function callClaude(prompt, maxTokens) {
  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json',
               'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`Claude API ${r.status}: ${errText.slice(0, 200)}`);
  }
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
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
    const vec  = await getEmbedding(`${industry} ${country} ${reportType}`);
    const opts = { method: 'POST',
                   headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
                               'Content-Type': 'application/json' } };
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
      patternText: (p || []).map(x => `[${x.pattern_type}] ${x.description}`).join('\n\n'),
    };
  } catch {
    return { chunkText: '', patternText: '' };
  }
}

async function getCompetencyTemplate(reportType) {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/competency_templates?competency_type=eq.${reportType}&limit=1`,
      { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } }
    );
    const d = await r.json();
    return Array.isArray(d) && d[0] ? d[0] : null;
  } catch { return null; }
}

// ── Country → language ────────────────────────────────────
const COUNTRY_LANG = {
  'Vietnam':'Vietnamese','Thailand':'Thai','Indonesia':'Indonesian',
  'Malaysia':'Malay','Philippines':'Filipino','Myanmar':'Burmese',
  'Cambodia':'Khmer','Laos':'Lao','Singapore':'English',
  'Japan':'Japanese','South Korea':'Korean','Korea':'Korean',
  'China':'Chinese (Simplified)','Taiwan':'Chinese (Traditional)',
  'Hong Kong':'Chinese (Traditional)',
  'India':'Hindi','Bangladesh':'Bengali','Sri Lanka':'Sinhala',
  'Australia':'English','New Zealand':'English','United States':'English',
};

// ── EN fallback queries ───────────────────────────────────
const EN_QUERIES = {
  executive_summary:     (I,C) => [`${I} market overview ${C} 2024`],
  market_assessment:     (I,C) => [`${I} market size ${C} 2024 revenue`,`${I} market growth CAGR ${C}`],
  market_segmentation:   (I,C) => [`${I} market segments ${C} breakdown`],
  industry_structure:    (I,C) => [`${I} distribution channels ${C}`,`${I} value chain margin ${C}`],
  competitive_landscape: (I,C) => [`${I} market share ${C} 2024 top companies`],
  competitor_profiles:   (I,C) => [`${I} leading companies ${C} strategy 2024`],
  market_drivers:        (I,C) => [`${I} growth drivers ${C} 2024`,`${I} challenges ${C}`],
  consumer_insights:     (I,C) => [`${I} consumer behavior ${C} 2024`],
  pricing_analysis:      (I,C) => [`${I} pricing tiers ${C}`,`${I} price strategy ${C}`],
  regulatory:            (I,C) => [`${I} regulations ${C} 2024`],
  market_forecast:       (I,C) => [`${I} market forecast ${C} 2025 2026 2027`],
  recommendations:       (I,C) => [`${I} market entry strategy ${C}`],
};

function detectSectionType(title) {
  const t = title.toLowerCase();
  if (/exec|summary|tóm|요약|まとめ/.test(t))           return 'executive_summary';
  if (/market.*siz|market.*assess|siz.*market|quy.*mô|規模|규모/.test(t)) return 'market_assessment';
  if (/segment|phân.*khúc|세분/.test(t))                return 'market_segmentation';
  if (/value.*chain|channel|chuỗi|kênh|バリュー|유통/.test(t)) return 'industry_structure';
  if (/compet.*land|market.*share|thị.*phần|シェア|점유/.test(t)) return 'competitive_landscape';
  if (/compet.*prof|player.*prof|hồ.*sơ|プロフィール|프로필/.test(t)) return 'competitor_profiles';
  if (/driver|trend|factor|động.*lực|動向|트렌드/.test(t)) return 'market_drivers';
  if (/consumer|customer|buyer|khách|消費者|소비/.test(t)) return 'consumer_insights';
  if (/pric|giá|価格|가격/.test(t))                      return 'pricing_analysis';
  if (/regulat|policy|pháp|chính.*sách|規制|규제/.test(t)) return 'regulatory';
  if (/forecast|dự.*báo|予測|예측/.test(t))              return 'market_forecast';
  if (/recommend|khuyến|提言|권고/.test(t))              return 'recommendations';
  return null;
}

// Build section queries from EN_QUERIES only (fast, sync).
// Local language queries are generated dynamically inside generate-section.js
// using the localLanguage param — no extra API call needed here.
function buildSectionQueries(sections, industry, country) {
  const result = {};
  sections.forEach(title => {
    const type = detectSectionType(title);
    const enQ  = EN_QUERIES[type]
      ? EN_QUERIES[type](industry, country)
      : [`${industry} ${title} ${country} 2024`];
    result[title] = { type, queries: enQ };
  });
  return result;
}

// ── Module constants ──────────────────────────────────────
const FALLBACK_GUIDANCE = {
  market_overview:         '8-10 sections: executive summary, market sizing, segmentation, industry structure, competitive landscape, drivers & trends, forecast, recommendations.',
  competitive_analysis:    '7-8 sections: exec summary, industry competitiveness, competitive positioning, competitor profiles (top 3-5), strategy & performance, best practices, outlook.',
  customer_intelligence:   '8 sections: exec summary, customer segmentation, needs & pain points, buying behavior, brand perception, willingness to pay, channel preferences, recommendations.',
  value_chain:             '7 sections: exec summary, industry structure, value chain mapping, pricing & margin analysis, bottlenecks, supply web efficiencies, recommendations.',
  proposition_development: '8 sections: exec summary, gap analysis, innovation scouting, price-positioning, segment prioritisation, branding & comms, channel strategy, roadmap.',
  partner_search:          '7 sections: exec summary, partner criteria, distribution evaluation, JV/acquisition targets, tech & manufacturing partners, due diligence framework, shortlist.',
  go_to_market:            '8 sections: exec summary, market opportunity, barriers & drivers, entry mode options, entry phases & timeline, marketing plan, exit strategy, action plan.',
};

const TYPE_NAMES = {
  market_overview:         'Market Overview',
  competitive_analysis:    'Competitive Analysis',
  customer_intelligence:   'Customer Intelligence',
  value_chain:             'Value Chain',
  proposition_development: 'Proposition Development',
  partner_search:          'Partner Search',
  go_to_market:            'Go-To-Market',
};

// ── CORS ─────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// ── Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { industry, country, reportType, questions, companies,
          slug, userId, liveResearch, language } = req.body;

  if (!industry || !country || !reportType) {
    return res.status(400).json({ error: 'Missing required fields: industry, country, reportType' });
  }

  // ── Step 1: Create job record ────────────────────────────
  let reportId;
  try {
    const job = await sbPost('custom_reports', {
      user_id:      userId || null,
      slug:         slug || `${reportType}-${Date.now()}`,
      report_type:  reportType,
      input_params: { industry, country, reportType, questions, companies, language },
      sections:     [],
      status:       'researching',
    });
    reportId = job?.id;
    if (!reportId) throw new Error('No ID returned');
  } catch (e) {
    return res.status(500).json({ error: 'DB error: ' + e.message });
  }

  // ── Step 2: RAG + competency template (parallel, ~3s) ────
  // Research already done by browser (liveResearch param).
  // If no liveResearch, do a quick Claude knowledge-base call.
  let research, rag, competencyTemplate;
  try {
    const typeName = TYPE_NAMES[reportType] || 'market research report';

    if (liveResearch) {
      [rag, competencyTemplate] = await Promise.all([
        ragSearch(industry, country, reportType),
        getCompetencyTemplate(reportType),
      ]);
      research = liveResearch;
    } else {
      // Fallback: quick Claude knowledge call (no Perplexity)
      [research, rag, competencyTemplate] = await Promise.all([
        callClaude(
          `Compile market intelligence for a ${typeName}: ${industry} in ${country}.
${companies ? 'Companies: ' + companies : ''}
${questions  ? 'Focus: '    + questions  : ''}
Include: market size & growth, key players & share, channels, pricing, trends, regulations.
Be specific. Max 400 words.`, 800),
        ragSearch(industry, country, reportType),
        getCompetencyTemplate(reportType),
      ]);
    }
  } catch (e) {
    await sbPatch('custom_reports', reportId, { status: 'failed' });
    return res.status(500).json({ error: 'Research/RAG failed: ' + e.message });
  }

  // ── Step 3: Plan sections (~5s) ──────────────────────────
  let plannedSections;
  try {
    const typeName = TYPE_NAMES[reportType] || 'market research report';

    // Build module guidance from template or fallback
    let moduleGuidance;
    if (competencyTemplate?.section_structure) {
      const secs = Array.isArray(competencyTemplate.section_structure)
        ? competencyTemplate.section_structure : [];
      moduleGuidance = `SECTION STRUCTURE FROM RESEARCH LIBRARY:\n${
        secs.map((s,i) =>
          `${i+1}. ${s.section}${s.purpose ? ` — ${s.purpose}` : ''}`
        ).join('\n')}`;
    } else {
      moduleGuidance = `MODULE GUIDANCE: ${FALLBACK_GUIDANCE[reportType] || '8-10 sections.'}`;
    }

    const chunkSample = rag.chunkText
      ? rag.chunkText.split('\n\n').slice(0, 3).join('\n\n') : '';

    const planPrompt = `Plan sections for a ${typeName} report: ${industry} in ${country}.
${companies ? 'Companies: ' + companies : ''}
${questions  ? `\nCLIENT'S SPECIFIC QUESTIONS (these MUST be answered by the report structure):\n"${questions}"\n\nEnsure the section list directly addresses these questions. Add or rename sections to cover the client's specific focus — do not default to a generic structure if the client has specific needs.` : ''}

RESEARCH SUMMARY:
${(research || '').slice(0, 2000)}

${chunkSample ? `LIBRARY CONTEXT:\n${chunkSample}\n` : ''}
${rag.patternText ? `PATTERNS:\n${rag.patternText}\n` : ''}
${moduleGuidance}

Rules:
- 7-9 sections total
- Start with "Executive Summary", end with "Recommendations" or "Strategic Outlook"
- Each section covers DISTINCT ground — no overlap
- Reflect actual research data found
${language && language !== 'English' ? `- Titles in ${language}` : ''}

Return ONLY a JSON array: ["Title 1", "Title 2", ...]`;

    const raw = await callClaude(planPrompt, 400);
    plannedSections = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (!Array.isArray(plannedSections) || !plannedSections.length) {
      throw new Error('Planning returned empty sections');
    }
  } catch (e) {
    await sbPatch('custom_reports', reportId, { status: 'failed' });
    return res.status(500).json({ error: 'Section planning failed: ' + e.message });
  }

  // ── Step 4: Build section queries (sync, no API call) ────
  const localLanguage  = language && language !== 'English'
    ? language : (COUNTRY_LANG[country] || 'English');
  const sectionQueries = buildSectionQueries(plannedSections, industry, country);

  // ── Step 5: Save to DB ───────────────────────────────────
  try {
    await sbPatch('custom_reports', reportId, {
      sections:      plannedSections.map(t => ({ title: t, content: '', status: 'pending' })),
      research_data: { summary: (research || '').slice(0, 8000) },
      rag_context:   { chunkText: rag.chunkText, patternText: rag.patternText },
      status:        'generating',
    });
  } catch (e) {
    console.warn('DB save warning:', e.message);
    // non-fatal — continue
  }

  // ── Return to browser ────────────────────────────────────
  return res.json({
    reportId,
    sections:          plannedSections,
    researchSummary:   research,
    ragContext:        rag,
    competencyTemplate: competencyTemplate || null,
    sectionQueries,
    localLanguage,
    status:            'generating',
  });
}
