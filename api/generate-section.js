// KIRA RESEARCH — api/generate-section.js
// Option B: Stream commentary first, then extract chart/table from real text
//
// SSE events:
//   event: headline  → { headline, stats, sources }   ~1s
//   event: token     → { text }                        streaming
//   event: visuals   → { chart, table }                ~2s after stream ends
//   event: done      → { sectionIndex }

export const config = { maxDuration: 60, runtime: 'nodejs' };

const ANT_URL = 'https://api.anthropic.com/v1/messages';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-5';
const SB_URL  = process.env.SUPABASE_URL;
const SB_KEY  = process.env.SUPABASE_SERVICE_KEY;

// ── DB helpers ────────────────────────────────────────────
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

// ── Claude call (non-streaming) ───────────────────────────
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

// ── CORS ──────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

// ── Build context string ──────────────────────────────────
function buildContext(params, ragContext, researchSummary, prevSections) {
  const { industry, country, reportType, questions, companies } = params;
  const rag = [
    ragContext?.chunkText   ? `RESEARCH LIBRARY:\n${ragContext.chunkText}`   : '',
    ragContext?.patternText ? `INDUSTRY PATTERNS:\n${ragContext.patternText}` : ''
  ].filter(Boolean).join('\n\n');

  const prev = (prevSections || []).slice(-2).map(s => {
    try { const p = JSON.parse(s.content); return `## ${s.title}\n${p.headline || ''}`; }
    catch { return `## ${s.title}`; }
  }).join('\n\n');

  return `Industry: ${industry} | Market: ${country} | Report type: ${reportType.replace(/_/g,' ')}
${questions ? `Client focus: ${questions}` : ''}
${companies ? `Companies: ${companies}` : ''}

RESEARCH DATA:
${researchSummary || 'Draw on your knowledge of this market.'}
${rag ? `\n${rag}` : ''}
${prev ? `\nPREVIOUS SECTIONS (do not repeat):\n${prev}` : ''}`;
}

// ── Handler ───────────────────────────────────────────────
export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    reportId, sectionIndex, sectionTitle, totalSections,
    industry, country, reportType, questions, companies,
    researchSummary, ragContext, prevSections = []
  } = req.body;

  if (!sectionTitle) return res.status(400).json({ error: 'Missing sectionTitle' });

  const context = buildContext(
    { industry, country, reportType, questions, companies },
    ragContext, researchSummary, prevSections
  );

  // ── SSE setup ─────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

  // ══════════════════════════════════════════════════════════
  // PHASE 1: Headline + stats (~1s, non-streaming)
  // ══════════════════════════════════════════════════════════
  let headline = '', stats = [], sources = [];
  try {
    const headlinePrompt = `Section "${sectionTitle}" of a market research report.
${context}

Return ONLY valid JSON:
{
  "headline": "Most important finding — 1-2 punchy data-driven sentences",
  "stats": [{ "value": "~$2.4B", "label": "Market size 2024", "icon": "growth" }],
  "sources": ["Vietnam EV Association (2024)", "BloombergNEF (2024)"]
}

Rules:
- headline: always required. Lead with the key insight.
- stats: 2-4 standalone metrics worth highlighting. icon: pie|growth|trend|users|channel|price|globe|check. Use ~ prefix if estimated. Set [] if section has no metrics (e.g. Recommendations, Regulatory overview).
- sources: 1-3 real sources. Format: "Organization (year)". Use "Industry estimate" if no real source.
Return ONLY JSON.`;

    const raw = await callClaude(headlinePrompt, 400);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    headline = parsed.headline || '';
    stats    = parsed.stats    || [];
    sources  = parsed.sources  || [];
  } catch (e) {
    console.warn('Headline phase failed:', e.message);
  }

  send('headline', { headline, stats, sources });

  // ══════════════════════════════════════════════════════════
  // PHASE 2: Stream commentary
  // ══════════════════════════════════════════════════════════
  let fullCommentary = '';
  try {
    const commentaryPrompt = `Write section "${sectionTitle}" (${sectionIndex + 1} of ${totalSections}) of a market research report.

${context}

Key finding already established: "${headline}"

Write 300-450 words of consulting-grade analytical prose:
- Lead with the strategic insight
- Reference specific data points, companies, figures from the research data
- When mentioning numbers (market share %, sizes, growth rates, prices), be explicit — these will be used to generate charts
- IMPORTANT: For any specific number that is not directly cited from a named source in the research data, add "est." or "approx." before it — e.g. "est. 45% market share", "approx. $2.4B market size". Only omit est./approx. if you can attribute the figure to a specific named source (e.g. "According to Vietnam EV Association, 38% of...")
- Use **bold** for key terms and company names
- Use ### for sub-headings if helpful
- End with strategic implication
- No generic AI disclaimers
- Flowing paragraphs, not bullet points`;

    const streamRes = await fetch(ANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1200, stream: true, messages: [{ role: 'user', content: commentaryPrompt }] })
    });

    const reader  = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            const token = evt.delta.text;
            fullCommentary += token;
            send('token', { text: token });
          }
        } catch {}
      }
    }
  } catch (e) {
    send('token', { text: '\n\n*Commentary generation failed.*' });
  }

  // ══════════════════════════════════════════════════════════
  // PHASE 3: Extract chart + table from real commentary text
  // ══════════════════════════════════════════════════════════
  let chart = null, table = null;
  try {
    const extractPrompt = `You just wrote this section of a market research report:

SECTION TITLE: "${sectionTitle}"

COMMENTARY:
${fullCommentary}

Now extract structured visual data FROM the text above. Return ONLY valid JSON:
{
  "chart": null,
  "table": null
}

Rules — only include what the text actually supports:

chart: Extract if the commentary contains quantitative comparisons (market share %, growth rates, sizes, rankings, price points across 3+ items).
- type: "bar" for rankings/comparisons, "line" for time series, "pie" or "donut" for share breakdown, "radar" for multi-attribute
- Use ONLY numbers mentioned in the commentary — do NOT invent data
- If the text doesn't contain enough real numbers for a chart → null

table: Extract if the commentary compares multiple entities across 2+ attributes (competitors, channels, products, regulations, partners).
- Use ONLY information explicitly stated in the commentary
- If the text is purely narrative → null

IMPORTANT: If neither chart nor table is supported by actual data in the text, return { "chart": null, "table": null }.
Return ONLY JSON.`;

    const raw    = await callClaude(extractPrompt, 600);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    chart = parsed.chart || null;
    table = parsed.table || null;
  } catch (e) {
    console.warn('Visual extraction failed:', e.message);
  }

  send('visuals', { chart, table });

  // ══════════════════════════════════════════════════════════
  // Save to DB
  // ══════════════════════════════════════════════════════════
  if (reportId) {
    try {
      const report = await sbGet('custom_reports', reportId);
      if (report) {
        const fullContent = JSON.stringify({ headline, stats, chart, table, commentary: fullCommentary, sources });
        const updatedSections = (report.sections || []).map((s, i) =>
          i === sectionIndex ? { ...s, content: fullContent, status: 'completed' } : s
        );
        const allDone = updatedSections.every(s => s.status === 'completed');
        await sbPatch('custom_reports', reportId, {
          sections:   updatedSections,
          status:     allDone ? 'completed' : 'generating',
          updated_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('DB save failed:', e.message);
    }
  }

  send('done', { sectionIndex });
  res.end();
}
