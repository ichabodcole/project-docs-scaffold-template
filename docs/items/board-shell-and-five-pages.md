---
type: item
title: Build the work board's shell and five pages, read-only
description:
  The layout D shell over live data, with the Now, Inbox, Triage, Cycle and
  Feature pages drawn, polled and navigable by keyboard, before any write.
status: draft
lifecycle: ready
id: 01a1f70e-fc9f-7123-bb09-bdf30f682a7f
kind: task
generated: { by: claude-fable-5-2, at: 2026-11-19 }
cycle: 2026-11-work-board
parent: feature/pdocs-work-board
from: features/pdocs-work-board/plan.md
blocked_by:
  [01a1f70e-fbe5-718b-8d2d-d1af33d3f266, 01a1f70e-fc42-7791-93e2-e5912428c775]
---

# Build the work board's shell and five pages, read-only

The layout D shell over live data: `app/index.html`, `app/board.ts`,
`app/styles.css` and a vendored Alpine, served by the board's server through
Bun's HTML import. Nav, one centre column and the inspector; the Now, Inbox,
Triage, Cycle (both tabs) and Feature pages; a poll; keyboard stepping. No
writes yet. The markup is ported from layout D in the
[layouts prototype](./pdocs-work-board-mockups/artifacts/work-board-layouts.html),
without its switcher and sample data.

This is Phase 4 of the [plan](../features/pdocs-work-board/plan.md). It needs
[the server](./board-server-and-pdocs-bridge/item.md) and
[the model](./board-model-and-selection-rules/item.md).

## Definition of done

- [ ] `scripts/cli.ts open` in this repository opens the board, and each of the
      five pages shows this tree's data and matches the prototype's layout D for
      the same data.
- [ ] The shell keeps layout D's rules: three regions at most, the inspector
      pushes the centre and never overlays it, a cycle's lists are tabs, and
      nothing floats but the Snooze menu and the cycle chooser.
- [ ] `j`/`k` and the arrow keys move the highlight, Enter opens the inspector,
      and Escape unwinds one thing per press.
- [ ] A change made with `pdocs set` in a terminal shows on the board within one
      poll.
- [ ] The browser console shows no errors and no request leaves `127.0.0.1`. No
      build step is run and no bundle is committed.
- [ ] The session records how the shell behaves with a 40-item cycle and at
      1024px wide, without redesigning it.
- [ ] `npm run check` passes after `npm run build:dist`.

## Related Documents

- [pdocs Work Board Implementation Plan](../features/pdocs-work-board/plan.md)
