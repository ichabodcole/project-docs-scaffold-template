---
type: item
title: Re-pin the newest migration to the release with the board's fields
description:
  The v3.0 migration installs the scaffold release whose pdocs view carries the
  board's fields, so update-project-docs is the fix the board names.
status: draft
lifecycle: backlog
id: 01a1f70e-fdb2-71df-9713-22cf757e2749
kind: chore
generated: { by: claude-fable-5-2, at: 2026-11-19 }
cycle: 2026-11-work-board
parent: feature/pdocs-work-board
from: features/pdocs-work-board/plan.md
blocked_by: [01a1f70e-fb86-7237-931e-c756125fe373]
---

# Re-pin the newest migration to the release with the board's fields

The board tells a project with an older CLI to run `update-project-docs`. That
only helps once the newest migration installs a scaffold release that carries
[the view fields](./view-entries-carry-board-fields/item.md). After that
release, re-pin `migrate-v2.10-to-v3.0.ts` by the writing-migrations playbook,
step 14: `SCAFFOLD_TAG`, its test's pin, its guide, the `update-project-docs`
skill's step and table row, and `OWNED_RELEASES`.

This is Phase 7 of the [plan](../features/pdocs-work-board/plan.md). It cannot
start until the view fields have shipped in a scaffold release, which is later
than that item being `done`. It ships in the same plugin release as
[the skill](./work-board-skill-and-packaging.md).

## Definition of done

- [ ] `SCAFFOLD_TAG` names a scaffold release that contains the view fields, and
      the test's pin, the guide and the skill's table row agree with it.
- [ ] `OWNED_RELEASES` is regenerated.
- [ ] On a fixture at 9.4.1, `update-project-docs` refreshes `scripts/pdocs/`,
      and the board then opens there.
- [ ] `bun test plugins/project-docs/skills/update-project-docs` and
      `npm run check` pass.

## Related Documents

- [pdocs Work Board Implementation Plan](../features/pdocs-work-board/plan.md)
