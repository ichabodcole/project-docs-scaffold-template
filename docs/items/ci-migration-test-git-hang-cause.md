---
type: item
title: Find why fixture git hangs in the migration tests on CI
description:
  On CI, fixture git init and commit in the v2.6 migration tests intermittently
  hang past 10 s on pushes to main, after the spawn hardening; the cause is
  unknown.
status: draft
lifecycle: triage
id: 01a104d4-ddac-760f-abcf-d1e591a24a65
kind: research
generated: { by: claude-opus-5-5, at: 2026-10-03 }
from: 01a0fdc5-e8e1-7032-b536-05bd4834600a
---

# Find why fixture git hangs in the migration tests on CI

[The test-hang fix](./v26-migration-test-git-hang/item.md) bounded fixture git
calls at 10 s and passed the maintenance and gc settings, but the hang came
back. CI run 37172149263, the push of main at `d4ff2ee` (2026-10-04), failed
four tests in `migrate-v2.6-to-v2.7.test.ts`:

- `git … commit -q -m "the v2.6 tree, as generated"` timed out after 10 s and
  was killed, twice;
- `git … init -q` exited null when the 30 s test budget killed it.

The same tree passed on the develop push and the PR run, and a re-run of the
failed job passed. Both recent failures were pushes to main, just after a merge.
Locally, every fixture git call takes under 10 ms, and the hang has never
reproduced.

Question: what makes a fixture git spawn block on the CI runner? Candidates: a
lock or stdin the spawn inherits, contention between the four parallel test
workers, or something specific to the push-to-main runs. The answer decides
whether to fix the spawn, serialize these files, or retry.

## Definition of done

- [ ] The cause is found and recorded, or the investigation's evidence rules out
      the candidates above and names what to instrument next.
- [ ] If the cause is found, the fix lands and the migration tests pass ten CI
      runs in a row.

## Related Documents

- [A v2.6 migration test's git add hangs until the test budget kills it](./v26-migration-test-git-hang/item.md)
