---
name: feedback-supabase-storage-protect-delete
description: "Supabase blocks direct SQL DELETE from storage.objects/storage.buckets via a `protect_delete()` trigger — use Storage API / Dashboard UI instead"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 17b60c44-4484-4396-bbf1-6b3fb8f7a2a6
---

When writing a Supabase migration that needs to remove storage buckets or objects, do NOT use `delete from storage.objects` or `delete from storage.buckets`. Supabase enforces a `storage.protect_delete()` trigger on these tables that raises `42501: Direct deletion from storage tables is not allowed. Use the Storage API instead.` with hint "This prevents accidental data loss from orphaned objects."

**Why:** In the 2026-05-21 kira-research session, migration `006_drop_legacy.sql` tried to clean up two legacy buckets (`frameworks` 23 obj, `reports` 132 obj ~38 MB) by doing `delete from storage.objects where bucket_id in (...)`. Postgres aborted the whole transaction at that statement — and because Supabase SQL Editor wraps the entire script in one transaction, ALL the preceding successful `drop table` / `drop function` statements rolled back. The migration appeared to fail clean (state unchanged), but the rollback behavior is the important part: if your migration combines table drops with storage cleanup, expect a rollback if storage fails.

**How to apply:**
- For bucket/object cleanup in kira-research, instruct Henry via UI click-through: Dashboard → Storage → bucket → "Empty bucket" → confirm → "Delete bucket". Two-step UI per bucket.
- Migrations that need both DB drops AND bucket cleanup should be written as **two-step**: SQL migration handles DB only, plus a separate UI instruction block for buckets.
- If automated bucket deletion is ever needed, the path is the Storage REST API (`DELETE /storage/v1/object/<bucket>/<path>` and `DELETE /storage/v1/bucket/<id>`) authenticated with the `SUPABASE_SERVICE_KEY`. Service role bypasses the trigger.
- Object creation (`insert into storage.objects`) and bucket creation (`insert into storage.buckets`) are NOT blocked — only deletion. Migration `005_storage.sql` proves the insert path works fine.

Affects: migration `006_drop_legacy.sql` was revised to drop only the SQL step; bucket cleanup moved to Dashboard UI instructions in CLAUDE.md (commit landing 2026-05-21).
