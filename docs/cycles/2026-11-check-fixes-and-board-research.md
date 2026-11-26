---
type: cycle
title: Check fixes and the board and touchpoint research
description:
  Two research threads, the work board and the feature touchpoint, beside the
  pdocs check fixes adopters reported in November.
tags: [pdocs, research]
status: stable
lifecycle: closed
started: 2026-11-17
appetite:
  Stop when both write-ups reach a recommendation and the three check fixes ship
  in a scaffold release.
after: []
generated: { by: claude-fable-5-2, at: 2026-11-17 }
closed: 2026-11-19
---

# Check fixes and the board and touchpoint research

## Why now

Two questions are ready to be researched and neither blocks the other: what a
project-docs work board should be, and where an agent should ask whether work
needs a feature. Both feed design work that cannot start without them.

Beside them sit three `pdocs check` bugs adopters reported in November. One of
them (#207) lets through frontmatter that other tools cannot open, and
`pdocs new` writes the shape that breaks.

## Scope

- **[item/pdocs-board-landscape](../items/pdocs-board-landscape/item.md)** —
  research: what a work board shows, lets you do, and leaves to other tools.
  Unblocks the mockups.
- **[item/feature-or-item-touchpoint](../items/feature-or-item-touchpoint/item.md)**
  — research: where the feature question reaches an agent filing work.
- **[item/dot-dot-name-inside-docs-root](../items/dot-dot-name-inside-docs-root/item.md)**
  (#209),
  **[item/heading-anchors-match-github](../items/heading-anchors-match-github/item.md)**
  (#208) and
  **[item/check-rejects-non-strict-yaml-frontmatter](../items/check-rejects-non-strict-yaml-frontmatter/item.md)**
  (#207) — the check fixes. They share lint files, so the branches run in that
  order.
- **[item/project-summary-zsh-glob-and-old-cli](../items/project-summary-zsh-glob-and-old-cli/item.md)**
  — the project-summary command runs under zsh and on an older CLI.
- **[item/ci-migration-test-git-hang-cause](../items/ci-migration-test-git-hang-cause/item.md)**
  — research: why fixture git hangs on CI. The cycle's release pushes to main,
  which is where the hang shows. Timeboxed to one working session: if the cause
  is not found by then, record what was ruled out and what to instrument next,
  and close the item on that.

The two research items and the project-summary fix can run alongside the check
fixes. The cycle ends with a scaffold release and a plugin release.

Out of scope, deliberately: the mockups and the archiving touchpoint, which wait
on the research; and the v3.0 migration fixes, which have
[their own cycle](./2026-10-v3-migration-feedback.md). That cycle runs after
this one: most of the projects it serves have already migrated.

## Outcome

Closed 2026-11-19. The appetite was met: both write-ups reached a
recommendation, and the three check fixes shipped in scaffold 9.4.2.

- **Shipped.** Scaffold 9.4.2 carries the fixes for #207, #208 and #209. Plugin
  project-docs 4.6.0 carries the project-summary fix. CI runs on Bun 1.4.4.
- **Research.** The board write-up recommended a local board over `pdocs` JSON.
  The touchpoint write-up recommended an advisory on `pdocs new item`, with the
  filing skills as a second layer.
- **Beyond the scope.** The mockups were built in this cycle too, and layout D
  was chosen. The [work board](../features/pdocs-work-board/feature.md) has a
  plan, a test plan and seven items, in
  [the next cycle](./2026-11-work-board.md).
- **Carried over.**
  [item/ci-migration-test-git-hang-cause](../items/ci-migration-test-git-hang-cause/item.md)
  moved to the next cycle still `active`. Its last box needs ten clean CI runs
  in a row on Bun 1.4.4, and fewer than ten have run.
- **Not done.** The v3.0 migration still pins scaffold 9.4.1, so an adopter who
  migrates does not get the three fixes yet.

## Sessions

<!--
One line per branch, appended by `init-branch` as it opens them:

  - feature/some-branch (open)

`finalize-branch` rewrites `(open)` as `(landed YYYY-MM-DD)` when the branch
lands. Leave this section empty until the first branch; do not carry a
placeholder line into a real cycle.
-->

- chore/pin-bun-1-4-4 (landed 2026-11-17)
- fix/dot-dot-name-inside-docs-root (landed 2026-11-17)
- fix/project-summary-zsh-glob-and-old-cli (landed 2026-11-17)
- fix/heading-anchors-match-github (landed 2026-11-17)
- fix/check-rejects-non-strict-yaml-frontmatter (landed 2026-11-17)
