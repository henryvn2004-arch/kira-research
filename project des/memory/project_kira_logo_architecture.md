---
name: project-kira-logo-architecture
description: "Nav logo is text+CSS render (Satoshi 900 + ::after parallelogram accent), not an image. logo.png is reserved for og:image / JSON-LD / standalone /auth — never the nav."
metadata: 
  node_type: memory
  type: project
  originSessionId: 410f69cb-ce7f-4d63-9185-96f74b3a4f41
---

The kira-research brand wordmark in the nav header + footer is rendered as **HTML text styled by CSS**, not as an `<img>`. The `.logo-mark` span contains `KIR<span class="a-accent">A</span>` with `font-family: 'Satoshi', sans-serif; font-weight: 900; font-size: 22px`. The blue parallelogram accent next to "A" is drawn by `.logo-mark .a-accent::after` — a 9×5px `--primary`-filled rectangle skewed -15° absolutely-positioned at the bottom-right of the A glyph.

`logo.png` (2 MB raster at `public/logo.png`) exists for three specific consumers — NOT the nav:
- `og:image` + `twitter:image` meta tags on `_view.html` templates (social share previews)
- Organization JSON-LD `logo:` URL in `nav.js` (`origin + '/logo.png'` — schema.org crawler input)
- `<img src="/logo.png">` on the chromeless `/auth` page (no nav.js injected there — see [[feedback-clickthrough-not-cli]] for the auth.html chromeless gotcha already in CLAUDE.md gotcha #14)

**Why text+CSS not image for nav:** appears on every page → must be tiny + theme-aware + retina-sharp + selectable + SEO-friendly. Text inline ticks all boxes for 0 bytes network. PNG would need @2x/@3x variants for retina, can't be color-themed via CSS, costs an HTTP request, and obscures brand text from crawlers.

**How to apply:**
- If the user asks to "swap" or "update" the logo, clarify whether they mean (a) the nav glyph rendering (= CSS edit on `.logo-mark`, or webfont swap), (b) the `logo.png` raster file (= drop a new PNG at `public/logo.png` — affects only social shares + `/auth` + JSON-LD), or (c) both. Default assumption is (b) unless they say otherwise.
- Don't try to render the nav `.logo-mark` as an inline SVG — when this was attempted (commit `2a99d89`, 2026-05-21) it **broke post-deploy smoke tests** (specific failing assertion not investigated; revert was faster than debug). The `.nav-wrap .logo-mark` visibility check and/or canonical test interact poorly with SVG content in that span. See also [[dont-hand-trace-svg-glyphs]].
- If pixel-perfect match to a reference image is required, route the user through option 1 or 2 from [[dont-hand-trace-svg-glyphs]] — exported SVG from their design tool, or webfont swap.
