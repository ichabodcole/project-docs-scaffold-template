---
type: cycle
title: Migration test stability
description:
  Make the migration tests pass reliably, locally and in CI, before the next
  pdocs cycle relies on the gate.
tags: [migrations, testing, ci]
status: draft
lifecycle: closed
started: 2026-10-01
appetite:
  Stop when the fixture copy and timeout failures are fixed or shown not to
  reproduce; no scaffold release.
after: []
generated: { by: claude-opus-5-5, at: 2026-10-01 }
closed: 2026-10-01
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
- **[item/migration-tests-time-out-under-load](../items/migration-tests-time-out-under-load/item.md)**
  — first reproduce under the current four-worker suite
  (`run-source-tests-once`, landed in the Codex cycle). If it reproduces, fix
  it; if it doesn't, drop the item with the evidence.

Out of scope, deliberately: any change to what the scaffold ships. This cycle
touches the test harness only, so it needs no scaffold release. The pdocs work
waits for [2026-10-pdocs-views](./2026-10-pdocs-views.md).

## Outcome

Both items shipped on 2026-10-01, and the gate is reliable again. Under the same
concurrent load, `develop` before this cycle timed out in both review rounds and
after it passed 1,412/1,412 in both. Neither change touches what the scaffold
ships, so no release was cut; the fixes ride along with the
[pdocs views cycle](./2026-10-pdocs-views.md)'s release.

- **The fixture copy failure is closed, not explained.** The release-marker
  fixtures no longer copy the cached repository's `.git`, and fixture commits
  run with auto-maintenance off. The first CI run after it passed. What deleted
  the `.git/objects` directories on CI stays unconfirmed: the obvious suspect,
  background maintenance, does nothing at this fixture's size under default
  config. If the `ENOENT` returns, the cause is outside the copied `.git`.
- **The timeouts were one mechanism, not load in general.** Each migration test
  file builds its fixtures lazily, so whichever test touches them first pays for
  `git archive` plus cookiecutter. A test killed mid-build leaves the cache
  empty, so failures cluster: 23 failures from 10 timeouts in one run. A 30 s
  per-file budget on the five spawning files fixed it.
  `scripts/post-gen-hook.test.ts`, not a migration test, joined the scope
  because it timed out under the same load.

Learned for scoping: the cheap reproduction (two suites at once) found in one
run what weeks of "passed on retry" had hidden. Next time a gate flakes,
reproduce it under load first and save the output, since an unsaved hook failure
loses the test names.

## Sessions

<!-- One line per branch, appended by init-branch: `- <type>/<slug> (open)`. -->

- fix/stabilize-migration-git-fixtures (landed 2026-10-01)
- fix/migration-tests-time-out-under-load (landed 2026-10-01)
