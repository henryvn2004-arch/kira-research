# Backup 22 routine trước khi gom (Phase Q.7 — 2026-07-29)

Chụp bằng `mcp__scheduled-tasks__list_scheduled_tasks` ngay trước Step 3.
Đây là bản rollback: mỗi dòng → 1 `create_scheduled_task` với cron tương ứng.
Prompt body giống hệt nhau trong cùng một họ — lấy mẫu từ
`C:\Users\DELL\.claude\scheduled-tasks\kira-batch-0000\SKILL.md` (họ batch) và
`...\kira-insight-0700\SKILL.md` (họ insight). Các thư mục SKILL.md vẫn còn trên
đĩa sau khi delete (tool chỉ gỡ khỏi scheduler), nên nội dung prompt không mất.

Tất cả 22 routine đều `enabled: true` tại thời điểm chụp.

## Họ batch (18)

| taskId | cron | lastRunAt (UTC) |
|---|---|---|
| kira-batch-0000 | `0 0 * * *` | 2026-07-29T04:40:06Z |
| kira-batch-0045 | `45 0 * * *` | 2026-07-29T04:40:07Z |
| kira-batch-0130 | `30 1 * * *` | 2026-07-29T04:40:07Z |
| kira-batch-0215 | `15 2 * * *` | 2026-07-29T04:42:06Z |
| kira-batch-0300 | `0 3 * * *` | 2026-07-29T04:42:06Z |
| kira-batch-0345 | `45 3 * * *` | 2026-07-29T04:42:07Z |
| kira-batch-0430 | `30 4 * * *` | 2026-07-29T04:44:07Z |
| kira-batch-0515 | `15 5 * * *` | 2026-07-29T04:44:07Z |
| kira-batch-0600 | `0 6 * * *` | 2026-07-21T01:23:31Z |
| kira-batch-0645 | `45 6 * * *` | 2026-07-21T01:24:31Z |
| kira-batch-1700 | `0 17 * * *` | 2026-07-21T01:24:32Z |
| kira-batch-1745 | `45 17 * * *` | 2026-07-21T01:25:32Z |
| kira-batch-1830 | `30 18 * * *` | 2026-07-21T01:25:32Z |
| kira-batch-1930 | `30 19 * * *` | 2026-07-21T01:26:32Z |
| kira-batch-2030 | `30 20 * * *` | 2026-07-21T01:26:33Z |
| kira-batch-2130 | `30 21 * * *` | 2026-07-21T01:27:32Z |
| kira-batch-2230 | `30 22 * * *` | 2026-07-21T01:27:32Z |
| kira-batch-2330 | `30 23 * * *` | 2026-07-21T01:27:32Z |

description (batch, thay HH:MM cho khớp):
`KIRA batch — fire HH:MM ICT, gen 1 topic × EN/JA/KO from data/report_queue.csv`
(6 fire bridge 1930–2330 dùng: `... advance 1 row by 1 stage (Q.1 split: EN→JA→KO)`)

## Họ insight (4)

| taskId | cron | lastRunAt (UTC) |
|---|---|---|
| kira-insight-0700 | `0 7 * * *` | 2026-07-21T01:25:32Z |
| kira-insight-1100 | `0 11 * * *` | 2026-07-20T04:05:49Z |
| kira-insight-1500 | `0 15 * * *` | 2026-07-20T08:05:43Z |
| kira-insight-2100 | `0 21 * * *` | 2026-07-21T01:26:32Z |

description (insight):
`KIRA insight — fire HH:MM ICT, advance 1 report's Insight pipeline by 1 stage (EN→JA→KO)`

## Routine thay thế

| taskId | cron | tạo lúc |
|---|---|---|
| kira | `0 18,21,0,3 * * *` | 2026-07-29 |

Đường dẫn repo hardcode dùng cho máy này (DELL):
- Windows: `C:\Users\DELL\Kira Research\kira-research`
- Bash: `/c/Users/DELL/Kira Research/kira-research`
