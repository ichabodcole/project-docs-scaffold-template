---
type: write-up
title: Test performance and CI reliability
description:
  Measurements and recommendations for reducing gate runtime and stabilizing
  migration fixtures.
tags: [testing, performance, ci]
status: draft
generated: { by: pdocs, at: 2026-10-01 }
---

# Test performance and CI reliability

**Outcome:** Work items filed. Run each source suite once, then adopt measured
file parallelism. Keep the unique regression cases. Investigate the intermittent
Git fixture copy failure separately.

## Measurements

Measured October 1, 2026 on the same local checkout and Bun 1.4.0. The full
baseline comes from the immediately preceding checked landing commit, `0027f60`;
the two experiments used that code without changing test implementations or
configuration. These are single runs, not statistical benchmarks. CI uses a
different machine.

| Execution                      | Cases | Files | Wall time | Result |
| ------------------------------ | ----: | ----: | --------: | ------ |
| Previous local full discovery  | 2,564 |    34 |  375.74 s | Passed |
| Source-only sequential         | 1,412 |    26 |  138.32 s | Passed |
| Source-only, four file workers | 1,412 |    26 |   78.55 s | Passed |
| PR CI full discovery           | 2,564 |    34 |  265.37 s | Passed |

Both source-only experiments made 9,387 assertions. The observed reductions
relative to the local full baseline are 63% and 79%, respectively. Results need
confirmation on CI before adopting a worker count.

Reproduce the experiments:

```bash
bun test --path-ignore-patterns 'dist/**'
bun test --path-ignore-patterns 'dist/**' --parallel=4 \
  --timings=/private/tmp/project-docs-source-timings.json --update-timings
```

Raw local logs are in `/private/tmp/project-docs-landing-commit.log`,
`/private/tmp/project-docs-source-sequential.log`, and
`/private/tmp/project-docs-source-parallel.log`. These temporary files are
evidence for this investigation, not durable repository artifacts; the
measurements above are the retained record.

## Implementation follow-through

