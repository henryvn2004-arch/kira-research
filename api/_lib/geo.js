// ============================================================
// KIRA RESEARCH — api/_lib/geo.js
// Data + rules for the GEO hubs (G4): Q&A from `kira_answers`, practitioner statements from `field_claims`,
// the BizDirect crosswalk. Read at request time (edge-cached by the callers); a small in-memory cache keeps
// the few "whole table" reads cheap. Public data only: rows with status = 'published'.
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function sb(p) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

// Every row of a query: PostgREST answers at most 1,000 rows at a time, so page through (stable order by id).
export async function sbAll(path) {
  const out = [];
  for (let from = 0; from < 50000; from += 1000) {
    const page = await sb(`${path}${path.includes('?') ? '&' : '?'}order=id.asc&limit=1000&offset=${from}`);
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

const memo = new Map();
async function cached(key, ttlMs, fn) {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v;
  const v = await fn();
  memo.set(key, { at: Date.now(), v });
  return v;
}
const inList = (arr) => `in.(${arr.map((s) => `"${String(s).replace(/"/g, '')}"`).join(',')})`;

export const slugOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── rules ────────────────────────────────────────────────
export const MIN_ANSWERS = 5;             // hub is indexable with >= 5 published answers …
export const MIN_CLAIMS = 3;              // trade page: >= 3 claims …
export const MIN_TRANSCRIPTS = 2;         // … from >= 2 transcripts

export const INTENT_ORDER = ['market_size', 'growth', 'trends', 'key_players', 'channels', 'pricing', 'margins', 'consumer', 'trade_flow', 'trade_data', 'regulation', 'entry', 'investment', 'risks', 'practitioner', 'other'];
export const INTENT_LABEL = {
  market_size: 'Market size', growth: 'Growth', trends: 'Trends', key_players: 'Key players', channels: 'Channels and distribution',
  pricing: 'Pricing', margins: 'Margins', consumer: 'Customers and demand', trade_flow: 'Trade flows', regulation: 'Regulation',
  entry: 'Market entry', investment: 'Investment', risks: 'Risks', practitioner: 'How the trade works', other: 'Other questions',
};
export const TOPIC_LABEL = {
  buyer_roles: 'Who buys', channel: 'Sales channels', risk: 'Risks', competition: 'Competition', pricing: 'Pricing',
  decision_makers: 'Who decides', switching_triggers: 'Why buyers switch', margins: 'Margins', regulation: 'Regulation',
  payment_terms: 'Payment terms', lead_times: 'Lead times', exclusivity: 'Exclusivity',
};
// Topic → the answer intent that belongs next to it.
export const TOPIC_INTENT = { channel: 'channels', pricing: 'pricing', margins: 'margins', risk: 'risks', regulation: 'regulation', competition: 'key_players', buyer_roles: 'consumer' };
export const topicSlug = (t) => String(t).replace(/_/g, '-');
export const topicKey = (s) => String(s).replace(/-/g, '_');

// ── taxonomy ─────────────────────────────────────────────
export const countries = () => cached('countries', 3600e3, () => sb('tax_countries?select=code,name'));
export async function countryBySlug(slug) { return (await countries()).find((c) => slugOf(c.name) === slug) || null; }
export async function countryByCode(code) { return (await countries()).find((c) => c.code === code) || null; }

const industries = () => cached('industries', 3600e3, () => sb('tax_industries?select=slug,name&limit=2000'));
export async function segmentName(key) {
  const row = (await industries()).find((i) => i.slug === key);
  if (row) return row.name;
  const tail = String(key).split('--').pop();
  return tail.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

// ── translated rows (i18n = { ja: {...}, ko: {...}, zh: {...} }) ──
// Answers need both question and answer_short in the language; claims need claim_text. Else null (not translated).
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '');
export function ansLoc(a, loc) {
  if (loc === 'en') return a;
  const t = a.i18n && a.i18n[loc];
  const question = t && str(t.question), answer_short = t && str(t.answer_short);
  return question && answer_short ? { ...a, question, answer_short } : null;
}
export function claimLoc(c, loc) {
  if (loc === 'en') return c;
  const t = c.i18n && c.i18n[loc];
  const claim_text = t && str(t.claim_text);
  if (!claim_text) return null;
  return { ...c, claim_en: c.claim_text, claim_text, speaker_role: str(t.speaker_role) || c.speaker_role, basis_label: str(t.basis_label) || c.basis_label };
}

