---
type: item
title: Run source tests once and measure file parallelism
description:
  Exclude generated dist suites from test discovery and adopt measured parallel
  execution while retaining artifact checks.
status: draft
lifecycle: active
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

- [ ] Test discovery executes all 26 source files once and excludes generated
      copies.
- [ ] `check:dist` continues checking every shipped file against a fresh build.
- [ ] Decide whether distribution packages should omit development test files;
      retain a small installed-artifact smoke check for relevant path/import
      behavior.
- [ ] Benchmark file parallelism on local and CI machines before choosing a
      worker count.
- [ ] Run the full gate on Linux and locally; record elapsed time and test
      counts.

## Constraints

Do not remove unique regression assertions or replace the authoritative gate
with changed-file discovery. Some tests read history tags, markdown, and scripts
through dynamic filesystem access that an import graph cannot fully capture.
