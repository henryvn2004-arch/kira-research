// Build script: reads the 3 KIRA report template files and writes a
// JS module that exports them as raw string constants. The output is
// used by api/_lib/studio-templates.js as a last-resort fallback when
// the file-system loader can't find the templates (e.g. Vercel
// bundler dropped them silently).
//
// Run manually after editing any of the 3 files:
//   node scripts/build-studio-embedded.mjs

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');
const TPL_DIR = path.join(ROOT, 'skills', 'kira-research-report', 'templates');
const OUT_FILE = path.join(ROOT, 'api', '_lib', 'studio-templates-embedded.js');

async function readTplFile(name) {
  return readFile(path.join(TPL_DIR, name), 'utf8');
}

// JS string-literal-safe: escape \ ` and ${ since we use backtick strings.
function jsBacktickEscape(s) {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const css      = await readTplFile('master_styles.css');
const wrapper  = await readTplFile('master_wrapper.html');
const pageComp = await readTplFile('page_components.html');

const banner = `// ============================================================
// AUTO-GENERATED — DO NOT EDIT BY HAND.
// Source: scripts/build-studio-embedded.mjs
// Generated: ${new Date().toISOString()}
//
// These are the verbatim contents of the 3 template files under
// skills/kira-research-report/templates/. Embedded as JS string
// constants so studio-templates.js can fall back to them when the
// Vercel function bundle doesn't ship the actual files (the most
// common production failure mode for Studio).
//
// To regenerate: edit the source files, then run:
//   node scripts/build-studio-embedded.mjs
// ============================================================
`;

const out = `${banner}
export const EMBEDDED_MASTER_STYLES_CSS = \`${jsBacktickEscape(css)}\`;

export const EMBEDDED_MASTER_WRAPPER_HTML = \`${jsBacktickEscape(wrapper)}\`;

export const EMBEDDED_PAGE_COMPONENTS_HTML = \`${jsBacktickEscape(pageComp)}\`;

export const EMBEDDED_FILES = {
  'master_styles.css':    EMBEDDED_MASTER_STYLES_CSS,
  'master_wrapper.html':  EMBEDDED_MASTER_WRAPPER_HTML,
  'page_components.html': EMBEDDED_PAGE_COMPONENTS_HTML
};
`;

await writeFile(OUT_FILE, out, 'utf8');
console.log(`Wrote ${OUT_FILE}`);
console.log(`  master_styles.css:    ${css.length} chars`);
console.log(`  master_wrapper.html:  ${wrapper.length} chars`);
console.log(`  page_components.html: ${pageComp.length} chars`);
console.log(`  total source bytes:   ${out.length}`);
