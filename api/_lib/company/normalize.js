// ============================================================
// Company Intelligence — Vietnamese company name normalisation
//
// Used to populate entities.name_norm.
// Must produce the same output as Postgres unaccent() so that
// JS-side queries and DB-side searches stay in sync.
// ============================================================

// Vietnamese-specific character map (not covered by NFD decompose)
const VI_MAP = {
  'đ': 'd', 'Đ': 'd',  // đ Đ
  'ư': 'u', 'Ư': 'u',  // ư Ư
  'ơ': 'o', 'Ơ': 'o',  // ơ Ơ
};

// Legal entity tokens to strip from VN company names
const LEGAL_TOKENS = [
  'cong ty',   'công ty',
  'tnhh mtv', 'tnhh',
  'ctcp', 'co phan', 'cổ phần',
  'mot thanh vien', 'một thành viên',
  'tap doan', 'tập đoàn',
  'thuong mai', 'thương mại',
  'san xuat', 'sản xuất',
  'dich vu', 'dịch vụ',
  'joint stock company', 'joint stock',
  'co., ltd.', 'co.,ltd', 'co., ltd', 'co,ltd', 'co ltd',
  'co.ltd', 'co. ltd',
  'limited liability', 'limited',
  'liability',
  'jsc', 'llc', 'ltd', 'inc', 'corp',
  'viet nam', 'vietnam',
  // common abbreviations
  'tm', 'sx', 'dv', 'xd', 'xnk',
];

/**
 * Normalise a Vietnamese company name for fuzzy matching.
 * Steps: map special chars → NFD strip diacritics → lower → strip legal tokens → collapse whitespace.
 *
 * @param {string} name
 * @returns {string}
 */
export function normaliseName(name) {
  if (!name) return '';

  let s = name;

  // Replace Vietnamese characters not covered by NFD
  for (const [ch, rep] of Object.entries(VI_MAP)) {
    s = s.replaceAll(ch, rep);
  }

  // NFD decompose → strip combining diacritical marks
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Lower-case + remove punctuation except spaces
  s = s.toLowerCase().replace(/[^\w\s]/g, ' ');

  // Strip legal entity tokens (longest match first to avoid partial strips)
  const sorted = [...LEGAL_TOKENS].sort((a, b) => b.length - a.length);
  for (const token of sorted) {
    // Match as whole word(s)
    const re = new RegExp(`\\b${escapeRe(token)}\\b`, 'g');
    s = s.replace(re, ' ');
  }

  // Collapse whitespace
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Generate a URL-safe slug from a company name + MST.
 * Used for company_reports.slug.
 *
 * @param {string} name canonical_name
 * @param {string} mst
 * @returns {string}
 */
export function makeSlug(name, mst) {
  const base = normaliseName(name)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
  return `${base}-${mst}`;
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
