---
name: kira-batch-cron-system
description: "Phase Q.7 (executed 2026-07-29): 22 scheduled tasks consolidated into 1 routine `kira`, cron `0 18,21,0,3 * * *` (4 fires/day, LOCAL time) — 3 batch fires + 1 insight fire, dispatched by `date +%H` inside SKILL.md. Steady state = 1 full report/day (EN+JA+KO)."
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## What this is

Henry's KIRA Research has a daily batch report generation system built on top of the `kira-research-report` skill ("[[project_tool_gen_report|tool gen report]]"). Scheduled tasks (`mcp__scheduled-tasks`) fire daily and pull 1 pending topic per fire from `data/report_queue.csv`, gen it as a 3-language report (EN + JA + KO), auto-publish to Supabase, commit results.

## IMPORTANT: Cron times are LOCAL, not UTC

**Đính chính 2026-07-29 (đo trực tiếp, thay cho ghi chú "cron là UTC" cũ).**
`mcp__scheduled-tasks` đánh giá cron theo **giờ local của máy** (ICT trên máy Henry).
Bằng chứng: `kira` cron `0 18,21,0,3 * * *` → `nextRunAt` = `2026-07-29T11:01:52Z`
= 18:01 ICT. Tương tự `kira-batch-1700` cron `0 17 * * *` → `nextRunAt` 10:07Z
= 17:07 ICT. Viết cron thẳng bằng giờ Việt Nam, **đừng +7**.

Ghi chú "cron times are UTC" trước đây đến từ thời Q.6 — mà Q.6 chưa từng được
áp lên máy nào, nên sai chưa bao giờ bị lộ. Bảng Q.6 phía dưới (0000 = 07:00 ICT)
vì thế cũng sai; bảng Q.3 (1745 = 05:45 PM) mới đúng.

Hệ quả cho scheduler: có thêm **jitter 0–10 phút** cộng vào mỗi fire
(`jitterSeconds` trong `list_scheduled_tasks`) — 18:00 thực tế nổ ~18:00–18:10.

## Current schedule (Phase Q.7 — executed 2026-07-29) — 22 routine gom về 1

**Henry chốt 2026-07-29: 1 routine duy nhất, 4 fire/ngày, ra 1 report/ngày (EN+JA+KO).**
**Đã thực thi xong 2026-07-29 ~11:55 ICT** — panel Routines chỉ còn `kira`.

| | Trước | Sau |
|---|---|---|
| Routine | 22 | **1** (`kira`) |
| Fires/ngày | 22 | **4** — `0 18,21,0,3 * * *` |
| Report/ngày | ~6 (thiết kế) | **1** |

3 fire chạy `batch_runner.md` (1 report = 3 stage: gen EN → dịch JA → dịch KO +
publish), fire 03:00 chạy `insight_runner.md`. Dispatch bằng `date +%H` ngay
trong SKILL.md — vẫn 1 routine.

**Fire giãn 3 tiếng** (stage chạy 30–90 phút) nên không bao giờ có 2 fire chồng
nhau → né luôn rủi ro scheduler skip fire khi lần chạy trước còn sống.

**Hệ quả có chủ đích**: throughput ~1 report/ngày thay vì ~6. Queue 60 hàng
pending → runway ~60 ngày. Insight của một report cần 6 fire → ~6 ngày mới đủ
4 bài × 3 thứ tiếng. Muốn nhanh hơn: thêm giờ vào cron, vẫn 1 routine.

Runbook: `skills/kira-research-report/prompts/routines_consolidate.md`.
Backup 22 routine cũ (rollback): `data/routines_backup_2026-07-29.md`.

### Kết quả thực thi runbook (2026-07-29)

- **Step 1** — 22 routine, tất cả `enabled: true` (KHÔNG Paused như runbook dự đoán;
  chúng đã được bật lại trước đó và đang chạy bù hàng loạt fire lỡ, ~2 phút/fire).
- **Step 3** — tạo `kira`, cron `0 18,21,0,3 * * *`, SKILL.md hardcode path DELL +
  câu "BỎ QUA `git rev-parse`" + env guard + dispatch `date +%H`.
- **Step 4** — "Run now" xanh: dispatch chọn đúng batch runner (giờ 11 ≠ 03), env
  guard qua, **không dính permission prompt** (allowlist user-level đã đủ), phát
  hiện 2 claim live dưới 90 phút → thoát sạch, không claim/commit/spawn.
- **Step 5** — xoá 22 routine. `delete_scheduled_task` chỉ gỡ khỏi scheduler:
  **SKILL.md cũ vẫn nằm trên đĩa** ở `~/.claude/scheduled-tasks/<taskId>/` (recover
  prompt được), và **session đang chạy dở KHÔNG bị giết** — fire cũ vẫn commit
  `batch: EN done for 2027-sg-digital-assets` lúc 11:54 sau khi task đã bị xoá.
- **Step 6** — chờ đo 1 tuần (xem mục dưới).

