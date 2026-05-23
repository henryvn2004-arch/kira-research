---
name: kira-m3-soft-delete-regen-workflow
description: "Phase M.3 — Admin delete = soft-delete (status='retired'). Batch re-publish auto-unretires via UPSERT. Buyers retain access to retired reports."
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## TL;DR

When Henry clicks "Retire" on `/en/admin/reports`, the row stays in DB with `status='retired'`. Public site hides it, buyers keep accessing it, batch re-run auto-unretires it. No DB migration needed — the system was already 90% correct; M.3 added the buyer-friendly fix to `library-content.js`.

## Why this matters

Henry's stated workflow (2026-05-23): "sau khi auto-publish, thì tao chỉnh sửa trên page /en/admin/reports thôi, nếu reports sai, thì tao delete rồi gen lại thôi."

The naive interpretation = hard-delete + insert. But hard-delete from `living_reports`:
- Cascades to `report_translations` (per `on delete cascade` in migration 002)
- Hits FK constraint on `purchases.report_id` (no cascade) — DB rejects the delete unless we add ON DELETE behavior
- Loses `downloads` audit trail (orphan rows or cascade-deletes them)
- Creates a NEW UUID on next regen → buyers' purchase rows orphan → buyers lose download access

Soft-delete sidesteps all of this. Same UUID on regen → buyer's purchase still resolves.

## The workflow

```
1. Henry clicks "Retire" on /en/admin/reports/<id>
   → POST /api/admin-reports?id=<id>&method=DELETE
   → backend: PATCH living_reports SET status='retired'
   → audit_log row written

2. Public site auto-hides:
   - /en/library no longer lists the slug (library-list.js filters status=eq.published)
   - /en/reports/<slug> returns 404 (library-report.js filters status=eq.published)
   - /api/library-buy refuses new purchases (library-buy.js filters status=eq.published)

3. Existing buyers retain access:
   - /api/library-content does NOT filter status (M.3 fix). They can still
     read full_content + download PDF using their purchase record.

4. Henry resets queue.csv row for that topic → status=pending

5. Next batch fire (manual "Run now" or cron) gens fresh report
   → My M.2 UPSERT in _build_<id>_sql.mjs:
     - ON CONFLICT (slug) DO UPDATE SET status='published' (auto-unretire)
     - ON CONFLICT (report_id, locale) DO UPDATE SET title/preview/toc/pdf_url
   → Same UUID is preserved → buyers still see their report

6. Public site sees the fresh version.
```

## Why no migration needed

| Concern | Status |
|---|---|
| Public RLS hides retired | ✅ `living_reports_read_published` policy: `using (status = 'published')` |
| Public APIs filter retired | ✅ library-list, library-report, library-buy all use `status=eq.published` |
| Buyer access preserved | ✅ M.3 fix: library-content.js dropped status filter on living_reports lookup |
| Soft-delete is default | ✅ admin-reports.js DELETE handler PATCHes `status='retired'` (was already there) |
| UI labels correctly | ✅ reports.html button reads "Retire" not "Delete", confirm dialog explains soft delete |
| Re-publish via batch | ✅ M.2 UPSERT flips status back to 'published' + refreshes content |
| FK constraint blocks accidental hard-delete | ✅ `purchases.report_id` FK has no cascade → DB blocks hard-delete from Dashboard |
| Per-locale hard-delete | ✅ admin-reports.js `DELETE ?locale=en` still hard-deletes the translation row (use case: a bad JA translation needs scrubbing without retiring the whole report) |
| `downloads.report_id` orphan risk | 🟡 No FK cascade declared. If `living_reports` is ever hard-deleted (admin Dashboard, not API), downloads rows persist with stale report_id. Acceptable — they have `slug` snapshot for audit. |

## Files touched in M.3

- `api/library-content.js` — dropped `status=eq.published` filter on living_reports lookup (lines 110-114). New comment explains the buyer-access rationale.
- This memory file + `MEMORY.md` index update.

## What was NOT done (and why)

- **Migration 010 (FK cascades)**: planned for `downloads.report_id ON DELETE SET NULL`. Skipped because hard-delete is not used by the API. Existing FK constraint actively prevents accidental Dashboard hard-deletes — that's a *feature*, not a bug. If a future need emerges (mass-cleanup of orphan PDFs), revisit.
- **"Permanent purge" admin endpoint**: skipped. Henry can do permanent cleanup via Supabase Dashboard (manual, click-through) which is rare. Adding a UI button invites accidental data loss.

## Gotcha: re-publish race window

Between "Retire" click and batch re-run completing (typically 10-30 min):
- New buyers: can't see/purchase (correct)
- Existing buyers: still access via library-content.js (correct after M.3 fix)
- Slug-direct URL `/en/reports/vietnam-coffee-2026`: returns 404 (correct — preview hidden)

After regen UPSERT completes:
- Public page returns to 200 with fresh content
- Same UUID, same purchases all still valid
- No buyer notification needed (they don't see the retirement)

## Storage PDF behavior

Soft-delete does NOT touch Supabase Storage. PDFs at `<uuid>/<locale>.pdf` remain. When batch re-runs:
- `upload-pdf.mjs` POSTs with `x-upsert: true` → overwrites existing PDFs at same paths
- Buyers downloading during the regen window may briefly get the OLD PDF until upload completes (~3-5s overlap). Acceptable for Year 1.

If Henry ever wants to delete the old PDF before the new one uploads (e.g. takedown order), Dashboard Storage UI → delete file (per `[[feedback_supabase_storage_protect_delete]]` — Dashboard works, SQL DELETE on storage.* is blocked).

## When to bypass soft-delete

Rare cases requiring hard-delete:
1. **Pre-launch test data**: report seeded for testing, never had buyers — safe to hard-delete from Supabase Dashboard. FK on purchases is empty → no constraint violation.
2. **Legal takedown with permanent erasure requirement**: Dashboard SQL: `DELETE FROM living_reports WHERE id = '...';` Will cascade-delete `report_translations` (per FK cascade). Will FK-block on `purchases.report_id` — need to also nuke those (`DELETE FROM purchases WHERE report_id = '...';`). Audit trail loss is the cost.

Both are operator-judgment calls in the Supabase Dashboard. Not exposed via API by design.

See also: [[project_m1_dual_language_search]] · [[project_l3_source_tag_system]] · [[project_tool_gen_report]] · [[reference_kira_research]]
