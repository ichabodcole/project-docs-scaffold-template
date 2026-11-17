---
type: write-up
title: "Write-up: why fixture git hangs in the migration tests on CI"
description:
  The CI hangs are Bun 1.4.0's spawnSync losing a child's exit after a garbage
  collection, a bug fixed in Bun 1.4.4; neither git nor the migration tests
  cause them.
tags: [ci, bun, tests, spawn]
status: draft
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# Write-up: why fixture git hangs in the migration tests on CI

**Outcome:** Work Items Filed (proposed below, not yet filed)

---

## Question

What makes a fixture git spawn block on the CI runner? The answer decides
whether to fix the spawn, serialize the test files, or retry. The item named
three candidates: a lock or stdin the spawn inherits, contention between the
four parallel test workers, and something specific to pushes to main.

## Current State

- `npm test` is `bun test --path-ignore-patterns 'dist/**' --parallel=4`
  (`package.json:16`). `--parallel` implies `--isolate`. It landed in `b8c4f22`
  on 2026-10-01.
- CI pins Bun 1.4.0 (`.github/workflows/docs-check.yml`, `bun-version: 1.4.0`).
  The local Bun is also 1.4.0.
- The v2.6 migration test spawns every fixture git through `sh()`:
  `Bun.spawnSync` with `childEnv()`, a 10 s `timeout` and `SIGKILL`
  (`migrate-v2.6-to-v2.7.test.ts:211-222`). `git()` adds
  `maintenance.auto=false` and `gc.auto=0` (`:318-339`). The file's budget is 30
  s (`:109-110`). The migration script itself runs through `migrate()`, another
  `Bun.spawnSync`, with no timeout (`:1295-1321`).

## Findings

The detail behind each point is in the
[evidence report](./reports/2026-11-17-ci-spawn-hang-evidence-report.md).

### The cause: Bun 1.4.0 loses a sync spawn's child exit (confidence: medium-high)

