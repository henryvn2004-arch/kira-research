// KIRA RESEARCH — api/browser-research.js
// Web research using Perplexity sonar-pro (~10x cheaper than Anthropic for search)
// Falls back to Anthropic web_search if PERPLEXITY_API_KEY not set.

export const config = { maxDuration: 45, runtime: 'nodejs' };

const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const ANT_KEY        = process.env.ANTHROPIC_API_KEY;
const ANT_URL        = 'https://api.anthropic.com/v1/messages';

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

async function researchWithPerplexity(prompt) {
  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PERPLEXITY_KEY}`,
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: 'You are a market research analyst. Provide specific data with source attributions. Always include numbers, percentages, and company names. Focus on recent 2023-2024 data.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      temperature: 0.1, // low temp = more factual
    }),
  });
  if (!r.ok) throw new Error(`Perplexity ${r.status}: ${await r.text().then(t=>t.slice(0,100))}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || '';
}

async function researchWithAnthropic(prompt) {
  const r = await fetch(ANT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANT_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
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
  if (!industry || !country) return res.status(400).json({ error: 'Missing industry or country' });

  const focus = TYPE_FOCUS[reportType] || 'market size, key players, trends, regulations';

  // questions drives the research angle — prioritized before generic topics
  const focusInstruction = questions
    ? `CLIENT'S SPECIFIC FOCUS (prioritize this above all else): ${questions}`
    : `Research focus: ${focus}`;

  const prompt = `Research the ${industry} market in ${country}.
${companies ? `Key companies to cover: ${companies}` : ''}

${focusInstruction}

Also cover these standard topics where relevant: ${focus}

For each topic provide:
- Specific numbers/percentages with year (e.g. "Market size: $2.3B in 2024")
- Top 3-5 company names and estimated market share
- Source attribution (e.g. "according to GSO", "industry estimate")
- Local currency figures where available
- Answer the client's specific focus questions with real data

Max 500 words. Be specific and data-dense.`;

  try {
    let research = '';
    let source   = '';

    if (PERPLEXITY_KEY) {
      research = await researchWithPerplexity(prompt);
      source   = 'perplexity-sonar-pro';
    } else {
      // Fallback to Anthropic web_search if no Perplexity key
      research = await researchWithAnthropic(prompt);
      source   = 'anthropic-web_search';
    }

    return res.json({ research, source });

  } catch (e) {
    console.error('[browser-research]', e.message);
    // Non-fatal: return empty — generate-report will use Claude knowledge fallback
    return res.json({ research: '', error: e.message });
  }
}
