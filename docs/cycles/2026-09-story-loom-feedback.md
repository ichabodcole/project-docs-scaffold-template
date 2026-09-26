---
type: cycle
title: Story-loom feedback, round 1
description:
  Land the nine defects the first consumer found, and ship the migration that
  delivers them to a project already on 8.0.0.
tags: [feedback, lint, migrations]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: closed
started: 2026-09-14
appetite:
  Until story-loom has run v2.10 and the lint, not a person, holds templates.md
  correct.
after: [] # cycles or projects this one waits on
generated: { by: claude-fable-5-1, at: 2026-09-14 }
closed: 2026-09-26
---

# Story-loom feedback, round 1

## Why now

Story-loom adopted 8.0.0 on 2026-09-14, the first project to run the v2.6
migration as a script, and came back with nine issues. All nine were reproduced
here before this cycle opened. Two of them pass the lint silently — a real page
hidden by a template heuristic, and prose scraped into tags — which means the
gate a consumer just turned on is not yet the gate it appears to be. The fixes
are small; delivering them to a project already on 8.0.0 needs a migration, and
that is the second branch this cycle exists to hold.

## Scope

- [Story-loom feedback, round 1: nine fixes](../items/story-loom-feedback-round-1.md)
  — one branch, one commit per issue, minor plugin bump.
- [v2.9 → v2.10: refresh the owned files](../items/v2.9-to-v2.10-refresh-the-owned-files.md)
  — the migration that carries the fixes to a consumer, and the first real use
  of seeded-template reconciliation.
- [Spellbook feedback, round 1: twelve items](../items/spellbook-feedback-round-1.md)
  — added 2026-09-15: the second consumer's round, worked as one branch under
  the same cycle because it is the same kind of work and the release that closes
  it is the one this cycle was already waiting for.
- [pdocs check inherits git's hook variables](../items/check-inherits-git-hook-variables.md)
  — added 2026-09-22: what the Spellbook branch's re-review found on `develop`,
  worked here so the release this cycle waits for carries it.

## Outcome

All four items landed: story-loom's nine fixes, the v2.9 → v2.10 migration,
Spellbook's twelve, and the hook-variable crash. Spellbook's round and the hook
fix shipped in 9.0.0. The appetite named story-loom running v2.10. Closed on
2026-09-26 without that: Spellbook's 8.1.0 → 9.0.0 migration exercised the same
path and more, story-loom has live work in flight, and its migration now tests
the next release instead. Two of the landed items still read `backlog` after the
v3.0 migration, which carried their pre-release state forward; they were set
`done` at close.

Carried over: nothing unfinished. The feedback from the first 9.0.0 consumers
opens [v9 rollout feedback](./2026-09-v9-rollout-feedback.md), and story-loom's
migration becomes its check.

## Sessions

- fix/story-loom-feedback-round-1 (landed 2026-09-14)
- feature/v2.9-to-v2.10-migration (landed 2026-09-14)
- fix/v2.10-tests-derive-owned-diff (landed 2026-09-14)
- fix/v2.10-tests-ignore-release-markers (landed 2026-09-14)
- feature/spellbook-feedback-round-1 (landed 2026-09-17)
- fix/check-inherits-git-hook-variables (landed 2026-09-22)
