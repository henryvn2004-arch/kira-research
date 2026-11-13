---
name: kira-n-studio
description: "Phase N — KIRA Studio at studio.kiraresearch.com. Self-serve report gen via Anthropic API. Login-gated. Same repo/Vercel/Supabase as kiraresearch.com. Personal user library, no public exposure."
metadata: 
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## Why this exists

UC2 (Design Mode, novel topics) + UC3 (Data-Grounded, uploaded files) consolidate into ONE end-user product. Same flow, optional file attach. Henry's framing: "thực chất là 1 UC thôi, là generate report bằng AI, chỉ khác là 1 cái ko upload, 1 cái có upload".

Lives at `studio.kiraresearch.com` subdomain (already provisioned). KIRA brand kept (in-house testing phase). Future: launch as credit-based product (token gen costs real money via Anthropic API).

## Architecture

Same Vercel project + same Supabase. Host-based rewrite in `vercel.json`:

```json
{ "source": "/:path*",
  "has": [{ "type": "host", "value": "studio.kiraresearch.com" }],
  "destination": "/studio/:path*" }
```

Order critical: `/api/:path*` passthrough comes FIRST so `/api/*` calls from the subdomain don't get prefixed with `/studio/`.

Long gen → Vercel Pro `maxDuration: 800` on `api/studio-jobs.js`. POST submits + responds 202 immediately, then `@vercel/functions` `waitUntil()` keeps the function alive for the worker to finish.

```
Browser POST /api/studio-jobs
   ↓ 202 + job_id
   ↓ (waitUntil bg work runs ~10-14 min)
   Browser polls /api/studio-jobs?id=<uuid> every 2.5s
   ↓ progress 0→100, current_stage + stages_completed update live
   ↓ status='completed' + studio_report_id set
   Browser redirects to /reports?id=<studio_report_id>
   ↓ iframe loads HTML signed URL
   ↓ "Download PDF" → PDF signed URL
```

## Files added

**DB** (`supabase/migrations/010_studio.sql`):
- `studio_jobs` table — lifecycle (pending → running → completed/failed/cancelled), progress 0-100, stages_completed array, error fields, token counts, est_cost_usd
- `studio_reports` table — title/eyebrow/preview/country/industry/year/toc/full_content + html_path/pdf_path/pages + is_archived
- 2 private buckets: `studio-inputs` (25MB cap, docx/pdf/xlsx/csv/txt) + `studio-reports` (50MB cap, html/pdf)
- RLS: user_id = auth.uid() (SELECT only; writes service-key)

**API**:
- `api/studio-jobs.js` — POST create + GET list/poll. waitUntil for bg worker.
- `api/studio-upload.js` — raw bytes upload to studio-inputs. Body parser disabled.
- `api/studio-report.js` — GET signed HTML+PDF URLs, DELETE soft-archive.
- `api/_lib/studio-shared.js` — bearer auth + Supabase REST + storage sign + upload helpers.
- `api/_lib/studio-worker.js` — Anthropic SDK orchestrator. Stage 1 parse, 3 plan, 4 web_search tool, 5 parallel per-section, 7 assemble + /api/render-pdf + bucket upload.

**Frontend** (`public/studio/`):
- `index.html` — landing + topic form + file upload UI (drag-drop, multi-file, 25MB cap)
- `jobs.html` — progress page (stage timeline + progress bar + error block + CTA)
- `reports.html` — viewer (iframe + Download PDF + Archive)
- `library.html` — My studio reports (grid) + In-progress jobs section

**Config**:
- `vercel.json` — host rewrite, per-route `maxDuration: 800`, `includeFiles: "skills/kira-research-report/templates/**"` for master CSS bundling. `/studio` redirects removed (resurrected from Sprint 5.2 kill).
- `package.json` — added `@anthropic-ai/sdk` ^0.40.0 + `@vercel/functions` ^2.0.0.

**Nav**:
- `nav.js` + `auth.js` — new `kira-studio` class link, toggled visible when logged-in (same pattern as `kira-my-library`). 3 locales i18n key `nav.studio`.
- Profile pages (`/[locale]/profile.html` × 3) — Studio CTA card injected post-render via separate script block (avoids touching the main render flow).

## Stage details (Anthropic SDK)

| Stage | Method | Tokens | Time est. |
|---|---|---|---|
| 1 Parse | 1 messages.create, system = topic parser | ~600 in / ~400 out | ~3s |
| 3 Plan | 1 messages.create, system = section planner, returns JSON | ~800 / ~1200 | ~6s |
| 4 Search | 1 messages.create with `web_search_20250305` tool, max_uses=18 | ~10K / ~5K | 90-180s |
| 5 Content | N=10 parallel messages.create (cap concurrency=3), per-section HTML | ~2K each / ~1.5K each | 60-180s |
| 7 Render | POST to existing `/api/render-pdf` + upload to bucket + DB insert | n/a | 30-60s |

Stage 6 (charts) is deferred — sections render text-only for MVP. Stage 2 (UC2/UC3 routing) is inlined in Stage 3's prompt (file-aware branching).

## Hard rules enforced

- System prompts list banned words: Claude / McKinsey / Mordor / Frost / Euromonitor / Synovate / Ipsos / IMARC.
- Belt-and-braces `scrub()` regex on every text chunk before assembly.
- KIRA voice: "our analysts" / "our research team" / "we" — never "our platform" or "AI-powered".
- Sentence-case headlines, no filler, de-cliented voice.
- Inline source tags `[<Alias> <year>]` or `[Kira estimates]` per L.3.
- Aliases stay English even when original source is local-language (M.1 carryover).
- LLM-infer local language from country (M.4) — system prompt instructs to pick business-press language not official language.

## What's NOT in MVP

- **Full file content extraction** — `studio-inputs` files are uploaded + path is referenced in prompt by FILENAME only. Real docx/pdf/xlsx parsing is Phase N+1.
- **Charts** — Stage 6 skipped, sections text-only. Future: include SVG chart gen per section.
- **Credit billing** — token counts + est cost ARE tracked per job, but no enforcement / decrement / paywall. Future when launching to paying users.
- **JA/KO Studio UI** — landing pages are EN-only. Underlying gen can target any country (M.4 language inference handles that), but UI chrome stays English for in-house testing.
- **Real-time push (Supabase realtime channels)** — currently uses 2.5s polling. Realtime channel sub on `studio_jobs` row would be cheaper but adds complexity.

## Cost model (Year 2 launch)

Per-report token estimate: ~50K in / ~25K out = ~$0.50 (Sonnet 4.5 pricing). Web search tool: $10/1K searches × 18 = $0.18. Total ~$0.70 cost per report (rough).

Plan: charge 5 credits per report, 100 credits / $20 → ~$0.20 revenue per credit × 5 = $1.00 revenue per report → ~30% margin after API costs. Adjust during launch based on actual usage.

## Owner click-through items (after merge)

1. Run `supabase/migrations/010_studio.sql` in Supabase SQL editor
2. Add `studio.kiraresearch.com` domain in Vercel → Project → Settings → Domains (CNAME to `cname.vercel-dns.com`)
3. Set `ANTHROPIC_API_KEY` env var in Vercel (all 3 envs) → redeploy
4. End-to-end test: visit subdomain → sign in → submit "Coffee market Vietnam 2027" → wait 8-14 min → view report

## See also

[[project_tool_gen_report]] · [[project_m1_dual_language_search]] · [[project_m4_llm_inferred_language]] · [[project_l3_source_tag_system]] · [[reference_kira_research]]
