// Small CSS helpers shared by sync-insight-chart-css.mjs and extract-insight-pages.mjs: find the plain class
// rules that style an SVG chart (fill / stroke / text properties only) in a stylesheet.
export const SVG_PROPS = new Set(['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'stroke-linecap',
  'stroke-linejoin', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant-numeric', 'letter-spacing', 'text-anchor',
  'dominant-baseline', 'opacity', 'paint-order', 'shape-rendering', 'text-transform']);

export const stripCssComments = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

// Top-level rules only; at-rules (@media, @font-face) are skipped by balanced-brace scan.
export function topLevelRules(css) {
  const rules = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0; j++; }
    if (!head.startsWith('@')) rules.push({ head, body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return rules;
}

// Rules whose selectors are all plain classes (.a or .a.b) and whose declarations are all SVG properties:
// [{ selectors: ['.a', '.b.c'], decls: [[prop, value], ...] }]
export function svgClassRules(css) {
  const out = [];
  for (const { head, body } of topLevelRules(stripCssComments(css))) {
    const selectors = head.split(',').map(s => s.trim());
    if (!selectors.every(s => /^\.[\w-]+(\.[\w-]+)*$/.test(s))) continue;
    const decls = body.split(';').map(d => d.trim()).filter(Boolean).map(d => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]);
    if (decls.length && decls.every(([p]) => SVG_PROPS.has(p))) out.push({ selectors, decls });
  }
  return out;
}
