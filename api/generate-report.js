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

// ── Local-language query generation ──────────────────────
// Map country → authoritative local sources to cite
const LOCAL_SOURCES = {
  'Vietnam':     'Tổng cục Thống kê (GSO), Ngân hàng Nhà nước (SBV), VCCI, CafeF, VnExpress, Tạp chí Kinh tế',
  'Thailand':    'NESDC, Bank of Thailand, BOI, Bangkok Post, SET, Thai PBS',
  'Indonesia':   'BPS, Bank Indonesia, OJK, Kementerian Perdagangan, Bisnis.com, Kompas',
  'Malaysia':    'DOSM, BNM (Bank Negara), MITI, The Edge, Bernama',
  'Philippines': 'PSA, BSP, DTI, Philippine Star, Philippine Daily Inquirer',
  'Singapore':   'MTI, MAS, EDB, Channel NewsAsia, The Straits Times',
  'Myanmar':     'MNPED, CBM, DICA, Myanmar Times',
  'Cambodia':    'NIS, NBC, CRDB, Phnom Penh Post',
  'Laos':        'LSB, NLBC, Vientiane Times',
};

// Query templates per section type, per language
// format: (industry, country) => string[]
const SECTION_QUERY_TEMPLATES = {
  vi: {
    executive_summary:    (I,C) => [`tổng quan thị trường ${I} ${C} 2024`, `quy mô ngành ${I} ${C}`],
    market_assessment:    (I,C) => [`quy mô thị trường ${I} ${C} 2024 2025`, `tốc độ tăng trưởng ${I} ${C} CAGR`, `doanh thu ngành ${I} Việt Nam`],
    market_segmentation:  (I,C) => [`phân khúc thị trường ${I} ${C}`, `phân loại sản phẩm ${I} ${C} theo giá`],
    industry_structure:   (I,C) => [`chuỗi giá trị ${I} ${C}`, `kênh phân phối ${I} ${C}`, `biên lợi nhuận nhà phân phối ${I} ${C}`],
    competitive_landscape:(I,C) => [`thị phần ${I} ${C} 2024`, `doanh nghiệp ${I} lớn nhất ${C}`, `xếp hạng công ty ${I} ${C}`],
    competitor_profiles:  (I,C) => [`doanh thu ${I} ${C} công ty hàng đầu`, `chiến lược ${I} ${C} đối thủ cạnh tranh`],
    market_drivers:       (I,C) => [`động lực tăng trưởng ngành ${I} ${C}`, `xu hướng ${I} ${C} 2024 2025`, `thách thức ${I} ${C}`],
    consumer_insights:    (I,C) => [`hành vi người tiêu dùng ${I} ${C}`, `nhu cầu khách hàng ${I} ${C}`, `nhân khẩu học người mua ${I} ${C}`],
    pricing_analysis:     (I,C) => [`giá ${I} ${C} theo phân khúc 2024`, `bảng giá ${I} ${C}`, `chiến lược định giá ${I} ${C}`],
    regulatory:           (I,C) => [`quy định pháp lý ${I} ${C} 2024`, `điều kiện cấp phép ${I} ${C}`, `chính sách nhà nước ${I} ${C}`],
    market_forecast:      (I,C) => [`dự báo thị trường ${I} ${C} 2025 2026 2027`, `kịch bản tăng trưởng ${I} ${C}`],
    recommendations:      (I,C) => [`cơ hội kinh doanh ${I} ${C}`, `chiến lược thâm nhập thị trường ${I} ${C}`],
  },
  th: {
    market_assessment:    (I,C) => [`ขนาดตลาด${I}${C} 2567`, `อัตราการเติบโต${I}ประเทศไทย`, `มูลค่าตลาด${I}ไทย`],
    competitive_landscape:(I,C) => [`ส่วนแบ่งตลาด${I}ไทย`, `บริษัท${I}ชั้นนำประเทศไทย 2567`],
    market_drivers:       (I,C) => [`แนวโน้ม${I}ประเทศไทย 2567`, `ปัจจัยขับเคลื่อน${I}ไทย`],
    pricing_analysis:     (I,C) => [`ราคา${I}ประเทศไทยตามกลุ่ม`, `โครงสร้างราคา${I}ไทย`],
    regulatory:           (I,C) => [`กฎระเบียบ${I}ประเทศไทย`, `นโยบายภาครัฐ${I}ไทย`],
  },
  id: {
    market_assessment:    (I,C) => [`ukuran pasar ${I} Indonesia 2024`, `pertumbuhan ${I} Indonesia CAGR`],
    competitive_landscape:(I,C) => [`pangsa pasar ${I} Indonesia 2024`, `perusahaan ${I} terbesar Indonesia`],
    market_drivers:       (I,C) => [`tren ${I} Indonesia 2024`, `faktor pertumbuhan ${I} Indonesia`],
    pricing_analysis:     (I,C) => [`harga ${I} Indonesia segmen`, `strategi harga ${I} Indonesia`],
    regulatory:           (I,C) => [`regulasi ${I} Indonesia 2024`, `kebijakan pemerintah ${I} Indonesia`],
  },
};

