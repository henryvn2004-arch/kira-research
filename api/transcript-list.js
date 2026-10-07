// ============================================================
// KIRA RESEARCH — api/transcript-list.js
//   GET /api/transcript-list?locale=en
//   → { items: [{ slug, interview_type, market, industry, expert_group, format, published,
//                 title, blurb, expert, expert_type, as_of, length, companies }] }
// Published transcripts only; each item in the requested locale, else EN.
// ============================================================
import { sb, pickLocale } from './_lib/transcripts.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const locale = pickLocale(new URL(req.url, `https://${req.headers.host || 'x'}`));
  try {
    const bases = await sb(
      'expert_transcripts?status=eq.published&order=published_at.desc' +
      '&select=id,slug,interview_type,market,industry,expert_group,format,published_at'
    );
    const ids = bases.map((b) => b.id);
    const trs = ids.length ? await sb(
      `expert_transcript_translations?transcript_id=in.(${ids.join(',')})&status=eq.published` +
      '&select=transcript_id,locale,title,blurb,expert_role,expert_type,as_of,length_label,companies'
    ) : [];
    const items = bases.map((b) => {
      const mine = trs.filter((t) => t.transcript_id === b.id);
      const tr = mine.find((t) => t.locale === locale) || mine.find((t) => t.locale === 'en');
      if (!tr) return null;
      return {
        slug: b.slug, interview_type: b.interview_type, market: b.market, industry: b.industry,
        expert_group: b.expert_group, format: b.format, published: b.published_at,
        title: tr.title, blurb: tr.blurb, expert: tr.expert_role, expert_type: tr.expert_type,
        as_of: tr.as_of, length: tr.length_label, companies: tr.companies || [], locale: tr.locale,
      };
    }).filter(Boolean);
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    res.status(200).json({ items });
  } catch (err) {
    console.error('[transcript-list] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
