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

// ── Country → language detection ────────────────────────
// Auto-detect local language from market selection.
// Covers all APAC + major markets — no per-language maintenance needed.
const COUNTRY_LANG = {
  // Southeast Asia
  'Vietnam':'Vietnamese','Thailand':'Thai','Indonesia':'Indonesian',
  'Malaysia':'Malay','Philippines':'Filipino','Myanmar':'Burmese',
  'Cambodia':'Khmer','Laos':'Lao','Singapore':'English','Brunei':'Malay',
  // East Asia
  'Japan':'Japanese','South Korea':'Korean','Korea':'Korean',
  'China':'Chinese (Simplified)','Taiwan':'Chinese (Traditional)',
  'Hong Kong':'Chinese (Traditional)','Macau':'Chinese (Traditional)',
  // South Asia
  'India':'Hindi','Bangladesh':'Bengali','Sri Lanka':'Sinhala',
  'Pakistan':'Urdu','Nepal':'Nepali',
  // Other
  'Australia':'English','New Zealand':'English','United States':'English',
};

// Local authoritative sources per country — referenced in research prompt
const LOCAL_SOURCES = {
  'Vietnam':     'Tổng cục Thống kê (GSO), Ngân hàng Nhà nước (SBV), VCCI, CafeF, VnExpress',
  'Thailand':    'NESDC, Bank of Thailand, BOI, Bangkok Post, SET',
  'Indonesia':   'BPS, Bank Indonesia, OJK, Kementerian Perdagangan, Bisnis.com, Kompas',
  'Malaysia':    'DOSM, BNM (Bank Negara), MITI, The Edge, Bernama',
  'Philippines': 'PSA, BSP, DTI, Philippine Star',
  'Singapore':   'MTI, MAS, EDB, Channel NewsAsia, The Straits Times',
  'Japan':       '経済産業省 (METI), 日本銀行 (BOJ), 総務省統計局, 日経新聞, 東洋経済',
  'South Korea': '통계청 (KOSTAT), 한국은행 (BOK), 산업통상자원부, 한국경제, 매일경제',
  'Korea':       '통계청 (KOSTAT), 한국은행 (BOK), 산업통상자원부, 한국경제, 매일경제',
  'China':       '国家统计局 (NBS), 商务部, 中国人民银行, 财新, 第一财经',
  'Taiwan':      '主計總處 (DGBAS), 中央銀行, 工業總會, 經濟日報',
  'India':       'MOSPI, RBI, DPIIT, Economic Times, Business Standard',
  'Myanmar':     'MNPED, CBM, DICA, Myanmar Times',
  'Cambodia':    'NIS, NBC, CRDB, Phnom Penh Post',
};

// ── EN fallback queries per section type ─────────────────
const EN_QUERIES = {
  executive_summary:     (I,C) => [`${I} market overview ${C} 2024 key findings`],
  market_assessment:     (I,C) => [`${I} market size ${C} 2024 revenue USD`,`${I} market growth CAGR ${C}`],
  market_segmentation:   (I,C) => [`${I} market segments ${C} product categories breakdown`],
  industry_structure:    (I,C) => [`${I} distribution channels ${C} share`,`${I} value chain margin stack ${C}`],
  competitive_landscape: (I,C) => [`${I} market share ${C} 2024 top companies ranking`],
  competitor_profiles:   (I,C) => [`${I} company revenue strategy ${C} 2024`,`${I} leading player ${C} profile`],
  market_drivers:        (I,C) => [`${I} growth drivers ${C} 2024`,`${I} challenges barriers ${C}`],
  consumer_insights:     (I,C) => [`${I} consumer behavior ${C} 2024 survey`],
  pricing_analysis:      (I,C) => [`${I} pricing segments ${C}`,`${I} price tier strategy ${C}`],
  regulatory:            (I,C) => [`${I} regulations ${C} 2024`,`${I} government policy ${C}`],
  market_forecast:       (I,C) => [`${I} market forecast ${C} 2025 2026 2027 scenario`],
  recommendations:       (I,C) => [`${I} market entry opportunity strategy ${C}`],
  industry_competitiveness:(I,C)=>[`${I} competitive intensity ${C} barriers entry`],
  pricing_margin:        (I,C) => [`${I} distributor retailer margin stack ${C}`],
  partner_identification:(I,C) => [`${I} distribution partner ${C}`,`${I} business partner ${C} 2024`],
  entry_mode:            (I,C) => [`${I} market entry mode ${C} distributor JV greenfield`],
  gap_analysis:          (I,C) => [`${I} market gap unmet needs ${C} whitespace`],
};

