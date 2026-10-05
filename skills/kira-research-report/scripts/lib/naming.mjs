// Report naming rules (docs/naming_convention.md) as code, shared by
// scripts/report-name.mjs and the backfill. Pure functions, no I/O except
// loading the vocabulary file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const VOCAB = JSON.parse(fs.readFileSync(path.join(here, '../../references/naming_vocab.json'), 'utf8'));

const LIMITS = { segment: 28, angle: 60, title: 95, canonical: 45, seo: 60, slug: 60, line3: 18 };
const HYPE = /\b(game[- ]?changer|unprecedented|explosive|massive|revolutionary|ultimate|booming)\b/i;

export function resolveCountry(input) {
  const s = String(input || '').trim();
  if (VOCAB.countries[s.toUpperCase()]) return s.toUpperCase();
  const hit = Object.entries(VOCAB.countries).find(([, v]) => v.en.toLowerCase() === s.toLowerCase()
    || (s.toLowerCase() === 'korea' && v.en === 'South Korea'));
  return hit ? hit[0] : null;
}

export function resolveIndustry(input) {
  const s = String(input || '').trim().toLowerCase();
  if (VOCAB.industries[s.toUpperCase()]) return s.toUpperCase();
  const hit = Object.entries(VOCAB.industries).find(([, v]) =>
    v.en.toLowerCase() === s || v.aliases.some(a => a.toLowerCase() === s));
  return hit ? hit[0] : null;
}

export function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Returns { naming, errors }. `taken` = { slugs:Set, codes:Set } already in use.
export function buildName(input, taken = { slugs: new Set(), codes: new Set() }) {
  const errors = [];
  const cc = resolveCountry(input.country);
  const ind = input.industryCode ? resolveIndustry(input.industryCode) : resolveIndustry(input.industry);
  const stage = String(input.stage || 'XPL').toUpperCase();
  const type = String(input.type || 'D').toUpperCase();
  const year = Number(input.year);
  const segment = String(input.segment || '').trim().replace(/\s+/g, ' ');
  const angle = String(input.angle || '').trim().replace(/\s+/g, ' ').replace(/[.]$/, '');

  if (!cc) errors.push(`unknown country "${input.country}" (add it to references/naming_vocab.json)`);
  if (!ind) errors.push(`unknown industry "${input.industryCode || input.industry}" (map it to an existing code or add one to naming_vocab.json)`);
  if (!VOCAB.stages[stage]) errors.push(`stage must be one of ${Object.keys(VOCAB.stages).join(', ')}`);
  if (!VOCAB.types[type]) errors.push(`type must be one of ${Object.keys(VOCAB.types).join(', ')}`);
  if (!(year >= 2020 && year <= 2100)) errors.push('year must be a 4-digit year');
  if (!segment || segment.split(' ').length > 4 || segment.length > LIMITS.segment)
    errors.push(`segment must be 1-4 words, <= ${LIMITS.segment} chars (got "${segment}")`);
  if (segment !== segment.toLowerCase() && !/[A-Z]{2}/.test(segment))
    errors.push('segment is sentence case: lowercase unless an acronym or proper noun (e.g. "coffee chains", "EV charging")');
  if (!angle || angle.length > LIMITS.angle) errors.push(`angle is required, <= ${LIMITS.angle} chars (got ${angle.length})`);
  if (/\?$/.test(angle)) errors.push('angle is a statement, not a question');
  if (HYPE.test(angle) || HYPE.test(segment)) errors.push('no hype words in titles (voice_guide)');
  if (cc && segment.toLowerCase().includes(VOCAB.countries[cc].en.toLowerCase())) errors.push('segment must not repeat the country');
  if (errors.length) return { naming: null, errors };

  const country = VOCAB.countries[cc];
  const industry = VOCAB.industries[ind];
  const st = VOCAB.stages[stage];
  const canonical = `${country.en} ${segment} ${year}`;
  const title = `${canonical}: ${angle}`;
  if (canonical.length > LIMITS.canonical) errors.push(`"${canonical}" is longer than ${LIMITS.canonical} chars; shorten the segment`);
  if (title.length > LIMITS.title) errors.push(`title is ${title.length} chars (max ${LIMITS.title}); shorten the angle`);

  // Slug: country-segment-year, then add the stage word, then -2, -3 …
  const base = [slugify(country.en), slugify(segment)];
  const tries = [[...base, year], [...base, st.slug, year]];
  let slug = tries.map(t => t.join('-')).find(s => !taken.slugs.has(s));
  for (let n = 2; !slug; n++) { const s = `${tries[1].join('-')}-${n}`; if (!taken.slugs.has(s)) slug = s; }
  if (slug.length > LIMITS.slug) errors.push(`slug "${slug}" exceeds ${LIMITS.slug} chars; shorten the segment`);

  // Code: CC-IND-STG-TYY-NN, NN = next free sequence for that prefix.
  const prefix = `${cc}-${ind}-${stage}-${type}${String(year).slice(2)}`;
  let seq = 1;
  while (taken.codes.has(`${prefix}-${String(seq).padStart(2, '0')}`)) seq++;
  const code = `${prefix}-${String(seq).padStart(2, '0')}`;

  // Keywords first, then report kind, then brand: drop from the right to fit.
  const seo_title = [`${canonical} — ${st.en} | KIRA Research`, `${canonical} — ${st.en}`, `${canonical} | KIRA Research`, canonical]
    .find(t => t.length <= LIMITS.seo);

  const kw = new Map();
  [`${country.en} ${segment}`, segment, country.en, industry.en, st.en, ...(input.keywords || [])]
    .map(k => String(k).trim()).filter(Boolean).forEach(k => { if (!kw.has(k.toLowerCase())) kw.set(k.toLowerCase(), k); });

  const eyebrow = Object.fromEntries(['en', 'ja', 'ko'].map(l => [l,
    l === 'en' ? `${country.en} · ${industry.en} · ${st.en}`.toUpperCase()
               : `${country[l]} · ${industry[l]} · ${st[l]}`]));

  return {
    errors,
    naming: {
      code, slug, title, canonical, angle, seo_title,
      short_title: `${country.en} ${segment}`,
      report_kind: st.en,
      eyebrow,
      cover: { line1: country.en, line2_accent: cap(segment), line3_max_chars: LIMITS.line3 },
      country_code: cc, country: country.en, industry_code: ind, industry: industry.en,
      segment, stage, type, year,
      keywords: [...kw.values()],
    },
  };
}
