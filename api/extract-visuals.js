// api/extract-visuals.js
// POST { commentary, sectionTitle, sectionIndex }
// Claude reads the section content and extracts the most appropriate chart OR table.
//
// Visual selection logic (built into the prompt):
//  - Market share / composition → doughnut
//  - Growth / time-series trend → line
//  - Competitor multi-attribute comparison → radar
//  - Category rankings / comparisons → horizontal bar
//  - Volume / distribution by segment → vertical bar
//  - Structured rows of data (3+ columns) → table
//
// Returns: { chart:{type,title,labels,datasets}, table:{title,headers,rows} }
// Exactly one of chart/table will be non-null (or both null if no clear data).

export const config = { maxDuration: 30 };

const SYSTEM = `You are a data visualization specialist for market research reports.
Your job: read a section of analysis, identify the key quantitative relationship, and return the single best chart OR table spec.

CHART TYPE RULES:
- Percentage breakdown / market share / composition → type: "doughnut"
- Time series / growth over years → type: "line"  
- Competitor comparison across multiple attributes → type: "radar"
- Category rankings, top-N comparisons → type: "bar" with horizontal=true
- Volume by segment, distribution → type: "bar"
- 3+ columns of structured data → table (NOT chart)

OUTPUT FORMAT (strict JSON, no markdown):
{
  "chart": {
    "type": "bar|line|doughnut|radar",
    "title": "Short descriptive title",
    "labels": ["label1","label2",...],
    "datasets": [
      {"label":"Series name","data":[num1,num2,...],"borderColor":"#1E6FFF"}
    ]
  },
  "table": {
    "title": "Table title",
    "headers": ["Col1","Col2","Col3"],
    "rows": [["val","val","val"],...]
  }
}

STRICT RULES:
- Return exactly ONE of chart or table (set the other to null)
- Return {"chart":null,"table":null} if no quantitative data found
- datasets[].data values must be NUMBERS, not strings
- labels array length must equal datasets[0].data length
- Max 8 labels per chart; max 12 rows per table
- For line charts, datasets may have multiple series (multiple items in datasets array)
- For radar, include 4-8 attributes as labels, one dataset per competitor
- NEVER invent data — only extract numbers that appear in the text
- If numbers are approximate ("~$2B", "around 40%"), use the numeric value (2, 40)`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { commentary, sectionTitle, sectionIndex } = req.body;
  if (!commentary || commentary.length < 80) {
    return res.json({ chart: null, table: null });
  }

  const prompt = `Section title: "${sectionTitle}"

Section content:
${commentary.slice(0, 3000)}

Extract the single best visualization for this section. Return only JSON.`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 900,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      return res.status(500).json({ error: 'Claude API error', detail: err });
    }

    const data = await apiRes.json();
    const raw  = data.content?.[0]?.text?.trim() || '';

    // Strip any accidental markdown fences
    const clean = raw.replace(/^```json\s*/,'').replace(/\s*```$/,'').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.json({ chart: null, table: null });
    }

    // Validate chart
    let chart = null;
    if (parsed.chart?.type && Array.isArray(parsed.chart.labels) && parsed.chart.labels.length &&
        Array.isArray(parsed.chart.datasets) && parsed.chart.datasets.length) {
      // Ensure all data values are numbers
      parsed.chart.datasets = parsed.chart.datasets.map(ds => ({
        ...ds,
        data: (ds.data || []).map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g,'')) || 0),
      }));
      // Trim to match labels length
      const len = parsed.chart.labels.length;
      parsed.chart.datasets.forEach(ds => { ds.data = ds.data.slice(0, len); });
      chart = parsed.chart;
    }

    // Validate table
    let table = null;
    if (!chart && parsed.table?.headers?.length && parsed.table?.rows?.length) {
      table = parsed.table;
    }

    return res.json({ chart, table });

  } catch (err) {
    console.error('[extract-visuals]', err.message);
    return res.json({ chart: null, table: null });
  }
}
