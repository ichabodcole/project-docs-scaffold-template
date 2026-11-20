---
type: item
title: Add the work board's two writes, with Undo
description:
  The triage decision and cycle membership write through one pdocs set call
  each, show the command that ran, and can be undone.
status: draft
lifecycle: backlog
id: 01a1f70e-fcfb-71a7-a8c7-2b9c09152e10
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-19 }
cycle: 2026-11-work-board
parent: feature/pdocs-work-board
from: features/pdocs-work-board/plan.md
blocked_by: [01a1f70e-fc9f-7123-bb09-bdf30f682a7f]
---

# Add the work board's two writes, with Undo

The board's two writes, through `/api/write`: the Triage decision form in the
inspector (accept to `backlog` or `ready`, or drop, with priority, parent
feature and "content reviewed"), and cycle membership (Bring in on a candidate
row and the `b` key; Take out in the inspector and the `t` key). After a write,
a bar shows the command that ran with an Undo. A drop's reason becomes a line
for the agent to record; the board does not write it.

This is Phase 5 of the [plan](../features/pdocs-work-board/plan.md). It needs
[the shell](./board-shell-and-five-pages.md).

## Definition of done

- [ ] Applying a triage decision runs exactly one `pdocs set`, removes the item
      from the queue, moves the highlight to the next waiting item, and lists
      the item under "Decided".
- [ ] "Content reviewed" adds `--status stable` to that one call, and is off
      unless the user ticks it.
- [ ] Bring in and Take out each run exactly one `pdocs set`. A brought-in item
      appears under "Added just now".
- [ ] On a copy of this repository's docs: accept an item with a priority and a
      parent then Undo, drop one then Undo, and bring one in then take it out.
      After each, `diff -r` against an untouched copy prints nothing.
- [ ] A write that `pdocs set` refuses shows the refusal in the bar and changes
      nothing on the board.
- [ ] `npm run check` passes after `npm run build:dist`.

## Related Documents

- [pdocs Work Board Implementation Plan](../features/pdocs-work-board/plan.md)