### Phương án 2-routine (đã cân nhắc, không chọn)

Giữ 2 routine tách theo pipeline (`kira-batch` + `kira-insight`), gộp nguyên tập
giờ cũ. Vướng: layout đang chạy là Q.3 nhịp 45 phút, phút lệch nhau, mà cron là
tích chéo minute × hour nên **không có biểu thức nào khớp đúng** — vẫn phải
regularize. Đã regularize thì gom thẳng về 1 routine gọn hơn.

---

## Phương án cũ (2026-07-29 sáng, superseded) — gom về 2, giữ nguyên số fire

18 `kira-batch-HHMM` dùng chung một prompt body, chỉ khác giờ trong cron → gộp
thành **1 task với cron nhiều giờ**. Tương tự 4 `kira-insight-HHMM` → 1 task.

**⚠️ Cron gộp cụ thể phụ thuộc layout đang chạy trên máy — không hardcode.**
Xác minh 2026-07-29 qua ảnh panel Routines: máy đang chạy **layout Q.3** (nhịp
45 phút, phút chạy vòng 00→45→30→15), **không phải Q.6 hourly** như note này
từng ghi. Q.6 rõ ràng chưa từng được áp lên máy này.

Hệ quả: **Q.3 không gộp nguyên trạng được.** Cron là tích chéo minute × hour, nên
một nhịp lệch phút (00:00 / 00:45 / 01:30 / 02:15…) không có biểu thức cron nào
khớp đúng. Muốn gom phải regularize sang nhịp đều, tức **đổi giờ fire thật sự**:

| Phương án | Cron | Fires/ngày | So với 18 hiện tại |
|---|---|---|---|
| Hourly, giữ cửa sổ 17:00→06:00 | `0 17-23,0-6 * * *` | 14 | −4 |
| Mỗi 30 phút, cùng cửa sổ | `0,30 17-23,0-6 * * *` | 28 | +10 (ngốn quota) |

Không có nghiệm giữ đúng 18 fire trong 1 task — 18 fire trong cửa sổ 14 tiếng
không chia được bằng nhịp đều. Henry chọn phương án trước khi chạy runbook.

Nếu sau này máy được đưa về layout Q.6 (hourly, cùng phút 0) thì gộp thành
`0 0-17 * * *` là **không đổi gì cả** — đó là Case A trong runbook.

**"Gen" và "dịch" KHÔNG phải 2 task riêng.** Mỗi fire đọc trạng thái (queue.csv
status với batch, số dòng `insight_translations` với insight) rồi tự route sang
stage kế tiếp — EN gen, JA translate, hay KO translate + publish. Tách theo đồng
hồ sẽ làm pipeline nghẽn (task "dịch" fire khi chưa có gì để dịch, task "gen"
fire khi queue đã dồn ở stage dịch). Vì vậy 2 task = 2 **pipeline** (report /
insight), không phải 2 **loại việc**.

