---
name: kira-aa-contrast-tokens
description: KIRA blue and muted-dim tokens were one notch too light for WCAG AA on white. Current values pass; do not revert to the older hex values without re-checking contrast.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 792ec067-480b-4789-a6f3-98cffbc75d7f
---

`public/css/kira.css` design tokens have specific hex values chosen to pass WCAG AA (4.5:1 normal text on white):

| Token | Current | Past (failed) | Contrast on white |
|---|---|---|---|
| `--primary` | `#1A66F0` | `#1E6FFF` | 5.00 vs 4.40 |
| `--muted-dim` | `#64748B` | `#94A3B8` | 4.83 vs 2.85 |

**Why:** The original KIRA blue `#1E6FFF` (used in `.logo-sub`, `.hero-eyebrow`, `.report-meta .country`, `.filter-option.active`, `.nav-cta` bg + many other text-on-white usages) sat at 4.40:1 — fails AA normal by 0.10. The `#94A3B8` muted-dim (used by `.locale-switcher a` and similar tertiary text) was 2.85:1 — fails even AA Large (3.0). Lighthouse CI dropped /en/library accessibility to 0.86 before the fix. The two-line token shift (commit `b78f007`) lifted contrast across every selector that referenced them without restyling individual rules.

Visual delta: `#1E6FFF` → `#1A66F0` is -4 R, -9 G, -15 B — about 1-2% perceptual darkening, indistinguishable in side-by-side. Brand identity untouched.

**How to apply:** When introducing new components or color rules, check the token (not invent a fresh hex). If a designer-y request needs more vivid primary, use `--primary` as accent (border, icon stroke, background under white text — those pass) but never as text-on-white below 18px / non-bold. If you must add a new accent color, run it through https://webaim.org/resources/contrastchecker/ against `#FFFFFF` before committing.

The third common offender in the past was small uppercased text (`.hero-eyebrow` 11px, `.report-meta .country` 10px, `.logo-sub` 11px) using `--primary` — these all benefit from the token fix automatically.

## Related
- [[feedback_lighthouse_lhr_json_extract]] — diagnostic that surfaced these
- [[project_kira_logo_architecture]] — `.logo-sub` is one of the affected text rules