The user authorized implementation after this investigation. `npm test` now uses
source-only discovery with four workers, and the full local gate passed with
tests at 79.31 seconds.
[Linux CI](https://github.com/ichabodcole/project-docs-scaffold-template/actions/runs/36901538729)
passed all 1,412 tests in 68.36 seconds, with the complete job at 111 seconds.
See the [implementation item](../run-source-tests-once.md) for the gate
comparison and packaging scope. The recommendation below records the
investigation's original ordering; the first execution changes are now
implemented.

## Where the time goes

### Generated packages repeat the migration suite

The [build script](../../../scripts/build-skills-dist.sh) copies whole skill
folders, including four migration test files, into both distributions. Bare
`bun test` recursively discovers source and both copies: 836 cases in `scripts/`
plus 576 migration cases executed three times. The Codex package introduced the
third execution; the older package already caused the second.

In the full local log, timed test bodies total approximately 112 seconds per
migration copy, versus 21 seconds for all `scripts/` cases. Duplicate copies
account for approximately 222 seconds of measured test-body time. These sums
exclude fixture setup and cleanup, so they are not whole-file wall times.

The source-only sequential breakdown is:

| Suite                   | Cases | Sum of timed test bodies |
| ----------------------- | ----: | -----------------------: |
| v2.10 → v3.0 migration  |   235 |                  66.89 s |
| v2.6 → v2.7 migration   |   223 |                  19.79 s |
| v2.9 → v2.10 migration  |    80 |                  19.32 s |
| v2.8 → v2.9 migration   |    38 |                   4.94 s |
| All other source suites |   836 |                  20.05 s |

The slow tests exercise real Git repositories, Cookiecutter generation,
migration CLI processes, lint, and Prettier. They predominantly use synchronous
subprocesses. Generated base scaffolds are already cached per migration file;
recommending caching them again would miss what the code already does.

### CI setup and other checks are smaller costs

The successful
[PR run](https://github.com/ichabodcole/project-docs-scaffold-template/actions/runs/36898447384)
took approximately 5m14s for the check job. Tests used 4m25s; the complete gate
used 4m43s, leaving about 18 seconds for formatting, lint, version, mirror, and
dist checks. Typechecking took three seconds. Dependency/tool setup is a
secondary opportunity after test duplication and execution strategy.

The [workflow](../../../.github/workflows/docs-check.yml) triggers on both
branch pushes and pull requests. Its concurrency group uses `github.ref`, so
branch and PR runs do not cancel each other. Review this duplication later while
preserving checks for direct branch pushes and PR merge results.

## Do the tests provide value?

The expensive migration suites test document preservation, dirty-tree refusal,
release downgrade prevention, interrupted-run recovery, dry-run behavior,
formatting exclusions, and real published scaffold compatibility. Wiring
witnesses deliberately remove a phase and demonstrate that a regression is
detected. Those guard against changes to adopters' repositories and deserve
retention.

Many pure table/contract tests run in milliseconds; deleting them would remove
coverage for negligible time savings. This was a representative audit, not a
case-by-case redundancy review of all 1,412 unique cases. The proven redundancy
is executing byte-identical generated copies.

Retain [check:dist](../../../scripts/check-dist.sh) to verify shipped bytes. A
small installed-artifact smoke check can verify packaging-specific paths/imports
without replaying the entire development suite. Excluding discovery and omitting
development tests from shipped packages are separate choices; confirm the
packaging policy.

## Actions failure

The
[failed push run](https://github.com/ichabodcole/project-docs-scaffold-template/actions/runs/36898150297)
passed all non-test gates and failed three release-marker tests in the Codex
copy of the v3.0 migration suite. `markedAt` called `cpSync` on its cached
migrated fixture; `lstat` reported missing `.git/objects/0e` and
`.git/objects/34` directories. The failures occur during fixture construction,
before the intended assertions.

An
[older run on September 29](https://github.com/ichabodcole/project-docs-scaffold-template/actions/runs/36627477104)
failed at the same helper with the same missing-object-directory pattern, before
the Codex marketplace change. The PR run passed on the same head SHA as the
failed push. This establishes intermittency and prior occurrence, but not the
underlying cause. Git background maintenance and Bun filesystem copying are
hypotheses to distinguish with Linux instrumentation; neither is proven by these
logs.

A promising fixture change is to copy only the working-tree snapshot, create a
new Git repository, and commit it. Marker tests appear to need a clean current
snapshot, not the cached fixture's earlier history. Confirm that assumption
before changing construction. Do not hide the defect with blanket retries.

## Recommended order

1. [Run source tests once](../run-source-tests-once.md). Keep the single gate
   entry point and artifact equality checks. This gives the largest demonstrated
   saving.
2. Measure file workers on CI, then choose a worker count. Bun's
   [parallel execution](https://bun.com/docs/test/parallel) runs files in
   isolated processes; within-file concurrency only overlaps async waits.
   Blanket `--concurrent` will not accelerate synchronous subprocess calls.
3. [Stabilize Git fixtures](../stabilize-migration-git-fixtures.md). Faster
   execution reduces retry cost, but does not fix the intermittent failure.
4. Profile the largest migration file before restructuring it. Consider
   splitting pure planning tests from independent integration groups, reusing
   immutable generated snapshots, and batching formatter calls where assertions
   remain independent. The largest file limits file-level parallelism; splitting
   also repeats setup, so measure the tradeoff.
5. Review duplicate CI events and introduce timing artifacts if more
   optimization is needed. Sharding adds job setup and gate complexity; defer it
   until the simpler changes are measured.

Keep Bun for now: the dominant costs are duplicate discovery and real subprocess
work, and the current runner already supports measured parallelism. A runner
switch has migration cost and no demonstrated benefit here. Changed-test
selection can help local iteration, but dynamic reads of markdown, scripts, and
release tags make it unsuitable as the sole authoritative gate.

## Tooling friction

- The first GitHub query failed under network sandboxing; escalation succeeded.
- `pdocs new investigation` supplied a useful retirement error pointing to a
  research item and its owned write-up. The new layout works, but old
  terminology remains easy to reach for during research.
- `pnpm exec prettier` stalled without output for over 30 seconds and was
  cancelled. Running the already installed `node_modules/.bin/prettier` finished
  immediately. The pnpm shim/startup cause was not diagnosed.
- The default gate reports case count without flagging generated duplicates.
  Retaining discovery counts and per-file timings would make this regression
  visible.

## Related

- [Research item](./item.md)
- [Source test execution follow-up](../run-source-tests-once.md)
- [Fixture reliability follow-up](../stabilize-migration-git-fixtures.md)