// ── answers ──────────────────────────────────────────────
const A_SEL = 'id,question,intent,country_code,segment_key,answer_short,year,primary_source,source_kind,source_ref,updated_at,i18n';

export function answersForHub(code, segment) {
  return sb(`kira_answers?status=eq.published&country_code=eq.${encodeURIComponent(code)}&segment_key=eq.${encodeURIComponent(segment)}&select=${A_SEL}&order=year.desc.nullslast,created_at.asc&limit=1000`);
}
export function answersForDoc(slug, limit = 15) {
  return sb(`kira_answers?status=eq.published&source_ref->>slug=eq.${encodeURIComponent(slug)}&select=${A_SEL}&order=intent.asc,year.desc.nullslast&limit=${limit}`);
}

// Which of these slugs are published reports / transcripts? → { reports: Map(slug→title), transcripts: Map(slug→title) }
export async function docTitles(slugs, loc = 'en') {
  const list = [...new Set(slugs.filter(Boolean))];
  const out = { reports: new Map(), transcripts: new Map() };
  if (!list.length) return out;
  const pick = (rows, k, m) => {
    for (const r of rows) {
      const tl = (r[k] || []).filter((x) => x.status === 'published');
      const t = tl.find((x) => x.locale === loc) || tl.find((x) => x.locale === 'en') || tl[0];
      m.set(r.slug, (t && t.title) || r.slug);
    }
  };
  for (let i = 0; i < list.length; i += 80) {          // chunks keep the request URL short
    const part = list.slice(i, i + 80);
    const [reps, trs] = await Promise.all([
      sb(`living_reports?status=eq.published&slug=${inList(part)}&select=slug,report_translations(locale,title,status)`),
      sb(`expert_transcripts?status=eq.published&slug=${inList(part)}&select=slug,expert_transcript_translations(locale,title,status)`),
    ]);
    pick(reps, 'report_translations', out.reports);
    pick(trs, 'expert_transcript_translations', out.transcripts);
  }
  return out;
}

// Hub stats from its answers + the doc titles: indexable only with real sources AND enough answers.
export function hubIndexable(answers, titles, loc = 'en') {
  const n = answers.filter((a) => ansLoc(a, loc)).length;     // thresholds count the rows that exist in that language
  const docs = answers.map((a) => a.source_ref && a.source_ref.slug).filter(Boolean);
  const hasDoc = docs.some((s) => titles.reports.has(s) || titles.transcripts.has(s));
  return hasDoc && n >= MIN_ANSWERS;
}

