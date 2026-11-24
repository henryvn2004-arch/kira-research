// ============================================================
// KIRA RESEARCH — api/_lib/naver.js
// Naver Search Advisor ownership tag. Naver reads the RAW HTML of the home page, so the tag is added on the server
// (api/home.js) from env NAVER_SITE_VERIFICATION. The code is never committed. No env or a malformed value: no tag.
// ============================================================
export const naverToken = (env = process.env) => {
  const v = String(env.NAVER_SITE_VERIFICATION || '').trim();
  return /^[A-Za-z0-9_-]{8,128}$/.test(v) ? v : '';
};

export function injectNaver(html, token) {
  if (!token || !html || html.includes('naver-site-verification')) return html;
  const tag = `  <meta name="naver-site-verification" content="${token}" />\n`;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${tag}</head>`) : html;
}
