// ============================================================
// KIRA RESEARCH — api/transcript-content.js
//   GET /api/transcript-content?slug=X&locale=Y   (Authorization: Bearer <supabase-jwt>)
//   → the full dialogue and every source.
// 401 not signed in · 402 not entitled (see isEntitled) · 404 missing.
// ============================================================
import { SLUG_RE, pickLocale, loadTranscript, verifyBearer, isEntitled } from './_lib/transcripts.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (!isEntitled(user)) { res.status(402).json({ error: 'not_entitled' }); return; }
  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug = url.searchParams.get('slug') || '';
  if (!SLUG_RE.test(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }
  try {
    const found = await loadTranscript(slug, pickLocale(url));
    if (!found) { res.status(404).json({ error: 'not_found' }); return; }
    res.status(200).json({ slug, locale: found.locale, sections: found.tr.sections || [], sources: found.tr.sources || {} });
  } catch (err) {
    console.error('[transcript-content] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
