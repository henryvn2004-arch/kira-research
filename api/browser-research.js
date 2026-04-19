// api/browser-research.js
// Web search research proxy — key stays server-side in Vercel env vars
// Strategy: search local language FIRST (better local data),
//           fall back to English for international benchmarks
//
// POST /api/browser-research
// Body: { industry, country, reportType, questions, companies }

export const config = { maxDuration: 60 };

const LANG_MAP = {
  'Vietnam':                    { lang: 'Vietnamese', q1: '{industry} thị trường {country} quy mô tăng trưởng 2024 2025', q2: '{industry} doanh nghiệp thị phần {country}', q3: '{industry} kênh phân phối giá cả {country}', q4: '{industry} xu hướng quy định {country}' },
  'Indonesia':                  { lang: 'Indonesian', q1: 'pasar {industry} {country} ukuran pertumbuhan 2024 2025', q2: '{industry} perusahaan pangsa pasar {country}', q3: '{industry} saluran distribusi harga {country}', q4: '{industry} tren regulasi {country}' },
  'Thailand':                   { lang: 'Thai',       q1: '{industry} ตลาด{country} ขนาด การเติบโต 2024 2025', q2: '{industry} บริษัท ส่วนแบ่งการตลาด {country}', q3: '{industry} ช่องทาง ราคา {country}', q4: '{industry} แนวโน้ม กฎระเบียบ {country}' },
  'Philippines':                { lang: 'Filipino',   q1: '{industry} merkado {country} laki paglago 2024 2025', q2: '{industry} kumpanya market share {country}', q3: '{industry} distribution channels presyo {country}', q4: '{industry} trends regulasyon {country}' },
  'Malaysia':                   { lang: 'Malay',      q1: 'pasaran {industry} {country} saiz pertumbuhan 2024 2025', q2: '{industry} syarikat bahagian pasaran {country}', q3: '{industry} saluran pengedaran harga {country}', q4: '{industry} trend peraturan {country}' },
  'China':                      { lang: 'Chinese',    q1: '{industry} 市场 {country} 规模 增长 2024 2025', q2: '{industry} 企业 市场份额 {country}', q3: '{industry} 分销渠道 价格 {country}', q4: '{industry} 趋势 法规 {country}' },
  'Japan':                      { lang: 'Japanese',   q1: '{industry} 市場 {country} 規模 成長 2024 2025', q2: '{industry} 企業 市場シェア {country}', q3: '{industry} 流通チャネル 価格 {country}', q4: '{industry} トレンド 規制 {country}' },
  'South Korea':                { lang: 'Korean',     q1: '{industry} 시장 {country} 규모 성장 2024 2025', q2: '{industry} 기업 시장점유율 {country}', q3: '{industry} 유통채널 가격 {country}', q4: '{industry} 트렌드 규제 {country}' },
  'India':                      { lang: 'Hindi',      q1: '{industry} बाजार {country} आकार वृद्धि 2024 2025', q2: '{industry} कंपनी बाजार हिस्सा {country}', q3: '{industry} वितरण चैनल मूल्य {country}', q4: '{industry} रुझान नियम {country}' },
  'Myanmar':                    { lang: 'Burmese',    q1: '{industry} market {country} size growth 2024 2025', q2: '{industry} companies market share {country}', q3: '{industry} distribution price {country}', q4: '{industry} trends regulations {country}' },
  'Cambodia':                   { lang: 'Khmer',      q1: '{industry} market {country} size growth 2024 2025', q2: '{industry} companies market share {country}', q3: '{industry} distribution price {country}', q4: '{industry} trends regulations {country}' },
  'Singapore':                  { lang: 'English',    q1: '{industry} market Singapore size growth 2024 2025', q2: '{industry} companies market share Singapore', q3: '{industry} distribution channels pricing Singapore', q4: '{industry} trends regulations Singapore MAS' },
  'Australia':                  { lang: 'English',    q1: '{industry} market Australia size growth 2024 2025', q2: '{industry} companies market share Australia', q3: '{industry} distribution channels pricing Australia', q4: '{industry} trends regulations Australia ACCC' },
};