const LANG_CODE_MAP = {
  'Vietnamese': 'vi', 'Thai': 'th', 'Indonesian': 'id', 'Malay': 'id',
  'Filipino': 'tl', 'Khmer': 'km', 'Myanmar': 'my',
};

// Simple section-type detector (mirrors generate-section.js getBlueprint patterns)
function detectSectionType(title) {
  const patterns = [
    [/exec.*sum|tóm.*(tắt|lược)|summary/i,                      'executive_summary'],
    [/market.*assess|market.*overview|market.*size|quy.*mô|đánh.*giá.*thị/i, 'market_assessment'],
    [/segment|phân.*khúc|phân.*loại/i,                           'market_segmentation'],
    [/industry.*struct|value.*chain|channel.*struct|chuỗi|kênh/i,'industry_structure'],
    [/compet.*landscape|market.*share|thị.*phần.*tổng|cạnh.*tranh.*tổng/i, 'competitive_landscape'],
    [/compet.*profil|player.*profil|company.*profil|hồ.*sơ|đối.*thủ.*cụ/i, 'competitor_profiles'],
    [/driver|trend|factor|động.*lực|xu.*hướng/i,                 'market_drivers'],
    [/consumer|customer|buyer|người.*tiêu|khách.*hàng/i,         'consumer_insights'],
    [/pric|giá|định.*giá/i,                                      'pricing_analysis'],
    [/regulat|policy|legal|chính.*sách|pháp.*lý|quy.*định/i,    'regulatory'],
    [/forecast|outlook|dự.*báo|kịch.*bản|tương.*lai/i,          'market_forecast'],
    [/recommend|khuyến.*nghị|chiến.*lược.*đề/i,                  'recommendations'],
  ];
  for (const [rx, type] of patterns) {
    if (rx.test(title)) return type;
  }
  return null;
}

// Build per-section localized queries from planned section titles
function buildSectionQueries(sections, industry, country, language) {
  const langCode  = LANG_CODE_MAP[language] || 'en';
  const templates = SECTION_QUERY_TEMPLATES[langCode] || {};
  const result    = {};

  sections.forEach(title => {
    const type    = detectSectionType(title);
    const fn      = type && templates[type];
    const queries = fn ? fn(industry, country) : [`${industry} ${title} ${country} 2024`];
    result[title] = { type, queries };
  });

  return result;
}
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

    plannedSections = await callClaude(planPrompt, 500)
      .then(t => JSON.parse(t.replace(/```json|```/g, '').trim()));

    // ── Build per-section localized queries ──────────────────
    const sectionQueries = buildSectionQueries(plannedSections, industry, country, language);

    // ── Enhanced research pass with localized section queries ──
    // Only run if NOT using liveResearch and language is non-English
    // Adds local-source data on top of the base research
    if (!liveResearch && language && language !== 'English') {
      const localSources = LOCAL_SOURCES[country] || 'local government statistics, industry associations, national news';
      const queryList = plannedSections.slice(0, 8).map((title, i) => {
        const queries = sectionQueries[title]?.queries || [];
        return `${i+1}. [${title}]: ${queries.join(' | ')}`;
      }).join('\n');

      const localResearch = await callClaude(
        `You are researching ${industry} in ${country} for a market intelligence report in ${language}.

Prioritize LOCAL data sources: ${localSources}

For each section below, find 2-3 specific data points (numbers, company names, percentages) from ${country} sources. Respond in ${language} where appropriate for local terms and company names.

${queryList}

For each section provide:
- 1-2 specific statistics with approximate source (e.g., "GSO 2024", "industry estimate")  
- Key local company names if relevant
- Any recent local developments (2023-2024)

Be concise but data-specific. Prefer local-currency figures.`, 1200
      ).catch(() => ''); // non-blocking — fail gracefully

      if (localResearch) {
        research = `${research}\n\n--- LOCAL DATA (${country}, ${language} sources) ---\n${localResearch}`;
      }
    }

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
