// Kira Data (D4) adapter: EDINET API v2 (Japan, free key EDINET_API_KEY). Lists each day's filings and keeps those
// whose description names one of our markets (rules.js, Japanese names). The investor is Japan and the company is
// the filer. Reply shape checked on the first run with a key.
import { getJson } from '../econ/util.js';

const API = 'https://api.edinet-fsa.go.jp/api/v2/documents.json';

export async function items({ env, days = 3 } = {}) {
  if (!env) throw new Error('EDINET: EDINET_API_KEY missing');
  const out = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const body = await getJson(`${API}?${new URLSearchParams({ date, type: '2', 'Subscription-Key': env }).toString()}`);
    if (!body || !Array.isArray(body.results)) throw new Error('EDINET: unexpected reply');
    for (const r of body.results) {
      if (!r.docID || !r.docDescription) continue;
      out.push({ source_key: 'edinet', url: `https://disclosure2.edinet-fsa.go.jp/WZEK0040.aspx?${r.docID},,`, title: `${r.filerName}: ${r.docDescription}`,
        domain: 'disclosure2.edinet-fsa.go.jp', lang: 'ja', event_date: String(r.submitDateTime || date).slice(0, 10), tier: 'filing',
        investor: 'JP', company: r.filerName, classify_text: r.docDescription });
    }
  }
  return out;
}
