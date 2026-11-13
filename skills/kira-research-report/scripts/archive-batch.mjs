#!/usr/bin/env node
// Save / fetch one report's artifact folder in the PRIVATE kira-pipeline repo.
//
// The artifacts of a report (full EN/JA/KO/ZH HTML, PDFs, cover, naming/players/
// exhibits JSON) are the paid product, so they are never committed to this
// public repo: skills/kira-research-report/outputs/ is git-ignored. Between runner
// fires (and between machines) they travel through kira-pipeline/report-archive/.
//
//   node archive-batch.mjs push <id> [--msg "<commit message>"]
//        copy outputs/batch/<id>/ (except PDFs: Supabase Storage is canonical for
//        them) into report-archive/batch/<id>/ on kira-pipeline main, commit and
//        push (retries when someone else pushed first)
//   node archive-batch.mjs pull <id> [--force]
//        copy report-archive/batch/<id>/ from kira-pipeline origin/main into
//        outputs/batch/<id>/ (only files missing locally, unless --force)
//
// kira-pipeline is found like the brain: the parent of env KIRA_BRAIN_DIR
// (<repo>/brain), else ../kira-pipeline next to this repo. Neither the working
// tree nor the branch of that clone is touched: pull reads origin/main, push
// works in a throw-away worktree.
//
// Exit codes: 0 ok · 2 usage / kira-pipeline not found · 3 nothing archived for <id> (pull)
// · 1 anything else (fetch/push failed).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { positionals: [cmd, id], values: opt } = parseArgs({
  allowPositionals: true,
  options: { msg: { type: 'string' }, force: { type: 'boolean', default: false } },
});

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'skills', 'kira-research-report', 'outputs', 'batch');
const fail = (code, msg) => { console.error(msg); process.exit(code); };

if (!['push', 'pull'].includes(cmd) || !id || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
  fail(2, 'usage: archive-batch.mjs push <id> [--msg "..."] | pull <id> [--force]');
}

const PIPE = process.env.KIRA_BRAIN_DIR
  ? path.dirname(path.resolve(process.env.KIRA_BRAIN_DIR))
  : path.resolve(ROOT, '..', 'kira-pipeline');
if (!fs.existsSync(path.join(PIPE, '.git')) || !fs.existsSync(path.join(PIPE, 'CLAUDE.md'))) {
  fail(2, `kira-pipeline not found at ${PIPE} (set KIRA_BRAIN_DIR to its brain/ folder)`);
}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const REL = `report-archive/batch/${id}`;
const local = path.join(OUT, id);

if (cmd === 'pull') {
  try { git(PIPE, 'fetch', '-q', 'origin', 'main'); } catch (e) { fail(1, `fetch failed: ${e.stderr || e.message}`); }
  if (!git(PIPE, 'ls-tree', '--name-only', 'origin/main', '--', REL)) fail(3, `nothing archived for ${id}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-pull-'));
  try {
    const tar = execFileSync('git', ['archive', 'origin/main', REL], { cwd: PIPE, maxBuffer: 1 << 28 });
    execFileSync('tar', ['-x', '-C', tmp], { input: tar });
    const copied = [];
    const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      const dest = path.join(local, path.relative(path.join(tmp, REL), p));
      if (fs.existsSync(dest) && !opt.force) return;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(p, dest);
      copied.push(path.relative(local, dest));
    });
    walk(path.join(tmp, REL));
    console.log(`pull ${id}: ${copied.length} file(s) restored${copied.length ? ' (' + copied.join(', ') + ')' : ''}`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  process.exit(0);
}

// push
if (!fs.existsSync(local) || !fs.readdirSync(local).length) fail(2, `nothing to save: ${local} is missing or empty`);
const who = ['user.name', 'user.email'].every(k => { try { return git(PIPE, 'config', k); } catch { return ''; } })
  ? [] : ['-c', 'user.name=henryvn2004-arch', '-c', 'user.email=henryvn2004@gmail.com'];

async function push() {
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'archive-push-'));
  const cleanup = () => {
    try { git(PIPE, 'worktree', 'remove', '--force', wt); } catch { /* already removed */ }
    fs.rmSync(wt, { recursive: true, force: true });
  };
  try {
    for (let attempt = 1; attempt <= 4; attempt++) {
      git(PIPE, 'fetch', '-q', 'origin', 'main');
      git(PIPE, 'worktree', 'add', '--detach', '-f', wt, 'origin/main');
      fs.cpSync(local, path.join(wt, REL), { recursive: true, filter: f => !f.endsWith('.pdf') });   // PDFs: Supabase Storage is canonical
      git(wt, 'add', '-A', REL);
      if (!git(wt, 'status', '--porcelain')) { console.log(`push ${id}: already archived, nothing to commit`); return 0; }
      git(wt, ...who, 'commit', '-q', '-m', opt.msg || `batch: save ${id}`);
      try {
        git(wt, 'push', '-q', 'origin', 'HEAD:main');
        console.log(`push ${id}: saved to kira-pipeline ${REL} (${git(wt, 'rev-parse', '--short', 'HEAD')})`);
        return 0;
      } catch (e) {
        if (attempt === 4) { console.error(`push failed: ${e.stderr || e.message}`); return 1; }
        cleanup();                                             // someone pushed first: start again on top of it
        fs.mkdirSync(wt, { recursive: true });
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  } catch (e) {
    console.error(`push failed: ${e.stderr || e.message}`);
    return 1;
  } finally { cleanup(); }
}

process.exitCode = await push();
