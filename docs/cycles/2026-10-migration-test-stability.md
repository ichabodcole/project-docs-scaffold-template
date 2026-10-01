---
type: cycle
title: Migration test stability
description:
  Make the migration tests pass reliably, locally and in CI, before the next
  pdocs cycle relies on the gate.
tags: [migrations, testing, ci]
status: draft
lifecycle: active
started: 2026-10-01
appetite:
  Stop when the fixture copy and timeout failures are fixed or shown not to
  reproduce; no scaffold release.
after: []
generated: { by: claude-opus-5-5, at: 2026-10-01 }
---

# Migration test stability

## Why now

The next cycle lands nine pdocs branches, and each runs the gate several times.
Two migration-test failures make that gate unreliable: CI intermittently fails
copying a cached Git fixture, and the local pre-commit run has timed out at the
5-second budget and passed unchanged on retry. Until those are fixed, a red run
doesn't say whether the change or the fixture is at fault.

## Scope

- **[item/stabilize-migration-git-fixtures](../items/stabilize-migration-git-fixtures/item.md)**
  — the release-marker tests no longer copy a mutable Git object database, and
  repeated targeted Linux runs pass.
- **[item/migration-tests-time-out-under-load](../items/migration-tests-time-out-under-load.md)**
  — first reproduce under the current four-worker suite
  (`run-source-tests-once`, landed in the Codex cycle). If it reproduces, fix
  it; if it doesn't, drop the item with the evidence.

Out of scope, deliberately: any change to what the scaffold ships. This cycle
touches the test harness only, so it needs no scaffold release. The pdocs work
waits for [2026-10-pdocs-views](./2026-10-pdocs-views.md).

## Outcome

_Written at close, not before — and for an `abandoned` cycle too._

## Sessions

<!-- One line per branch, appended by init-branch: `- <type>/<slug> (open)`. -->

- fix/stabilize-migration-git-fixtures (landed 2026-10-01)