Bun 1.4.0's `spawnSync` waits on a private event loop. A garbage collection
during that wait can finalize earlier pipe readers and writers and drop the
loop's poll count to zero. From then on the loop never calls `epoll_wait`, so it
never sees the child exit. The call returns only when its own `timeout` fires or
when the bun:test timeout kills the child. Upstream this is
[oven-sh/bun#47257](https://github.com/oven-sh/bun/issues/47257), fixed by
#44581 and shipped in Bun 1.4.4.

The evidence:

- **Reproduced on our pinned version.** The upstream regression script, run here
  on Bun 1.4.0 (Linux container and macOS), returns a 0.1 s child after its full
  2 s timeout with empty stdout: `"exitedDueToTimeout":true,"ms":2004`. On 1.4.4
  it returns in 106 ms with the child's output.
- **The CI signature matches.** The errors read
  `git … commit -q -m the v2.6 tree, as generated timed out after 10000 ms and was killed`,
  with no output from a commit that normally takes under 10 ms. Other failures
  are `exited null` with `killed 1 dangling process`. Upstream reports the same
  lines for git spawns on GitHub's ubuntu runners under 1.4.0 and `--isolate`.
- **Not git-specific.** In run 37045377363 the hung spawns were
  `bun cli.ts view …` in `review-advisory.test.ts` (5 tests at 5 s). In run
  37172149263 the `layer:` hang named no git command, which points at the
  untimed `migrate()` spawn.
- **Onset is the switch to `--parallel`.** There were no hangs in 99 runs before
  `b8c4f22`, and 4 hung in the 38 runs after it. Upstream reports the same
  dependence: the #34069 repro hangs 10 of 10 under `--parallel=4` and 0 of 10
  with `--no-isolate`.
- **Its shape fits a per-spawn race in one process.** Each run's hangs sit in a
  single worker. Tests between them pass at normal speed. The 28 passing
  post-parallel runs show no slow tail: no test ran over 2 s and over 8 times
  its median.

What keeps confidence below high: CI has not run a bumped Bun yet. A 500,000
spawn synthetic stress on 1.4.0 did not reproduce the hang, because the race
needs a collection at the right moment. One CI case is also unexplained: the
`init -q` hang ran 30 s although its own 10 s timeout should have fired.
Upstream's spinning-worker variant (#46488, also fixed by #44581) may account
for it.

### Candidates ruled out

| Candidate                                      | Verdict            | Evidence                                                                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| stdin the spawn inherits                       | Ruled out          | `Bun.spawnSync`'s default stdin is not inherited: `cat` returns at once with the parent's stdin a pipe held open. `git init`, `add` and `commit -m` do not read stdin. And `bun cli.ts view` hung too.                                        |
| a lock, or detached maintenance holding a pipe | Ruled out          | Maintenance and gc are off since `b374407`, and the hang came back after it. A held pipe would show git's output. The timed-out commits have none.                                                                                            |
| contention between the four workers            | Ruled out as cause | Two hangs in run 37172149263 ran after the other files had finished, with the v2.6 file alone. The heavier git user, `migrate-v2.10-to-v3.0`, never hung. `--parallel` matters through `--isolate`'s effect on the Bun bug, not through load. |
| something specific to pushes to main           | Ruled out          | Two of the four incidents were develop pushes (36994651624, 37043419354).                                                                                                                                                                     |
| the runner image or region                     | Ruled out          | Every log reads image `20260901.588`. Hangs and passes share regions.                                                                                                                                                                         |
| machine sleep                                  | Not applicable     | That is a local cause. These are hosted CI runs, and the sibling files kept running on time during each hang.                                                                                                                                 |

### Options Considered

1. **Bump the pinned Bun to 1.4.4 or later.** This removes the defect at its
   source and covers every sync spawn in the suite (about 140 call sites in the
   test files). It is one line in `docs-check.yml`, plus the local Bun.
   Verification takes CI runs.
2. **Drop `--parallel=4`, or add `--no-isolate`.** Upstream data says this
   avoids the trigger. It gives back the speed `b8c4f22` bought and keeps a
   buggy runtime.
3. **Move test spawns to async `Bun.spawn` with a timeout.** Upstream reports
   this works around the bug, but it is a large rewrite of synchronous tests.
4. **Retry failed tests or jobs.** This hides the bug and keeps the 30 s stalls.
5. **Do nothing.** About one run in ten fails, and every failure needs a re-run.

## Recommendation

- [x] **File work items**: the fix is one version bump, then the verification
      the item's second box asks for.

**Rationale:** the defect is in the runtime, it reproduces on the pinned
version, and the release that fixes it exists. Bumping Bun is cheaper and
broader than any change to the spawns or the parallelism. The bump does not undo
the earlier hardening. The 10 s spawn bound still turns any future hang into a
named failure, and `maintenance.auto=false` still prevents the held-pipe case
shown in the calibration.

## Next Steps

Proposed work items (not filed):

1. **Pin Bun 1.4.4 or later in CI and locally.** Done when `docs-check.yml`'s
   `bun-version` names a release of 1.4.4 or later that is at least two weeks
   old, the local Bun matches it, and `npm run check` passes on it.
2. **Verify the bump over ten CI runs.** Done when ten consecutive `docs-check`
   runs on the bumped Bun pass with no `exited null`, no
   `timed out after 10000 ms`, and no test at its timeout. That is this item's
   second box. If a hang recurs, take the instrumentation step below instead of
   closing.

Instrument next, only if a hang recurs on 1.4.4 or later: on a spawn timeout,
before the kill, record `ps -eo pid,ppid,stat,wchan:32,etime,args` for the
worker's children. A zombie child means a lost exit, which is still Bun. A child
sleeping in a named wait channel means git or the filesystem. Also log each sync
spawn's duration, so a 30 s failure names the call that stalled rather than only
the one in flight.

When the bump has landed and the ten runs pass, tick both boxes and close the
item: `pdocs set item/ci-migration-test-git-hang-cause --lifecycle done`. The
earlier item,
[v26-migration-test-git-hang](../v26-migration-test-git-hang/item.md), has an
open third box, "If the hang recurs after that, its cause is recorded here".
That box can point at this write-up.

## Open Questions

- Why did the `init -q` spawn in run 37172149263 run to the 30 s test budget
  instead of its own 10 s timeout? It may be upstream's spinning-worker variant
  (#46488), which the same fix covers.
- The pre-parallel baseline leaves out five pull-request runs whose logs are
  gone. Each was a failure of some kind, so none can have hidden a hang that a
  re-run made green.

Sources: the GitHub Actions logs of the runs listed in the report; the test file
and `scripts/pdocs/test-env.ts`; `git log` for `b8c4f22`, `97a001b` and
`b374407`; and oven-sh/bun issues #47257, #43697, #46488, #46373 and #41024.

---

**Related Documents:**

- [CI spawn-hang evidence](./reports/2026-11-17-ci-spawn-hang-evidence-report.md)
- [Find why fixture git hangs in the migration tests on CI](./item.md)
- [A v2.6 migration test's git add hangs until the test budget kills it](../v26-migration-test-git-hang/item.md)
