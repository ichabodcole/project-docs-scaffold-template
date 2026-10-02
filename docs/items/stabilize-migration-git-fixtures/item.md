---
type: item
title: Stabilize migration Git fixtures in CI
description:
  Remove intermittent missing Git object directories when copying the migrated
  release fixture.
status: stable
lifecycle: done
id: 01a0f883-379a-71ea-9e4a-d7a08b520330
kind: bug
generated: { by: pdocs, at: 2026-10-01 }
from: 01a0f880-d53a-76b4-a21d-be653c795179
cycle: 2026-10-migration-test-stability
scope: migrations
---

# Stabilize migration Git fixtures in CI

Actions run
[36898150297](https://github.com/ichabodcole/project-docs-scaffold-template/actions/runs/36898150297)
failed three release-marker tests with `ENOENT` copying
`/tmp/migrate-v30-O-f7C5Ef/.git/objects/{0e,34}`. The exception comes from
`markedAt`, which recursively copies the cached, migrated Git fixture.

The same failure occurred before the marketplace change in
[36627477104](https://github.com/ichabodcole/project-docs-scaffold-template/actions/runs/36627477104).
The marketplace PR's
[run](https://github.com/ichabodcole/project-docs-scaffold-template/actions/runs/36898447384)
passed on the same head SHA. This is intermittent fixture construction failure;
the logs do not establish what removes or misreports the object directories.

See the [research write-up](../test-performance/write-up.md).

## Definition of done

- [x] Reproduce or instrument repeated copying on pinned Bun 1.4.0/Linux;
      compare filesystem contents and Node copying to distinguish Git activity
      from a Bun copying defect. Instrumented on Linux (Bun 1.4.0, Git 2.55):
      the failure did not occur on its own, but a forced background prune during
      the copy reproduced the CI error exactly. Bun versus Node was settled by
      reading Bun's copy (a port of Node's), not by a side-by-side run. The
      cause stays unconfirmed; see the
      [session](./sessions/2026-10-01-stabilize-migration-git-fixtures.md).
- [x] Make marker-test fixtures independent of a copied mutable Git object
      database. Candidate: copy the working tree without `.git`, initialize a
      fresh repository, and commit the snapshot; first confirm these tests need
      no earlier history.
- [x] Preserve all ahead-of-pin, equal-pin, custom-scaffold, refusal, and
      no-write assertions.
- [x] Repeated targeted Linux runs pass, followed by the full source suite and
      artifact gate.

Do not treat a successful retry as a fix or hide this failure with unconditional
retries.
