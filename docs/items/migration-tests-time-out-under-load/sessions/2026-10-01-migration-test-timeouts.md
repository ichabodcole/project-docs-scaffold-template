---
type: session
title: Migration test timeouts — 2026-10-01
description:
  Reproduced the gate's random 5-second timeouts under load, traced them to
  lazily built fixtures, and gave the five spawning test files a 30-second
  budget.
tags: [migrations, testing, timeouts]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-01 }
---

# Migration test timeouts — 2026-10-01

Part of
[Migration test stability](../../../cycles/2026-10-migration-test-stability.md)

## Context

The full gate failed at random when migration tests passed bun's 5-second
default timeout, and passed on an unchanged retry. On 2026-09-29 the failures
were a v3.0 wiring-witness test and an unnamed hook. On 2026-10-01, after the
suite moved to four file workers, a pre-commit run failed at 122 s (usual about
80 s), and a review run of the v3.0 file had 5 failures at 110 s.

## What Happened

The implementer (a subagent) reproduced the failures on the first try by running
two gate-style suites at once: 6 of 6 loaded runs failed, each failure a timeout
at 5001–5007 ms. The tests that failed:

- v3.0's case-only-clash preflight test;
- v2.10's seed-logic equality test and its fixture tests;
- v3.0's owned-files Prettier test;
- the AGENTS.md note test in `post-gen-hook.test.ts`, which is not a migration
  test.

**Cause:** each migration test file builds its generated fixtures lazily
(`git archive` plus cookiecutter), so the first test to touch them pays for the
build: 2–3 s idle, past 5 s under load. A test killed mid-build leaves the cache
empty (the spawn throws, so the cache stays `null`), and the next test pays
again. That is why failures came in clusters, and why a run could show 23
failures from 10 timeouts.

The unnamed hook from 2026-09-29 was a cleanup `afterAll`: bun labels any timed
out hook "a beforeEach/afterEach hook". None of these files has a `beforeEach`
or `afterEach`.

Measured (idle → two suites at once → plus ten CPU burners): the slowest test on
the default budget went 2.8 s → 5.3–5.5 s → 5.7 s, and the worst seen in the
heaviest verification run was 12.7 s.

## Changes Made

- **The four migration test files and `scripts/post-gen-hook.test.ts`** call
  `setDefaultTimeout(SPAWN_BUDGET)` with a 30-second budget before their first
  hook or test. Each call carries a comment giving the measured durations. Every
  other test file keeps the 5-second default.
- **The two `dist/` copies** of each migration test are rebuilt.

Thirty seconds is more than five times the worst default-budget test at the load
where the gate failed, and more than twice the worst under much heavier load. It
also matches the v3.0 file's existing cleanup budget.

A per-file budget rather than per-test budgets, because bun has no
per-`describe` timeout and per-test budgets would break whenever test order
changes which test builds a fixture. It costs the fast tests nothing: bun cannot
interrupt a synchronous test anyway, only kill a spawned child. Only one of the
472 migration tests is async. The fixture build stays lazy, so a pure or
filtered run never pays for cookiecutter. `post-gen-hook.test.ts` is outside the
item's "migrations" scope; it is included because it timed out under the same
load.

## Verification

- **The implementer:**
  - 10 loaded runs after the fix (6 with two suites at once, 4 with ten CPU
    burners added), all passing;
  - the pre-commit gate plus three more `npm run check` runs, all passing.
- **The review:** on the same machine at the same time, two concurrent rounds
  each of `develop` and this branch. `develop` failed both (23 failures with 10
  timeouts, then 4 with 4), and the branch passed 1,412/1,412 both times.
- **The final pre-commit gate:** 1,412 pass.

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

The reviewer's execution log:

- a six-file scratch probe, run with and without `--parallel=4`, showing
  `setDefaultTimeout` is file-scoped, applies to tests and hooks registered
  after it, does not leak, and cannot interrupt a synchronous loop;
- a `spawnSync`/`execFileSync` probe showing children are killed at about 5002
  ms;
- a read of `generatedScaffolds()` (a thrown spawn leaves the cache `null`);
- `check:dist` and `cmp` of all eight dist copies (clean, identical);
- the two-worktree concurrent-load runs above, with the worktrees removed
  afterwards.

**Verdict: "Ready to merge: Yes".** It raised two optional comment nits. The
`post-gen-hook.test.ts` comment said a test "failed the gate" when it had failed
a loaded run: Cole had it fixed. The note that tests spawning nothing "lose
nothing" skips the rare async-hang case, and was left as is.

## Follow-up

The other item in this cycle,
[stabilize-migration-git-fixtures](../../stabilize-migration-git-fixtures/item.md),
landed first. The CI run on `develop` after it passed: 1,412 tests in 70 s.

---

**Related Documents:**

- [Migration tests time out at their 5-second budget under load](../item.md)
