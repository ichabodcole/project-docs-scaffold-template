---
type: item
title: Carry the board's fields on pdocs view entries
description:
  pdocs view JSON gains description, from and source on every entry, and
  appetite and started on a cycle entry, so a caller outside the repository
  needs nothing else.
status: stable
lifecycle: done
id: 01a1f70e-fb86-7237-931e-c756125fe373
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-19 }
cycle: 2026-11-work-board
parent: feature/pdocs-work-board
from: features/pdocs-work-board/plan.md
---

# Carry the board's fields on pdocs view entries

The board reads a project only through `pdocs view … --json`, and five fields it
needs are missing from that output today: `description`, `from` and `source` on
every entry, and `appetite` and `started` on a cycle entry. Add them to
`ViewEntry` in `scripts/pdocs/commands/view.ts`, each `string | null`, and copy
the change into the payload. The change is additive: nothing is renamed or
removed, and text output does not change.

This is Phase 1 of the [plan](../../features/pdocs-work-board/plan.md). If #210
also changes `view.ts` or `advisories.ts`, this lands first.

## Definition of done

- [x] `pdocs view board --features --all`, `view backlog`, `view feature`,
      `view cycle` and `view unreviewed` carry `description`, `from` and
      `source` on every entry with `--json`, and `null` where a field is absent.
- [x] A cycle entry carries `appetite` and `started`; an item or feature entry
      has them as `null`.
- [x] The new tests in `scripts/pdocs/commands/view.test.ts` fail with the
      `entry` change reverted.
- [x] The payload copy matches (`npm run check:mirror`), and a project generated
      with cookiecutter shows the new keys on a new item.
- [x] `npm run check` passes.

## Related Documents

- [pdocs Work Board Implementation Plan](../../features/pdocs-work-board/plan.md)
