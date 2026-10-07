// ============================================================
// KIRA RESEARCH — api/_lib/transcripts.js
// Shared helpers for the Kira Experts transcript endpoints (migration 037):
//   /api/transcript-list     published catalog (public)
//   /api/transcript          one transcript: summary + the free opening (public)
//   /api/transcript-content  the full text (Bearer JWT, entitled users)
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const LOCALES = new Set(['en', 'ja', 'ko', 'zh']);
export const SLUG_RE = /^[a-z0-9][a-z0-9-]+$/;

// Share of the transcript (by characters of dialogue) readable without a subscription.
export const FREE_SHARE = 0.15;

export async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

export function pickLocale(url) {
  const l = url.searchParams.get('locale');
  return LOCALES.has(l) ? l : 'en';
}

// A transcript row with its translation for `locale`, falling back to EN.
// Readers only ever see published rows; the caller decides about drafts.
export async function loadTranscript(slug, locale) {
  const rows = await sb(
    `expert_transcripts?slug=eq.${encodeURIComponent(slug)}&status=eq.published` +
    `&select=id,slug,interview_type,country_code,market,industry,expert_group,format,published_at&limit=1`
  );
  const base = rows[0];
  if (!base) return null;
  for (const l of locale === 'en' ? ['en'] : [locale, 'en']) {
    const tr = await sb(
      `expert_transcript_translations?transcript_id=eq.${base.id}&locale=eq.${l}&status=eq.published&select=*&limit=1`
    );
    if (tr[0]) return { base, tr: tr[0], locale: l, isFallback: l !== locale };
  }
  return null;
}

export function meta({ base, tr, locale, isFallback }) {
  return {
    slug: base.slug,
    interview_type: base.interview_type,
    country_code: base.country_code,
    market: base.market,
    industry: base.industry,
    expert_group: base.expert_group,
    format: base.format,
    published_at: base.published_at,
    locale,
    isFallback,
    title: tr.title,
    blurb: tr.blurb,
    expert_role: tr.expert_role,
    expert_type: tr.expert_type,
    expert_profile: tr.expert_profile,
    basis: tr.basis,
    as_of: tr.as_of,
    length_label: tr.length_label,
    companies: tr.companies || [],
    summary: tr.summary || [],
  };
}

const TAG_RE = /\[([NF]\d+)\]/g;
const tagsIn = (text) => [...String(text).matchAll(TAG_RE)].map((m) => m[1]);

// Only the sources cited in the given texts, so the free view does not list
// the evidence behind the locked part.
export function sourcesFor(sources, texts) {
  const used = new Set(texts.flatMap(tagsIn));
  return Object.fromEntries(Object.entries(sources || {}).filter(([k]) => used.has(k)));
}

// Split the dialogue: whole turns from the start until FREE_SHARE of the
// characters is reached, then on to the end of that answer, so the free part
// never stops on an unanswered question. Locked turns are never returned,
// only the section titles and how many turns each hides.
export function splitFree(sections) {
  const total = sections.reduce((n, s) => n + s.turns.reduce((m, t) => m + t.text.length, 0), 0);
  const budget = total * FREE_SHARE;
  let used = 0, stop = false;
  const free = [], toc = [];
  for (const s of sections) {
    const shown = [];
    for (const turn of s.turns) {
      if (stop) break;
      shown.push(turn);
      used += turn.text.length;
      if (used >= budget && turn.who === 'A') stop = true;
    }
    // Keep reading an answer that continues in the next paragraph.
    while (stop && shown.length < s.turns.length && s.turns[shown.length].who === 'A' && shown[shown.length - 1].who === 'A') {
      shown.push(s.turns[shown.length]);
    }
    if (shown.length) free.push({ title: s.title, turns: shown });
    toc.push({ title: s.title, locked: shown.length < s.turns.length, lockedTurns: s.turns.length - shown.length });
  }
  const lockedTurns = toc.reduce((n, t) => n + t.lockedTurns, 0);
  return { free, toc, lockedTurns, totalTurns: sections.reduce((n, s) => n + s.turns.length, 0) };
}

export async function verifyBearer(req) {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${m[1]}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: (u.email || '').toLowerCase() } : null;
}

// Who may read full transcripts. Subscriptions are not live yet (Sprint S7),
// so for now only the admin team can, to review content. When subscriptions
// ship, add the active-subscription check here; every endpoint goes through it.
export function isEntitled(user) {
  const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!user && admins.includes(user.email);
}
