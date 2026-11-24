// ============================================================
// KIRA RESEARCH — api/_lib/indexnow.js
// IndexNow (Bing, Yandex, Naver, Seznam; shared with other engines): tells them a URL was added or
// changed. No-op without env INDEXNOW_KEY (the key is never committed; /indexnow.txt serves it).
// ============================================================
import { BASE, LOCALES } from './ssr.js';

export const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const BATCH = 10000;
const HOST = new URL(BASE).host;

export function indexNowKey(env = process.env) {
  const k = String(env.INDEXNOW_KEY || '').trim();
  return /^[A-Za-z0-9-]{8,128}$/.test(k) ? k : '';
}

// urls: absolute https://kiraresearch.com/... only (anything else is dropped). Never throws.
export async function submitUrls(urls, { fetchImpl = fetch, env = process.env } = {}) {
  const key = indexNowKey(env);
  if (!key) return { ok: true, skipped: 'no_key', submitted: 0 };
  const list = [...new Set((urls || []).filter((u) => typeof u === 'string' && u.startsWith(BASE + '/')))];
  if (!list.length) return { ok: true, skipped: 'no_urls', submitted: 0 };
  let submitted = 0;
  let failed = 0;
  let status = 0;
  for (let i = 0; i < list.length; i += BATCH) {
    const chunk = list.slice(i, i + BATCH);
    try {
      const r = await fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host: HOST, key, keyLocation: `${BASE}/indexnow.txt`, urlList: chunk }),
      });
      status = r.status;
      if (r.status === 200 || r.status === 202) submitted += chunk.length; else failed += chunk.length;
    } catch (_e) { failed += chunk.length; }
  }
  return { ok: failed === 0, submitted, failed, status };
}

// URLs of the pages that changed since `sinceIso`: every published translation of a report,
// insight or transcript updated since then, plus the listing pages when anything changed.
// sb(path) → rows (injected for tests).
export async function changedUrls(sb, sinceIso) {
  const since = encodeURIComponent(sinceIso);
  const [reps, ins, trs] = await Promise.all([
    sb(`living_reports?status=eq.published&select=slug,report_translations!inner(locale)&report_translations.status=eq.published&report_translations.updated_at=gte.${since}`),
    sb(`insights?status=eq.published&select=slug,insight_translations!inner(locale)&insight_translations.status=eq.published&insight_translations.updated_at=gte.${since}`),
    sb(`expert_transcripts?status=eq.published&select=slug,expert_transcript_translations!inner(locale)&expert_transcript_translations.status=eq.published&expert_transcript_translations.updated_at=gte.${since}`),
  ]);
  const urls = [];
  const add = (rows, key, seg) => rows.forEach((r) => (r[key] || []).forEach((t) => {
    if (LOCALES.includes(t.locale)) urls.push(`${BASE}/${t.locale}/${seg}/${r.slug}`);
  }));
  add(reps, 'report_translations', 'reports');
  add(ins, 'insight_translations', 'insights');
  add(trs, 'expert_transcript_translations', 'experts/transcripts');
  if (reps.length) LOCALES.forEach((l) => urls.push(`${BASE}/${l}/library`));
  if (ins.length) LOCALES.forEach((l) => urls.push(`${BASE}/${l}/insights/`));
  if (trs.length) urls.push(`${BASE}/en/experts/transcripts/`);
  return [...new Set(urls)];
}
