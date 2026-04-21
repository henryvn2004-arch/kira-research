// KIRA RESEARCH — api/browser-research.js
// Web research using Perplexity sonar-pro
// FIX: Claude pre-step generates queries in LOCAL language of target market

export const config = { maxDuration: 55, runtime: 'nodejs' };

const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const ANT_KEY        = process.env.ANTHROPIC_API_KEY;
const ANT_URL        = 'https://api.anthropic.com/v1/messages';
const MODEL          = 'claude-sonnet-4-20250514';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

const TYPE_FOCUS = {
  market_overview:         'market size, segmentation, channels, growth, key players, forecast',
  competitive_analysis:    'key players, market share, competitive positioning, recent moves',
  customer_intelligence:   'customer segments, buying behavior, needs, brand perception, WTP',
  value_chain:             'value chain, distribution channels, margin stack, supply chain',
  proposition_development: 'market gaps, unmet needs, innovation, price-positioning',
  partner_search:          'potential distributors, JV targets, industry associations',
  go_to_market:            'market entry requirements, barriers, entry modes, launch examples',
};

// Country → local language mapping
const COUNTRY_LANG = {
  vietnam:     'Vietnamese',
  'viet nam':  'Vietnamese',
  vn:          'Vietnamese',
  thailand:    'Thai',
  thai:        'Thai',
  indonesia:   'Indonesian',
  malaysia:    'Malay',
  philippines: 'Filipino/English',
  singapore:   'English',
  myanmar:     'Burmese',
  cambodia:    'Khmer',
  japan:       'Japanese',
  korea:       'Korean',
  china:       'Chinese (Simplified)',
  taiwan:      'Chinese (Traditional)',
};

function detectLocalLanguage(country) {
  if (!country) return 'English';
  const key = country.toLowerCase().trim();
  for (const [k, lang] of Object.entries(COUNTRY_LANG)) {
    if (key.includes(k)) return lang;
  }
  return 'English';
}

// ── Step 1: Claude → targeted local-language queries ─────────────────────────
async function generateQueries(industry, country, reportType, questions, companies) {
  const focus    = TYPE_FOCUS[reportType] || 'market size, key players, trends';
  const language = detectLocalLanguage(country);

  const ctx = [
    industry  && `Topic/Industry: ${industry}`,
    country   && `Country/Region: ${country}`,
    companies && `Key companies: ${companies}`,
    questions && `User request: ${questions}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are preparing web search queries for a market research report.

${ctx}
Research focus: ${focus}
Target language for queries: ${language}

Generate 4-6 SHORT, SPECIFIC search queries to collect current market data.

RULES:
- Write queries in ${language} — local-language queries return more local content
- If language is Vietnamese: write in Vietnamese (e.g. "doanh thu thị trường viễn thông Việt Nam 2025")
- If language is Thai: write in Thai script
- If language is English or no clear country: write in English
- Keep each query SHORT (under 12 words)
- Include year 2024 or 2025 for recency
- Extract key entities (company names, domains) and use them directly
- Mix: some queries in local language for local data, some in English for global coverage

Example for GTEL Vietnam:
["doanh thu GTEL vietnamobile 2024 2025",
 "thị phần viễn thông Việt Nam Viettel VNPT MobiFone 2025",
 "GTEL gtel.vn dịch vụ khách hàng doanh nghiệp",
 "OKR triển khai doanh nghiệp viễn thông Việt Nam 2025",
 "Vietnam telecom market growth 5G 2025"]

Return ONLY a valid JSON array of strings, no explanation:
["query 1", "query 2", "query 3", "query 4"]`;

  try {
    const r = await fetch(ANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
    });
    if (!r.ok) return null;
    const d = await r.json();
    const text = d.content?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return null;
    const queries = JSON.parse(match[0]);
    return Array.isArray(queries)
      ? queries.filter(q => typeof q === 'string' && q.length > 3).slice(0, 6)
      : null;
  } catch {
    return null;
  }
}

// ── Step 2: Single Perplexity search ─────────────────────────────────────────
async function searchOne(query) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 18000);
  try {
    const r = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_KEY}` },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a market research analyst. Return specific data: numbers, percentages, company names, revenue figures. Max 200 words. Cite sources when possible.',
          },
          { role: 'user', content: query },
        ],
        max_tokens: 350,
        temperature: 0.1,
      }),
    });
    clearTimeout(timeout);
    if (!r.ok) return '';
    const d = await r.json();
    return d.choices?.[0]?.message?.content || '';
  } catch {
    clearTimeout(timeout);
    return '';
  }
}

// ── Fallback: Anthropic web_search ───────────────────────────────────────────
async function researchWithAnthropic(industry, country, questions, focus) {
  const q = [
    `Research ${industry || questions}`,
    country   && `in ${country}`,
    `Focus: ${focus}. Include specific numbers, company names. Max 500 words.`,
  ].filter(Boolean).join(' ');

  const r = await fetch(ANT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: q }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}`);
  const d = await r.json();
  return (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { industry, country, reportType, questions, companies } = req.body;
  if (!industry && !questions) return res.status(400).json({ error: 'Missing industry or questions' });

  try {
    let research = '', source = '';

    if (PERPLEXITY_KEY) {
      try {
        // Step 1: Claude → targeted local-language queries
        const queries = await generateQueries(industry, country, reportType, questions, companies);
        let results   = [];

        if (queries?.length) {
          // Step 2: Parallel Perplexity search
          results = await Promise.all(queries.map(q => searchOne(q)));
        } else {
          // Simple fallback: build basic query from inputs
          const fallback = [
            industry?.substring(0, 60),
            country  && `${country} 2025`,
          ].filter(Boolean).join(' ');
          results = [await searchOne(fallback)];
        }

        research = results.filter(Boolean).join('\n\n---\n\n');
        source   = `perplexity-sonar-pro (${queries?.length || 1} queries, ${detectLocalLanguage(country)})`;

        if (!research.trim()) throw new Error('All Perplexity queries returned empty');

      } catch (err) {
        console.warn('[browser-research] Perplexity failed:', err.message, '— falling back to Anthropic');
        if (ANT_KEY) {
          const focus = TYPE_FOCUS[reportType] || 'market size, key players, trends';
          research = await researchWithAnthropic(industry, country, questions, focus);
          source   = 'anthropic-web_search-fallback';
        }
      }
    } else if (ANT_KEY) {
      const focus = TYPE_FOCUS[reportType] || 'market size, key players, trends';
      research = await researchWithAnthropic(industry, country, questions, focus);
      source   = 'anthropic-web_search';
    }

    return res.json({ research, source });

  } catch (e) {
    console.error('[browser-research]', e.message);
    return res.json({ research: '', error: e.message });
  }
}
