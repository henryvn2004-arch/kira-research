# data/ — operational data files

This directory holds operational data that the batch cron system reads/writes. **Not** source code, **not** generated artifacts (those live under `skills/kira-research-report/outputs/`).

## report_queue.csv — batch report generation queue

The daily 4-fire cron (`prompts/batch_runner.md`) reads this file each fire, picks the top `pending` row, and gens 1 report across 3 languages (EN+JA+KO).

### Schema

| Column | Type | Description |
|---|---|---|
| `id` | string | Unique slug. Used as output folder name (`outputs/batch/<id>/`). Convention: `<year>-<country-lower>-<topic-slug>` e.g. `2026-vn-coffee`. |
| `topic` | string | Full topic string passed to the skill. Quote if it contains commas. |
| `country` | string | ISO-2 country code (VN, ID, TH, SG, MY, PH, JP, KR) or `APAC`. Used for blueprint matching. |
| `industry` | string | Short industry tag (Coffee, Roofing, AI, Legal, Steel, etc.). |
| `year` | int | Target year of the report (typically current year). |
| `target_languages` | string | Comma-separated locale codes. Always `en,ja,ko` for KIRA standard run. |
| `status` | enum | Multi-stage; see "Status flow" below. |
| `output_paths` | string | After completion, pipe-separated Supabase Storage paths to the 3 PDFs. |
| `date_added` | ISO date | When you added the row. |
| `date_completed` | ISO date | When status moved to `done` or `error`. |
| `error_log` | string | If status=error, brief message including the stage that failed. |

### Status flow (Phase Q.1, 2026-05-25 — multi-fire split)

```
pending
  → en_in_progress (claimed for EN gen)
  → en_done        (EN HTML + PDF committed)
  → ja_in_progress (claimed for JA translate)
  → ja_done        (JA HTML + PDF committed)
  → ko_in_progress (claimed for KO translate + publish)
  → done           (all 3 langs + Supabase row + 3 PDFs in Storage)
  → error          (any stage failed — terminal; reset to pending to retry)
```

Legacy single-stage statuses (still seen in older rows or rows from before Q.1):
- `in_progress` — legacy single-fire format; the new batch_runner.md treats as `error` and skips. Manually reset to `pending` to retry.

### Adding a topic

1. Open this file in Excel / Google Sheets / your editor
2. Add a row at the bottom with `status=pending` and today's `date_added`
3. Leave `output_paths`, `date_completed`, `error_log` blank
4. Save + commit + push to main

The next batch cron fire (13 fires/day, 45-min cadence, ICT) picks it up. A full report (EN+JA+KO+publish) requires **3 consecutive fires** in pipeline (each fire = 1 stage).

### Inspecting progress

- `pending` — waiting for next fire to claim for EN gen
- `en_done` — half-done, awaiting JA translate at next fire
- `ja_done` — two-thirds done, awaiting KO translate + publish at next fire
- `done` — published to library; check `output_paths` for Storage paths
- `error` — failed at some stage; check `error_log`; reset to `pending` to retry
- `*_in_progress` — currently being worked on by a fire RIGHT NOW (or stuck if fire crashed; check git log timestamp of the claim commit — if > 90 min ago, likely stuck → reset to the pre-claim status)

### Why CSV instead of database

- You can edit by hand without writing SQL
- Versioned in git (history of what you queued + when it ran)
- Simple to parse from any prompt
- Year 1 free-tier rule — no extra DB/queue infra needed
