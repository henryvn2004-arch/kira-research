// ============================================================
// KIRA RESEARCH — middleware.js
// Edge middleware for host-based routing.
//
// Why this exists: vercel.json `rewrites` are skipped when the URL
// matches a static file (per Vercel docs: "rewrites never execute
// when a file matches"). That's a problem for studio.kiraresearch.com
// — the path `/` matches `public/index.html` (the locale-redirect
// landing for the main domain) so the host-filtered rewrite in
// vercel.json never fires for the subdomain root.
//
// Edge middleware runs BEFORE the filesystem check, so we can do the
// host-based rewrite here reliably. Trade-off is one Edge invocation
// per matched request to the project; Vercel Pro includes 1M/month
// which is plenty for Year 1.
//
// Logic: if Host = studio.kiraresearch.com and the path doesn't
// already start with /studio (or fall under a shared-asset prefix) →
// rewrite the URL pathname to `/studio<original-path>`. Everything
// else is passed through untouched so the main domain behavior is
// unchanged.
//
// Matcher excludes paths that should NEVER trigger middleware —
// API routes, Vercel internals, shared CSS/JS/locale assets, the
// auth flow, favicon/logo/robots. These all need to serve from the
// project root regardless of host, and bypassing middleware saves
// the Edge invocation.
// ============================================================

import { rewrite, next } from '@vercel/edge';

export const config = {
  // Vercel middleware matchers go through path-to-regexp and CLI 54.x
  // rejects any inline capturing group (e.g. `auth(\.html|\.js)`).
  // Keep exclusions as plain prefixes — they catch `/auth`, `/auth.html`,
  // `/auth.js`, etc. all in one. Defense-in-depth filtering for file
  // extensions lives in the handler below.
  matcher: ['/((?!api/|_vercel/|_next/|css/|js/|locales/|favicon|logo|robots|sitemap|auth|404).*)']
};

const STUDIO_HOST = 'studio.kiraresearch.com';

export default function middleware(request) {
  const url = new URL(request.url);

  // Host header may include port in local dev — strip it.
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  if (host !== STUDIO_HOST) {
    return next(); // main domain — pass through untouched
  }

  // Already routed under /studio (e.g. a deep link that's hand-crafted) —
  // leave it alone so we don't double-prefix to /studio/studio/...
  if (url.pathname.startsWith('/studio')) {
    return next();
  }

  // Defense-in-depth — even if the matcher fails to exclude something,
  // skip anything that looks like a file with an extension.
  if (/\.[a-zA-Z0-9]{2,5}$/.test(url.pathname)) {
    return next();
  }

  // Rewrite — URL pathname becomes /studio<original>. Vercel's cleanUrls
  // resolves /studio → /studio/index.html, /studio/library → /studio/library.html, etc.
  const target = new URL(url.toString());
  target.pathname = url.pathname === '/' ? '/studio' : `/studio${url.pathname}`;
  return rewrite(target);
}
