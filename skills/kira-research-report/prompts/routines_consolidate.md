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

## Step 0 — Kiểm tra pipeline có đang chạy không

Trước khi gom, xem hệ thống có sống không — gom một cỗ máy đã tắt thì không phát
hiện được là nó tắt.

```bash
git log origin/main --format='%ad %s' --date=short | grep -m5 'batch:'
```

Commit `batch:` gần nhất cách hôm nay > 2 ngày trong khi queue còn hàng `pending`
→ pipeline đang dừng. Nguyên nhân hay gặp, kiểm theo thứ tự:

1. **Routine bị Paused** — panel Routines hiện chip `Paused` trên từng dòng. Bấm bỏ pause.
2. **Máy tắt / offline** — routine `Local` chỉ chạy khi máy thức và online.
3. **Cửa sổ Claude Code đang treo ở permission prompt** — chặn mọi fire sau đó.
   Xem `feedback_scheduled_task_cwd_parent.md` phần recovery.
4. **Hàng kẹt `*_in_progress`** — `node skills/kira-research-report/scripts/audit-queue.mjs`
   sẽ revert; nhưng script này chỉ chạy trong fire, mà fire thì đang không chạy.

Ghi trạng thái tìm được vào output. **Fix cái này trước, gom sau** — nếu không thì
sau khi gom sẽ không biết throughput tụt là do gom hay do máy vốn đã tắt.

---

## Nguyên tắc: giữ nguyên giờ fire nếu gộp được; nếu không, nói rõ đã đổi gì

Gom = hợp nhất tập giờ đang có vào một biểu thức cron. Có 2 trường hợp, kiểm ở
Step 2 rồi mới quyết:

**Case A — mọi fire cùng một phút** (vd tất cả đều `0 H * * *`): gộp được nguyên
trạng. Hợp tập giờ lại, số fire và giờ fire không đổi một giây nào.

**Case B — phút khác nhau** (vd nhịp 45 phút: `0 0`, `45 0`, `30 1`, `15 2`…):
**không gộp nguyên trạng được.** Cron là **tích chéo** minute × hour — viết
`0,15,30,45 0-6 * * *` sẽ ra 28 fire chứ không phải 10 fire đúng giờ cũ. Không có
cách nào diễn tả một nhịp lệch phút bằng một dòng cron.

Case B bắt buộc phải **regularize** (đổi sang nhịp đều). Quy tắc:

- Giữ nguyên **cửa sổ giờ** (giờ sớm nhất → giờ muộn nhất của tập hiện tại).
  Cron hỗ trợ range bắc cầu qua nửa đêm dạng liệt kê: `0 17-23,0-6 * * *`.
- Chọn cadence đều gần nhất về **số fire/ngày**: hourly `0 <hours>`, hoặc mỗi 30
  phút `0,30 <hours>` nếu hourly làm tụt > 20% số fire.
- **Báo rõ số fire trước/sau** trong output — đây là thay đổi hành vi thật, không
  được im lặng nuốt.

Nếu số fire sau khi regularize lệch > 20% so với trước → dừng, hỏi Henry chọn
cadence, đừng tự quyết.

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

Gom theo họ, lấy **hợp của các giờ đang bật** (bỏ qua task `enabled: false`).
Trước hết phân loại Case A hay Case B (xem mục trên): **tập phút của họ đó có
đúng 1 giá trị không?**

### Case A — cùng một phút

Hợp tập giờ, giữ nguyên phút. Dạng liệt kê `0 h1,h2,h3 * * *` luôn an toàn hơn
dạng range khi tập giờ không liên tục.

Ví dụ (layout Q.6): batch 18 dòng `0 0 * * *` … `0 17 * * *` → `0 0-17 * * *`.

### Case B — nhiều phút khác nhau (layout Q.3, nhịp 45 phút)

Quan sát 2026-07-29: máy đang chạy **layout Q.3**, không phải Q.6 như memory ghi.
Batch overnight fire lúc 00:00 / 00:45 / 01:30 / 02:15 / 03:00 / 03:45 / 04:30 /
05:15 / 06:00 / 06:45 + block tối 17:00 / 17:45 / 18:30 + bridge 19:30–23:30.
Phút chạy vòng 00→45→30→15 nên **không có biểu thức cron nào khớp đúng**.

Cách làm:

1. Lấy giờ sớm nhất và muộn nhất của cửa sổ (vd 17:00 → 06:45 hôm sau).
2. Viết dạng liệt kê bắc cầu nửa đêm: `0 17-23,0-6 * * *` → **14 fire/ngày**.
3. So với số fire cũ (18). Lệch 22% → theo quy tắc, **hỏi Henry** chọn:
   - `0 17-23,0-6 * * *` = 14 fire/ngày (ít hơn 4, tiết kiệm quota)
   - `0,30 17-23,0-6 * * *` = 28 fire/ngày (nhiều hơn 10, ngốn quota hơn hẳn)
   - Giữ 18 fire mà vẫn 1 task thì không có nghiệm đẹp — cron không chia được 18
     fire vào cửa sổ 14 tiếng bằng nhịp đều.
4. Ghi số fire trước/sau vào output và vào memory note.

Nếu Step 1 cho ra tập giờ khác hoàn toàn hai kịch bản trên (task bị sửa tay) →
dùng tập giờ **thật**, áp lại quy tắc Case A / Case B.

## Step 3 — Tạo 2 task mới

Tạo TRƯỚC, xoá task cũ SAU (Step 5) — nếu tạo lỗi thì lịch cũ vẫn chạy.

### Task 1 — `kira-batch`

- cron: kết quả Step 2 (KHÔNG hardcode — phụ thuộc Case A hay Case B)
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

- cron: kết quả Step 2 (KHÔNG hardcode — 4 task insight cũng phải kiểm Case A/B)
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
