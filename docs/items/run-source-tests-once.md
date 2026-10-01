---
type: item
title: Run source tests once and measure file parallelism
description:
  Exclude generated dist suites from test discovery and adopt measured parallel
  execution while retaining artifact checks.
status: draft
lifecycle: review
id: 01a0f883-3715-767b-900f-6ad94ee815ea
kind: chore
generated: { by: pdocs, at: 2026-10-01 }
from: 01a0f880-d53a-76b4-a21d-be653c795179
---

# Run source tests once and measure file parallelism

`bun test` discovers four migration suites in `plugins/` and identical copies in
both `dist/` packages. The gate executes 2,564 cases, but only 1,412 are unique.
Source-only sequential execution passed in 138.32 seconds, compared with the
previous full local run's 375.74 seconds.

Implement the recommendation in the
[research write-up](./test-performance/write-up.md). Keep `npm run check` as the
single gate entry point.

## Definition of done

- [x] Test discovery executes all 26 source files once and excludes generated
      copies.
- [x] `check:dist` continues checking every shipped file against a fresh build.
- [x] Choose the packaging scope: keep distribution contents unchanged for this
      execution change. Omitting development test files and adding
      installed-artifact smoke checks remain separate packaging work.
- [x] Benchmark file parallelism on local and CI machines before choosing a
      worker count.
- [x] Run the full gate on Linux and locally; record elapsed time and test
      counts.

## Implementation and verification

`npm test` now runs `bun test --path-ignore-patterns 'dist/**' --parallel=4`.
Both pre-commit and CI continue using `npm run check`; no tests or assertions
were removed, and no workflow-specific test command was introduced.

The committed implementation's pre-commit gate passed all checks, with 1,412
tests, 26 files, 9,387 assertions, and a test runtime of 79.31 seconds. Local
typechecking also passed.

[Linux CI run 36901538729](https://github.com/ichabodcole/project-docs-scaffold-template/actions/runs/36901538729)
passed the same 1,412 tests across 26 files in 68.36 seconds, followed by
typechecking. The gate took 85 seconds and the whole job took 111 seconds. The
preceding marketplace PR run took 265.37 seconds for tests, 283 seconds for the
gate, and 314 seconds for the job. These single-run observations show
approximately 74% less test time and 65% less job time; machine load may vary.

Four workers performed well in both environments. The intermittent Git-fixture
failure remains tracked in
[its own item](./stabilize-migration-git-fixtures.md). A passing run does not
resolve that defect.

## Constraints

Do not remove unique regression assertions or replace the authoritative gate
with changed-file discovery. Some tests read history tags, markdown, and scripts
through dynamic filesystem access that an import graph cannot fully capture.
