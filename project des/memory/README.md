# Cross-machine session memory mirror

This directory is a checked-in mirror of Claude Code's local session memory for the kira-research project. It exists because Henry switches between machines mid-project and needs every Claude session — regardless of machine — to pick up the same accumulated knowledge.

## What's in here

20 short markdown notes (~110 KB total) covering:

- **user_henry.md** — owner profile, register, working style
- **feedback_*.md** — gotchas Claude has learned the hard way (Vercel rewrite parsing, Supabase storage delete protection, PowerShell JSON wrapping, etc.)
- **project_*.md** — substantive build phases (batch cron system, A+ blueprint flex layer, L.3 source tag overhaul, M.1 dual-language search, M.3 soft-delete workflow, etc.)
- **reference_kira_research.md** — external resource pointers (prod URL, repo, Supabase project, GH Actions)
- **MEMORY.md** — the index that links to all of the above

Read `MEMORY.md` first when starting a new session on a new machine — it's the table of contents.

## How a new-machine Claude session uses this

When you (Henry) start work on a different machine and tell Claude "tao đang ở máy mới, sync memory cho tao", Claude should:

1. Read `project des/memory/MEMORY.md` to see what topics have entries
2. Read the individual `.md` files relevant to whatever task is being requested
3. Copy these files back into the new machine's local Claude memory dir at:
   ```
   C:\Users\<user>\.claude\projects\C--Users-<user>-Rira-Research\memory\
   ```
   (or the macOS/Linux equivalent — `~/.claude/projects/.../memory/`)
4. Continue work with full context

The local memory dir is where Claude Code's runtime actually reads from — this checked-in mirror is just durable storage for cross-machine sync.

## How to keep it current

Memory files are NOT auto-synced. When a significant new chunk of knowledge accumulates in the local memory dir during a session (a new `project_*.md`, an updated MEMORY.md index, a new `feedback_*.md`), Claude should be asked to copy the updates here and commit.

Cadence: end of any session that produced a new memory file, or whenever Henry says "update memory lên repo luôn".

The canonical local path on machine `vnc-f4`:
```
C:\Users\vnc-f4\.claude\projects\C--Users-vnc-f4-Rira-Research\memory\
```

## Why not symlinks / auto-sync

Symlinks don't survive across machines. A pre-commit hook could auto-sync, but Henry doesn't run CLIs and a hook running on Claude's behalf would need elevated permissions. Manual sync at "ship the increment" moments is the simplest reliable pattern, and matches Henry's workflow of explicit "push merge deploy" requests.

## Privacy / secrets check

None of the files in this directory contain secret VALUES (no API keys, JWT tokens, passwords, or PII beyond what's already in the public CLAUDE.md). They reference variable NAMES (`PDF_RENDER_SECRET`, `SUPABASE_SERVICE_KEY`) which are stored as Vercel env vars + Windows User env vars — never committed.

The Supabase project ID (`iygoynbnscednfzdsflc`) appears in some notes; that's an identifier, not a secret — auth comes from the service key which stays in env.