// Section type detector — works for any language section titles
function detectSectionType(title) {
  const patterns = [
    [/exec.*sum|summary.*exec|tóm.*tắt|エグゼクティブ|요약|执行摘要|ringkasan/i, 'executive_summary'],
    [/market.*siz|market.*assess|market.*over|quy.*mô|市場規模|시장.*규모|市场规模|ukuran pasar|ขนาดตลาด/i,'market_assessment'],
    [/segment|phân.*khúc|セグメント|세분화|市场细分|segmen/i,  'market_segmentation'],
    [/value.*chain|industry.*struct|channel.*struct|chuỗi|kênh|バリューチェーン|가치.*사슬|价值链/i,'industry_structure'],
    [/compet.*land|market.*share|thị.*phần.*tổng|市場シェア|시장.*점유|市场份额/i,'competitive_landscape'],
    [/compet.*profil|player.*profil|hồ.*sơ|競合.*プロフィール|경쟁.*프로필|竞争对手/i,'competitor_profiles'],
    [/driver|trend|factor|động.*lực|xu.*hướng|動向|트렌드|趋势|แนวโน้ม|tren/i,'market_drivers'],
    [/consumer|customer|buyer|khách.*hàng|người.*tiêu|消費者|소비자|消费者/i,'consumer_insights'],
    [/pric|giá|定.*価|가격|定价|ราคา|harga/i,               'pricing_analysis'],
    [/regulat|policy|pháp.*lý|chính.*sách|規制|규제|监管|กฎระเบียบ|regulasi/i,'regulatory'],
    [/forecast|dự.*báo|kịch.*bản|予測|예측|预测|การคาดการณ์|proyeksi/i,'market_forecast'],
    [/recommend|khuyến.*nghị|提言|권고|建议|estrategi/i,      'recommendations'],
    [/competit.*intensity|industry.*comp/i,                  'industry_competitiveness'],
    [/margin.*anal|pricing.*margin|value.*chain.*map/i,      'pricing_margin'],
    [/partner.*ident|partner.*crit|distribution.*eval/i,     'partner_identification'],
    [/entry.*mode|phương.*thức|参入モード|진입.*방식|进入方式/i,'entry_mode'],
    [/gap.*anal|innovation.*scout/i,                         'gap_analysis'],
  ];
  for (const [rx, type] of patterns) if (rx.test(title)) return type;
  return null;
}

// ── Dynamic local query generation via Claude ─────────────
// Instead of hardcoded per-language templates, Claude generates
// idiomatic queries for ANY language/country automatically.
async function generateLocalizedQueries(sections, industry, country, localLanguage) {
  if (!localLanguage || localLanguage === 'English') return {};

  const localSources = LOCAL_SOURCES[country] || `local statistics bureau, central bank, industry associations in ${country}`;
  const sectionList  = sections.slice(0, 10).map((t,i) => `${i+1}. ${t}`).join('\n');

  const prompt = `Generate idiomatic ${localLanguage} web search queries for market research on "${industry}" in ${country}.

Local authoritative sources to reference: ${localSources}

Sections needing queries:
${sectionList}

For each section: 2 search queries in ${localLanguage} that would find real primary data.
Rules:
- Natural ${localLanguage} phrasing — NOT word-for-word translation from English
- Reference local institution names where relevant (e.g., 経済産業省, 통계청, Tổng cục Thống kê)
- Include year 2024 where relevant
- Specific enough to return data (not generic news articles)

Return ONLY JSON: {"Section Title": ["query1", "query2"], ...}`;

  try {
    const raw   = await callClaude(prompt, 600);
    const clean = raw.replace(/```json|```/g,'').trim();
    return JSON.parse(clean);
  } catch {
    return {}; // fail silently — EN queries will cover
  }
}

