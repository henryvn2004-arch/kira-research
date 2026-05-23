# render_and_output.md — Stage 7 (assembly + PDF render + output routing)

Assemble the per-section content + charts into one self-contained HTML document, render to PDF via the Vercel function, handle overflow retries, then route output based on mode (publish or draft).

## Input

- The full list of section `content_spec` objects from Stage 5
- The corresponding `svg_html` blobs from Stage 6
- Report metadata: `report_id`, `report_title`, `country`, `industry`, `year`, `locale`, `output_mode`, `blueprint_id`
- The orchestrator's routing decision (UC1 / UC2 / UC3)

## Step 1 — Read templates

Load into context:
- `templates/master_styles.css` — full CSS, inlined as-is into the wrapper
- `templates/master_wrapper.html` — HTML doc shell with two placeholders: `{{MASTER_STYLES_CSS}}` and `{{PAGES_HTML}}`
- `templates/page_components.html` — 10 starter page templates (use as base; substitute the placeholders specific to each section)

## Step 2 — Compose each page

For each section in the report plan:

1. Pick the matching page-type block from `page_components.html` (e.g. `<div class="page">…exec_summary_p1…</div>`)
2. Substitute placeholders:
   - `{{section_num}}` — from `section_structure.json` (e.g. "Section 04")
   - `{{section_label}}` — human label (e.g. "Executive Summary")
   - `{{page_num}}` / `{{total_pages}}` — assigned at assembly time after all pages computed
   - `{{h1}}`, `{{subhead}}` — from content_spec
   - Per-slot placeholders (`{{callout_1_num}}`, `{{narrative_left_section_1_body}}`, etc.) — from content_spec
   - `{{chart_svg}}` — full chart svg_html blob from Stage 6
3. For sections whose page_type doesn't appear in `page_components.html` (UC2 novel layouts), compose the layout using only CSS utility classes from `master_styles.css`. Don't introduce new classes.

### Source-tag rendering (UPDATED Phase L.3)

The old `[primary]` / `[secondary]` / `[estimate]` tag system is **deprecated**. Current reports use:
- `[Kira estimates]` — for any KIRA-derived figure
- `[<Source Alias> <Year>]` — for named externals (e.g. `[BPS 2024]`, `[Vinacafe AR 2025]`)
- `[user-input]` — UC3 only

Render rules:
- Leave bracket markers in place inside body prose — they read as part of the sentence ("USD 2.0 bn market in 2025 [BPS 2024]"). No DOM transformation.
- Do NOT wrap them in `<span class="data-tag">` chips for body prose — that visual treatment is reserved for callout cards' source line and the methodology endnote source mix.
- For each section's `content_spec.source_key`, emit it as `<div class="source-key">…</div>` placed just above the `.page-footer` block. The `SOURCE KEY ·` prefix comes from CSS `::before`, so the `source_key` value itself starts at the first alias (e.g. `BPS 2024 = Badan Pusat Statistik Construction Materials Census 2024 · Vinacafe AR 2025 = …`).
- If a page's `content_spec.source_key` is null or empty (e.g. pages that only use `[Kira estimates]`), still emit an empty `<div class="source-key"></div>` so layout grid heights stay consistent — the empty-state CSS hides the border line. Alternatively emit just `Kira estimates = KIRA in-house analyst triangulation` so the line still informs the reader.
- For HTML stubs without a `{{SOURCE_KEY_HTML}}` placeholder yet (older stubs), INJECT the `<div class="source-key">` element before `<div class="page-footer">` at render time. The placeholder will be retrofitted into stubs progressively; the renderer should handle both forms.

The `[user-input]` tag in UC3 may optionally be rendered as a small chip when it's important to highlight provenance (e.g. "buyer file" callout) — but this is design judgment per page, not default.

### Section numbering + page numbering

After all pages exist, walk them in order and assign:
- `{{page_num}}` = monotonic 001, 002, … 0NN (3-digit, zero-padded)
- `{{total_pages}}` = the final count (NN)
- `{{section_num}}` carries through all pages of a section ("Section 04" repeated across exec_summary p1 + p2)
- Dividers ("page divider-page") inherit the section_num of the chapter they introduce

## Step 3 — Assemble final HTML

```
<read master_wrapper.html>
Replace {{MASTER_STYLES_CSS}} with the full contents of master_styles.css
Replace {{PAGES_HTML}} with the concatenated page <div>s in order
→ final_html (string)
```

Estimated size: 150-220 KB for an 18-22 page report with embedded SVGs.

If `final_html.length > 5_000_000` chars: the Vercel function rejects (5MB cap). Compress: drop any whitespace in chart SVGs, deduplicate inline styles. If still too large, flag for orchestrator with `assembly_too_large: true`.

## Step 4 — POST to Vercel /api/render-pdf

```
POST https://kiraresearch.com/api/render-pdf
Headers:
  Content-Type: application/json
  X-Api-Key: ${PDF_RENDER_SECRET}     ← read from env at runtime, never hardcode
Body:
  { "html": <final_html>, "filename": "<report_id>.pdf" }
```

The secret lives in the Vercel project env vars. The skill runtime needs `PDF_RENDER_SECRET` available — fail closed with a clear error message if it's not set.

### Response shape

```json
{
  "success": true,
  "filename": "KR-IDN-CONS-2026-001.pdf",
  "pdf_base64": "JVBERi0xLjQK...",
  "pdf_size_bytes": 184502,
  "page_count": 19,
  "overflow_detected": false,
  "overflow_pages": [],
  "rendered_at": "2026-05-22T15:32:50.999Z",
  "render_version": "render-pdf-v6"
}
```

