---
type: item
title: Pin Bun 1.4.4 in CI
description:
  CI pins Bun 1.4.0, whose spawnSync can miss a child's exit and hang a test;
  1.4.4 fixes it.
status: stable
lifecycle: done
id: 01a1eb22-83ac-7216-87d4-cb7b3cee178b
kind: chore
generated: { by: claude-fable-5-2, at: 2026-11-17 }
from: 01a104d4-ddac-760f-abcf-d1e591a24a65
cycle: 2026-11-check-fixes-and-board-research
priority: medium
---

# Pin Bun 1.4.4 in CI

`.github/workflows/docs-check.yml` pins `bun-version: 1.4.0`. In that release a
garbage collection that runs while `spawnSync` waits can make it miss the
child's exit, so the call returns only when a timeout kills it. That is the
cause the CI hang research (`item/ci-migration-test-git-hang-cause`, this item's
`from`) found for the hung `docs-check` runs. Bun 1.4.4 carries the fix, and the
development machine now runs 1.4.4.

Whether the hangs stop is not this item's to show: the research item's second
box waits on ten clean CI runs after the pin lands.

## Definition of done

- [x] `docs-check.yml` sets `bun-version: 1.4.4`.
- [x] `npm run check` passes locally on Bun 1.4.4.
- [ ] The first `docs-check` run on the pinned version passes.
