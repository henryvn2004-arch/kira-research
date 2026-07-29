# routines_consolidate.md — gom 22 scheduled task về 2 (Phase Q.7)

Runbook tự chứa cho **một session Claude Code chạy trên máy Windows của Henry**
(máy nào đang giữ bộ `kira-*` scheduled tasks). Session này phải có
`mcp__scheduled-tasks` — session Claude Code trên web/mobile KHÔNG chạy được
runbook này vì scheduled tasks nằm ở `C:\Users\<user>\.claude\scheduled-tasks\`,
không nằm trong repo.

---

## Tại sao gom

Trước Q.7 có **22 task**, chia 2 họ, mỗi họ dùng **prompt body giống hệt nhau**,
chỉ khác đúng một thứ: giờ trong cron.

| Họ | Số task | Prompt | Việc thật sự làm |
|---|---|---|---|
| `kira-batch-HHMM` | 18 | `batch_runner.md` | EN gen **+** JA/KO translate + publish |
| `kira-insight-HHMM` | 4 | `insight_runner.md` | Insight EN gen **+** JA/KO translate |

"Gen" và "dịch" **không phải 2 task khác nhau** — mỗi fire đọc trạng thái hàng
trong `data/report_queue.csv` (batch) hoặc số dòng `insight_translations`
(insight) rồi tự quyết định stage kế tiếp. Vì thế 18 task chỉ là **1 task lặp 18
lần/ngày**, và cron chuẩn 5 trường thừa sức diễn tả bằng một dòng.

Sau Q.7: **2 task**, cùng số lần fire/ngày, cùng giờ, không đổi throughput.

---

## Nguyên tắc bắt buộc: KHÔNG được đổi giờ fire

Gom = hợp nhất tập giờ đang có vào một biểu thức cron, **giữ nguyên từng giờ**.
Không "làm tròn", không đổi timezone, không thêm/bớt fire. Nếu số fire/ngày sau
khi gom khác trước khi gom → dừng lại, báo Henry, đừng tự sửa.

---

## Step 1 — Kiểm kê trạng thái thật (không tin trí nhớ)

```
mcp__scheduled-tasks__list_scheduled_tasks
```

Ghi lại cho từng task: `name`, `cron`, `enabled`, `nextRunAt`, `lastRunAt`.
Chép nguyên bảng này vào output cuối — đây là bản backup duy nhất nếu cần rollback.

Rồi mở 1 file SKILL.md mẫu của mỗi họ để lấy **đường dẫn repo hardcode của máy này**:

- `C:\Users\<user>\.claude\scheduled-tasks\kira-batch-0000\SKILL.md`
- `C:\Users\<user>\.claude\scheduled-tasks\kira-insight-0700\SKILL.md`

Đường dẫn khác nhau theo máy (`C:\Users\DELL\Kira Research\kira-research` trên
DELL, `C:\Users\vnc-f4\Rira Research\kira-research` trên vnc-f4). Lấy đúng cái
đang có trong file, **đừng đoán**.

## Step 2 — Tính cron gộp

Gom theo họ, lấy **hợp của các giờ đang bật** (bỏ qua task `enabled: false`),
minute giữ nguyên.

Trạng thái kỳ vọng (theo Q.6, xác nhận lại bằng Step 1):

| Họ | Cron đang có | Cron gộp |
|---|---|---|
| batch | `0 0 * * *` … `0 17 * * *` (18 dòng, hourly) | `0 0-17 * * *` |
| insight | 4 dòng tại giờ `7,11,15,21` | `0 7,11,15,21 * * *` |

Nếu Step 1 cho ra tập giờ khác bảng này (task bị xoá/thêm tay từ 2026-05-31) →
dùng tập giờ **thật**, viết dạng liệt kê `0 h1,h2,h3 * * *`. Dạng liệt kê luôn
an toàn hơn dạng range khi tập giờ không liên tục.

## Step 3 — Tạo 2 task mới

Tạo TRƯỚC, xoá task cũ SAU (Step 5) — nếu tạo lỗi thì lịch cũ vẫn chạy.

### Task 1 — `kira-batch`

- cron: kết quả Step 2 (kỳ vọng `0 0-17 * * *`)
- SKILL.md body:

```markdown
# kira-batch — KIRA report pipeline (gen EN + dịch JA/KO + publish)

Working directory (machine-specific override — BỎ QUA bước `git rev-parse --show-toplevel`
trong playbook, cron fire launch ở thư mục cha nên rev-parse luôn fail):

- Windows path: <REPO_WIN_PATH>
- Bash path:    <REPO_BASH_PATH>

