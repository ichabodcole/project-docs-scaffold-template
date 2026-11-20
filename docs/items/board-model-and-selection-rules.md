---
type: item
title: Build the work board's model and selection rules
description:
  "Layout D's behaviour as pure, tested functions over a snapshot: grouping, the
  Inbox rows, candidates, blockers, snooze and the selection rules."
status: draft
lifecycle: ready
id: 01a1f70e-fc42-7791-93e2-e5912428c775
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-19 }
cycle: 2026-11-work-board
parent: feature/pdocs-work-board
from: features/pdocs-work-board/plan.md
---

# Build the work board's model and selection rules

Layout D's behaviour as pure functions over a snapshot, so the UI only binds
them: `app/model.ts` (container groups, Now's groups, candidates, blockers, the
Inbox rows and their two groups, snooze) and `app/selection.ts` (the current
list, moving the highlight, what happens when the highlighted row leaves, the
Escape order, "Added just now"). Both are written test-first and stay free of
the DOM. The rules are listed under Phase 3 of the
[plan](../features/pdocs-work-board/plan.md), taken from the `d`-prefixed code
in the
[layouts prototype](./pdocs-work-board-mockups/artifacts/work-board-layouts.html).

It shares no files with the view fields or the server, so it can run beside
them.

## Definition of done

- [ ] Every rule listed under Phase 3 of the plan has a test in
      `app/model.test.ts` or `app/selection.test.ts` that fails when the rule is
      reverted.
- [ ] The Inbox has one row per planned cycle that is not reviewed, and only
      "Needs a decision" rows count toward the nav.
- [ ] A blocker whose id is unknown counts as open, never as "blocker done".
- [ ] The inspector can never show an item that has no highlighted row: when a
      change removes the highlighted row, the highlight moves to the row that
      takes its place, or the selection clears.
- [ ] A test feeds the model a snapshot recorded from this repository and finds
      a triage row and an archive row in the Inbox.
- [ ] `npx tsc --noEmit` is clean and `npm run check` passes.

## Related Documents

- [pdocs Work Board Implementation Plan](../features/pdocs-work-board/plan.md)