// One row per (country, segment) hub: { code, segment, n, updated, slugs, counts:{en,ja,ko,zh} }.
// From the database function geo_hub_stats() (migration 068); until it exists, built by paging through the answers.
async function hubRows() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/geo_hub_stats`, {
      method: 'POST', headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    if (r.ok) {
      return (await r.json()).map((x) => ({ code: x.country_code, segment: x.segment_key, n: x.n, updated: x.updated || '', slugs: x.slugs || [], counts: { en: x.n, ja: x.n_ja, ko: x.n_ko, zh: x.n_zh } }));
    }
  } catch (_e) { /* fall back */ }
  const rows = await sbAll('kira_answers?status=eq.published&segment_key=not.is.null&select=id,country_code,segment_key,source_ref,updated_at,i18n');
  const by = new Map();
  for (const r of rows) {
    const k = `${r.country_code}|${r.segment_key}`;
    if (!by.has(k)) by.set(k, { code: r.country_code, segment: r.segment_key, n: 0, updated: '', slugs: new Set(), counts: { en: 0, ja: 0, ko: 0, zh: 0 } });
    const h = by.get(k);
    h.n++; h.counts.en++;
    for (const l of ['ja', 'ko', 'zh']) if (ansLoc(r, l)) h.counts[l]++;
    if (r.source_ref && r.source_ref.slug) h.slugs.add(r.source_ref.slug);
    if (r.updated_at > h.updated) h.updated = r.updated_at;
  }
  return [...by.values()].map((h) => ({ ...h, slugs: [...h.slugs] }));
}

// Every (country, segment) hub with its indexable flag (per language) — for the sitemap, index pages and admin.
export async function listHubs() {
  return cached('hubs', 5 * 60e3, async () => {
    const rows = await hubRows();
    const titles = await docTitles(rows.flatMap((h) => h.slugs));
    return rows.map((h) => {
      const hasDoc = h.slugs.some((s) => titles.reports.has(s) || titles.transcripts.has(s));
      const byLocale = Object.fromEntries(['en', 'ja', 'ko', 'zh'].map((l) => [l, hasDoc && h.counts[l] >= MIN_ANSWERS]));
      return { code: h.code, segment: h.segment, n: h.n, updated: h.updated, indexable: byLocale.en, byLocale, counts: h.counts };
    });
  });
}

// ── practitioner claims ──────────────────────────────────
const C_SEL = 'id,topic,industry,country_code,speaker_role,claim_text,transcript_slug,basis_label,updated_at,i18n';
const industryBase = (s) => String(s || '').replace(/\s*\(.*$/, '').trim();
export const industrySlug = (s) => slugOf(industryBase(s));

export function claimsForTranscript(slug) {
  return sb(`field_claims?status=eq.published&transcript_slug=eq.${encodeURIComponent(slug)}&select=${C_SEL}&order=created_at.asc&limit=100`);
}
export function claimsForTranscripts(slugs) {
  if (!slugs.length) return Promise.resolve([]);
  return sb(`field_claims?status=eq.published&transcript_slug=${inList(slugs)}&select=${C_SEL}&order=created_at.asc&limit=400`);
}
// All published claims (593 rows, small) — grouped by the trade pages.
export const allClaims = () => cached('claims', 5 * 60e3, () => sbAll(`field_claims?status=eq.published&select=${C_SEL}`));

// Claims grouped by industry slug → topic → [claims], in one language (translated rows only for ja/ko/zh);
// claims of unpublished transcripts dropped.
const claimBase = () => cached('claim-base', 5 * 60e3, async () => {
  const claims = await allClaims();
  const titles = await docTitles(claims.map((c) => c.transcript_slug));
  return { claims, titles: titles.transcripts };
});
// Claims of published transcripts only.
export async function publishedClaims() {
  const { claims, titles } = await claimBase();
  return claims.filter((c) => titles.has(c.transcript_slug));
}
const SLUG_LIKE = /^[a-z0-9]+(-+[a-z0-9]+)*$/;
export async function tradeIndex(loc = 'en') {
  const { claims, titles } = await claimBase();
  return cached(`trade|${loc}`, 5 * 60e3, async () => {
    const idx = new Map();   // industry slug → { slug, name, topics: Map(topic → claims) }
    for (const c0 of claims) {
      const c = claimLoc(c0, loc);
      if (!c || !titles.has(c.transcript_slug) || !c.industry) continue;
      const is = industrySlug(c.industry);
      if (!is) continue;
      // Since the GEO gate, claim.industry is a segment key (or null); older rows hold a free-text name.
      if (!idx.has(is)) idx.set(is, { slug: is, key: SLUG_LIKE.test(c.industry) ? c.industry : null, name: SLUG_LIKE.test(c.industry) ? await segmentName(c.industry) : industryBase(c.industry), topics: new Map() });
      const ind = idx.get(is);
      if (!ind.topics.has(c.topic)) ind.topics.set(c.topic, []);
      ind.topics.get(c.topic).push(c);
    }
    return { idx, titles };
  });
}
export const tradeTopicIndexable = (claims, topic) =>
  topic !== 'other' && claims.length >= MIN_CLAIMS && new Set(claims.map((c) => c.transcript_slug)).size >= MIN_TRANSCRIPTS;

// ── BizDirect (who's who) ────────────────────────────────
export const crosswalk = (code, segment) =>
  sb(`segment_crosswalk?status=eq.approved&country_code=eq.${encodeURIComponent(code)}&segment_key=eq.${encodeURIComponent(segment)}&select=bizdirect_country,bizdirect_term_slugs&limit=1`).then((r) => r[0] || null);

// Never throws; null until the endpoint answers 200. Cached 1 day (misses 10 minutes).
export async function bizdirectSummary(row) {
  if (!row || !row.bizdirect_country) return null;
  const terms = (row.bizdirect_term_slugs || []).join(',');
  const key = `bd|${row.bizdirect_country}|${terms}`;
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < (hit.v ? 86400e3 : 600e3)) return hit.v;
  let v = null;
  try {
    const url = `https://bizdirectasia.com/api/public/segment-summary?country=${encodeURIComponent(row.bizdirect_country)}&terms=${encodeURIComponent(terms)}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3000);
    const r = await fetch(url, { signal: ctl.signal, headers: { accept: 'application/json', 'user-agent': 'kira-geo' } });
    clearTimeout(timer);
    if (r.ok) v = await r.json();
  } catch (_e) { v = null; }
  memo.set(key, { at: Date.now(), v });
  return v;
}