**Runbook thực thi**: `skills/kira-research-report/prompts/routines_consolidate.md`
— tự chứa, chạy trên máy Windows đang giữ scheduled tasks (session Claude Code
trên web/mobile KHÔNG làm được: task nằm ở `C:\Users\<user>\.claude\scheduled-tasks\`,
ngoài repo). Tạo 2 task mới → Run now verify → mới xoá 22 task cũ.

**Pipeline từng DỪNG 8 ngày (07-21 → 07-29), đã chạy lại**: commit `batch:` cuối
cùng là 2026-07-21 trong khi queue còn hàng. Nguyên nhân: routine bị Paused +
máy tắt. Đã bỏ pause trước khi gom (Step 0). Queue lúc gom: **59 pending** ·
1 `en_in_progress` · 16 `error` · 106 `done`.

Bài học: gom một cỗ máy đang tắt thì sau đó không phân biệt được throughput tụt
là do gom hay do vốn đã tắt — luôn chạy Step 0 trước.

**Rủi ro đã biết, cần đo sau 48h**: 18 task riêng thì 2 fire chồng nhau là 2 job
độc lập; gom về 1 task, nếu scheduler skip fire khi lần chạy trước còn sống thì
throughput tụt (fire batch chạy 30–90 phút, cron hàng giờ). Đo bằng số commit
`batch:` mỗi ngày trước/sau. Nếu giảm >30% → cron `0,30 0-17 * * *`, không được
nữa thì tách batch làm 2 task lệch pha (tổng 3, vẫn gọn hơn 22).

## Previous schedule (Phase Q.6 — 2026-05-31, SUPERSEDED by Q.7)

**18 active tasks**, hourly on-the-hour from 00:00–17:00 UTC = **07:00–00:00 ICT**. Gap: 00:00–07:00 ICT (7h overnight).

| Task ID | Cron (UTC) | Vietnam time (ICT) |
|---|---|---|
| `kira-batch-0000` | `0 0 * * *` | 07:00 |
| `kira-batch-0100` | `0 1 * * *` | 08:00 |
| `kira-batch-0200` | `0 2 * * *` | 09:00 |
| `kira-batch-0300` | `0 3 * * *` | 10:00 |
| `kira-batch-0400` | `0 4 * * *` | 11:00 |
| `kira-batch-0500` | `0 5 * * *` | 12:00 |
| `kira-batch-0600` | `0 6 * * *` | 13:00 |
| `kira-batch-0700` | `0 7 * * *` | 14:00 |
| `kira-batch-0800` | `0 8 * * *` | 15:00 |
| `kira-batch-0900` | `0 9 * * *` | 16:00 |
| `kira-batch-1000` | `0 10 * * *` | 17:00 |
| `kira-batch-1100` | `0 11 * * *` | 18:00 |
| `kira-batch-1200` | `0 12 * * *` | 19:00 |
| `kira-batch-1300` | `0 13 * * *` | 20:00 |
| `kira-batch-1400` | `0 14 * * *` | 21:00 |
| `kira-batch-1500` | `0 15 * * *` | 22:00 |
| `kira-batch-1600` | `0 16 * * *` | 23:00 |
| `kira-batch-1700` | `0 17 * * *` | 00:00 (next day) |

**Daytime gap: 00:00–07:00 ICT** (17:00–24:00 UTC) — 7h overnight. Acceptable since machine typically off after midnight.

## Setup on machine (recreate tasks) — Q.7

Chỉ còn **1 task**. Trong Claude Code trên máy đó:
> "Đọc `skills/kira-research-report/prompts/routines_consolidate.md` trong repo kira-research rồi làm theo."

Runbook lo hết: kiểm kê task đang có → chọn 4 giờ fire trong cửa sổ máy bật →
tạo `kira` → Run now verify → xoá task cũ.

Bắt buộc trong SKILL.md: hardcode đường dẫn repo + câu "BỎ QUA bước
`git rev-parse --show-toplevel`". Thiếu là mọi fire chết ở dòng đầu playbook
với `not in git, no-op` — xem [[feedback_scheduled_task_cwd_parent]].

Đường dẫn trên DELL: `C:\Users\DELL\Kira Research\kira-research`
(bash `/c/Users/DELL/Kira Research/kira-research`).

## Baseline throughput đo lúc gom (2026-07-29) — QUAN TRỌNG khi đọc Step 6

Số report `done` mỗi tuần (`git log --format='%ad %s' --date=format:'%Y-W%V' | grep 'batch: complete'`):

| Tuần | done | /ngày |
|---|---|---|
| W21 | 1 | 0.1 |
| W22 | 31 | **4.4** |
| W23 | 36 | **5.1** |
| W24 | 21 | 3.0 |
| W25 | 4 | 0.6 |
| W26 | 2 | 0.3 |
| W27 | 2 | 0.3 |
| W28 | 4 | 0.6 |
| W29 | 2 | 0.3 |

**Hệ 22 routine chỉ chạy đúng thiết kế trong 3 tuần W22–W24.** Từ giữa tháng 6
(W25) trở đi throughput tụt về ~0.3–0.6/ngày và ở đó suốt 6 tuần: 22 fire/ngày ×
42 ngày ≈ 900 fire mà chỉ ra ~14 report.

→ **Mục tiêu 1 report/ngày của Q.7 là tăng ~2 lần so với thực tế 6 tuần trước khi
gom, không phải giảm 6 lần.** Câu "throughput giảm còn ~1/ngày" trong runbook so
với con số *thiết kế* (~6/ngày) chứ không phải con số *thực*. Đừng đọc Step 6 như
một phép so với 6/ngày.

Nguyên nhân nghi nhất cho cú tụt W25: **máy tắt / Claude Code không mở** phần lớn
thời gian (routine `Local` chỉ chạy khi máy thức + online) — bằng chứng: `lastRunAt`
của hàng loạt task cũ đứng ở 2026-07-21, và pipeline dừng hẳn 8 ngày 07-21 → 07-29.
Cộng thêm 16 hàng `error` tích lại từ các đợt second-strike 06-11/06-12/06-18.
Chưa xác minh dứt điểm.

## Step 6 — theo dõi (mở, bắt đầu 2026-07-29)

**Đã tự động hoá**: task một lần `kira-q7-measure` nổ **2026-08-05 19:30 ICT**,
tự đo + báo cáo + commit kết quả vào note này rồi tự tắt. Không cần Henry nhắc.

Kỳ vọng: **1 commit `batch: complete <id> (EN+JA+KO, published)` mỗi ngày**.
Chuỗi grep này đã xác minh là đúng (khớp `batch_runner.md:430`, xuất hiện 102 lần
trong history) — đừng đổi.

**Chỉ số phân biệt nguyên nhân**: đếm số commit `^batch:` trong 7 ngày (kỳ vọng
~21 = 3 fire/ngày × 7). Ít fire nổ → máy tắt hoặc permission prompt, KHÔNG phải
lỗi của việc gom. Đủ fire nổ mà ít report done → nghẽn trong pipeline.

Đo sau 7 ngày (≈ 2026-08-05):

```bash
git log --since="7 days ago" --format='%s' | grep -c 'batch: complete'
```

~7 là đúng. Thấp hơn nhiều → kiểm theo thứ tự: máy có bật lúc 18/21/00/03 không →
có hàng `*_in_progress` kẹt không → fire có bị permission prompt chặn không.
Muốn nhanh hơn: thêm giờ vào cron (vd `0 18,20,22,0,2,4 * * *` = 6 fire = 2
report/ngày), vẫn 1 routine, sửa đúng 1 dòng.

## Current schedule (Phase Q.3 — 2026-05-25, SUPERSEDED)

Old schedule had crons mislabeled as ICT but actually UTC, causing 10 fires to cluster at 07:00–13:45 ICT and 8 fires at 00:00–06:30 ICT (wasted when machine off). Replaced by Q.6.
| `kira-batch-1745` | `45 17 * * *` | 05:45 PM | Evening |
| `kira-batch-1830` | `30 18 * * *` | 06:30 PM | Evening |
| `kira-batch-1930` | `30 19 * * *` | 07:30 PM | **Bridge (NEW Q.3)** |
| `kira-batch-2030` | `30 20 * * *` | 08:30 PM | Bridge |
| `kira-batch-2130` | `30 21 * * *` | 09:30 PM | Bridge |
| `kira-batch-2230` | `30 22 * * *` | 10:30 PM | Bridge |
| `kira-batch-2330` | `30 23 * * *` | 11:30 PM | Bridge |
| `kira-batch-0000` | `0 0 * * *` | 12:00 AM | Overnight |
| `kira-batch-0045` | `45 0 * * *` | 12:45 AM | Overnight |
| `kira-batch-0130` | `30 1 * * *` | 01:30 AM | Overnight |
| `kira-batch-0215` | `15 2 * * *` | 02:15 AM | Overnight |
| `kira-batch-0300` | `0 3 * * *` | 03:00 AM | Overnight |
| `kira-batch-0345` | `45 3 * * *` | 03:45 AM | Overnight |
| `kira-batch-0430` | `30 4 * * *` | 04:30 AM | Overnight |
| `kira-batch-0515` | `15 5 * * *` | 05:15 AM | Overnight |
| `kira-batch-0600` | `0 6 * * *` | 06:00 AM | Overnight |
| `kira-batch-0645` | `45 6 * * *` | 06:45 AM | Overnight |

Daytime gap (06:45 → 17:00) still ~10h15m by design — Henry usually works on the other machine during day.

**Disabled (history)**: `kira-batch-01am`, `kira-batch-05am`, `kira-batch-1215pm`, `kira-batch-05pm` — old 4-task schedule, replaced 2026-05-24 with 13-task fan-out (later expanded to 18 in Q.3).

System auto-applies 0-10 min random jitter per task to spread load. All tasks share the same prompt (delegate to `batch_runner.md` in repo).

## Capacity calculation (Phase Q.3 — 18 fires/day)

Post-Q.1 multi-fire split: each report needs 3 fires (Stage A/B/C). So:

- 18 fires/day ÷ 3 stages = **~6 reports/day fully published** (steady-state)
- Each report = 3 PDFs (EN + JA + KO) → **~18 PDFs/day**
- Queue depth needed: 6/day → 50-topic queue lasts ~8 days
- Per fire cost: ~150-450K tokens (Stage A heavier than B/C). On Max 5x: 18 × ~250K avg = 4.5M tokens/day ≈ 32M/week — within Max 5x weekly budget.
- Max wait between stages: ~60 min (Q.3 bridge closed the 5h30m evening↔overnight gap).
- Worst-case per-report latency: claim Stage A at 06:45 (last overnight fire) → wait ~10h15m (daytime gap) → Stage B at 17:00 → Stage C at 17:45 → done in ~11h30m. (Daytime gap still present by design — Henry uses other machine.)
- Best-case: claim Stage A at 00:00 → Stage B at 00:45 → Stage C at 01:30 → done in ~1h30m.

## Pre-Q.3 capacity (history)

Pre-2026-05-25, the schedule was 13 fires/day with a 5h30m gap between block 2 end (18:30) and block 1 start (00:00). At Q.1 (3-fire-per-report), this caused worst-case ~18h latency when Stage A claimed at 18:30. Q.3 added 5 evening bridge fires (19:30/20:30/21:30/22:30/23:30) to close that gap; daytime gap retained.

## Architecture

```
data/report_queue.csv  ◄────────────── Henry edits this file (or Claude auto-gens topics)
       │                               Adds rows with status=pending
       ▼
13 scheduled tasks (Claude Code .claude/scheduled-tasks/):
  kira-batch-HHMM × 13 (45-min cadence in two blocks)
       │
       │ Each fires a FRESH Claude session (no memory of past sessions)
       │ The prompt tells it to read + execute:
       ▼
skills/kira-research-report/prompts/batch_runner.md
       │  Self-contained: claim row → spawn subagents → gen EN → translate JA → translate KO
       │                  → auto-publish (Supabase upsert + Storage upload) → commit
       ▼
skills/kira-research-report/outputs/batch/<id>/
       ├─ en.html · en.pdf  (PDF only in Storage, .gitignored in repo)
       ├─ ja.html · ja.pdf
       └─ ko.html · ko.pdf
       │
       ▼
kiraresearch.com/en/library/<slug>  (auto-published, status='published')
```

## Concurrency / overlap behavior

45-min gap is shorter than typical batch fire duration (30-90 min). Two fires can overlap — but the **claim-then-commit** pattern in batch_runner.md Step 2 makes this safe:

- Fire A at 00:00 → claims first pending row → set `in_progress` → commits within 10s
- Fire B at 00:45 → reads queue → row A is already `in_progress` → claims NEXT pending row
- No double-claim possible

If queue is empty when a fire triggers → fire exits cleanly with "No pending work" message, ~1 prompt of quota burned.

## Key constraints

- **App must be running.** Claude Code must be open on Henry's machine for crons to fire. If closed at fire time, task runs on next launch (catches up missed fires).
- **1 topic per fire.** Sonnet on Max 5x: each topic × 3 langs ≈ 450K tokens. Going higher risks context overflow.
- **Token budget is the constraint, not API rate limits.** Max 5x message quota is comfortable at 13 fires/day; the binding limit is Sonnet's context window per conversation.
- **EN-first-then-translate.** JA and KO are translated from EN (charts reused, labels swapped). NOT generated from scratch in each language — would 3x cost + risk number drift across languages.
- **Subagent-per-phase.** batch_runner spawns 3 separate general-purpose subagents (EN gen, JA translate, KO translate) so each gets a fresh 200K context. Parent batch_runner only orchestrates.

## Where to look when things break

- **No new reports overnight:** Check `data/report_queue.csv` — does it have pending rows? Check `.claude/scheduled-tasks/kira-batch-*/SKILL.md` — are tasks still enabled? Check if Claude Code was running at fire time.
- **Reports erroring:** Check `error_log` column in queue.csv. Common: `/api/render-pdf` 500 (chromium boot), 401 (PDF_RENDER_SECRET missing), translation overflow, section-count mismatch.
- **Brand violation slipped in:** Run anti-positioning grep on `outputs/batch/*` — should be zero hits for Mordor/Frost/Euromonitor/Synovate/Ipsos/IMARC/Claude/McKinsey.
- **Fire didn't trigger at scheduled time:** Open Claude Code → check Scheduled section in sidebar → see `nextRunAt` and `lastRunAt`. Use `mcp__scheduled-tasks__list_scheduled_tasks` from any Claude Code session.
- **Stuck `*_in_progress` row:** **Phase Q.4 (2026-05-28) auto-recovery handles this now.** Step 0.5 of every fire runs `scripts/audit-queue.mjs` which detects rows where `claimed_at` is empty OR > 90 min ago, reverts status to prior stage (strike-1) or escalates to `error` (strike-2 — already auto-recovered once). Manual flip is only needed if the audit script itself is broken or if a strike-2 escalation surfaces a real bug. The orphan output dir under `outputs/batch/<id>/` can stay for inspection.

## Files involved (committed to repo)

- `data/report_queue.csv` — the queue (Henry edits, or auto-bumped via agent). **Phase Q.4 added `claimed_at` column** (ISO UTC timestamp set at claim, cleared on done/error/auto-recover).
- `data/README.md` — schema docs for queue.csv
- `skills/kira-research-report/prompts/batch_runner.md` — orchestrator prompt fired by cron (Q.4 added Step 0.5 audit-queue call before stage routing)
- `skills/kira-research-report/prompts/translator_jp.md` — JP voice guide + translation rules
- `skills/kira-research-report/prompts/translator_ko.md` — KO voice guide + translation rules
- `skills/kira-research-report/scripts/audit-queue.mjs` — **Phase Q.4** idempotent stale-claim reverter (90-min threshold, strike-1 to prior stage, strike-2 escalate to `error`). Called from batch_runner.md Step 0.5.
- `skills/kira-research-report/outputs/batch/` — output directory (each report gets a subdir keyed by `id`; PDFs .gitignored, HTMLs tracked)

## Files NOT committed (live in user's Claude Code config)

Post-Q.7: **1 task directory** — `C:\Users\<user>\.claude\scheduled-tasks\kira\SKILL.md`.
(Pre-Q.7 là 22: `kira-batch-HHMM` × 18 + `kira-insight-HHMM` × 4. 22 thư mục cũ vẫn
còn trên đĩa DELL sau khi delete — tool không xoá file, chỉ gỡ khỏi scheduler.)

→ **If Henry switches machines, scheduled tasks won't follow.** Recreate on the new machine
by running `prompts/routines_consolidate.md` — **1** `create_scheduled_task` call thay vì 22.

## Per-machine env vars

Batch fires need 3 env vars set in the **Windows User scope** of every machine that runs the cron. All three live as source of truth in **Vercel project env** (kira-research → Settings → Environment Variables). Mirror them locally — they cannot be derived. After setting, restart Claude Code so child processes inherit them.

| Var | Used for |
|---|---|
| `PDF_RENDER_SECRET` | header `X-Api-Key` on POST `/api/render-pdf` |
| `SUPABASE_URL` | `https://iygoynbnscednfzdsflc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Bearer token on Supabase Storage upload + signed-URL generation |

**Reusable helper scripts** in `skills/kira-research-report/scripts/`:
- `render-one.mjs` — POST HTML to `/api/render-pdf`, decode base64 → write PDF.
- `upload-pdf.mjs` — POST PDF to Supabase Storage bucket `reports-pdfs/<report-id>/<locale>.pdf`.
- `_build_vn_coffee_sql.mjs` — one-off SQL builder template; copy + adapt per-topic.

## Pre-approval gotcha — PARTIALLY SOLVED (2026-05-25 → 2026-05-26)

**2026-05-26 update:** Project-level `.claude/settings.json` alone was NOT enough — cron fires launch Claude Code in the parent dir (`C:\Users\<user>\Rira Research`), not the project dir, so the project allowlist never loads. Discovered after 0600 fire hung on a permission prompt overnight. See [[feedback_scheduled_task_cwd_parent]] for full diagnosis path.

**Working fix (must do BOTH):**
1. **Project-level** `.claude/settings.json` (committed to repo) — for interactive sessions and as the source-of-truth template
2. **User-level** `C:\Users\<user>\.claude\settings.json` (per-machine, NOT committed) — same content, applies to cron regardless of launch cwd

**2026-05-25 shipped (project-level):** `.claude/settings.json` committed to the repo with explicit allowlist for the tool set batch_runner + insight_runner need. Travels via git → DELL inherits on pull → no per-machine click-approve for interactive sessions.

What's in the allowlist (commit `07d1a5c`):
- Built-in tools: Read, Glob, Grep, Edit, Write, Agent, ToolSearch, WebSearch, WebFetch
- Bash patterns (prefix-wildcard): `git *`, `node *`, `npm *`, `npx *`, `curl *`, `gh *`, `mkdir/mv/cp/rm/ls/cat/echo/printf/cd/wc/tail/head/grep/find/sed/awk/tr/sort/uniq/date/diff/test/[`
- Deny: `git push --force*`, `git push -f*`, `rm -rf /`, `rm -rf /*`, `rm -rf ~`, `rm -rf ~/*` (deny wins over allow)

**Why this works:** scheduled-task SKILL.md hardcodes working dir to the repo root (`C:\Users\<user>\Rira Research\kira-research` or equivalent). Fresh Claude Code session spawns there → loads `.claude/settings.json` → allowlist applies before first tool call → no prompt.

**What's NOT in the allowlist:** MCP tools (`mcp__<uuid>__*`). MCP server names use machine-specific UUID prefixes (e.g., `mcp__763a5dc5-...__execute_sql` on vnc-f4 may be a different UUID on DELL), so can't be portably committed. batch_runner uses curl + node helper scripts for Supabase (not the MCP), so MCP prompts are rare. If a cron fire does prompt for an MCP tool, click approve once and consider adding a machine-specific rule to `.claude/settings.local.json` (gitignored).

**Per-machine override:** `.claude/settings.local.json` is in `.gitignore` for things like machine-specific MCP allowlists or hooks. Settings load order: user → project → local (later overrides earlier).

**Historical note:** Pre-allowlist (before 2026-05-25), the gotcha was: click "Run now" on any task before first auto-fire, approve each tool, hope subsequent fires reuse approvals. Unreliable since fresh sessions don't always inherit approvals. Allowlist file fixes this deterministically.

## Cost / billing notes

- Runs on Henry's Claude Code Max 5x ($100/mo) plan quota — NOT direct API billing
- Each fire ≈ 450K tokens spread across parent + 3 subagents
- 13 fires/day × 30 days = ~175M tokens/month
- Max 5x weekly limit should comfortably accommodate this; if rate-limited, disable some tasks (start with `kira-batch-0215`, `0345`, `0515` — middle-of-block slots that are most redundant)

## Phase O.13 changelog (2026-05-24)

- Replaced 4 daily tasks with 13 (45-min cadence in 2 blocks). ~3.25x throughput increase.
- Queue bumped +50 SEA topics (10 VN, 8 ID, 7 TH, 5 MY/PH/SG/JP/KR each).
- Documented overlap-safe claim-then-commit pattern (was implicit before).

## Phase Q.1 changelog (2026-05-25) — multi-fire split + chunked translation

**Root cause for split**: `2026-vn-fintech` hung 2h24m at JA translation stage (commit `0b6be26` claimed at 06:31 ICT, no further commits). Outputs/ folder rỗng → confirmed translation subagent failed before any file write. Investigation showed JA subagent was asked to one-shot Write ~67KB ja.html, exceeding Sonnet's ~32K-token per-response output cap → partial truncation or hang.

**What changed**:

- **Status flow extended**: `pending → en_in_progress → en_done → ja_in_progress → ja_done → ko_in_progress → done` (or `error`). Legacy `in_progress` rows treated as error (skip).
- **1 fire = 1 stage = 1 row**: each fire picks the most-advanced row (ja_done first, then en_done, then pending) and advances it ONE stage. Drains pipeline toward `done`.
- **Chunked translator output**: per `translator_jp.md` / `translator_ko.md` Section 11.5 — sentinel `<!-- KIRA_BATCH_PAGES_INSERT_HERE -->` comment, per-page `Edit` instead of one-shot Write. Each Edit ≤ ~7KB → no truncation risk.
- **Machine-agnostic working dir**: `git rev-parse --show-toplevel` instead of hardcoded `C:\Users\vnc-f4\...`. Same prompt runs on any machine.
- **Validation gates added** (parent-side, post-subagent):
  - Page count match (`grep -c '<div class="kira-page'` in ja/ko = en)
  - Source tag superset (every `[…]` in en must appear in ja/ko)
  - Anti-positioning grep with katakana/hangul variants (`クロード`, `클로드`)
- **45-min hard timeout per stage**: failures logged with stage label.
- **Throughput same**: 13 fires/day still = ~13 reports/day at steady state (each report flows through 3 fires but pipeline is parallel).

**Implication for machine setup**: 13 batch tasks now exist on DELL too (recreated from vnc-f4 set 2026-05-25). Both machines can fire safely — claim-then-commit prevents double-claim. Quota cost: ~2x if both run.

**2026-05-27 sync update**: vnc-f4 brought to canonical Q.3 layout — 18 batch (added 5 bridges: 1930/2030/2130/2230/2330) + 2 monitor + 4 insight = 24 tasks total. Mirrors DELL exactly. Achieved via `mcp__scheduled-tasks__create_scheduled_task` × 9 calls.

## Phase Q.2 changelog (2026-05-25) — Insight gen pipeline

New cron added: 4 `kira-insight-XXXX` daily fires (07/11/15/21 ICT) on DELL. Reads `skills/kira-research-report/prompts/insight_runner.md` — extracts 3 strongest sections from each published report's `en.html`, gens 3 insights × 3 locales = 9 `insight_translations` rows.

Multi-fire split same pattern as Q.1:
- Stage E: extract + publish 3 EN insights
- Stage J: translate to JA + publish
- Stage K: translate to KO + publish

Source of truth for stage = row count in `insight_translations` (per `insight_id`): `< 3 EN` → stage_en; `< 3 JA` → stage_ja; `< 3 KO` → stage_ko. No DB schema change.

Question-form H2 per locale via `prompts/question_templates.md`:
- EN allows `?` (e.g. "How large is X?")
- JA/KO use 体言止め / 명사형 (no `？`/`?` — translator anti-pattern rule)
- FAQ JSON-LD restores interrogative form for AI Overviews indexing

Cost: ~4 × 150K tokens/day = 600K/day Insight (~10% of batch quota).

## Phase Q.4 changelog (2026-05-28) — auto-recovery for stale claims

**Root cause for build**: pre-dawn queue audit on 2026-05-28 05:41 ICT found 4 rows stuck on `*_in_progress` for 5.5h-21h (palm-oil EN, real-estate JA, tourism JA, digital-banking JA). Each fire had committed `claim` then died (Claude session crash, machine sleep, network blip, sub-agent hang past timeout, anti-positioning retry-loop hard-stop) BEFORE producing output. Pre-Q.4 the only recovery was manual unstuck. The 21h-stuck rows burned a full day of queue capacity silently — Henry only noticed because he asked for an overnight summary.

**What changed**:

- **New column `claimed_at`** in `data/report_queue.csv` (ISO 8601 UTC timestamp). Set at claim, cleared on success/failure/auto-recover.
- **New script** `skills/kira-research-report/scripts/audit-queue.mjs` — idempotent CSV schema migrator + 90-min stale-claim detector. 90-min = 2× the 45-min hard stage timeout, wide margin to never kill a legit-running stage. Strike-1 reverts to prior stage + appends `auto-recovered <iso>` note to error_log. Strike-2 (row's error_log already contains "auto-recovered") escalates to `error` instead of looping — real bugs surface for manual review.
- **New Step 0.5** in `batch_runner.md` runs the audit before stage routing every fire. Single `batch: auto-recover N stale claim(s)` commit per fire that finds stale rows; zero overhead when queue is clean (idempotent — no disk write).
- **Steps 2 / 3 / 4 / 5.3d / 7** in batch_runner.md set claimed_at on claim and clear it on every stage transition (success or failure).

**Implication for throughput**: a fire that would previously have wasted hours on a stuck slug now self-heals on the next fire. Theoretical worst case before Q.4 = stuck row consumed slot indefinitely; after Q.4 = stuck row consumed 1 wasted fire (the one that died) + auto-recover commit on the next, then retries on the fire after that. Net loss = ~1 fire (~45 min) instead of unbounded.

Commit: `012bb31`.

## Phase Q.7 changelog (2026-07-29) — 22 scheduled task gom về 1

**Chốt cuối: 1 routine `kira`, 4 fire/ngày, ~1 report/ngày. Đã thực thi xong.**
Mục dưới đây là bản nháp giữa chừng (gom về 2, giữ nguyên số fire) — giữ lại để
thấy đường đi của quyết định, KHÔNG phải trạng thái hiện tại.

### Bản nháp giữa chừng (gom về 2 — superseded trong cùng ngày)

**Lý do**: Henry mở panel Routines/Scheduled thấy 22 dòng `kira-batch-*` +
`kira-insight-*`, mỗi dòng prompt body giống hệt nhau, chỉ khác giờ. Không đọc
được, không sửa được hàng loạt, và mỗi lần đổi playbook path phải sửa 22 file
SKILL.md tay.

**Cái gì đổi**: chỉ là *biểu thức cron* — 18 dòng `0 H * * *` (H = 0..17) gộp
thành `0 0-17 * * *`; 4 dòng insight gộp thành `0 7,11,15,21 * * *`. Số fire, giờ
fire, prompt, playbook, throughput đều giữ nguyên. Không đụng gì trong repo pipeline.

**Cái gì KHÔNG đổi được**: không tách được thành task "gen" và task "dịch" như
mental model ban đầu — stage routing phụ thuộc trạng thái queue, không phụ thuộc
đồng hồ. Tách theo giờ sẽ làm 1 trong 2 task fire rỗng còn task kia dồn việc.
2 task hiện tại chia theo **pipeline** (report / insight), mỗi cái đã tự làm cả
gen lẫn dịch.

**Runbook**: `skills/kira-research-report/prompts/routines_consolidate.md`.
Phải chạy từ Claude Code trên máy Windows giữ scheduled tasks — session trên
web/mobile không truy cập được `C:\Users\<user>\.claude\scheduled-tasks\`.

**Chưa đo**: throughput sau khi gom (Step 6 của runbook). Nếu scheduler skip fire
khi lần chạy trước của cùng task còn sống thì phải bù bằng cron dày hơn.

**Đính chính 2026-07-29 (sau khi thấy ảnh panel Routines)**: bản Q.7 đầu tiên giả
định máy đang chạy layout Q.6 (hourly, cùng phút 0) nên kết luận "gom = không đổi
gì". Sai — máy chạy layout Q.3 nhịp 45 phút, phút lệch nhau, **không gộp nguyên
trạng được**. Runbook đã bổ sung Case A (cùng phút → gộp không đổi) / Case B
(lệch phút → buộc regularize, phải báo số fire trước/sau và hỏi Henry). Bài học:
memory note ghi "current schedule" không phải bằng chứng — panel Routines mới là.

### Gotcha phát hiện lúc thực thi (2026-07-29)

- **Tool approval lưu theo từng routine, không theo máy.** Routine mới tạo bắt
  đầu với 0 approval — đó là lý do Step 4 "Run now" bắt buộc, không bỏ qua được.
  (Ở đây `kira` chạy trót lọt vì allowlist user-level `~/.claude/settings.json`
  đã phủ Bash/Read/git — xem [[feedback_scheduled_task_cwd_parent]].)
- **Bật lại routine sau khi Paused → scheduler chạy bù dồn dập.** 22 routine nổ
  liên tiếp cách nhau ~2 phút, nhiều fire chồng nhau trong cùng working tree.
  Cơ chế detect-concurrent-fire (xem [[feedback_batch_fire_shared_workdir_overlap]])
  gánh được phần batch, nhưng **insight thì không có claim** — 2 fire insight cùng
  chạy có thể sinh dư insight, phải dọn về đúng 3
  (xem [[feedback_insight_fires_no_claim_race]]). Gom về 1 routine giãn 3 tiếng
  xoá hẳn lớp rủi ro này.
- **`delete_scheduled_task` là thao tác an toàn**: chỉ gỡ khỏi scheduler + archive
  run session cũ. SKILL.md ở lại trên đĩa, session đang chạy dở vẫn chạy tới xong
  và vẫn commit bình thường.

See also: [[project_tool_gen_report]] · [[reference_kira_research]] · [[feedback_sparticuz_chromium_vercel]] · [[project_o_studio_credits]] · [[project_q_insight_runner]]
