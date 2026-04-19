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
const MODEL   = 'claude-sonnet-4-5';
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY;

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

// ── SECTION BLUEPRINTS — hardcoded per section type ──────
// Each entry: { angle, mustCover, mustNotCover, dataHints }
// angle: the unique POV this section takes
// mustCover: specific sub-topics / data points required
// mustNotCover: what NOT to repeat (typically covered elsewhere)
// dataHints: what numbers/facts to actively look for
const SECTION_BLUEPRINTS = {
  executive_summary: {
    angle: 'Synthesize the 5-7 most strategically important findings across the entire report into a decision-ready brief. No new analysis — distill the highlights.',
    mustCover: ['Overall market size & growth rate (1-2 numbers)', 'The single most important competitive insight', 'Top 2-3 strategic implications for the reader', 'Key opportunity or risk to act on'],
    mustNotCover: ['Detailed methodology', 'Full competitive profiles', 'Detailed pricing breakdowns'],
    dataHints: 'Market size USD, CAGR %, top player name & share %, 1 headline forecast',
  },
  market_assessment: {
    angle: 'Quantify the market — size, growth trajectory, and structural health. Make the numbers credible.',
    mustCover: ['Current market size (value + volume if relevant)', 'Historical growth rate (2-3 year trend)', 'Projected CAGR and forecast size in 3-5 years', 'Key demand drivers behind the growth', 'Any seasonality or cyclicality'],
    mustNotCover: ['Who the players are (that is Competitive Landscape)', 'Channel structure (that is Industry Structure)', 'Consumer behavior details'],
    dataHints: 'Market value in USD or local currency, CAGR %, year range for forecast, segment split %',
  },
  market_segmentation: {
    angle: 'Slice the market into meaningful sub-groups — which segments are growing fastest, which are most attractive.',
    mustCover: ['Primary segmentation dimensions (by product/price/geography/channel)', 'Size of each segment as % of total', 'Which segments are growing vs declining', 'Segment profitability or attractiveness differences', 'Underserved or emerging segments'],
    mustNotCover: ['Overall market size (already in Market Assessment)', 'Who plays where (Competitive Landscape)', 'Regulatory differences per segment (Regulatory section)'],
    dataHints: 'Segment % breakdown, fastest growing segment name + CAGR, premium vs mass split',
  },
  industry_structure: {
    angle: 'Map how value flows through the chain — who captures margin where, what the channel architecture looks like.',
    mustCover: ['Value chain: from manufacturer/supplier → distributor → retailer/channel → end customer', 'Channel mix (% online vs offline, modern vs traditional trade)', 'Margin stack at each level (approximate % gross margins)', 'Key intermediaries and their role', 'Structural shifts happening (e.g., disintermediation, D2C growth)'],
    mustNotCover: ['Who the end-market brands are (Competitive Landscape)', 'Consumer needs (Consumer Insights)', 'Regulatory requirements'],
    dataHints: 'Channel share %, margin at each level %, online penetration %',
  },
  competitive_landscape: {
    angle: 'Map the battle — who are the key players, how concentrated is the market, and what competitive dynamics define the fight.',
    mustCover: ['Market share of top 3-5 players (% or ranking)', 'Competitive concentration (HHI / market structure type)', 'How players compete (price, distribution, innovation, brand?)', 'Recent significant competitive moves', 'Barriers to entry or competitive moats'],
    mustNotCover: ['Detailed individual company financials (that is Competitor Profiles)', 'Market size (Market Assessment)', 'Channel details (Industry Structure)'],
    dataHints: 'Named top players, market share %, HHI index, recent M&A or launches',
  },
  competitor_profiles: {
    angle: 'Deep-dive on each major player — their strategy, footprint, and vulnerabilities. Give the reader an edge in understanding the opposition.',
    mustCover: ['For each top 3-5 player: business overview, product/service mix, distribution reach, pricing tier, key strengths and one key weakness', 'Recent strategic moves or notable campaigns', 'What makes each player hard to displace'],
    mustNotCover: ['Overall market share summary (already in Competitive Landscape)', 'Generic market size numbers'],
    dataHints: 'Company name, founding year or ownership, revenue estimate, distribution network size, key SKUs or product lines',
  },
  market_drivers: {
    angle: 'Explain why this market moves — both the tailwinds accelerating growth and the headwinds creating friction.',
    mustCover: ['3-5 key growth drivers (quantify each where possible)', '2-3 key restraints or challenges', '1-2 disruptive trends that could reshape the market', 'Which drivers are structural vs cyclical', 'Relative magnitude of each factor'],
    mustNotCover: ['Market size (Market Assessment)', 'Player responses to these drivers (Competitor Profiles)', 'Consumer preferences (Consumer Insights — different angle)'],
    dataHints: 'Driver magnitude (e.g., "internet penetration grew from X to Y"), trend growth rates, regulatory change dates',
  },
  consumer_insights: {
    angle: 'Humanize the demand side — who is buying, why, how, and what will change their behavior.',
    mustCover: ['Primary buyer/consumer segments (demographics + psychographics)', 'Key purchase drivers and unmet needs', 'Buying process and decision journey', 'Brand perception and loyalty patterns', 'Willingness to pay and price sensitivity'],
    mustNotCover: ['Channel structure (Industry Structure)', 'Market size numbers (Market Assessment)', 'Competitor positioning (Competitive Landscape)'],
    dataHints: 'Consumer segment sizes, purchase frequency, brand NPS or awareness %, willingness to pay price range',
  },
  pricing_analysis: {
    angle: 'Map the price architecture — how is the market stratified by price, who occupies each tier, and where is the value?',
    mustCover: ['Price tier breakdown (economy / mid / premium / super-premium)', 'Price range for key products in each tier', 'Which players occupy which tiers', 'Price-volume relationship (which tier is largest by volume vs value)', 'Pricing trends (inflation, premiumization, downtrading?)'],
    mustNotCover: ['Margin stack (Industry Structure)', 'Consumer willingness to pay in aggregate (Consumer Insights)', 'Brand-level competitive positioning'],
    dataHints: 'Price points in local currency per unit, tier split % of volume, % price change YoY',
  },
  regulatory: {
    angle: 'Map the regulatory landscape as a business risk and opportunity filter — what must players comply with and what is changing.',
    mustCover: ['Key regulations or standards currently in force', 'Recent or upcoming regulatory changes (with dates)', 'Compliance costs or barriers to entry from regulation', 'Government policy stance (supportive / neutral / restrictive)', 'Regional regulatory variations if applicable'],
    mustNotCover: ['Market size impact of regulation (captured in Market Drivers)', 'Competitor compliance status'],
    dataHints: 'Regulation name, year enacted or anticipated, compliance cost estimate, license or certification requirements',
  },
  market_forecast: {
    angle: 'Build a forward view — what will this market look like in 3-5 years under different scenarios.',
    mustCover: ['Base case forecast (market size, CAGR, key assumptions)', 'Optimistic scenario (what would drive upside)', 'Conservative scenario (what would cause underperformance)', 'Key inflection points or trigger events to watch', 'Which segments will grow fastest'],
    mustNotCover: ['Historical market data (already in Market Assessment)', 'Current competitive positions (those will shift)'],
    dataHints: 'Forecast market size by year, CAGR range, scenario probability, segment-level forecasts',
  },
  recommendations: {
    angle: 'Turn insights into action — concrete, prioritized strategic recommendations tailored to the client context.',
    mustCover: ['Product/service strategy recommendation', 'Pricing and positioning recommendation', 'Channel and distribution recommendation', 'Market entry or expansion sequencing', 'Top 2-3 priority actions with rationale'],
    mustNotCover: ['Repeat analysis already done in other sections — only reference conclusions'],
    dataHints: 'Concrete action verbs, timelines (short/medium/long term), success metrics',
  },
};

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

