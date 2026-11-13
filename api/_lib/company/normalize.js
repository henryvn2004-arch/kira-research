// ============================================================
// Company Intelligence — multilingual company name normalisation
//
// Used to populate entities.name_norm.
// VN: must match Postgres unaccent() output for DB-side trgm search.
// Other countries: generic NFD strip + legal token removal.
// ============================================================

// Vietnamese-specific character map (not covered by NFD decompose)
const VI_MAP = {
  'đ': 'd', 'Đ': 'd',
  'ư': 'u', 'Ư': 'u',
  'ơ': 'o', 'Ơ': 'o',
};

// Legal tokens per country (longest-match strip)
const LEGAL_TOKENS_BY_COUNTRY = {
  VN: [
    'cong ty', 'công ty',
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
    'limited liability', 'limited', 'liability',
    'jsc', 'llc', 'ltd', 'inc', 'corp',
    'viet nam', 'vietnam',
    'tm', 'sx', 'dv', 'xd', 'xnk',
  ],
  JP: [
    '株式会社', '有限会社', '合同会社', '合資会社', '合名会社',
    'kabushiki kaisha', 'yugen kaisha', 'godo kaisha',
    'co., ltd.', 'co.,ltd', 'ltd', 'inc', 'corp',
  ],
  KR: [
    '주식회사', '유한회사', '합명회사', '합자회사',
    'jusik hoesa', 'yuhan hoesa',
    'co., ltd.', 'ltd', 'inc', 'corp',
  ],
  AU: [
    'pty ltd', 'pty. ltd.', 'proprietary limited', 'proprietary',
    'limited', 'ltd', 'pty', 'inc', 'corp',
  ],
  SG: [
    'pte ltd', 'pte. ltd.', 'private limited',
    'limited', 'ltd', 'pte', 'inc', 'corp',
  ],
  MY: [
    'sdn bhd', 'sdn. bhd.', 'sendirian berhad',
    'berhad', 'bhd', 'limited', 'ltd', 'inc', 'corp',
  ],
  ID: [
    'pt', 'perseroan terbatas', 'tbk',
    'limited', 'ltd', 'inc', 'corp',
  ],
  TH: [
    'บริษัท', 'จำกัด', 'มหาชน',
    'co., ltd.', 'public company limited', 'limited', 'ltd', 'pcl', 'co',
  ],
  PH: [
    'corporation', 'incorporated', 'inc.', 'corp.',
    'limited', 'ltd', 'inc', 'corp',
  ],
  NZ: [
    'limited', 'ltd', 'incorporated', 'inc', 'corp',
  ],
};

// Fallback for any country not in the list above
const LEGAL_TOKENS_GENERIC = [
  'limited liability', 'limited', 'liability',
  'co., ltd.', 'co.,ltd', 'co ltd',
  'jsc', 'llc', 'ltd', 'inc', 'corp',
];

/**
 * Normalise a company name for fuzzy matching.
 * country defaults to 'VN' for backward compatibility.
 *
 * @param {string} name
 * @param {string} [country='VN'] ISO 3166-1 alpha-2
 * @returns {string}
 */
export function normaliseName(name, country = 'VN') {
  if (!name) return '';

  let s = name;

  if (country === 'VN') {
    for (const [ch, rep] of Object.entries(VI_MAP)) {
      s = s.replaceAll(ch, rep);
    }
  }

  // NFD decompose → strip combining diacritical marks (works for all Latin-derived scripts)
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Lower-case + remove punctuation except spaces
  s = s.toLowerCase().replace(/[^\w\s]/g, ' ');

  const tokens = LEGAL_TOKENS_BY_COUNTRY[country] ?? LEGAL_TOKENS_GENERIC;
  const sorted = [...tokens].sort((a, b) => b.length - a.length);
  for (const token of sorted) {
    const re = new RegExp(`\\b${escapeRe(token)}\\b`, 'g');
    s = s.replace(re, ' ');
  }

  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Generate a URL-safe slug from a company name + tax_id + country.
 * Used for company_reports.slug.
 * Format: <country-lower>-<name-slug>-<tax_id>
 * Example: vn-intimex-group-0100107659
 *
 * @param {string} name canonical_name
 * @param {string} taxId
 * @param {string} [country='VN']
 * @returns {string}
 */
export function makeSlug(name, taxId, country = 'VN') {
  const base = normaliseName(name, country)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 55);
  return `${country.toLowerCase()}-${base}-${taxId}`;
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
