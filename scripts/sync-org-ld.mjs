// Writes the Organization JSON-LD (api/_lib/org-ld.js) into the static pages between
// <!--ORG-LD--> and <!--/ORG-LD-->, just before </head>. A page that already carries the old
// bare Organization script (the home pages) gets it replaced.
//   node scripts/sync-org-ld.mjs          write
//   node scripts/sync-org-ld.mjs --check  exit 1 when a page is out of date (used by the unit test)
import { readFileSync, writeFileSync } from 'node:fs';
import { orgLdTag } from '../api/_lib/org-ld.js';

export const PAGES = ['index', 'about', 'methodology'];
export const LOCS = ['en', 'ja', 'ko', 'zh'];
const OLD = /[ \t]*<script type="application\/ld\+json">\{"@context": "https:\/\/schema\.org", "@type": "Organization"[^\n]*<\/script>\n/;
const BLOCK = /[ \t]*<!--ORG-LD-->[\s\S]*?<!--\/ORG-LD-->\n/;

export function withOrgLd(html, loc) {
  const block = `  <!--ORG-LD-->${orgLdTag(loc)}<!--/ORG-LD-->\n`;
  if (BLOCK.test(html)) return html.replace(BLOCK, () => block);
  if (OLD.test(html)) return html.replace(OLD, () => block);
  return html.replace(/<\/head>/, () => `${block}</head>`);
}

export function files() { return LOCS.flatMap((l) => PAGES.map((p) => ({ loc: l, file: new URL(`../public/${l}/${p}.html`, import.meta.url) }))); }

if (process.argv[1] && process.argv[1].endsWith('sync-org-ld.mjs')) {
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const { loc, file } of files()) {
    const cur = readFileSync(file, 'utf8');
    const next = withOrgLd(cur, loc);
    if (cur !== next) { stale++; if (!check) writeFileSync(file, next); console.log((check ? 'stale ' : 'updated ') + file.pathname); }
  }
  if (check && stale) process.exit(1);
}
