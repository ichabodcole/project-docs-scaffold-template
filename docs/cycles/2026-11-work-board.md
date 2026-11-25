---
type: cycle
title: The work board
description:
  Build the pdocs work board at its in-between level, and keep a feature's
  finished items in view until the feature is done.
tags: [pdocs, work-board]
status: stable
lifecycle: active
started: 2026-11-19
appetite:
  "Stop when the board opens on this repository's own docs with its five pages,
  makes its two writes through pdocs set, and #210 has landed."
after: [2026-11-check-fixes-and-board-research]
generated: { by: claude-fable-5-2, at: 2026-11-19 }
---

# The work board

## Why now

The research and the mockups are done, and a direction is chosen: layout D at
the in-between capability level, recorded in the
[feature](../features/pdocs-work-board/feature.md). What is left is the build.

The board reads `pdocs view board --features`, and #210 changes what that view
and the archive advisory show for a feature whose items are finished. Building
the board first would mean reworking its Feature page and its "not archived"
Inbox row afterwards, so the two go together.

## Scope

- **[feature/pdocs-work-board](../features/pdocs-work-board/feature.md)** — the
  application and the skill that opens it: five pages (Now, Inbox, Triage,
  Cycle, Feature) and two writes (a triage decision, cycle membership), each one
  `pdocs set` call. Seven items, one per phase of its
  [plan](../features/pdocs-work-board/plan.md):
  - [item/view-entries-carry-board-fields](../items/view-entries-carry-board-fields/item.md)
    — the five fields the board needs in `pdocs view` JSON. First.
  - [item/board-server-and-pdocs-bridge](../items/board-server-and-pdocs-bridge/item.md)
    and
    [item/board-model-and-selection-rules](../items/board-model-and-selection-rules/item.md)
    — the server and the pure model. They share no files and can run side by
    side, in separate worktrees.
  - [item/board-shell-and-five-pages](../items/board-shell-and-five-pages/item.md),
    then
    [item/board-two-writes-with-undo](../items/board-two-writes-with-undo/item.md),
    then
    [item/work-board-skill-and-packaging](../items/work-board-skill-and-packaging.md)
    — they share files and run in that order.
  - [item/repin-migration-for-board-fields](../items/repin-migration-for-board-fields.md)
    — after a scaffold release carries the fields. It ships in the same plugin
    release as the skill.
- **[item/research-items-parent-feature](../items/research-items-parent-feature/item.md)**
  (#210) — a done item under an open feature stays in view until the feature is
  done.

The app lives in this repository, inside the skill. The cycle needs a scaffold
release part-way through, for the view fields, and ends with a plugin release.

Out of scope, deliberately: the robust version (state and priority changes from
the board, and the "Plan next cycle" page); the other three items of
[feature touchpoints](../features/feature-touchpoints/feature.md), which change
how agents file work, not what the board reads; and the v3.0 migration fixes,
which have [their own cycle](./2026-10-v3-migration-feedback.md). That cycle
runs after this one.

## Outcome

_Written at close, not before — and for an `abandoned` cycle too._

## Sessions

<!--
One line per branch, appended by `init-branch` as it opens them:

  - feature/some-branch (open)

`finalize-branch` rewrites `(open)` as `(landed YYYY-MM-DD)` when the branch
lands. Leave this section empty until the first branch; do not carry a
placeholder line into a real cycle.
-->

- feature/view-entries-carry-board-fields (landed 2026-11-19)
- feature/board-model-and-selection-rules (landed 2026-11-19)
- feature/board-server-and-pdocs-bridge (landed 2026-11-19)
- feature/research-items-parent-feature (landed 2026-11-24)
- feature/board-shell-and-five-pages (landed 2026-11-24)
- feature/board-two-writes-with-undo (landed 2026-11-25)
