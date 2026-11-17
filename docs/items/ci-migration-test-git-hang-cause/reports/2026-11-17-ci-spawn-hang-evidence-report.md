---
type: report
title:
  "CI spawn-hang evidence: logs, calibration and the Bun 1.4.0 reproduction"
description:
  The four CI runs whose sync spawns hung, read from their logs, beside the
  local calibration and the upstream regression script run on Bun 1.4.0 and
  1.4.4.
tags: [ci, bun, tests, spawn]
status: draft
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# CI spawn-hang evidence: logs, calibration and the Bun 1.4.0 reproduction

- **Report Type:** Other (incident evidence)
- **Scope:** the `docs-check` workflow's `npm run check` step, runs from
  2026-09-04 to 2026-10-04

---

## Executive Summary

**Key Findings:**

- Four runs, all on or after 2026-10-01, failed because a synchronous spawn in a
  test never returned. Two were develop pushes and two were main pushes. One of
  the four hung a `bun cli.ts` spawn in `review-advisory.test.ts`, not fixture
  git.
- The hangs are all-or-nothing. In 28 passing runs after the change to parallel
  workers, no test took more than 8 times its median: no spawn was merely slow.
- Bun 1.4.0, the version CI pins, loses a sync spawn's child exit when a garbage
  collection runs during the wait. The upstream regression script reproduces
  that here on 1.4.0, and 1.4.4 fixes it.

**Overall Assessment:** the hang is a Bun runtime defect, not git, the fixtures
or the runner. Bumping the pinned Bun is the fix to verify.

---

## Scope

**Included:** the first-attempt logs of every failed or re-run `docs-check` run
from 2026-09-04 to 2026-10-04, and the logs of 28 passing runs after
2026-10-01T17:43Z. `gh run view <id> --attempt 1 --log`, repo
`ichabodcole/project-docs-scaffold-template`.

**Excluded:** runs after 2026-10-04 (none are recorded as hanging), and five
failed pull-request runs before 2026-10-01 whose logs GitHub no longer serves.

---

## Findings

### The four hang incidents

Each is the first attempt of its run. "Exit null" means the bun:test timeout
ended the spawn. "Own timeout" means the spawn's own 10 s `timeout` fired and
the helper threw `timed out after 10000 ms and was killed`.

| Run         | Event, SHA              | File                   | Hung tests and spawn                                                                                                                                                                   |
| ----------- | ----------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 36994651624 | develop push, `597ef77` | `migrate-v2.6-to-v2.7` | 3 at 30 s. `git … commit -q -m "the v2.6 tree, as generated" exited null` (×2). This was before the 10 s bound.                                                                        |
| 37043419354 | develop push, `aa86449` | `migrate-v2.6-to-v2.7` | 2 at 30 s: `git … add -A exited null` and `git … commit … exited null`. A re-run passed.                                                                                               |
| 37045377363 | main push, `5fcf4ca`    | `review-advisory.test` | 5 at 5 s. `run()`'s `Bun.spawnSync(["bun", CLI, "view", …])` returned `exitCode` null (`review-advisory.test.ts:616`, `:50` at that SHA). No fixture git.                              |
| 37172149263 | main push, `d4ff2ee`    | `migrate-v2.6-to-v2.7` | 4: `commit` hit its own timeout at 10,026 ms and again at 10,018 ms; `git … init -q exited null` at 30,005 ms; the `layer:` guard test at 30,000 ms named no command. A re-run passed. |

- **Clustering.** Every incident's hangs sit in a single file, so in a single
  worker process. The other files in the same run spawn git just as heavily
  (`migrate-v2.10-to-v3.0`, `migrate-v2.9-to-v2.10`) and did not hang.
- **Recovery between hangs.** Inside the hanging file, the tests between two
  hangs pass in their normal 50–250 ms (run 37172149263: 02:49:12.83 to
  02:49:44.80). The worker is not wedged. Single spawns are lost.
- **No contention needed.** In run 37172149263, `migrate-v2.10-to-v3.0` printed
  its last result at 02:49:44.94. The `layer:` hang (02:49:44.80 to 02:50:14.80)
  and the second `commit` hang (02:50:17.16 to 02:50:27.18) ran with the v2.6
  file alone or almost alone.
- **Empty output.** The own-timeout errors carry no stderr or stdout. That is
  what a child that exited early looks like when its exit was never seen.
- **More than one dangling process.** The 30 s failures print
  `killed 1 dangling process` two or three times for one test. A single hung
  sync spawn prints it once (see the calibration below). So bun:test still
  counted extra direct children as live. That fits children whose exits were
  lost and never reaped, which bun#46373 describes.

### Not the push to main

Two of the four were develop pushes. The other three re-run first attempts in
the window (37172170485, 37045453986, 36904755510) were `action_required` bot
pull requests, not failures:
`gh api …/actions/runs/<id>/attempts/1 --jq .conclusion`.

