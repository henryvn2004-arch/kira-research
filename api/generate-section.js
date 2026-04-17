// KIRA RESEARCH — api/generate-section.js
// POST /api/generate-section
// Streams response as SSE:
//   1. event: meta  → { headline, stats, chart, table }  (~2s)
//   2. event: token → { text }  (streaming commentary)
//   3. event: done  → { sectionIndex }

export const config = { maxDuration: 60, runtime: 'nodejs' };

const ANT_URL   = 'https://api.anthropic.com/v1/messages';
const ANT_KEY   = process.env.ANTHROPIC_API_KEY;
const MODEL     = 'claude-sonnet-4-5';
const SB_URL    = process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_KEY;

async function sbGet(table, id) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  const d = await r.json();
  return d?.[0];
}

async function sbPatch(table, id, body) {
  await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

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

  return `Industry: ${industry} | Market: ${country} | Report: ${reportType.replace(/_/g,' ')}
${questions ? `Client focus: ${questions}` : ''}
${companies ? `Companies: ${companies}` : ''}

RESEARCH DATA:
${researchSummary || 'Draw on your knowledge.'}
${rag ? `\n${rag}` : ''}
${prev ? `\nPREVIOUS SECTIONS (do not repeat):\n${prev}` : ''}`;
}

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

  // ── SSE headers ──────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  // ── Phase 1: Meta (headline, stats, chart, table) ~2s ────
  let meta = { headline: '', stats: [], chart: null, table: null };
  try {
    const metaPrompt = `You are writing section "${sectionTitle}" of a market research report.

${context}

Return ONLY valid JSON (no markdown):
{
  "headline": "Most important finding in 1-2 punchy sentences",
  "stats": [
    { "value": "67%", "label": "Market share top 3", "icon": "pie" }
  ],
  "chart": {
    "type": "bar",
    "title": "Chart title (add est. if estimated)",
    "labels": ["A","B","C"],
    "datasets": [{ "label": "Series", "data": [30,45,25] }]
  },
  "table": {
    "title": "Table title",
    "headers": ["Col1","Col2","Col3"],
    "rows": [["v","v","v"]]
  },
  "sources": ["Source name / org (year)", "Source 2"]
}

Rules:
- headline: always required
- stats: 2-4 key metrics. icon options: pie|growth|trend|users|channel|price|globe|check. Use "~" if estimated. Omit array if section has no metrics.
- chart: include if quantitative data (share, size, growth, pricing). null if not applicable.
- table: include if comparison helps (competitors, channels, tiers). null if not applicable.
- sources: 1-4 sources that back the data in this section. Use real org names where applicable: industry reports, government stats, trade associations, news. Format: "Organization / Report Name (year)". If purely estimated, use "Industry estimate" or "Analyst consensus".`;

    const metaRes = await fetch(ANT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANT_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 800, messages: [{ role: 'user', content: metaPrompt }] })
    });
    const metaData = await metaRes.json();
    if (!metaData.error) {
      const raw   = metaData.content?.[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      meta = JSON.parse(clean);
    }
  } catch (e) {
    // Non-fatal — continue with empty meta
    console.warn('Meta phase failed:', e.message);
  }

  send('meta', meta);

  // ── Phase 2: Stream commentary ───────────────────────────
  let fullCommentary = '';
  try {
    const commentaryPrompt = `Write the analytical commentary for section "${sectionTitle}" of a market research report.

${context}

Key finding already established: "${meta.headline}"

Write 300-450 words of consulting-grade analytical prose:
- Lead with the strategic insight, not "In this section..."
- Support with specific evidence and data points from the research
- Explain what the data means strategically for the business
- Use **bold** for key terms and company names
- Use ### for sub-headings if needed
- End with a forward-looking implication
- Do NOT add AI disclaimers or mention data limitations
- Write flowing paragraphs, not bullet points`;

    const streamRes = await fetch(ANT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANT_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        stream: true,
        messages: [{ role: 'user', content: commentaryPrompt }]
      })
    });

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

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
    send('token', { text: '\n\n*Commentary generation encountered an error.*' });
    fullCommentary = 'Error: ' + e.message;
  }

  // ── Save completed section to DB ──────────────────────────
  if (reportId) {
    try {
      const report = await sbGet('custom_reports', reportId);
      if (report) {
        const fullContent = JSON.stringify({ ...meta, commentary: fullCommentary });
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
