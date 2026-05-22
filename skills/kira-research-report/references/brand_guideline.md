# KIRA Research — Brand Guideline (skill reference)

Distilled from `references/claude_md.md` and `templates/master_styles.css`. Skill prompts read this to enforce brand consistency across UC1, UC2, and UC3 outputs.

---

## Positioning (what we are)

KIRA Research is a **research house** specializing in Southeast Asia — senior analysts with consulting backgrounds and two decades of regional experience, using modern tools (including AI, light touch) to deliver intelligence faster and cheaper than traditional firms.

**Authorial voice:** "Our analysts", "our research team", "we". Confident, understated, analytical. Palantir / Apple / McKinsey-consulting register.

---

## Anti-positioning (what we are NOT — never violate)

In all copy, code, comments, and metadata produced by this skill:

- ❌ Never frame KIRA as an "AI-powered platform / SaaS / app"
- ❌ Never claim volume ("1000+ studies", "thousands of reports")
- ❌ Never lead with "AI" in headlines or marketing copy (AI is only mentioned on the Methodology page of the live site, and in the AI-impact sections of reports)
- ❌ Never use competitor names in visible copy: **Mordor, Frost, Euromonitor, Synovate, Ipsos, IMARC**
- ❌ Never use **"Claude"** or **"McKinsey"** in any visible report copy, page footer, or generated metadata
- ❌ Never use "our platform" — we don't have a platform
- ❌ Never use source archive firm names (e.g. the older internal R0xxx archive identifiers stay invisible to the buyer)

---

## Voice rules (enforced by `prompts/voice_guide.md`)

- McKinsey-inspired structured analytical prose; numbers minimal, precision maximum
- **Inline bolding:** `<strong>x</strong>` for 1-2 genuinely important phrases per paragraph max — never decorative
- **De-cliented:** "Market participants", "Stakeholders should consider", "Operators face" — never "Client should"
- **No filler:** drop "It is worth noting", "In conclusion", "It goes without saying". Every sentence carries weight.
- **Headlines = sentence case**, not Title Case (e.g. "A market at inflection." NOT "A Market At Inflection")
- One key insight per paragraph; max 4 paragraphs per section narrative slot
- **"Strategic implications for market participants"** is the canonical phrasing for action sections — not "what you should do"
- Numbers always paired with source tag

---

## Source tagging (mandatory on every quantitative claim)

Inline tags in content. The renderer maps them to colored chips via `master_styles.css` (`.data-tag.primary` blue / `.secondary` green / `.estimate` amber).

| Tag | Meaning | When to use |
|---|---|---|
| `[primary]` | KIRA primary research | Original analyst synthesis, direct interviews, our own field data |
| `[secondary]` | External published source | Stats from government bodies, trade associations, listed-company filings, named reports — must be citeable |
| `[estimate]` | KIRA estimate with anchor | Triangulated estimate, methodology stated (e.g. "APAC market × Indonesia's construction GDP share") |
| `[user-input]` | User-provided data (UC3 only) | Any number/quote/claim that came from a file the user uploaded |

Every callout, chart, and quantitative claim in body text needs one of these tags. Two-tag composites (e.g. `[secondary][estimate]`) are allowed when an estimate is derived from a cited source.

---

## Design tokens (canonical, from `templates/master_styles.css`)

### Colors

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#FFFFFF` | Page background |
| `--bg-soft` | `#F8F9FB` | Chart panels, secondary surfaces |
| `--text` | `#0B0D10` | Primary text (also dark divider bg) |
| `--text-mid` | `#4A5568` | Body text |
| `--muted` | `#6B7280` | Metadata, source lines, footer |
| `--primary` | `#1E6FFF` | KIRA blue — accent, charts, callout rules |
| `--primary-soft` | `#EEF3FF` | Tag backgrounds, hover states |
| `--green` | `#00A88B` | `[secondary]` tag, positive deltas |
| `--amber` | `#D97706` | `[estimate]` tag, caution deltas |
| `--border` | `#E5E7EB` | Card borders, dividers |

### Typography

| Use | Family | Weight |
|---|---|---|
| Headlines, callout numbers | Satoshi | 900 |
| Body | Satoshi | 400 |
| Inline emphasis | Satoshi | 600 (`<strong>`) |
| Numbers, tags, code, footer meta | JetBrains Mono | 600 |

`font-variant-numeric: tabular-nums` is set on `.mono` so columns of numbers align.

### Page geometry (hard constraint)

- Every page is **1280 × 720 px** exactly. Renderer flags overflow per page and triggers regen.
- Padding 36/56/28/56 (top/right/bottom/left)
- Available body height after H1 + subhead = **454 px** — char budgets in `schemas/page_schemas.json` are calibrated to this

---

## Locale notes (Phase 1 = EN only)

Phase 1 ships English only. JA + KO support is a Phase 2 skill upgrade. Date format for Phase 1: "May 2026" (not "2026年5月" / "2026년 5월").

When the user invocation includes Japanese or Korean topic strings but no `--locale ja/ko` flag, treat the topic as a translation hint and still render EN.