`cd` vào đó rồi đọc và thực thi đầy đủ:

  skills/kira-research-report/prompts/batch_runner.md

Playbook đó tự chứa: audit queue (Step 0.5) → claim 1 hàng → advance đúng 1 stage
(EN gen / JA translate / KO translate + publish) → commit + push.

1 fire = 1 hàng = 1 stage. Nếu queue rỗng hoặc thiếu env var → exit sạch, không commit.
```

### Task 2 — `kira-insight`

- cron: kết quả Step 2 (kỳ vọng `0 7,11,15,21 * * *`)
- SKILL.md body: y hệt trên, đổi 2 chỗ — tiêu đề và dòng playbook:

```markdown
# kira-insight — KIRA insight pipeline (gen EN + dịch JA/KO)

Working directory (machine-specific override — BỎ QUA bước `git rev-parse --show-toplevel`
trong playbook, cron fire launch ở thư mục cha nên rev-parse luôn fail):

- Windows path: <REPO_WIN_PATH>
- Bash path:    <REPO_BASH_PATH>

`cd` vào đó rồi đọc và thực thi đầy đủ:

  skills/kira-research-report/prompts/insight_runner.md

1 fire = 1 report = 1 stage (E / J / K / T / TJ / TK). Nếu không còn report nào
thiếu insight → exit sạch, không commit.
```

Thay `<REPO_WIN_PATH>` / `<REPO_BASH_PATH>` bằng đường dẫn lấy ở Step 1.
Cái override "bỏ qua git rev-parse" là **bắt buộc** — thiếu nó thì mọi fire chết
ở dòng đầu playbook với `not in git, no-op` (lỗi này đã làm insight cron im lặng
2 ngày, xem `feedback_scheduled_task_cwd_parent.md`).

## Step 4 — Verify trước khi xoá

```
mcp__scheduled-tasks__list_scheduled_tasks
```

- `kira-batch` + `kira-insight` có mặt, `enabled: true`, `nextRunAt` hợp lý.
- Chạy "Run now" 1 lần trên `kira-batch`. Kết quả chấp nhận được:
  - claim + commit 1 stage, **hoặc**
  - `no pending work` / `missing env, no-op` (exit sạch).
  - Nếu hiện permission prompt → thiếu allowlist ở user-level settings, xử theo
    `feedback_scheduled_task_cwd_parent.md` rồi thử lại. **Chưa xanh thì chưa xoá task cũ.**

## Step 5 — Xoá 22 task cũ

Chỉ làm sau khi Step 4 xanh. Xoá toàn bộ `kira-batch-HHMM` và `kira-insight-HHMM`
(kèm mấy task disabled từ thời trước: `kira-batch-01am`, `05am`, `05pm`, `1215pm`).
Giữ nguyên mọi task KHÔNG thuộc 2 họ này.

Xong: `list_scheduled_tasks` chỉ còn `kira-batch` + `kira-insight` (+ task ngoài KIRA nếu có).

## Step 6 — Theo dõi 48h (rủi ro duy nhất của việc gom)

18 task riêng thì 2 fire chồng nhau là 2 job độc lập. Gom về 1 task, **nếu
scheduler bỏ qua fire khi lần chạy trước của cùng task còn sống**, throughput sẽ
tụt — một fire batch chạy 30–90 phút trong khi cron là hàng giờ.

Cách đo (không cần đoán): sau 2 ngày chạy

```bash
git log --since="2 days ago" --format='%ad %s' --date=short | grep -c '^.* batch:'
```

So với 2 ngày trước khi gom. Nếu số commit `batch:` giảm rõ (>30%) → scheduler có
serialize. Cách chữa, theo thứ tự ưu tiên:

1. Đổi cron batch thành `0,30 0-17 * * *` (fire dày hơn, fire bị skip vẫn còn cái sau bù).
2. Nếu vẫn thấp: tách batch làm 2 task lệch pha (`0 0-17` + `30 0-17`) — tổng 3 task,
   vẫn gọn hơn 22 nhiều.

Ghi kết quả đo vào `project des/memory/project_batch_cron_system.md` mục Q.7.

---

## Rollback

Bảng ở Step 1 là đủ để dựng lại y nguyên 22 task: mỗi dòng → 1
`create_scheduled_task` với cron cũ + prompt body cũ (giống hệt nhau trong cùng họ).

---

See also: `project des/memory/project_batch_cron_system.md` ·
`project des/memory/feedback_scheduled_task_cwd_parent.md` ·
`project des/memory/project_machine_switch_checklist.md`
