---
name: kira-brain-report-pipeline
description: "Writing pipeline revamp DONE 2026-10-05 (PR #40/#41/#43/#44 merged): BRAIN route (question-led plan from private kira-pipeline), exhibit layer (16 types, no page cap, storytelling arc), gpt-image cover (5 rotating styles) + fixed closing page, new logo, tagline 'Know first. Move first.'. Code side finished; batch machine needs 2 setup steps before routines restart."
metadata:
  node_type: memory
  type: project
---

## Status (2026-10-05)

The writing pipeline (`skills/kira-research-report`) revamp is **finished on the code side**. All on `main`:

| PR | What |
|---|---|
| #40 | **BRAIN route.** Stage A plans each report as the answer to a buyer question (default buyer: a JP/KR company). The private brain (`kira-pipeline/brain`) picks the analyses. Prompt: `prompts/brain_route.md`. Pilot: 61 vs 49 /80 over the old pipeline. |
| #41 | **Exhibit layer.** `prompts/storytelling.md` sets the arc (Hook → Situation → Complication → Resolution → Proof of action). `exhibit_page` has 7 layouts. `docs/exhibit_library.md` + `templates/exhibits.html` define 16 exhibit types. There is no page cap; an overflowing page is split. Pilot v2 vs v1: 77 vs 56 /90. |
| #43 | **Cover and closing.** `scripts/gen-cover.mjs` draws the cover with gpt-image-1, rotating 5 styles by report id. Every report ends with the same closing page. Also: new logo and favicon. |
| #44 | Brand tagline **"Know first. Move first."** is fixed on the cover and closing pages. |

Batch time caps: EN 90 min, JA/KO 75 min, stale claim after 150 min.

## Before routines restart (batch machine, owner-side)

1. **Brain:** clone private repo `kira-pipeline` next to `kira-research`, or set env `KIRA_BRAIN_DIR`. Without it, Stage A silently falls back to the old UC1/UC2 planning.
2. **Cover art:** set env `OPENAI_API_KEY`. Without it the cover renders plain, without an illustration. This is not an error.

Both steps are also listed in [[kira-machine-switch-checklist]].

## Open follow-ups (not blocking)

- Older published reports have clipped competitor cards and source keys, plus the old tagline. They are worth a re-render pass.
- Studio (`studio.kiraresearch.com`) has its own cover renderer and has not been moved to the new cover.
- Confirm `hello@kiraresearch.com` and LinkedIn name "KIRA Research" on the closing page.
- Operations (routines, cadence, queue) are being redesigned in the separate "Kira Research business model" session. The pipeline itself is ready for whatever cadence that session chooses.

## Hard rule

Brain artifacts (framing, pack, trace) live in an OS temp folder and are **never** committed to this public repo. The batch runner greps `en.html` for leaks.