Or on failure:
```json
{ "success": false, "error": "…", "render_version": "…" }
```

### Handling overflow_detected

If `overflow_detected: true`, `overflow_pages` lists the offending page indexes with `actual_height_px` and `overflow_px`. Walk through them:

1. Map each overflow_page back to its source section (via the page-number-to-section index you built in Step 2)
2. For each offending section: regenerate with `char_budget × 0.85` (i.e. -15% of all schema char caps)
3. Recompose, re-render
4. Max 3 overflow-retry cycles. After the 3rd, publish the result as-is with a `quality_flag: "overflow_unresolved"` annotation in metadata.

### Handling render failure

If `success: false`:
- Log the error message + render_version for traceback
- Try ONCE more (transient errors do happen — chromium-min cold-start can occasionally hiccup)
- If second attempt also fails, halt and surface the error to the user. Do not silently fallback to HTML-only delivery (the user paid for / asked for a PDF).

## Step 5 — Decode + persist

Decode `pdf_base64` (base64 → bytes → file). The decoded size must match `pdf_size_bytes` — if not, the response was corrupted in transit, retry.

## Step 6 — Output routing

### Draft mode (UC2 + UC3 default, or any mode + `--draft`)

```
Save HTML to:   outputs/<report_id>/<locale>.html
Save PDF to:    outputs/<report_id>/<locale>.pdf
```

Return:
```json
{
  "mode": "draft",
  "report_id": "...",
  "files": {
    "html_path": "outputs/.../en.html",
    "pdf_path":  "outputs/.../en.pdf"
  },
  "page_count": 19,
  "pdf_size_bytes": 184502,
  "quality_flags": []
}
```

### Publish mode (UC1 default, or any mode + `--publish`)

Requires Supabase MCP available. Steps:

1. **Upload HTML to Storage:**
   ```
   bucket: reports-pdfs
   path:   <report_id>/en.html
   content-type: text/html
   upsert: true
   ```

2. **Upload PDF to Storage:**
   ```
   bucket: reports-pdfs
   path:   <report_id>/en.pdf
   content-type: application/pdf
   upsert: true
   ```

3. **Insert `living_reports` row** (if not already present):
   ```sql
   INSERT INTO living_reports
     (id, slug, country, industry, year, price, status, created_at)
   VALUES
     (<report_id>, <slug>, <country>, <industry>, <year>, 39.00, 'draft', now())
   ON CONFLICT (id) DO NOTHING;
   ```

   Slug format: kebab-case `<country>-<industry-key>-<year>` (e.g. `indonesia-construction-materials-2026`). Strip diacritics, lowercase, single hyphens.

4. **Insert `report_translations` row:**
   ```sql
   INSERT INTO report_translations
     (report_id, locale, title, preview, full_content, toc, status, published_at)
   VALUES
     (<report_id>, 'en', <title>, <preview_text>, <full_html>, <toc_json>, 'draft', NULL);
   ```

   - `preview` = first 2 paragraphs of exec summary, plain text, ~300 chars
   - `full_content` = same `final_html` we rendered (admin can promote `status` to `published`)
   - `toc` = JSON array of `{section_num, title, page_num}` derived from section_structure
   - `status` = `'draft'` — owner reviews + flips to `'published'` from admin UI

5. **Insert `audit_log` row:**
   ```sql
   INSERT INTO audit_log (actor, action, entity_type, entity_id, payload, created_at)
   VALUES ('kira-research-report-skill', 'report_generated',
           'living_report', <report_id>,
           jsonb_build_object('blueprint', <blueprint_id>, 'page_count', <NN>, 'render_version', <v>),
           now());
   ```

Return:
```json
{
  "mode": "publish",
  "report_id": "KR-IDN-CONS-2026-001",
  "slug": "indonesia-construction-materials-2026",
  "supabase_paths": {
    "html": "reports-pdfs/KR-IDN-CONS-2026-001/en.html",
    "pdf":  "reports-pdfs/KR-IDN-CONS-2026-001/en.pdf"
  },
  "draft_url": "https://kiraresearch.com/en/admin/reports?focus=KR-IDN-CONS-2026-001",
  "buyer_url_after_publish": "https://kiraresearch.com/en/reports/indonesia-construction-materials-2026",
  "page_count": 19,
  "pdf_size_bytes": 184502,
  "quality_flags": []
}
```

The buyer URL is dormant until the owner toggles `report_translations.status = 'published'` from `/en/admin/reports`.

### Publish-mode safety rails

- If Supabase MCP isn't available → fall back to draft mode, emit a warning in the user response
- If a `living_reports` row already exists for this id with status != 'draft' → don't overwrite. Increment to `<id>-v2` or surface to owner.
- Never insert with `status: 'published'`. Owner publishes manually.

## Step 7 — Final response to user

Concise human-readable summary of what was produced + the structured output object. Don't dump the base64 PDF inline.

```
Report generated: Indonesia construction materials 2026
19 pages · 184 KB · 0 overflow flags · blueprint=market_analysis

Draft saved at:
- outputs/KR-IDN-CONS-2026-001/en.html
- outputs/KR-IDN-CONS-2026-001/en.pdf

(or for publish:)
Uploaded to Supabase. Owner can review at:
https://kiraresearch.com/en/admin/reports?focus=KR-IDN-CONS-2026-001
```

## Failure summary

If any step fails irrecoverably, surface a clear error with: which step failed, what the upstream error was, what state the report is in (e.g. HTML rendered but PDF render failed → HTML still saved locally). Don't fail silently.
