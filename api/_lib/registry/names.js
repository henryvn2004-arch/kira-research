// Kira Data (D5): company-name helpers shared by the registry adapters.

// Legal-form words that differ between registries for the same company ("Co., Ltd." vs "Company Limited").
const LEGAL = ['JOINT STOCK COMPANY', 'PUBLIC COMPANY LIMITED', 'COMPANY LIMITED', 'PRIVATE LIMITED', 'SDN BHD', 'BERHAD', 'BHD', 'SDN',
  'KABUSHIKI KAISHA', 'CORPORATION', 'CORP', 'COMPANY', 'CO', 'LIMITED', 'LTD', 'INCORPORATED', 'INC', 'PTE', 'PLC', 'PCL', 'JSC', 'TBK', 'PT', 'KK', 'LLC', 'GROUP'];

export function normName(s) {
  let t = ' ' + String(s || '').toUpperCase().replace(/&/g, ' AND ').replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  for (const w of LEGAL) t = t.split(` ${w} `).join(' ');
  return t.replace(/\s+/g, ' ').trim();
}

// Same company? Equal after normalising, or nearly the same words (Jaccard ≥ 0.85).
export function sameName(a, b) {
  const A = normName(a), B = normName(b);
  if (!A || !B) return false;
  if (A === B) return true;
  const x = new Set(A.split(' ')), y = new Set(B.split(' '));
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / (x.size + y.size - both) >= 0.85;
}

// The followed group whose token appears as whole words in the name (company_groups.tokens), or null.
export function matchGroup(name, groups) {
  const n = ' ' + String(name || '').toUpperCase().replace(/[^A-Z0-9&.\- ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const g of groups) {
    for (const t of g.tokens || []) if (n.includes(` ${t} `) || n.includes(` ${t}(`)) return g;
  }
  return null;
}
