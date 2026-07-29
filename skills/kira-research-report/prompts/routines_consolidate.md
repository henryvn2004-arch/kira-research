# routines_consolidate.md — gom 22 routine về 1 (Phase Q.7)

Runbook tự chứa cho **một session Claude Code chạy trên máy Windows của Henry**
(máy đang giữ bộ routine `Kira batch *` / `Kira insight *`). Session này phải có
`mcp__scheduled-tasks`. Session Claude Code trên web/mobile **không chạy được**
runbook này — routine nằm ở `C:\Users\<user>\.claude\scheduled-tasks\`, ngoài repo.

---

## Mục tiêu (Henry chốt 2026-07-29)

**1 routine duy nhất. Mỗi ngày ra 1 report hoàn chỉnh EN + JA + KO.**

| | Trước | Sau |
|---|---|---|
| Số routine | 22 | **1** |
| Fires/ngày | 22 | **4** |
| Report/ngày | ~6 (thiết kế) | **1** |

---

## Vì sao 1 report = 3 fire, không phải 1

Không có routine "gen" và routine "dịch" riêng. Cả 18 routine `Kira batch *`
chạy **cùng một prompt** (`batch_runner.md`). Mỗi fire đọc trạng thái hàng trong
`data/report_queue.csv` rồi tự route:

```
pending → [fire 1: gen EN] → en_done → [fire 2: dịch JA] → ja_done → [fire 3: dịch KO + publish] → done
```

**Đừng gộp 3 stage vào 1 fire.** Đó là thiết kế trước Q.1 và nó đã hỏng: một fire
làm cả EN+JA+KO chạy 60–150 phút, và subagent dịch bị chặn bởi output cap
(~32K token/response) khi phải Write một lúc file ja.html ~67KB → treo hoặc ra
file cụt. Q.1 tách ra chính vì lỗi này. Giữ nguyên **1 fire = 1 stage**.

Nên: 3 fire/ngày = 1 report/ngày ở trạng thái ổn định.

## Fire thứ 4 để làm gì

Insight pipeline (`insight_runner.md`) cần fire riêng. Nếu bỏ hẳn, insight sẽ
ngừng sinh trong suốt thời gian còn queue (60 hàng pending ≈ 60 ngày). Nên giữ
1 fire/ngày cho insight, dispatch bằng giờ trong cùng một routine.

---

## Step 0 — Kiểm pipeline có đang chạy không

Gom một cỗ máy đã tắt thì sau đó không phân biệt được throughput tụt do gom hay
do máy vốn không chạy.

```bash
git log origin/main --format='%ad %s' --date=short | grep -m5 'batch:'
```

Commit `batch:` gần nhất cách hôm nay > 2 ngày mà queue còn hàng `pending`
→ pipeline đang dừng. Kiểm theo thứ tự:

1. **Routine bị Paused** — panel Routines hiện chip `Paused` trên từng dòng. Bỏ pause.
   (Trạng thái 2026-07-29: đúng là đang Paused hết, commit cuối 2026-07-21.)
2. **Máy tắt / offline** — routine `Local` chỉ chạy khi máy thức và online.
3. **Cửa sổ Claude Code treo ở permission prompt** — chặn mọi fire sau đó.
   Xem `feedback_scheduled_task_cwd_parent.md` phần recovery.
4. **Hàng kẹt `*_in_progress`** — chạy tay một lần:
   `node skills/kira-research-report/scripts/audit-queue.mjs`
   (2026-07-29 có 3 hàng kẹt: 2 `en_in_progress`, 1 `ja_in_progress`.)

**Fix xong mới sang Step 1.**

## Step 1 — Kiểm kê + backup

```
mcp__scheduled-tasks__list_scheduled_tasks
```

Chép nguyên bảng (`name`, `cron`, `enabled`, `nextRunAt`, `lastRunAt`) vào output
cuối — đây là bản backup duy nhất để rollback.

Mở 1 file SKILL.md mẫu để lấy **đường dẫn repo hardcode của máy này**:

```
C:\Users\<user>\.claude\scheduled-tasks\kira-batch-0000\SKILL.md
```

Đường dẫn khác nhau theo máy (`C:\Users\DELL\Kira Research\kira-research` trên
DELL, `C:\Users\vnc-f4\Rira Research\kira-research` trên vnc-f4). Lấy đúng cái
trong file, **đừng đoán**.

## Step 2 — Chọn 4 giờ fire

Ràng buộc:

- **Nằm trong cửa sổ máy bật.** Layout hiện tại chạy 17:00–06:45, tức Henry để
  máy chạy tối + đêm. Giữ trong khoảng đó.
- **Cách nhau ≥ 2 tiếng.** Một stage chạy 30–90 phút. Giãn ra thì không bao giờ
  có 2 fire chồng nhau — tránh luôn rủi ro scheduler skip fire khi lần chạy
  trước còn sống (rủi ro này là lý do bản gom 2-routine trước đó phải theo dõi 48h).
- **Tránh phút :00 nếu được** — nhưng ở đây fire ít nên không quan trọng.

Đề xuất: **18:00 · 21:00 · 00:00 · 03:00** → cron một dòng:

```
0 18,21,0,3 * * *
```

Ba fire đầu chạy batch, fire 03:00 chạy insight (Step 3). Nếu giờ máy bật khác,
đổi 4 con số cho khớp — giữ nguyên quy tắc giãn ≥ 2 tiếng.

## Step 3 — Tạo routine mới

Tạo TRƯỚC, xoá cũ SAU (Step 5).

- name: `kira`
- cron: kết quả Step 2 (đề xuất `0 18,21,0,3 * * *`)
- SKILL.md body:

```markdown
# kira — KIRA pipeline (report gen + dịch + insight)

