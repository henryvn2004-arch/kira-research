// ============================================================
// KIRA RESEARCH — api/_lib/geo-health.js
// Health of the GEO data layer (kira_answers, field_claims, hubs, trade pages), for /en/admin/geo and
// the "GEO answers" line on /en/admin/health. The daily hooks (batch_runner Step 5.3b-7, experts routine 4b)
// insert the rows; this shows whether they keep doing it.
// ============================================================
import { sb, listHubs, tradeIndex, tradeTopicIndexable } from './geo.js';

const DAY = 86400000;
// PostgREST returns at most 1,000 rows per request whatever `limit` says: page through.
async function all(path) {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const r = await sb(`${path}&order=id&limit=1000&offset=${off}`);
    out.push(...r);
    if (r.length < 1000) return out;
  }
}
const iso = (ms) => new Date(ms).toISOString();

// The light check: no new rows in 72 h while reports or transcripts were published in those 72 h.
export async function geoHealthLine() {
  const since = iso(Date.now() - 3 * DAY);
  const [a, c, reps, trs] = await Promise.all([
    sb(`kira_answers?select=created_at&created_at=gte.${since}&limit=1`),
    sb(`field_claims?select=created_at&created_at=gte.${since}&limit=1`),
    sb(`living_reports?select=slug&status=eq.published&published_at=gte.${since}&limit=1`),
    sb(`expert_transcripts?select=slug&status=eq.published&published_at=gte.${since}&limit=1`),
  ]);
  const newRows = a.length + c.length > 0;
  const published = reps.length + trs.length > 0;
  return { ok: newRows || !published, new_rows_72h: newRows, published_72h: published };
}

export async function geoHealth() {
  const now = Date.now();
  const d1 = iso(now - DAY), d7 = iso(now - 7 * DAY);

  const [answers, claims, reps, trs] = await Promise.all([
    all('kira_answers?select=id,status,country_code,source_kind,source_ref,created_at'),
    all('field_claims?select=id,status,country_code,transcript_slug,created_at'),
    sb(`living_reports?select=slug,published_at&status=eq.published&published_at=gte.${d7}&order=published_at.desc&limit=200`),
    sb(`expert_transcripts?select=slug,published_at&status=eq.published&published_at=gte.${d7}&order=published_at.desc&limit=200`),
  ]);

  const pub = (r) => r.status === 'published';
  const byCountry = {};
  for (const r of answers.filter(pub)) (byCountry[r.country_code] ||= { answers: 0, claims: 0 }).answers++;
  for (const r of claims.filter(pub)) (byCountry[r.country_code] ||= { answers: 0, claims: 0 }).claims++;
  const since = (rows, t) => rows.filter((r) => r.created_at >= t).length;

  // Last insert per source (any status: the hook inserts drafts too). Claims come from transcripts.
  const lastInsert = {};
  for (const r of answers) if (!lastInsert[r.source_kind] || r.created_at > lastInsert[r.source_kind]) lastInsert[r.source_kind] = r.created_at;
  for (const r of claims) if (!lastInsert.claims || r.created_at > lastInsert.claims) lastInsert.claims = r.created_at;

  // Indexable pages by the same rules as the sitemap (api/_lib/geo.js).
  const [hubs, trade] = await Promise.all([listHubs(), tradeIndex()]);
  let tradePages = 0;
  for (const ind of trade.idx.values()) for (const [topic, cl] of ind.topics) if (tradeTopicIndexable(cl, topic)) tradePages++;

  // Documents published in the last 7 days with no rows at all = a hook failed.
  const have = new Set(answers.map((r) => r.source_ref && r.source_ref.slug).filter(Boolean));
  for (const r of claims) have.add(r.transcript_slug);
  const missing = [
    ...reps.filter((r) => !have.has(r.slug)).map((r) => ({ kind: 'report', slug: r.slug, published_at: r.published_at })),
    ...trs.filter((r) => !have.has(r.slug)).map((r) => ({ kind: 'transcript', slug: r.slug, published_at: r.published_at })),
  ];

  const line = await geoHealthLine();
  return {
    totals: { answers: answers.filter(pub).length, claims: claims.filter(pub).length },
    by_country: Object.entries(byCountry).map(([code, v]) => ({ code, ...v })).sort((x, y) => (y.answers + y.claims) - (x.answers + x.claims)),
    added: {
      d1: { answers: since(answers, d1), claims: since(claims, d1) },
      d7: { answers: since(answers, d7), claims: since(claims, d7) },
    },
    last_insert: lastInsert,
    indexable: { hubs: hubs.filter((h) => h.indexable).length, hubs_total: hubs.length, trade_pages: tradePages },
    missing_docs: missing,
    line,
  };
}
