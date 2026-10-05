# data/ — operational data files

This directory holds operational data that the batch cron system reads/writes. **Not** source code, **not** generated artifacts (those live under `skills/kira-research-report/outputs/`).

## report_queue.csv — batch report generation queue

The daily 4-fire cron (`prompts/batch_runner.md`) reads this file each fire, picks the most-advanced row, and advances it one stage. A report is generated in EN and translated to every language in `target_languages` (default EN+JA+KO+ZH since Phase S4, 2026-10-05).

### Schema

| Column | Type | Description |
|---|---|---|
| `id` | string | Unique slug. Used as output folder name (`outputs/batch/<id>/`). Convention: `<year>-<country-lower>-<topic-slug>` e.g. `2026-vn-coffee`. |
| `topic` | string | Full topic string passed to the skill. Quote if it contains commas. |
| `country` | string | ISO-2 country code (VN, ID, TH, SG, MY, PH, JP, KR) or `APAC`. Used for blueprint matching. |
| `industry` | string | Short industry tag (Coffee, Roofing, AI, Legal, Steel, etc.). |
| `year` | int | Target year of the report (typically current year). |
| `target_languages` | string | Comma-separated locale codes. Default `en,ja,ko,zh` for new rows (Phase S4, 2026-10-05; `sync-approved-topics.mjs`, override with env `QUEUE_TARGET_LANGUAGES`). Older rows carry `en,ja,ko` and keep the 3-fire flow. |
| `status` | enum | Multi-stage; see "Status flow" below. |
| `output_paths` | string | After completion, pipe-separated Supabase Storage paths to the PDFs (one per published locale). |
| `date_added` | ISO date | When you added the row. |
| `date_completed` | ISO date | When status moved to `done` or `error`. |
| `error_log` | string | If status=error, brief message including the stage that failed. Also accumulates `auto-recovered <iso>` notes when Phase Q.4 auto-recovery flips a stale row, and holds the `zh-backfill` marker token on ZH backfill rows (see below). |
| `claimed_at` | ISO 8601 UTC | Phase Q.4. Set when a fire claims the row (`*_in_progress`); cleared on `done` / `error` / auto-recover. Used by `audit-queue.mjs` to detect stale claims older than 150 min. |

### Status flow (Phase Q.1, 2026-05-25 — multi-fire split)

```
pending
  → en_in_progress (claimed for EN gen)
  → en_done        (EN HTML + PDF committed)
  → ja_in_progress (claimed for JA translate)
  → ja_done        (JA HTML + PDF committed)
  → ko_in_progress (claimed for KO translate; + publish when zh is NOT in target_languages)
  → ko_done        (zh rows only: KO HTML committed, nothing published yet)
  → zh_in_progress (claimed for ZH translate + publish all languages)
  → done           (every target language + Supabase row + one PDF per language in Storage)
  → error          (any stage failed — terminal; reset to the last good stage to retry)
```

Rows without `zh` in `target_languages` skip `ko_done` / `zh_in_progress`: `ko_in_progress → done` (KO + publish in one fire, as before Phase S4).

**ZH backfill (Phase S4)** — adds Simplified Chinese to a report that is already published in EN/JA/KO:

```
zh_backfill → zh_in_progress (claimed for ZH backfill) → done
```

To queue one, edit the `done` row: status → `zh_backfill`, append `,zh` to `target_languages`, append ` · zh-backfill` to `error_log` (the marker), and leave `output_paths` as it is (it holds the published report id). The fire translates ZH from the committed `outputs/batch/<id>/en.html` and publishes only the ZH translation + ZH PDF; EN/JA/KO are not touched. Backfill rows have the lowest priority (they run only when no new-report stage is waiting). Auto-recovery sends a stale backfill claim back to `zh_backfill` (not `ko_done`) when `error_log` has the `zh-backfill` marker or `output_paths` is filled.

Side status: `hold` — parked by the owner (2026-10-05: the 57 pre-taxonomy rows wait for the new topic planner, Sprint S3). The runner never picks it; flip to `pending` to release.

Legacy single-stage statuses (still seen in older rows or rows from before Q.1):
- `in_progress` — legacy single-fire format; the new batch_runner.md treats as `error` and skips. Manually reset to `pending` to retry.

### Adding a topic

1. Open this file in Excel / Google Sheets / your editor
2. Add a row at the bottom with `status=pending` and today's `date_added`
3. Leave `output_paths`, `date_completed`, `error_log` blank
4. Save + commit + push to main

The next batch cron fire (13 fires/day, 45-min cadence, ICT) picks it up. A full report requires **4 consecutive fires** for an `en,ja,ko,zh` row (EN, JA, KO, ZH + publish) or **3** for a legacy `en,ja,ko` row (each fire = 1 stage).

### Inspecting progress

- `pending` — waiting for next fire to claim for EN gen
- `en_done` — half-done, awaiting JA translate at next fire
- `ja_done` — awaiting KO translate at next fire (+ publish when the row has no `zh`)
- `ko_done` — awaiting ZH translate + publish of all languages at next fire
- `zh_backfill` — published report waiting for a ZH-only backfill (lowest priority)
- `done` — published to library; check `output_paths` for Storage paths
- `error` — failed at some stage; check `error_log`; reset to `pending` to retry
- `*_in_progress` — currently being worked on by a fire RIGHT NOW. **Phase Q.4 auto-recovery (2026-05-28):** Step 0.5 of every fire runs `scripts/audit-queue.mjs` which detects rows where `claimed_at` is older than 150 minutes (or empty) and reverts the status to the pre-claim stage automatically. Strike-1 reverts to prior stage; strike-2 (already auto-recovered once) escalates to `error` so a real bug surfaces instead of looping. Manual unstuck is the fallback if auto-recovery itself is broken.

### Why CSV instead of database

- You can edit by hand without writing SQL
- Versioned in git (history of what you queued + when it ran)
- Simple to parse from any prompt
- Year 1 free-tier rule — no extra DB/queue infra needed