Working directory (machine-specific override — BỎ QUA bước `git rev-parse --show-toplevel`
trong playbook; cron fire launch ở thư mục cha nên rev-parse luôn fail):

- Windows path: <REPO_WIN_PATH>
- Bash path:    <REPO_BASH_PATH>

`cd` vào đó trước khi làm bất cứ việc gì.

## Dispatch

Đọc giờ hiện tại:

```bash
date +%H
```

- Giờ == `03` → đọc và thực thi đầy đủ `skills/kira-research-report/prompts/insight_runner.md`
- Giờ khác  → đọc và thực thi đầy đủ `skills/kira-research-report/prompts/batch_runner.md`

## Quy tắc cứng

- **1 fire = 1 hàng = 1 stage.** Playbook tự chọn stage theo trạng thái queue
  (gen EN / dịch JA / dịch KO + publish). KHÔNG được gộp nhiều stage vào một fire —
  subagent dịch sẽ vượt output cap và treo.
- Queue rỗng hoặc thiếu env var → exit sạch, không commit.
```

Thay `<REPO_WIN_PATH>` / `<REPO_BASH_PATH>` bằng đường dẫn lấy ở Step 1.
Nếu giờ insight ở Step 2 khác `03`, sửa con số trong khối Dispatch cho khớp.

Câu "BỎ QUA `git rev-parse`" là **bắt buộc** — thiếu nó thì mọi fire chết ở dòng
đầu playbook với `not in git, no-op`. Lỗi này từng làm insight cron im lặng 2 ngày
(`feedback_scheduled_task_cwd_parent.md`).

## Step 4 — Verify trước khi xoá

```
mcp__scheduled-tasks__list_scheduled_tasks
```

- `kira` có mặt, `enabled: true`, `nextRunAt` rơi đúng 1 trong 4 giờ đã chọn.
- Bấm "Run now" một lần. Kết quả chấp nhận được:
  - claim + commit 1 stage, **hoặc**
  - `no pending work` / `missing env, no-op` (exit sạch).
  - Hiện permission prompt → thiếu allowlist ở user-level settings, xử theo
    `feedback_scheduled_task_cwd_parent.md` rồi thử lại.

**Chưa xanh thì chưa xoá routine cũ.**

## Step 5 — Xoá 22 routine cũ

Chỉ sau khi Step 4 xanh. Xoá toàn bộ `kira-batch-HHMM`, `kira-insight-HHMM`, kèm
mấy cái disabled từ thời trước (`kira-batch-01am`, `05am`, `05pm`, `1215pm`).
Giữ nguyên mọi routine KHÔNG thuộc 2 họ này.

Xong: panel Routines chỉ còn `kira` (+ routine ngoài KIRA nếu có).

## Step 6 — Theo dõi 1 tuần

**Đo baseline TRƯỚC khi kết luận.** Chạy ngay sau Step 5:

```bash
git log --format='%ad %s' --date=format:'%Y-W%V' | grep 'batch: complete' | awk '{print $1}' | sort | uniq -c
```

Lý do: layout 22 routine có thể đã không đạt thiết kế từ lâu. Đo 2026-07-29 cho
thấy nó chỉ ra ~4–5 report/ngày trong 3 tuần W22–W24, còn 6 tuần W25–W29 tụt về
**~0.3–0.6/ngày**. So 7 ngày sau khi gom với con số *thiết kế* (~6/ngày) sẽ kết
luận sai là "gom làm tụt throughput", trong khi 1/ngày là **tăng ~2 lần** so với
thực tế ngay trước đó.

Kỳ vọng sau khi gom: **1 report `done` mỗi ngày**, tức mỗi ngày 1 commit
`batch: complete <id> (EN+JA+KO, published)`.

```bash
git log --since="7 days ago" --format='%s' | grep -c 'batch: complete'
```

Chuỗi này đúng — khớp `batch_runner.md:430`. (Đừng gom nhóm message bằng `sed`
trước khi grep: `(EN+JA+KO, published)` không có chữ `for` nên các pipeline
`sed 's/for .*/for <id>/'` sẽ làm mỗi dòng thành một nhóm riêng và `head` cắt mất
— đã hố một lần vì chuyện này rồi kết luận sai là "chuỗi không tồn tại".)

**Đếm số fire thực sự nổ** để phân biệt nguyên nhân — đây là bước hay bị bỏ:

```bash
git log --since="7 days ago" --format='%s' | grep -c '^batch:'
```

Kỳ vọng ~21 (3 fire batch/ngày × 7). Ít fire nổ → máy tắt lúc 4 giờ đó, hoặc fire
bị permission prompt chặn — **không phải lỗi của việc gom**. Đủ fire nổ mà ít
report done → nghẽn thật trong pipeline (hàng `*_in_progress` kẹt, `error`,
subagent timeout).

**Tự động hoá thay vì nhờ owner nhắc**: tạo 1 task một lần bằng
`create_scheduled_task` với `fireAt` = ngày gom + 7 ngày (giờ nằm trong cửa sổ máy
bật), prompt chứa sẵn các lệnh trên + bảng baseline + yêu cầu tự ghi kết quả vào
memory rồi commit. Task tự tắt sau khi nổ. Bản 2026-07-29 dùng taskId
`kira-q7-measure`, fire 2026-08-05 19:30 ICT.

Ghi kết quả vào `project des/memory/project_batch_cron_system.md` mục Q.7.

---

## Hệ quả cần biết trước khi chốt

- **Throughput giảm còn ~1 report/ngày** (thiết kế cũ ~6/ngày). Queue 60 hàng
  pending → runway ~60 ngày thay vì ~10 ngày. Đây là lựa chọn có chủ đích của
  Henry, không phải bug.
- **Insight chậm lại tương ứng**: 1 fire/ngày, mỗi report cần tới 6 fire insight
  (E/J/K/T/TJ/TK) → insight của một report mất ~6 ngày mới đủ 4 bài × 3 thứ tiếng.
- Muốn nhanh hơn sau này: thêm giờ vào cron (vd `0 18,20,22,0,2,4 * * *` = 6
  fire/ngày = 2 report/ngày) — vẫn 1 routine, chỉ sửa 1 dòng.

## Rollback

Bảng ở Step 1 đủ để dựng lại y nguyên 22 routine: mỗi dòng → 1
`create_scheduled_task` với cron cũ + prompt body cũ (giống hệt nhau trong cùng họ).

---

See also: `project des/memory/project_batch_cron_system.md` ·
`project des/memory/feedback_scheduled_task_cwd_parent.md` ·
`project des/memory/project_machine_switch_checklist.md`
