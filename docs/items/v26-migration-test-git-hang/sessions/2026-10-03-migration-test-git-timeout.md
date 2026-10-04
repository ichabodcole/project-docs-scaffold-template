---
type: session
title: Migration test git spawns bounded — 2026-10-03
description:
  The v2.6, v2.9 and v2.10 migration tests harden their fixture git calls and
  kill one that hangs after 10 seconds, naming the command.
tags: [project-docs, migrations, tests]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# Migration test git spawns bounded — 2026-10-03

Part of
[check and upgrade-skill fixes](../../../cycles/_archive/2026-10-check-and-upgrade-fixes.md)

## Context

On 2026-10-02 two v2.6 migration tests hung in `git add -A` until the 30 s
per-file budget killed them; a re-run passed. That file's fixture `git()` helper
lacked the hardening the v2.10 tests already had, and a hung spawn showed up
only as a test timeout with `exited null`.

## What Happened

- **The same hardening in three files.** The v2.6, v2.9 and v2.10 migration test
  files pass `-c maintenance.auto=false -c gc.auto=0` to every fixture git call
  (v2.10 already did), and their fixture copies leave out a top-level `.git`.
  v2.8's tests have no fixture git helper.
- **A hung git fails fast.** Fixture `git()` calls run with a 10 s
  `GIT_TIMEOUT_MS` and SIGKILL. A timeout throws before the exit-code check,
  naming the command. cookiecutter and `git archive` stay unbounded: they are
  read-only or local, and not on the path that hung.
- The cause of the original hang is still unknown; the item's third box stays
  open for a recurrence.

## Verification

- A throwaway test ran the real helper on a git that blocks; it failed in 10,002
  ms with the command named.
- Each changed file ran three times, all green (v2.6 ~20 s, v2.9 ~20 s, v2.10
  ~73 s). The gate passed with 1,587 tests.

## Review

Census, read from this session's list of dispatchable agent types (the Agent
tool's roster):

- **`general-purpose`** (Tools: `*`) has shell access. Chosen, briefed for this
  branch, as the review of record.
- **`feature-dev:code-reviewer`** lists Glob, Grep, LS, Read, NotebookRead,
  WebFetch, TodoWrite, WebSearch, KillShell and BashOutput, with no `Bash`.
  Rejected on capability.
- **`code-simplifier:code-simplifier`** and **`project-docs:docs-curator`** (All
  tools) have shell access. Rejected on fit.

**Verdict: "Ready to merge: Yes".** It extracted the real helper into a scratch
probe and blocked git on a named pipe: a throw at 10,001 ms naming the command,
no git left behind. It timed `init`, `add -A`, `commit` and `status` on the
v6.3.0, v8.1.0 and current scaffolds (under 10 ms each, so the bound has more
than 1,000x headroom), confirmed the `.git` filters change no assertion and
every helper still spawns through `childEnv()`, ran each changed file three
times and ran the gate (1,587 pass). Its one note, that SIGKILL does not reach a
grandchild a git alias starts, is left as it is: the hang was `git add`, which
starts none.

---

**Related Documents:**

- [A v2.6 migration test's git add hangs until the test budget kills it](../item.md)
