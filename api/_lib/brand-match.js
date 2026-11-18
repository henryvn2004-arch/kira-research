// ============================================================
// KIRA RESEARCH — api/_lib/brand-match.js
//
// Turns a brand name and its aliases into the regex lists that the SQL function
// content_brand_mentions (migration 069) runs against the full text of reports and
// transcripts. Pure functions, no I/O (tests: tests/brand-match.test.mjs).
//
// Two lists, because a match is worth more or less depending on the name:
//   solid  case-insensitive, one mention is enough.
//          Latin names: whole word only ("Toto" does not match "total", "Apple" not "pineapple").
//          CJK names of 3+ characters: substring.
//   weak   case-sensitive, at least WEAK_MIN mentions (STRICT_MIN when strict=1; the caller applies it).
//          Names that are also everyday words ("Base", "Apple": caller passes strict=1),
//          Latin names of 3 letters or fewer ("LG"), CJK names of 2 characters (豐田).
//   1 CJK character and names under 2 characters are ignored.
//
// The patterns use the Postgres ARE dialect (lookbehind/lookahead are supported since 9.6).
// ============================================================

export const WEAK_MIN = 2;
// Names that are everyday words (strict=1): exact-case mentions needed. 2 is far too low ("Base case" is in 91 of 208 reports);
// 5 keeps real names (Visa 6 reports) and drops most of the noise. Measured in results of PR description.
export const STRICT_MIN = 5;

const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯ｦ-ﾟ]/u;
// Characters that make a Latin match part of a longer word: ASCII letters/digits and the Latin supplements.
const WORD = 'A-Za-z0-9\\u00C0-\\u024F';
const SPECIAL = /[\\^$.|?*+()[\]{}]/g;

const esc = (s) => s.replace(SPECIAL, '\\$&');

export function normalizeName(s) {
  return String(s || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/** Latin-script pattern: whole word, spaces/hyphens in the name tolerate any run of whitespace or a hyphen. */
function latinPattern(name) {
  const body = name.split(/[\s-]+/).map(esc).join('[\\s-]+');
  return `(?<![${WORD}])${body}(?![${WORD}])`;
}

/**
 * @param {string[]} names brand name first, then aliases
 * @param {{strict?: boolean}} opts strict: the brand name is also an everyday word, so only exact-case mentions count
 * @returns {{solid: string[], weak: string[], ignored: string[]}}
 */
export function buildPatterns(names, opts = {}) {
  const solid = new Set();
  const weak = new Set();
  const ignored = [];
  const seen = new Set();
  for (const raw of names || []) {
    const name = normalizeName(raw);
    const key = name.toLowerCase();
    if (!name || name.length > 60 || seen.has(key)) continue;
    seen.add(key);
    const chars = [...name];
    if (CJK.test(name)) {
      const cjkLen = chars.filter((c) => CJK.test(c)).length;
      if (cjkLen < 2) ignored.push(name);
      else if (cjkLen === 2 && chars.length === 2) weak.add(esc(name));
      else solid.add(esc(name).replace(/ /g, '\\s*'));
      continue;
    }
    if (chars.length < 2) { ignored.push(name); continue; }
    const letters = name.replace(/[^A-Za-z0-9À-ɏ]/g, '');
    if (opts.strict || letters.length <= 3) weak.add(latinPattern(name));
    else solid.add(latinPattern(name));
  }
  return { solid: [...solid], weak: [...weak], ignored };
}

/** The patterns are valid in JS too (same ARE subset), for tests and offline measurements; the endpoint never runs them in JS. */
export const toJsRegex = (pattern, flags) => new RegExp(pattern, `${flags}gu`);

/** Counts for one text: {solid, weak}. */
export function countMentions(text, p) {
  const n = (list, flags) => list.reduce((a, s) => a + ((text.match(toJsRegex(s, flags)) || []).length), 0);
  return { solid: n(p.solid, 'i'), weak: n(p.weak, '') };
}

export const isMention = ({ solid, weak }, strict = false) => solid >= 1 || weak >= (strict ? STRICT_MIN : WEAK_MIN);
