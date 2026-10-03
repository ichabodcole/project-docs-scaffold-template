---
type: item
title: A v2.6 migration test's git add hangs until the test budget kills it
description:
  On CI two v2.6-to-v2.7 guard tests that take ~250ms hung in git add -A for the
  full 30 s budget; the same SHA passed on re-run. Its git helper lacks the
  hardening the v2.10 tests got.
status: stable
lifecycle: done
id: 01a0fdc5-e8e1-7032-b536-05bd4834600a
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-02 }
priority: medium
cycle: 2026-10-check-and-upgrade-fixes
---

# A v2.6 migration test's git add hangs until the test budget kills it

On 2026-10-02, CI run 37043419354 (a push of develop at `aa86449`) failed two
tests in `migrate-v2.6-to-v2.7.test.ts`:

- "preflight: the dirty-write stop covers the layer and the documents the
  codemod would mark, not a template it would keep" took 30002 ms;
- "scaffold: a --scaffold-dir that is not a generated project root stops the
  run" took 30001 ms.

Both normally take about 250 ms, and the PR run on the same SHA passed them in
254 ms. The log shows `git … add -A exited null` from `commitAll`, reached
through `withFiles`, with "killed 1 dangling process". So `git add` hung until
the 30 s per-file budget killed it. A re-run of the failed job passed.

This file's `git()` helper lacks the hardening
[stabilize-migration-git-fixtures](../stabilize-migration-git-fixtures/item.md)
gave `migrate-v2.10-to-v3.0.test.ts`: `-c maintenance.auto=false -c gc.auto=0`.
Its `fixtureA` copies a generated scaffold with `cpSync`. What made `git add`
hang is not known.

## Definition of done

- [x] The v2.6 test file's git helper carries the same `-c` hardening as the
      v2.10 file, and fixture copies leave out any `.git`.
- [x] A spawned git that hangs fails fast with the command named (a spawn
      timeout well under the test budget), rather than as a 30 s test timeout.
- [ ] If the hang recurs after that, its cause is recorded here.