const EN_QUERIES = [
  '{industry} market {country} size growth rate 2024 2025',
  '{industry} {country} key players market share competitive landscape',
  '{industry} {country} distribution channels pricing consumer behavior',
  '{industry} {country} trends regulations recent developments 2025',
];

function fill(template, industry, country) {
  return template.replace(/{industry}/g, industry).replace(/{country}/g, country);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function runSearch(queries, industry, country, questions, companies, apiKey) {
  const filledQueries = queries.map(q => fill(q, industry, country));

  const systemPrompt = `You are a professional market research analyst compiling intelligence on the ${industry} market in ${country}.
${questions ? `Client focus: ${questions}` : ''}
${companies ? `Key companies to research: ${companies}` : ''}

Search systematically using the provided queries. For each piece of data:
- Include specific numbers and percentages where available
- Cite the source name and year (e.g. "According to VietnamPlus 2024..." or "Industry estimate")
- Flag estimates clearly with "est." or "approx."
- Prioritize data from ${country}-based sources, government reports, and industry associations

Compile into a structured summary covering:
1. Market size & growth rate
2. Key players & market share
3. Distribution channels & structure
4. Pricing landscape
5. Key trends & recent developments
6. Regulatory environment
7. Consumer behavior insights
${companies ? '8. Profiles of: ' + companies : ''}`;

  const userContent = `Research the ${industry} market in ${country} using these search queries in order:\n${filledQueries.map((q, i) => `${i + 1}. "${q}"`).join('\n')}\n\nCompile all findings into a detailed research summary.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'web-search-2025-03-05',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: userContent }]
    })
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  return (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n\n');
}

function isDataThin(text) {
  if (!text || text.length < 400) return true;
  const hasNumbers  = /\d+[\.\,]?\d*\s*(%|billion|million|USD|VND|IDR|THB|tỷ|triệu)/i.test(text);
  const hasPlayers  = /player|company|brand|leader|market share|competitor/i.test(text);
  const hasStructure = /channel|distribution|segment|growth|trend/i.test(text);
  return !hasNumbers || (!hasPlayers && !hasStructure);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { industry, country, reportType, questions, companies } = req.body;
  if (!industry || !country) return res.status(400).json({ error: 'Missing industry or country' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const local = LANG_MAP[country];

  try {
    let research = '';

    if (local && local.lang !== 'English') {
      // ── TIER 1: Local language search ──────────────────────────────────────
      // Better data quality for local market — government reports, local news,
      // industry associations publish in local language first
      const localQueries = [local.q1, local.q2, local.q3, local.q4];
      try {
        research = await runSearch(localQueries, industry, country, questions, companies, apiKey);
      } catch (e) {
        console.warn('Local language search failed, falling back to English:', e.message);
      }

      // ── TIER 2: English fallback ────────────────────────────────────────────
      // Always append 2 English queries for international benchmarks + analyst reports
      // If local search was thin, run all 4 English queries
      const enQueries = isDataThin(research)
        ? EN_QUERIES                     // thin result → full English search
        : EN_QUERIES.slice(2);           // good result → only benchmarks + trends

      try {
        const enResearch = await runSearch(enQueries, industry, country, questions, companies, apiKey);
        research = research
          ? `${research}\n\n---\nINTERNATIONAL BENCHMARKS & ANALYST SOURCES:\n${enResearch}`
          : enResearch;
      } catch (e) {
        console.warn('English fallback search failed:', e.message);
      }

    } else {
      // ── English-first markets (Singapore, Australia, or unmapped) ──────────
      research = await runSearch(EN_QUERIES, industry, country, questions, companies, apiKey);
    }

    if (!research) throw new Error('No research data collected');

    return res.json({ research });

  } catch (e) {
    console.error('[browser-research]', e);
    return res.status(500).json({ error: e.message });
  }
}
