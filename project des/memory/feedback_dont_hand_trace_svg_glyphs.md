---
name: dont-hand-trace-svg-glyphs
description: "Don't trace brand letterforms in SVG by hand — the output is visibly worse than designer-tool output and the owner will reject it."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 410f69cb-ce7f-4d63-9185-96f74b3a4f41
---

When the owner asks to make a wordmark/logo look like a reference image, do NOT trace the letterforms into SVG `<path d="...">` coordinates by hand. The output looks crude — proportions off, stroke widths inconsistent, corners not matched. Henry rejected one such attempt with "xấu vãi" (really ugly) and asked to revert to the existing webfont rendering.

**Why:** Hand-written SVG paths can't match font glyphs designed in pro tools (Glyphs, FontLab, Illustrator). The eye picks up tiny inconsistencies in curves, joins, and optical spacing that a hand-coded path can't reproduce in a reasonable amount of effort. Letter design is its own craft.

**How to apply:** When the user wants pixel-perfect logo match in the nav or elsewhere, present these options *before* writing any SVG paths:
1. Ask the user to **export an SVG file from their design tool** (Figma/Illustrator/Photoshop have native SVG export). Drop that into the repo and reference it — pixel-perfect, zero authoring cost.
2. Propose a **webfont swap** to a font whose default glyphs already match the reference shape (e.g. `Saira 900` has the geometric wide letterforms + flat-top A common in tech brand marks; `Audiowide`, `Michroma`, `Orbitron` for more futuristic vibes — all free on Google Fonts).
3. Adjust existing webfont's CSS (letter-spacing, font-stretch, accent shapes) for incremental improvement — cheap, no new assets, but won't change the letterforms themselves.

Tracing by hand is option 0 — almost never worth attempting. The one time it was attempted on kira-research it was reverted within minutes (commits `2a99d89` → `8a04518`, 2026-05-21).

Bonus: that attempt also **broke smoke tests** on prod — see [[project-kira-logo-architecture]] for the visibility/render gotcha when swapping `.logo-mark` content from text to SVG.