// Build section-specific focus guidance — replaces the fragile competency template lookup
function getSectionGuidance(competencyTemplate, sectionTitle) {
  // Try blueprint first (hardcoded, reliable)
  const blueprint = getBlueprint(sectionTitle);
  if (blueprint) {
    return [
      `SECTION FOCUS — "${sectionTitle}"`,
      `Unique angle: ${blueprint.angle}`,
      `Must cover: ${blueprint.mustCover.map((x, i) => `\n  ${i+1}. ${x}`).join('')}`,
      `Do NOT cover (belongs to other sections): ${blueprint.mustNotCover.join('; ')}`,
      `Key data to cite: ${blueprint.dataHints}`,
    ].join('\n');
  }

  // Fallback to competency template if no blueprint match
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
    match.purpose ? `Purpose: ${match.purpose}` : '',
    match.typical_content ? `Expected content: ${match.typical_content}` : '',
    match.data_points ? `Key data points: ${Array.isArray(match.data_points) ? match.data_points.join(', ') : match.data_points}` : '',
  ].filter(Boolean);
  return parts.length ? `MODULE GUIDANCE:\n${parts.join('\n')}` : '';
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

// Build anti-overlap context — tracks headlines AND key stats already used
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

function buildContext(params, ragContext, researchSummary, prevSections, competencyTemplate, sectionTitle, sectionQuery) {
  const { industry, country, reportType, questions, companies, language } = params;
  const langInstruction = (language && language !== 'English')
    ? `\nOUTPUT LANGUAGE: Write ALL content in ${language}. This includes headlines, commentary, table headers, chart labels, and all text.`
    : '';

  const rag = [
    ragContext?.chunkText   ? `RESEARCH LIBRARY:\n${ragContext.chunkText}`   : '',
    ragContext?.patternText ? `INDUSTRY PATTERNS:\n${ragContext.patternText}` : ''
  ].filter(Boolean).join('\n\n');

  const antiOverlap     = buildAntiOverlapContext(prevSections);
  const sectionGuidance = getSectionGuidance(competencyTemplate, sectionTitle);

  const blueprint  = getBlueprint(sectionTitle);
  const localHints = buildLocalizedSearchHints(blueprint, language, industry, country, sectionTitle);

  // Per-section targeted queries from generate-report localization step
  const targetedQueries = sectionQuery?.queries?.length
    ? `\nTARGETED RESEARCH QUERIES FOR THIS SECTION (already searched — verify against research data above):\n${sectionQuery.queries.map(q => `  • ${q}`).join('\n')}`
    : '';

  return `Industry: ${industry} | Market: ${country} | Report: ${reportType.replace(/_/g,' ')}
${questions ? `Client focus: ${questions}` : ''}${companies ? `\nCompanies: ${companies}` : ''}${langInstruction}

RESEARCH DATA:
${researchSummary || 'Draw on your knowledge.'}
${rag ? `\n${rag}` : ''}
${sectionGuidance ? `\n${sectionGuidance}` : ''}
${localHints ? `\n${localHints}` : ''}
${targetedQueries}
${antiOverlap ? `\n${antiOverlap}` : ''}`;
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

  const context = buildContext(
    { industry, country, reportType, questions, companies, language },
    ragContext, researchSummary, prevSections, competencyTemplate, sectionTitle, sectionQuery
  );

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
    const prompt = `Write section "${sectionTitle}" (${sectionIndex + 1} of ${totalSections}) of a market research report.

${context}

Write 250-350 words of consulting-grade analytical prose:
- Lead with the key strategic insight
- Reference specific data, companies, numbers from the research
- For estimated numbers, prefix with "est." or "approx."
- If a number comes from a named source, attribute it: "According to X, ..."
- Use **bold** for key terms and company names
- End with strategic implication
- No AI disclaimers. Flowing paragraphs only.`;

    const streamRes = await fetch(ANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, stream: true, messages: [{ role: 'user', content: prompt }] })
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

    const raw = await callClaude(extractPrompt, 1500); // was 1000 — too tight for chart+table JSON

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