### Not the runner

All 32 logs read (the four incidents and the 28 passing runs) carry runner image
`Version: 20260901.588`. The incidents ran in westus, centralus and eastus (×2).
The passing runs used the same regions.

### Onset matches the switch to parallel workers

`b8c4f22` ("perf: run source tests once with four file workers", 2026-10-01
17:43Z) changed `npm test` to `bun test … --parallel=4`, which implies
`--isolate`. Before it, 99 `docs-check` runs from 2026-09-04 produced no hang
signature in any first-attempt log that can still be read. There are no
`exited null`, `Received: null` or `dangling process` lines from a sync spawn.
The 5 s failures in 36627470513 and 36902463807 were slow fixture hooks, which
the 30 s budget (`97a001b`) fixed. After it, 4 of 38 runs hung.

### No near misses

A per-test outlier scan of the 28 passing post-parallel runs (1,490 distinct
tests) found no result above both 2 s and 8 times its own median. The failure
does not come from a slow tail.

---

## Local experiments

All of them ran in `oven/bun` containers (Linux 6.12, aarch64), in a scratch
directory outside the repository, which was removed afterwards.

1. **Synthetic stress, no reproduction.** 16 files × 300 tests, each running
   `git init`, `add -A`, `commit`, `bun -e 0`, `add`, `commit` through
   `Bun.spawnSync` with `timeout: 10_000`. `bun test --parallel=4` with 4 CPUs,
   15 iterations: about 500,000 sync spawns, none over 1.5 s.
2. **Calibration of bun:test's messages on 1.4.0:**
   - A sync spawn of `sleep 60` that outlives the test's timeout prints
     `killed 1 dangling process` once. It returns `exitCode` null and
     `exitedDueToTimeout` false, which is the CI `exited null` line.
   - Earlier spawns in the same test that finished, or that ended by their own
     timeout, are not counted.
   - With `timeout: 1000` the spawn returns at 1,002 ms with
     `exitedDueToTimeout` true.
   - `Bun.spawnSync(["cat"])` returns at once while the parent's stdin is a pipe
     held open. The default stdin is not inherited.
   - A child whose background grandchild keeps the stdout pipe open holds
     `spawnSync` until the timeout. That is the shape `maintenance.auto=false`
     guards against.
3. **The upstream regression script** for bun#47257 (`gc-pollcount.js`: three
   `Bun.stderr.writer()` instances made garbage during one `spawnSync`, then a
   second `spawnSync` of `sh -c "sleep 0.1; echo polled"` with `timeout: 2000`),
   run with `BUN_JSC_slowPathAllocsBetweenGCs=3`:

   | Bun               | stderr | Result                                                    |
   | ----------------- | ------ | --------------------------------------------------------- |
   | 1.4.0 (container) | pipe   | `"stdout":"","exitedDueToTimeout":true,"ms":2004`         |
   | 1.4.0 (container) | TTY    | `"stdout":"","exitedDueToTimeout":true,"ms":2003`         |
   | 1.4.0 (macOS)     | pipe   | `"stdout":"","exitedDueToTimeout":true,"ms":2002`         |
   | 1.4.4 (container) | pipe   | `"stdout":"polled\n","exitedDueToTimeout":false,"ms":106` |
   | 1.4.4 (container) | TTY    | `"stdout":"polled\n","exitedDueToTimeout":false,"ms":106` |

   On 1.4.0 a 0.1 s child runs into its timeout with empty output. CI's
   `timed out after 10000 ms` errors look the same. On 1.4.4 it returns in 106
   ms.

---

## External references

- [oven-sh/bun#47257](https://github.com/oven-sh/bun/issues/47257), closed
  2026-10-29. Its signature is a sync spawn of git under `--isolate` on a GitHub
  Actions ubuntu runner with 1.4.0, then `killed 1 dangling process`. The
  maintainers' root cause: a GC during `spawnSync`'s private-loop wait finalizes
  earlier pipe readers and writers and drives the loop's poll count to zero, so
  the loop stops calling `epoll_wait` and never sees the child exit. Fixed by
  #44581 ("spawnSync: stop pointing the VM at the loop it waits on"), shipped in
  1.4.4.
- [oven-sh/bun#43697](https://github.com/oven-sh/bun/issues/43697) and
  [#46488](https://github.com/oven-sh/bun/issues/46488), closed 2026-11-17:
  related lost-exit and spinning-worker variants under `--parallel`. Their
  closing comments name 1.4.3 as the first passing release and #44581 as the
  fix. #47257's own script still fails on 1.4.3, so 1.4.4 is the floor.
- [oven-sh/bun#46373](https://github.com/oven-sh/bun/issues/46373), open: a test
  timeout kills more processes than the timed-out test's own.

---

## Related Documentation

- [Find why fixture git hangs in the migration tests on CI](../item.md)
- [The write-up this evidence supports](../write-up.md)
