---
type: session
title: Stabilize migration Git fixtures — 2026-10-01
description:
  The v3.0 release-marker tests stopped copying a cached repository's .git and
  turned off fixture auto-maintenance; the cause of the CI ENOENT stays
  unconfirmed.
tags: [migrations, testing, ci]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-01 }
---

# Stabilize migration Git fixtures — 2026-10-01

Part of
[Migration test stability](../../../cycles/2026-10-migration-test-stability.md)

## Context

GitHub Actions runs 36898150297 and 36627477104 failed release-marker tests in
the v2.10→v3.0 migration suite with `ENOENT` copying
`/tmp/migrate-v30-*/.git/objects/<xx>`. The `markedAt` helper copied a cached,
already-migrated fixture, `.git` included, for each marker test. This branch
makes those fixtures independent of that copied object database, before the
pdocs cycle's branches lean on the gate.

## What Happened

The implementer (a subagent) read both CI logs. In each, the first marker test
(the one that builds and commits the cached fixture) passes. The next three fail
within milliseconds of one another, and the missing object directories rise in
fan-out order (`01 → 20 → 43`, `03 → 20 → 34`). Something deleted them while the
copy walked the tree.

- **`git commit` spawns `git maintenance run --auto --detach`**, confirmed with
  `GIT_TRACE` on local Git 2.56 and Linux Git 2.55 (CI's version).
- **The failure shape reproduces on demand.** A temporary background
  `git gc --prune=now` on the cached fixture, run during the copy, reproduced
  the CI error with the old copy (3 of 6 delay settings) and never with the fix
  (0 of 4).
- **It does not reproduce on its own.** On the old code, in a Linux Docker
  container with Bun 1.4.0 and Git 2.55, 6 full suites and 3 targeted loops
  showed no fixture `ENOENT`.
- **Bun's copy is probably not the cause.** Bun's recursive copy is a port of
  Node's JS implementation, which stats a directory it has just listed, so an
  `ENOENT` there means something else removed it. That conclusion comes from
  reading Bun's source; no side-by-side Bun/Node copy was run.

The review then measured the cached fixture: 223 loose objects, no packs. At
that size default auto-maintenance does nothing (traced on Git 2.56), so the
maintenance explanation is unlikely under defaults. **The cause stays
unconfirmed.** The fix does not depend on it: whatever removed the directories,
it happened inside `.git`, and `.git` is no longer copied.

## Changes Made

- **`markedAt`** (in `migrate-v2.10-to-v3.0.test.ts`) copies the cached tree
  with a filter that excludes only its root `.git`, then `git init`s and commits
  the snapshot as one commit. The tests read the snapshot, not its history: the
  migration reads history only when it moves files, and these runs move none.
  The review confirmed the migration's output is identical with and without the
  old `.git`. Every assertion is unchanged (ahead of pin, either marker ahead,
  equal pin and the 9.0.1/9.0.0 re-runs, the custom scaffold, the refusals,
  no-write).
- **The shared `git()` test helper** passes
  `-c maintenance.auto=false -c gc.auto=0`, so no fixture commit spawns
  background maintenance that could race a copy or the `afterAll` cleanup.
- **The two `dist/` copies** of the test file are rebuilt to match.
- `migrate-v2.9-to-v2.10.test.ts`'s `markedAt` needed nothing: it builds a fresh
  fixture from a generated scaffold, which has no `.git`. No other test in the
  four migration files copies a committed repository.

## Verification

- The marker tests (`-t "past the release"`): 20 local runs and 10 Linux runs
  (Bun 1.4.0, Git 2.55) by the implementer, 5 local runs by the reviewer; all 5
  pass on every run.
- All four migration test files with `--parallel=4`: 576 pass, 0 fail (three
  implementer runs, one reviewer run).
- The full source suite on Linux with the fix: 2 runs, no fixture `ENOENT`. The
  container also showed 26 failures that occur identically on the old code: it
  runs as root, so chmod-based tests can't work, and its formatter setup
  differs.
- The full gate (`npm run check`, in the pre-commit hook) passed on both
  commits: 1,412 pass, 0 fail.

Only repeated CI runs can show the flake is gone.

## Review

Census, read from this session's list of dispatchable agent types (the Agent
tool's roster):

- **`general-purpose`** (Tools: `*`) has shell access. Chosen, briefed for this
  branch, as the review of record.
- **`feature-dev:code-reviewer`** lists Glob, Grep, LS, Read, NotebookRead,
  WebFetch, TodoWrite, WebSearch, KillShell and BashOutput, with no `Bash`.
  Rejected on capability: it cannot start a shell.
- **`code-simplifier:code-simplifier`** and **`project-docs:docs-curator`** (All
  tools) have shell access. Rejected on fit: one does simplification, the other
  reviews documents.

The reviewer ran in two passes, and each listed the commands it ran:

- **First pass (the net diff): "Ready to merge: With fixes".** It ran:
  - a Bun `cpSync` filter probe, which showed only the root `.git` excluded;
  - the marker tests ×5 (5/5 each);
  - the four migration files with `--parallel=4` (576/0);
  - `check:dist` and `cmp` of the dist copies (clean, identical);
  - an instrumented scratch copy of the repository comparing the old full-`.git`
    copy with the new filter (identical migration output, 0 moves, 223 loose
    objects);
  - `GIT_TRACE` and `GIT_TRACE2` traces of commit-spawned maintenance.

  Its findings: the comment and commit message stated the cause as fact against
  the evidence, two definition-of-done items had no recorded evidence, and an
  optional suggestion to turn off fixture auto-maintenance. Cole approved all
  three: the comment now says the cause is unconfirmed, the helper's flags were
  added, and this record carries the evidence.

- **Second pass (the follow-up commit only): "Ready to merge: Yes".** It ran:
  - a `GIT_TRACE` commit matrix: with the helper's flags 0 maintenance lines,
    without them 3 (and either flag alone suffices);
  - a grep of every `git()` caller;
  - `check:dist` and `cmp` (clean, identical);
  - the marker tests ×5 (5/5 each);
  - the four migration files with `--parallel=4` (576/0);
  - the full v3.0 file ×4: 230 pass / 5 fail in 110 s on the first run (failure
    names not captured, while other work was editing the tree), then 235/0 three
    times at about 77 s;
  - `pmset -g log`, which showed no sleep.

## Follow-up

- Watch the next CI runs on `develop` for the marker-test `ENOENT`. If it
  returns, the cause is outside the copied `.git` and this item reopens.
- The v2.9→v2.10 suite's `afterAll` cleanup runs with Bun's default 5-second
  budget over every fixture root. That bears on
  [migration-tests-time-out-under-load](../../migration-tests-time-out-under-load/item.md),
  the cycle's other item. So does the review's one unexplained full-file run (5
  failures at 110 s against a usual 77 s), which looks like load and is the
  first lead for that item.

---

**Related Documents:**

- [Stabilize migration Git fixtures in CI](../item.md)
- [Test performance and CI reliability](../../test-performance/write-up.md)
