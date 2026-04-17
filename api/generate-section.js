// KIRA RESEARCH — api/generate-section.js
// 2-phase per section:
//   Phase 1: stream commentary (~15s)
//   Phase 2: extract headline + stats + chart + table from text (~3s)
// SSE events: token | meta | done

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
${questions ? `Client focus: ${questions}` : ''}${companies ? `\nCompanies: ${companies}` : ''}

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
    const extractPrompt = `You wrote this section "${sectionTitle}" of a market research report:

${fullCommentary}

Extract structured data FROM this text. Return ONLY valid JSON:
{
  "headline": "Most important finding in 1-2 punchy sentences",
  "stats": [{ "value": "~45%", "label": "VinFast market share", "icon": "pie" }],
  "chart": null,
  "table": null,
  "sources": ["VAMA (2024)", "Industry estimate"]
}

Rules:
- headline: always required
- stats: 2-4 key standalone metrics. icon: pie|growth|trend|users|channel|price|globe|check. [] if no metrics.
- chart: only if text has 3+ comparable numbers. type: bar|line|pie|donut|radar. Use ONLY numbers from text. Add "(est.)" to title if estimates. Prefer chart over table for numeric data. null if insufficient numbers.
- table: only if text compares 3+ entities across 2+ attributes. null if data is narrative.
- sources: 1-3 sources mentioned or implied in text.
Return ONLY JSON.`;

    const raw    = await callClaude(extractPrompt, 700);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    meta = { ...meta, ...parsed };
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
