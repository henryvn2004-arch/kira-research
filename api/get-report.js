// KIRA RESEARCH — api/get-report.js
// Fetch report status + content (used for polling & re-access)
// GET /api/get-report?id=UUID
// GET /api/get-report?slug=SLUG
//
// CHANGE: sections[].content is stored as JSON string in DB.
// Now parses it and maps to the structured format report.html expects:
// { label, title, stats, chart, finding, table, bullets, source }

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.json();
}

// Map icon string from generate-section extraction to accent color name
// report.html uses: 'blue' | 'accent' (teal) | 'gold' | 'red'
function iconToAccent(icon) {
  const map = {
    growth: 'accent',
    trend:  'accent',
    price:  'gold',
    channel:'gold',
    users:  'blue',
    pie:    'blue',
    globe:  'blue',
    check:  'blue',
  };
  return map[icon] || 'blue';
}

// Detect negative stat (for red accent)
function isNegativeStat(value, label) {
  const v = String(value || '');
  const l = String(label || '').toLowerCase();
  if (v.startsWith('-') || v.includes('↓') || v.includes('decline') || v.includes('fall')) return true;
  if (l.includes('decline') || l.includes('loss') || l.includes('risk') || l.includes('barrier')) return true;
  return false;
}

// Map chart from DB format (generate-section output) → report.html format
// DB chart can have: { type, title, labels, data, datasets }
// report.html chart needs: { type, title, labels, data, colors, dir, height, datasets }
function mapChart(dbChart) {
  if (!dbChart || typeof dbChart !== 'object') return null;

  const { type, title, labels, data, datasets } = dbChart;
  if (!type) return null;

  const COLOR_MAP = {
    0: '#1E6FFF', 1: '#00D4A8', 2: '#C9A84C',
    3: '#8B5CF6', 4: '#E05252', 5: '#505A6B',
  };

  if (type === 'bar' || type === 'column') {
    // Single series
    if (data && labels) {
      return {
        type: 'bar',
        title,
        labels,
        data,
        colors: [COLOR_MAP[0]],
        dir: type === 'bar' ? 'horizontal' : 'vertical',
        height: 220,
      };
    }
    // Multi series (stacked/grouped)
    if (datasets && labels) {
      return {
        type: 'bar',
        title,
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          color: COLOR_MAP[i] || COLOR_MAP[0],
        })),
        height: 240,
      };
    }
  }

  if (type === 'line') {
    if (datasets && labels) {
      return {
        type: 'line',
        title,
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          color: COLOR_MAP[i] || COLOR_MAP[0],
        })),
        height: 240,
      };
    }
    // Single line
    if (data && labels) {
      return {
        type: 'line',
        title,
        labels,
        datasets: [{ label: title, data, color: COLOR_MAP[0] }],
        height: 220,
      };
    }
  }

  if (type === 'donut' || type === 'doughnut' || type === 'pie') {
    if (data && labels) {
      return {
        type: 'doughnut',
        title,
        labels,
        data,
        colors: labels.map((_, i) => COLOR_MAP[i] || COLOR_MAP[5]),
        height: 220,
      };
    }
  }

  if (type === 'radar') {
    if (datasets && labels) {
      return {
        type: 'radar',
        title,
        labels,
        datasets: datasets.map((ds, i) => ({
          label: ds.label,
          data: ds.data,
          color: COLOR_MAP[i] || COLOR_MAP[0],
        })),
        height: 260,
      };
    }
  }

  return null;
}

// Parse one section from DB format → report.html format
function parseSection(rawSection) {
  // If content is empty (pending section), return minimal structure
  if (!rawSection.content) {
    return {
      label:  rawSection.title || '',
      title:  rawSection.title || '',
      status: rawSection.status || 'pending',
    };
  }

  // Parse content JSON saved by generate-section
  let parsed = {};
  try {
    parsed = JSON.parse(rawSection.content);
  } catch {
    // content might be plain text (old format) — treat as commentary
    parsed = { commentary: rawSection.content };
  }

  const { headline, stats, chart, table, sources, commentary } = parsed;

  // Map stats: DB has {value, label, icon} → report.html wants {value, label, change, accent}
  const mappedStats = (stats || []).map(s => ({
    label:  s.label || '',
    value:  s.value || '',
    change: '',   // DB doesn't store change separately; left empty
    accent: isNegativeStat(s.value, s.label) ? 'red' : iconToAccent(s.icon),
  }));

  // Finding: use headline as the key finding shown in the finding box
  // Commentary becomes the detailed prose (not shown in slide view)
  const finding = headline || '';

  // Map chart
  const mappedChart = mapChart(chart);

  // Map table: DB has {headers, rows} — same format report.html expects
  const mappedTable = (table?.headers?.length && table?.rows?.length) ? table : null;

  // Sources → source string for slide footer
  const source = (sources || []).join('; ') || '';

  return {
    label:      rawSection.title || '',
    title:      headline || rawSection.title || '',
    finding,
    stats:      mappedStats.length ? mappedStats : undefined,
    chart:      mappedChart || undefined,
    table:      mappedTable || undefined,
    source,
    commentary, // kept for chatbox context
    status:     rawSection.status || 'completed',
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id, slug } = req.query;
  if (!id && !slug) return res.status(400).json({ error: 'Missing id or slug' });

  try {
    // Try custom_reports first
    let query = id
      ? `custom_reports?id=eq.${id}&select=*&limit=1`
      : `custom_reports?slug=eq.${slug}&select=*&limit=1`;

    let data   = await sb(query);
    let report = Array.isArray(data) ? data[0] : null;

    // If not found in custom_reports, try living_reports
    if (!report && slug) {
      data   = await sb(`living_reports?slug=eq.${slug}&select=*&limit=1`);
      report = Array.isArray(data) ? data[0] : null;
    }

    if (!report) return res.status(404).json({ error: 'Report not found' });

    const rawSections = report.sections || report.full_content || [];
    const inputParams = report.input_params || {};

    // Parse + map sections to report.html format
    const sections = rawSections.map(parseSection);

    return res.json({
      id:           report.id,
      slug:         report.slug,
      status:       report.status,
      title:        inputParams.title || `${inputParams.industry || ''} Market Intelligence`,
      type:         inputParams.reportType || report.report_type || 'Market Research',
      country:      inputParams.country || '',
      industry:     inputParams.industry || '',
      generated:    new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      sections,
      totalSections: rawSections.length || 8,
      createdAt:    report.created_at,
      updatedAt:    report.updated_at,
    });

  } catch (e) {
    console.error('[get-report]', e);
    return res.status(500).json({ error: e.message });
  }
}