// Build final per-section query map — local FIRST, EN fallback appended
function buildSectionQueries(sections, localQueryMap, industry, country) {
  const result = {};
  sections.forEach(title => {
    const type   = detectSectionType(title);
    const localQ = localQueryMap[title] || [];
    const enQ    = EN_QUERIES[type]
      ? EN_QUERIES[type](industry, country)
      : [`${industry} ${title} ${country} 2024`];
    result[title] = {
      type,
      queries:      [...localQ, ...enQ], // local FIRST
      localQueries: localQ,
      enQueries:    enQ,
    };
  });
  return result;
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

    // ── Build module guidance ──
    let moduleGuidanceText;
    if (competencyTemplate?.section_structure) {
      const sections = Array.isArray(competencyTemplate.section_structure)
        ? competencyTemplate.section_structure : [];
      moduleGuidanceText = `MODULE SECTION STRUCTURE (from proprietary research library):
${sections.map((s, i) => `${i + 1}. ${s.section}${s.purpose ? ` — ${s.purpose}` : ''}${s.typical_content ? `: ${s.typical_content}` : ''}`).join('\n')}
Methodology: ${competencyTemplate.methodology || 'standard consulting methodology'}
Use this structure as the backbone. Adapt section titles to reflect what the research actually found.`;
    } else {
      moduleGuidanceText = `Module guidance: ${FALLBACK_GUIDANCE[reportType] || '8-10 sections.'}`;
    }

    const chunkSample = rag.chunkText
      ? rag.chunkText.split('\n\n').slice(0, 4).join('\n\n') : '';

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

    // ── Run planning + local research in parallel ────────────
    // Saves ~10s vs sequential. Local research runs concurrently
    // with section planning since they don't depend on each other.
    const localLanguage = language && language !== 'English'
      ? language
      : (COUNTRY_LANG[country] || 'English');

    const localSources = LOCAL_SOURCES[country]
      || `local statistics bureau, central bank, industry associations in ${country}`;

    // Plan sections (sequential dependency: needs research)
    plannedSections = await callClaude(planPrompt, 500)
      .then(t => JSON.parse(t.replace(/```json|```/g, '').trim()));

    // ── Local research + query generation (1 combined call) ──
    // Merged to save 1 round-trip. Returns both local data AND
    // idiomatic local queries in a single response.
    // Non-blocking: if it fails, EN queries + base research still work.
    let localQueryMap = {};
    if (!liveResearch && localLanguage !== 'English') {
      const sectionList = plannedSections.slice(0,8).map((t,i)=>`${i+1}. ${t}`).join('\n');

      const combinedPrompt =
`You are a local market research specialist for ${country}. Answer in TWO parts.

PART 1 — LOCAL RESEARCH
Research "${industry}" in ${country} using local sources: ${localSources}
For each section below, provide 2 data points with source attribution:
${sectionList}
Use ${localLanguage} for company names and local terms. Include local currency. Year: 2023-2024.

PART 2 — LOCAL SEARCH QUERIES
For each section, generate 2 idiomatic ${localLanguage} web search queries.
Natural phrasing only — not word-for-word from English.
Reference local institutions (e.g., 経済産業省, 통계청, Tổng cục Thống kê) where relevant.

Return ONLY valid JSON:
{
  "research": "Section findings grouped by section title...",
  "queries": {"Section Title": ["query1", "query2"], ...}
}`;

      const raw = await callClaude(combinedPrompt, 1200).catch(() => null);
      if (raw) {
        try {
          const parsed = JSON.parse(raw.replace(/```json|```/g,'').trim());
          if (parsed.research) {
            research = `${research}\n\n=== LOCAL DATA (${localLanguage}, ${country}) ===\n${parsed.research}`;
          }
          localQueryMap = parsed.queries || {};
        } catch {
          // partial failure — try to extract what we can
          if (raw.includes('=== LOCAL DATA') || raw.length > 100) {
            research = `${research}\n\n=== LOCAL DATA (${localLanguage}, ${country}) ===\n${raw.slice(0, 2000)}`;
          }
        }
      }
    }

    const sectionQueries = buildSectionQueries(
      plannedSections, localQueryMap, industry, country
    );

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

  // CHANGE 3: Return competencyTemplate + sectionQueries to browser
  return res.json({
    reportId,
    sections:           plannedSections,
    researchSummary:    research,
    ragContext:         rag,
    competencyTemplate: competencyTemplate || null,
    sectionQueries:     sectionQueries || {},
    status:             'generating'
  });
}
