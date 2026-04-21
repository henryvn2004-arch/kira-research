// KIRA RESEARCH — api/generate-section.js
// 2-phase per section:
//   Phase 1: stream commentary (~15s)
//   Phase 2: extract headline + stats + chart + table from text (~3s)
// SSE events: token | meta | done
//
// CHANGES:
// 4. Anti-overlap: full headline summary of ALL completed sections (was slice(-2))
// 5. Competency template section guidance injected per section

export const config = { maxDuration: 55, runtime: 'nodejs' };

const ANT_URL = 'https://api.anthropic.com/v1/messages';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-20250514';
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY;
const OAI_KEY = process.env.OPENAI_API_KEY;

async function sbGet(table, id) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  return (await r.json())?.[0];
}

async function sbPatch(table, id, body) {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

async function callClaude(prompt, maxTokens) {
  const r = await fetch(ANT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || '';
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// ── SECTION BLUEPRINTS — guided authorship approach ──────
// Philosophy: give Claude LENSES to look through, not CHECKBOXES to fill.
// Claude decides depth per lens based on data availability.
// "cover only what data supports, estimate honestly where needed"
//
// Each entry:
//   angle:     the unique POV this section takes (differentiates from other sections)
//   lenses:    analytical dimensions to assess — not all must appear, depth varies by data
//   boundary:  what NOT to cover (belongs to adjacent sections — prevents overlap)
//   ragQuery:  specific query for per-section RAG search (more relevant than generic query)
const SECTION_BLUEPRINTS = {
  executive_summary: {
    angle: 'Decision-ready brief — synthesize the 5-7 most strategically important findings. No new analysis, only distillation.',
    lenses: ['Overall market size & growth headline (1-2 numbers)', 'Single most important competitive dynamic', 'Top 2-3 strategic implications', 'Key opportunity or risk requiring action'],
    boundary: 'Do NOT include detailed methodology, full competitive profiles, or granular pricing breakdowns.',
    ragQuery: (I,C) => `${I} ${C} market executive summary key findings`,
  },
  market_assessment: {
    angle: 'Quantify the market — make the growth story credible with numbers.',
    lenses: ['Current market size (value + volume if relevant)', 'Historical CAGR (2-3 year trend)', 'Forecast 3-5 years + assumptions', 'Demand drivers behind growth', 'Seasonality or structural cyclicality'],
    boundary: 'Do NOT write about who the players are or channel structure — those belong to other sections.',
    ragQuery: (I,C) => `${I} ${C} market size revenue growth CAGR forecast`,
  },
  market_segmentation: {
    angle: 'Slice the market — identify which sub-groups are growing fastest and most attractive.',
    lenses: ['Primary segmentation dimensions (product/price/geography/channel)', 'Segment sizes as % of total', 'Fastest growing vs declining segments', 'Premium vs mass split', 'Underserved or emerging segments'],
    boundary: 'Do NOT repeat overall market size or name which companies play in which segment.',
    ragQuery: (I,C) => `${I} ${C} market segments breakdown product categories`,
  },
  industry_structure: {
    angle: 'Map how value flows — who captures margin where, what the channel architecture looks like.',
    lenses: ['Value chain flow (manufacturer → distributor → channel → buyer)', 'Channel mix % (online vs offline, modern vs traditional)', 'Approximate margin stack at each level', 'Key intermediaries and their role', 'Structural shifts (disintermediation, D2C growth, digitization)'],
    boundary: 'Do NOT name end-market brands or discuss consumer needs.',
    ragQuery: (I,C) => `${I} ${C} distribution channels value chain margin stack`,
  },
  competitive_landscape: {
    angle: 'Map the battle — market share, concentration, and what competitive dynamics define the fight.',
    lenses: ['Market share of top 3-5 players (%)', 'Market concentration (fragmented/oligopoly/monopoly)', 'Basis of competition (price / distribution / brand / innovation?)', 'Recent significant moves', 'Barriers to entry'],
    boundary: 'Do NOT profile individual companies in depth — that is Competitor Profiles.',
    ragQuery: (I,C) => `${I} ${C} market share competitive landscape top companies ranking`,
  },
  competitor_profiles: {
    angle: 'Intelligence on each major player — their strategy, footprint, and where they are vulnerable.',
    lenses: ['Market position (share/rank/trajectory — growing or losing?)', 'What they actually win on (differentiation)', 'Operational footprint (distribution reach, geographic coverage)', 'Pricing tier and pricing power', 'One clear vulnerability or strategic blind spot'],
    boundary: 'Do NOT repeat overall market share summary or market size data.',
    ragQuery: (I,C) => `${I} ${C} competitor company profile revenue strategy distribution`,
  },
  market_drivers: {
    angle: 'Explain why this market moves — tailwinds accelerating growth and headwinds creating friction.',
    lenses: ['3-5 growth drivers (quantify where possible)', '2-3 restraints or challenges', '1-2 disruptive trends that could reshape the market', 'Structural vs cyclical classification', 'Relative magnitude (which driver matters most?)'],
    boundary: 'Do NOT discuss market size (Market Assessment) or player responses (Competitor Profiles).',
    ragQuery: (I,C) => `${I} ${C} market growth drivers trends challenges 2024`,
  },
  consumer_insights: {
    angle: 'Humanize the demand side — who buys, why, how, and what shifts behavior.',
    lenses: ['Primary buyer segments (demographics + psychographics)', 'Key purchase drivers and unmet needs', 'Buying process and decision journey', 'Brand perception and loyalty patterns', 'Price sensitivity and willingness to pay range'],
    boundary: 'Do NOT discuss channel structure or market size.',
    ragQuery: (I,C) => `${I} ${C} consumer behavior customer insights buying decision`,
  },
  pricing_analysis: {
    angle: 'Map the price architecture — how the market is stratified and where the value pools are.',
    lenses: ['Price tier breakdown (economy / mid / premium / super-premium)', 'Price range for key products in each tier', 'Which players occupy which tiers', 'Price-volume relationship (largest tier by volume vs value)', 'Pricing trends (inflation, premiumization, downtrading)'],
    boundary: 'Do NOT discuss margin stack (Industry Structure) or brand-level competitive positioning.',
    ragQuery: (I,C) => `${I} ${C} pricing price tiers segments premium value`,
  },
  regulatory: {
    angle: 'Map the regulatory landscape as a business risk and opportunity filter.',
    lenses: ['Key regulations or standards currently in force', 'Recent or upcoming changes (with dates)', 'Compliance costs or entry barriers', 'Government policy stance (supportive / neutral / restrictive)', 'Regional variations if applicable'],
    boundary: 'Do NOT quantify market size impact — that goes in Market Drivers.',
    ragQuery: (I,C) => `${I} ${C} regulations policy legal compliance requirements`,
  },
  market_forecast: {
    angle: 'Build a forward view — what this market looks like in 3-5 years across scenarios.',
    lenses: ['Base case (CAGR + market size by year + assumptions)', 'Optimistic scenario (what drives upside)', 'Conservative scenario (what causes underperformance)', 'Key inflection points or triggers to watch', 'Fastest growing segments in forecast period'],
    boundary: 'Do NOT repeat historical data — only forward-looking from current base.',
    ragQuery: (I,C) => `${I} ${C} market forecast outlook projection 2025 2026 2027`,
  },
  recommendations: {
    angle: 'Turn analysis into action — concrete, prioritized recommendations.',
    lenses: ['Product/service strategy', 'Pricing and positioning', 'Channel and distribution approach', 'Entry sequencing (which segment/geography first)', 'Top 2-3 priority actions with rationale'],
    boundary: 'Reference conclusions from previous sections, do NOT repeat the analysis.',
    ragQuery: (I,C) => `${I} ${C} market entry strategy recommendations opportunities`,
  },
  // Partner Search / GTM specific
  industry_competitiveness: {
    angle: 'Competitive intensity — concentration, barriers to entry, structural dynamics.',
    lenses: ['Market structure type (fragmented/concentrated)', 'Barriers to entry (capital/regulatory/distribution/brand)', 'Threat of new entrants and substitutes', 'Supplier and buyer power'],
    boundary: 'Do NOT profile individual companies.',
    ragQuery: (I,C) => `${I} ${C} competitive intensity barriers entry market structure`,
  },
  entry_mode: {
    angle: 'Evaluate all viable entry modes — pros/cons/required resources for each.',
    lenses: ['Export / distributor / JV / greenfield / acquisition options', 'Control vs risk tradeoff per mode', 'Investment level required', 'Recommended mode with rationale', 'Timing considerations'],
    boundary: 'Do NOT discuss marketing plan — that is a separate section.',
    ragQuery: (I,C) => `${I} ${C} market entry mode foreign company distributor JV`,
  },
  gap_analysis: {
    angle: 'Identify the whitespace — where current offerings underserve, and what that creates.',
    lenses: ['Unmet customer needs (from demand-side data)', 'Product/service gaps vs ideal offering', 'Competitive whitespace (underserved positioning)', 'Which segment is most underserved'],
    boundary: 'Do NOT recommend solutions yet — that comes in recommendations.',
    ragQuery: (I,C) => `${I} ${C} market gap unmet needs whitespace opportunity`,
  },
};

// ── RAG query per section ─────────────────────────────────
// Instead of one generic RAG query for entire report,
// each section gets its own targeted query for more relevant context.
function getSectionRagQuery(sectionTitle, industry, country) {
  const blueprint = getBlueprint(sectionTitle);
  if (blueprint?.ragQuery) return blueprint.ragQuery(industry, country);
  // Fallback: combine section title keywords with industry/country
  const titleKeywords = sectionTitle.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(' ');
  return `${industry} ${titleKeywords} ${country}`;
}

// Match a section title to a blueprint using normalized keyword matching
function getBlueprint(sectionTitle) {
  const t = sectionTitle.toLowerCase()
    .replace(/[^a-zà-ỹ0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ').trim();

  const patterns = [
    [/exec.*sum|tóm.*(tắt|lược)|overview.*exec|summary/i, 'executive_summary'],
    [/market.*assess|market.*overview|market.*size|đánh.*(giá|thị)|thị.*trường.*tổng/i, 'market_assessment'],
    [/segment|phân.*khúc|phân.*loại|segment|tiểu.*vùng/i, 'market_segmentation'],
    [/industry.*struct|value.*chain|channel.*struct|chuỗi.*giá|cấu.*trúc.*ngành/i, 'industry_structure'],
    [/compet.*landscape|market.*share|cạnh.*tranh.*tổng|bức.*tranh.*cạnh/i, 'competitive_landscape'],
    [/compet.*profil|player.*profil|company.*profil|hồ.*sơ.*công|đối.*thủ.*cụ|competitor.*detail/i, 'competitor_profiles'],
    [/driver|trend|factor|động.*lực|xu.*hướng|restraint|barrier|nhân.*tố/i, 'market_drivers'],
    [/consumer|customer|buyer|shopper|người.*tiêu|khách.*hàng|insight.*kh/i, 'consumer_insights'],
    [/pric|giá|định.*giá|price.*tier|price.*arch/i, 'pricing_analysis'],
    [/regulat|policy|legal|compliance|chính.*sách|pháp.*lý|quy.*định/i, 'regulatory'],
    [/forecast|outlook|projection|scenario|dự.*báo|kịch.*bản|tương.*lai/i, 'market_forecast'],
    [/recommend|strateg.*implication|action|khuyến.*nghị|chiến.*lược.*đề/i, 'recommendations'],
  ];

  for (const [pattern, key] of patterns) {
    if (pattern.test(sectionTitle)) return SECTION_BLUEPRINTS[key] || null;
  }
  return null;
}

// Map section title → SECTION_BLUEPRINTS key (used for chunk_type lookup in RAG)
function detectSectionType(sectionTitle) {
  const blueprint = getBlueprint(sectionTitle);
  if (!blueprint) return null;
  for (const [key, bp] of Object.entries(SECTION_BLUEPRINTS)) {
    if (bp === blueprint) return key;
  }
  return null;
}

// Inject blueprint as analytical lenses — guided authorship, not checkbox
function getSectionGuidance(competencyTemplate, sectionTitle) {
  const blueprint = getBlueprint(sectionTitle);
  if (blueprint) {
    return `ANALYTICAL FRAMEWORK for "${sectionTitle}":
Angle: ${blueprint.angle}

Assess through these lenses — cover what the data supports, skip what it doesn't, estimate honestly where needed ("est. ~X based on..."):
${blueprint.lenses.map((l, i) => `  → ${l}`).join('\n')}

${blueprint.boundary}

Write in proportion to data richness: if one lens has strong data, give it more depth.
Do not force equal coverage — consult data, then decide depth per lens.`;
  }

  // Fallback to competency template
  if (!competencyTemplate?.section_structure) return '';
  const sections = Array.isArray(competencyTemplate.section_structure)
    ? competencyTemplate.section_structure : [];
  const titleWords = sectionTitle.toLowerCase().split(/\s+/);
  const match = sections.find(s => {
    const sName = (s.section || '').toLowerCase();
    return titleWords.some(w => w.length > 3 && sName.includes(w));
  });
  if (!match) return '';
  const parts = [
    match.purpose ? `Angle: ${match.purpose}` : '',
    match.typical_content ? `Expected content: ${match.typical_content}` : '',
    match.data_points ? `Key data: ${Array.isArray(match.data_points) ? match.data_points.join(', ') : match.data_points}` : '',
  ].filter(Boolean);
  return parts.length ? `SECTION GUIDANCE:\n${parts.join('\n')}` : '';
}

// ── Translate blueprint guidance into local-language search queries ──────
// This ensures research data is sourced from local-language results,
// not just English-language market reports.
//
// Example output for Vietnamese, fintech industry:
// → "thị phần fintech Việt Nam 2024"
// → "doanh thu ví điện tử MoMo ZaloPay 2024"
// → "cấu trúc kênh phân phối fintech Việt Nam"
function buildLocalizedSearchHints(blueprint, language, industry, country, sectionTitle) {
  if (!blueprint || !language || language === 'English') return '';

  // Language → search instruction map
  const langMeta = {
    'Vietnamese': { lang: 'tiếng Việt', example: 'thị phần, doanh thu, tăng trưởng' },
    'Thai':       { lang: 'ภาษาไทย',    example: 'ส่วนแบ่งตลาด, รายได้, การเติบโต' },
    'Indonesian': { lang: 'Bahasa Indonesia', example: 'pangsa pasar, pendapatan, pertumbuhan' },
    'Malay':      { lang: 'Bahasa Melayu',    example: 'bahagian pasaran, pendapatan, pertumbuhan' },
    'Filipino':   { lang: 'Filipino',          example: 'market share, kita, paglago' },
    'Khmer':      { lang: 'ខ្មែរ',             example: 'ចំណែកទីផ្សារ, ចំណូល, កំណើន' },
    'Myanmar':    { lang: 'မြန်မာ',             example: 'ဈေးကွက်ဝင်ရောက်မှု, ဝင်ငွေ, ကြီးထွားမှု' },
  };
  const meta = langMeta[language] || { lang: language, example: 'market share, revenue, growth' };

  // Build localized query starters from mustCover items
  const queryHints = (blueprint.mustCover || []).slice(0, 4).map(item => {
    // Strip numbering/bullets, keep the core concept
    return item.replace(/^\d+\.\s*|^-\s*/, '').split('(')[0].trim().toLowerCase();
  });

  return `
LOCAL-LANGUAGE RESEARCH GUIDANCE:
The report is in ${language}. Web searches for this section MUST prioritize ${meta.lang} sources.

Section: "${sectionTitle}" | Industry: ${industry} | Market: ${country}

Recommended search terms (translate to ${meta.lang}):
${queryHints.map((q, i) => `  ${i+1}. "${industry} ${q} ${country} 2024" — in ${meta.lang}`).join('\n')}
  ${blueprint.dataHints ? `${blueprint.dataHints.split(',').map(h => `"${h.trim()} ${country}"`).join(' | ')}` : ''}

When citing data:
- Prefer local-language sources (local news, government stats, industry associations)
- Attribute to local source names when known (e.g., Tổng cục Thống kê, Bank Indonesia, NESDC)
- Use local currency and measurement units alongside USD
- If local data is unavailable, clearly note "data unavailable for ${country}, estimated from regional benchmarks"`;
}

// Map section blueprint type → chunk_type in RAG database
// This tells us which chunk_type contains relevant HOW-TO-WRITE examples
const SECTION_CHUNK_TYPE = {
  executive_summary:      'framework',
  market_assessment:      'industry_insight',
  market_segmentation:    'industry_insight',
  industry_structure:     'channel_data',
  competitive_landscape:  'competitive_insight',
  competitor_profiles:    'competitive_insight',
  market_drivers:         'industry_insight',
  consumer_insights:      'consumer_insight',
  pricing_analysis:       'pricing_data',
  regulatory:             'industry_insight',
  market_forecast:        'industry_insight',
  recommendations:        'recommendation',
  industry_competitiveness: 'competitive_insight',
  entry_mode:             'framework',
  gap_analysis:           'consumer_insight',
};

// ── Per-section RAG search ────────────────────────────────
// Runs 2 parallel queries:
//   1. Semantic similarity on section-specific query → relevant DATA chunks
//   2. chunk_type filter → HOW-TO-WRITE examples from similar reports in library
async function sectionRagSearch(query, sectionType) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OAI_KEY}` },
      body: JSON.stringify({ model: 'text-embedding-3-large', input: query, dimensions: 1536 })
    });
    const embData = await embRes.json();
    clearTimeout(timeout);
    if (embData.error) return null;
    const vec = embData.data[0].embedding;

    const chunkType = sectionType ? (SECTION_CHUNK_TYPE[sectionType] || null) : null;
    const opts = { method: 'POST',
                   headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`,
                               'Content-Type': 'application/json' } };

    // Query 1: semantic similarity — finds DATA relevant to this section
    // Query 2: chunk_type filter — finds HOW-TO-WRITE examples from library
    // Query 3: industry patterns — structural patterns
    const [dataChunks, frameworkChunks, patterns] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/rpc/search_report_chunks`, {
        ...opts,
        body: JSON.stringify({ query_embedding: vec, match_threshold: 0.65, match_count: 4 })
      }).then(r => r.json()),

      chunkType ? fetch(`${SB_URL}/rest/v1/rpc/search_report_chunks`, {
        ...opts,
        // chunk_type_filter param — works with upgraded RPC, ignored if old RPC
        body: JSON.stringify({ query_embedding: vec, match_threshold: 0.60, match_count: 2, chunk_type_filter: chunkType })
      }).then(r => r.json()).catch(() => []) : Promise.resolve([]),

      fetch(`${SB_URL}/rest/v1/rpc/search_industry_patterns`, {
        ...opts,
        body: JSON.stringify({ query_embedding: vec, match_threshold: 0.65, match_count: 3 })
      }).then(r => r.json()),
    ]);

    // Framework chunks go first — they show Claude HOW to write this section type
    // Data chunks follow — they provide the CONTENT to write about
    const allChunks = [...(frameworkChunks || []), ...(dataChunks || [])];

    return {
      chunkText:   allChunks.map(x => `[${x.chunk_type}] ${x.content}`).join('\n\n'),
      patternText: (patterns || []).map(x => `[${x.pattern_type}] ${x.description}`).join('\n\n'),
    };
  } catch { clearTimeout(timeout); return null; }
}

function buildAntiOverlapContext(prevSections) {
  if (!prevSections?.length) return '';
  const completed = prevSections
    .filter(s => s.status === 'completed' && s.content)
    .map(s => {
      try {
        const p = JSON.parse(s.content);
        const statsSnippet = (p.stats || []).map(st => `${st.label}: ${st.value}`).join(', ');
        return `• [${s.title}]: ${p.headline || ''}${statsSnippet ? ` | Stats used: ${statsSnippet}` : ''}`;
      } catch { return `• [${s.title}]`; }
    });
  if (!completed.length) return '';
  return `ALREADY COVERED — do NOT repeat these data points or conclusions:
${completed.join('\n')}

Rules: introduce UNIQUE data/angles; briefly cross-reference previous sections when needed ("as noted in [X]...") rather than repeating.`;
}


// ── Doc Intelligence context builder ─────────────────────
// Presentation-focused context — wildcard tool for any doc type or pure AI request.
function buildDocContext(params, researchSummary, prevSections, sectionTitle) {
  const { questions, language } = params;

  const langInstruction = (language && language !== 'English')
    ? `\nOUTPUT LANGUAGE: Write ALL content in ${language}. Section titles, headers, all text.`
    : '';

  const antiOverlap = buildAntiOverlapContext(prevSections);

  // Use most relevant content for this specific section
  const content = researchSummary
    ? researchSummary.slice(0, 3500)
    : 'No source material provided — draw on your expertise.';

  return `Original request: "${questions}"${langInstruction}

SOURCE MATERIAL:
${content}
${antiOverlap ? `\n${antiOverlap}` : ''}`;
}

function buildContext(params, ragContext, researchSummary, prevSections, competencyTemplate, sectionTitle, sectionQuery) {
  const { industry, country, reportType, questions, companies, language } = params;
  const langInstruction = (language && language !== 'English')
    ? `\nOUTPUT LANGUAGE: Write ALL content in ${language}. This includes headlines, commentary, table headers, chart labels, and all text.`
    : '';

  // ── Smart context trimming — only send what's relevant to THIS section ──
  // Full research dump is 4000 tokens × 8 sections = 32K wasted input tokens.
  // Instead: detect section type, extract relevant paragraphs from research.
  const sectionType = getBlueprint(sectionTitle)?.angle?.split('—')[0]?.toLowerCase() || '';
  const trimmedResearch = trimResearchForSection(researchSummary, sectionTitle, sectionType);

  // RAG: separate framework chunks (how-to-write) from data chunks (what-to-write-about)
  const effectiveRag  = ragContext || {};
  const allChunks     = effectiveRag.chunkText || '';
  const frameworkChunks = allChunks.split('\n\n').filter(c => c.startsWith('[framework]'));
  const dataChunks      = allChunks.split('\n\n').filter(c => !c.startsWith('[framework]'));

  const ragBlock = [
    frameworkChunks.length
      ? `WRITING EXAMPLES FROM RESEARCH LIBRARY (how similar sections were structured in real reports):\n${frameworkChunks.slice(0,2).join('\n\n')}`
      : '',
    dataChunks.length
      ? `RELEVANT DATA FROM LIBRARY:\n${dataChunks.slice(0,3).join('\n\n').slice(0,800)}`
      : '',
    effectiveRag.patternText
      ? `INDUSTRY PATTERNS:\n${effectiveRag.patternText.slice(0,400)}`
      : '',
  ].filter(Boolean).join('\n\n');

  const antiOverlap     = buildAntiOverlapContext(prevSections);
  const sectionGuidance = getSectionGuidance(competencyTemplate, sectionTitle);
  const blueprint       = getBlueprint(sectionTitle);
  const localHints      = buildLocalizedSearchHints(blueprint, language, industry, country, sectionTitle);

  const targetedQueries = sectionQuery?.queries?.length
    ? `\nSECTION QUERIES (search terms for this section):\n${sectionQuery.queries.slice(0,3).map(q => `  • ${q}`).join('\n')}`
    : '';

  return `Industry: ${industry} | Market: ${country} | Report: ${reportType.replace(/_/g,' ')}
${companies ? `Key companies: ${companies}` : ''}${langInstruction}
${questions ? `\nCLIENT FOCUS — address this in your analysis: "${questions}"` : ''}

RESEARCH DATA:
${trimmedResearch}
${ragBlock ? `\n${ragBlock}` : ''}
${sectionGuidance ? `\n${sectionGuidance}` : ''}
${localHints ? `\n${localHints}` : ''}
${targetedQueries}
${antiOverlap ? `\n${antiOverlap}` : ''}`;
}

// Extract only research paragraphs relevant to current section type
// Avoids sending 4000-token research dump to every section
function trimResearchForSection(research, sectionTitle, sectionAngle) {
  if (!research) return 'Draw on your knowledge.';
  const lines = research.split('\n').filter(l => l.trim().length > 10);

  // Keywords that indicate relevance to this section
  const titleWords = sectionTitle.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).filter(w => w.length > 3);

  // Score each paragraph by keyword overlap
  const paragraphs = research.split('\n\n').filter(p => p.trim().length > 30);
  const scored = paragraphs.map(p => {
    const pl = p.toLowerCase();
    const score = titleWords.reduce((s,w) => s + (pl.includes(w) ? 2 : 0), 0)
      + (pl.includes('===') ? 3 : 0); // boost LOCAL DATA sections
    return { p, score };
  });

  // Take top 5 most relevant paragraphs + always include LOCAL DATA section if present
  const localDataIdx = paragraphs.findIndex(p => p.includes('=== LOCAL DATA'));
  const sorted = scored.sort((a,b) => b.score - a.score).slice(0, 5).map(x => x.p);

  if (localDataIdx >= 0 && !sorted.includes(paragraphs[localDataIdx])) {
    sorted.push(paragraphs[localDataIdx]);
  }

  const result = sorted.join('\n\n').slice(0, 2500); // 2500 chars = ~600 tokens, balanced
  return result || research.slice(0, 2500);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    reportId, sectionIndex, sectionTitle, totalSections,
    industry, country, reportType, questions, companies, language,
    researchSummary, ragContext,
    prevSections = [],
    competencyTemplate = null,
    sectionQuery = null,       // per-section localized queries from generate-report
  } = req.body;

  if (!sectionTitle) return res.status(400).json({ error: 'Missing sectionTitle' });

  const isDocIntelligence = reportType === 'document_intelligence';

  // Doc Intelligence: skip RAG entirely (docs are already in researchSummary)
  // Market Research: run per-section RAG search
  let context;
  if (isDocIntelligence) {
    context = buildDocContext(
      { questions, language },
      researchSummary, prevSections, sectionTitle
    );
  } else {
    const sectionRagQuery = getSectionRagQuery(sectionTitle, industry, country);
    const sectionType     = detectSectionType(sectionTitle);
    const sectionRag      = await sectionRagSearch(sectionRagQuery, sectionType).catch(() => null);
    const effectiveRag    = sectionRag?.chunkText
      ? sectionRag
      : { chunkText: ragContext?.chunkText || '', patternText: ragContext?.patternText || '' };
    context = buildContext(
      { industry, country, reportType, questions, companies, language },
      effectiveRag, researchSummary, prevSections, competencyTemplate, sectionTitle, sectionQuery
    );
  }

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (type, data) => {
    try { res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`); } catch {}
  };

  // ── Phase 1: Stream commentary ─────────────────────────
  let fullCommentary = '';
  try {
    const prompt = isDocIntelligence
      ? `You are a senior consultant building a consulting presentation. Write section "${sectionTitle}" (${sectionIndex + 1} of ${totalSections}).

${context}

Write 250-350 words of crisp, presentation-ready consulting prose.

APPROACH:
- Lead with the single most important insight, finding, or recommendation for this section
- Ground every claim in the source material or your expertise — be specific (numbers, names, dates)
- This section will become a slide: write for clarity, impact, and decision-making
- Use **bold** for key metrics, findings, named entities, and strategic points
- Build toward a clear implication or action the reader should take
- If source material is available, extract and interpret it; if not, apply your expertise directly
- Write with confidence and authority — no disclaimers, no hedging
- Flowing paragraphs only. No bullet lists.`
      : `You are a senior market research analyst at a top consulting firm. Write section "${sectionTitle}" (${sectionIndex + 1} of ${totalSections}) of a market research report.

${context}

Write 300-400 words of consulting-grade analytical prose.

APPROACH:
- Use the research data above as your primary factual foundation
- SUPPLEMENT freely with your own knowledge of this industry, country, and market — do NOT limit yourself only to what the research explicitly states
- If the research data is sparse, draw on your knowledge to provide depth and context
- Lead with the single most important strategic insight for THIS section
- Include specific numbers, company names, market dynamics
- Attribute figures to sources where possible: "According to [source]..." or use "est." for estimates
- Use **bold** for key terms, company names, data points
- Connect insights to strategic implications throughout
- End with a forward-looking strategic implication
- No hedging, no AI disclaimers, no "based on the provided data" — write with authority
- Flowing paragraphs only. No bullet lists.`;

    const streamRes = await fetch(ANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1100, stream: true, messages: [{ role: 'user', content: prompt }] })
    });

    const reader  = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            fullCommentary += evt.delta.text;
            send('token', { text: evt.delta.text });
          }
        } catch {}
      }
    }
  } catch (e) {
    send('token', { text: '\n\n*Generation error: ' + e.message + '*' });
  }

  // ── Phase 2: Extract meta + visuals from commentary ────
  let meta = { headline: '', stats: [], chart: null, table: null, sources: [] };
  try {
    const isNarrativeSection = /executive summary|recommendation|strategic outlook|conclusion/i.test(sectionTitle);

    // Section-title-based chart hints
    const secLower = sectionTitle.toLowerCase();
    let chartHint = '';
    if (/market size|market.*value|revenue.*forecast|growth.*projection/.test(secLower)) {
      chartHint = 'This is a MARKET SIZE section → use "line" chart with years as labels and projected values as data. Extrapolate to 5-year series using CAGR if mentioned.';
    } else if (/market share|competitive landscape|player.*share/.test(secLower)) {
      chartHint = 'This is a MARKET SHARE section → use "doughnut" chart with each player as a label and their share % as data. Add "Others" to reach 100%.';
    } else if (/competitor|competitive|player.*profile|company.*comparison/.test(secLower)) {
      chartHint = 'This is a COMPETITOR COMPARISON section → use "radar" chart: labels = 4-6 attributes (Price Competitiveness, Distribution, Brand Strength, Innovation, etc.), datasets = one per competitor with scores 1-10.';
    } else if (/channel|distribution|retail.*channel/.test(secLower)) {
      chartHint = 'This is a CHANNEL section → use "bar" (horizontal) with channel names as labels and share % or index as data.';
    } else if (/pric|price|pricing/.test(secLower)) {
      chartHint = 'This is a PRICING section → use "bar" (horizontal) sorted by price, showing price points for key brands/segments.';
    } else if (/segment|segmentation|consumer.*type/.test(secLower)) {
      chartHint = 'This is a SEGMENTATION section → use "doughnut" chart showing segment sizes, OR "bar" showing segment characteristics.';
    } else if (/driver|trend|factor/.test(secLower)) {
      chartHint = 'This is a DRIVERS section → use "bar" (horizontal) with drivers/factors as labels and importance scores 1-10 as data.';
    } else if (/consumer|customer|buyer|shopper/.test(secLower)) {
      chartHint = 'This is a CONSUMER section → use "bar" (horizontal) for preferences/attributes or "radar" for comparing consumer segments across needs.';
    }

    const langNote = (language && language !== 'English')
      ? `\nIMPORTANT: All text (headline, stat labels, chart title, chart labels, table headers) must be in ${language}.`
      : '';

    const extractPrompt = `You wrote this market research section titled "${sectionTitle}":
${langNote}

${fullCommentary}

Extract structured data. Return ONLY valid JSON with this exact structure:
{
  "headline": "Key strategic finding in 1-2 sentences, specific and data-driven",
  "stats": [
    {"value": "~$2.4B", "label": "Market size 2024", "icon": "globe"},
    {"value": "18%", "label": "CAGR 2024-2029", "icon": "growth"},
    {"value": "3", "label": "Dominant players", "icon": "users"}
  ],
  "chart": {
    "type": "line",
    "title": "Market Size (USD Billion), 2022-2027",
    "labels": ["2022", "2023", "2024", "2025", "2026", "2027"],
    "datasets": [{"label": "Market Size ($B)", "data": [1.2, 1.5, 1.9, 2.3, 2.8, 3.4]}]
  },
  "table": {
    "title": "Competitive Landscape Overview",
    "headers": ["Player", "Est. Share", "Strengths", "Price Tier"],
    "rows": [
      ["Company A", "~35%", "Strong distribution", "Premium"],
      ["Company B", "~22%", "Price leader", "Mid-range"]
    ]
  },
  "sources": ["Industry report 2024", "Analyst estimate"]
}

RULES — read carefully:

headline: 1-2 sentences, specific numbers, strategic insight.

stats: exactly 2-4 metrics. icon options: pie|growth|trend|users|channel|price|globe|check

chart: ${isNarrativeSection ? 'set to null for this narrative section.' : `REQUIRED — must NOT be null. ${chartHint}

Chart type decision:
- Market size over time → "line" with year labels
- Market share / composition → "doughnut" (add "Others" to reach 100%)
- Competitor rankings → "bar" (horizontal, sorted by value)
- Multi-attribute competitor comparison → "radar"
- Growth rates or segment volumes → "bar" (vertical)
- Price positioning → "bar" (horizontal, sorted by price)

datasets[].data values MUST be numbers (no strings, no currency symbols).
labels length MUST equal datasets[0].data length.
Max 8 labels. For multi-series bar/line, include all series in datasets array.`}

table: ${isNarrativeSection ? 'set to null for this narrative section.' : `REQUIRED — must NOT be null. Most useful table for this section type:
- Competitive section → players × share/strengths/price/distribution
- Channel section → channels × share/growth/dominant players/margin
- Consumer section → segments × size/needs/willingness to pay/channel
- Pricing section → tiers × price range/key brands/target buyer
- Regulatory section → requirements × details/timeline/impact
- Default → 3-col key facts table (Metric | Value | Source)
Max 8 rows. All values as short strings.`}

sources: 1-3 sources referenced in text, or "Industry estimate" / "Analyst projection".

CRITICAL: Return ONLY the JSON object. No explanation. No markdown fences.`;

    const raw = await callClaude(extractPrompt, 1100); // 1100 sufficient for chart+table JSON

    // Robust JSON parsing — handle truncated or fence-wrapped responses
    let parsed = null;
    const clean = raw.replace(/```json\s*/g,'').replace(/```/g,'').trim();
    try {
      parsed = JSON.parse(clean);
    } catch {
      // Try to find a complete JSON object even if response was truncated
      const objStart = clean.indexOf('{');
      if (objStart >= 0) {
        // Walk backwards to find the outermost closing brace
        let depth = 0, lastClose = -1;
        for (let ci = objStart; ci < clean.length; ci++) {
          if (clean[ci] === '{' || clean[ci] === '[') depth++;
          if (clean[ci] === '}' || clean[ci] === ']') { depth--; if (depth === 0) lastClose = ci; }
        }
        if (lastClose > objStart) {
          try { parsed = JSON.parse(clean.slice(objStart, lastClose + 1)); } catch {}
        }
      }
    }

    if (parsed) {
      // Sanitize chart: ensure data arrays are numbers
      if (parsed.chart?.datasets) {
        parsed.chart.datasets = parsed.chart.datasets.map(ds => ({
          ...ds,
          data: (ds.data||[]).map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g,''))||0),
        }));
        // Normalize type names
        if (parsed.chart.type === 'donut') parsed.chart.type = 'doughnut';
        if (parsed.chart.type === 'pie')   parsed.chart.type = 'doughnut';
        if (parsed.chart.type === 'horizontal_bar' || parsed.chart.type === 'bar_horizontal') {
          parsed.chart.type = 'bar';
          parsed.chart.horizontal = true;
        }
      }
      meta = { ...meta, ...parsed };
    } else {
      console.warn(`[generate-section] JSON parse failed for section "${sectionTitle}". Raw (first 200): ${raw.slice(0,200)}`);
    }
  } catch (e) {
    console.warn('Meta extraction failed:', e.message);
  }

  send('meta', meta);

  // ── Save to DB ─────────────────────────────────────────
  if (reportId) {
    try {
      const report = await sbGet('custom_reports', reportId);
      if (report) {
        const content = JSON.stringify({ ...meta, commentary: fullCommentary });
        const updatedSections = (report.sections || []).map((s, i) =>
          i === sectionIndex ? { ...s, content, status: 'completed' } : s
        );
        await sbPatch('custom_reports', reportId, {
          sections:   updatedSections,
          status:     updatedSections.every(s => s.status === 'completed') ? 'completed' : 'generating',
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) { console.warn('DB save failed:', e.message); }
  }

  send('done', { sectionIndex });
  res.end();
}
