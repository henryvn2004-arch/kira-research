// Inline local images as data URIs so a report HTML is self-contained
// before it goes to /api/render-pdf or the preview bucket.
//
// Working HTML keeps short relative refs (cheap to translate page by page):
//   src="cover.jpg"        → file next to the HTML (per-report cover art)
//   src="brand/logo.png"    → skills/kira-research-report/templates/brand/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };

export function inlineAssets(html, htmlPath) {
  const dir = path.dirname(path.resolve(htmlPath));
  return html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)(")/g, (m, pre, src, post) => {
    if (/^(data:|https?:|\/\/)/.test(src)) return m;
    const file = [path.join(dir, src), path.join(TEMPLATES, src)].find(p => fs.existsSync(p));
    const mime = MIME[path.extname(src).slice(1).toLowerCase()];
    if (!file || !mime) return m;
    return pre + `data:${mime};base64,` + fs.readFileSync(file).toString('base64') + post;
  });
}
