// ============================================================
// KIRA RESEARCH — api/transcript.js
//   GET /api/transcript?slug=X&locale=Y
//   → meta + summary + the free opening of the dialogue (FREE_SHARE of it), the full
//     table of contents with locked flags, and the sources cited in the free part.
// Locked turns never leave the server; /api/transcript-content serves them.
// ============================================================
import { SLUG_RE, pickLocale, loadTranscript, meta, splitFree, sourcesFor } from './_lib/transcripts.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug = url.searchParams.get('slug') || '';
  if (!SLUG_RE.test(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }
  try {
    const found = await loadTranscript(slug, pickLocale(url));
    if (!found) { res.status(404).json({ error: 'not_found' }); return; }
    const { free, toc, lockedTurns, totalTurns } = splitFree(found.tr.sections || []);
    const texts = (found.tr.summary || []).concat(free.flatMap((s) => s.turns.map((t) => t.text)));
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    res.status(200).json({
      ...meta(found),
      sections: free,
      toc,
      lockedTurns,
      totalTurns,
      sources: sourcesFor(found.tr.sources, texts),
      sourceCounts: {
        public: Object.keys(found.tr.sources || {}).filter((k) => k[0] === 'N').length,
        field: Object.keys(found.tr.sources || {}).filter((k) => k[0] === 'F').length,
      },
    });
  } catch (err) {
    console.error('[transcript] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
