---
type: cycle
title: Story-loom feedback, round 1
description:
  Land the nine defects the first consumer found, and ship the migration that
  delivers them to a project already on 8.0.0.
tags: [feedback, lint, migrations]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: active
started: 2026-09-14
appetite:
  Until story-loom has run v2.10 and the lint, not a person, holds templates.md
  correct.
scope:
  [
    backlog/2026-09-14-story-loom-feedback-round-1,
    backlog/2026-09-14-v2.9-to-v2.10-refresh-the-owned-files,
    backlog/2026-09-15-spellbook-feedback-round-1,
  ]
after: [] # cycles or projects this one waits on
generated: { by: claude-fable-5-1, at: 2026-09-14 }
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

- [Story-loom feedback, round 1: nine fixes](../backlog/2026-09-14-story-loom-feedback-round-1.md)
  — one branch, one commit per issue, minor plugin bump.
- [v2.9 → v2.10: refresh the owned files](../backlog/2026-09-14-v2.9-to-v2.10-refresh-the-owned-files.md)
  — the migration that carries the fixes to a consumer, and the first real use
  of seeded-template reconciliation.
- [Spellbook feedback, round 1: twelve items](../backlog/2026-09-15-spellbook-feedback-round-1.md)
  — added 2026-09-15: the second consumer's round, worked as one branch under
  the same cycle because it is the same kind of work and the release that closes
  it is the one this cycle was already waiting for.

## Outcome

_Written at close._

## Sessions

- fix/story-loom-feedback-round-1 (landed 2026-09-14)
- feature/v2.9-to-v2.10-migration (landed 2026-09-14)
- fix/v2.10-tests-derive-owned-diff (landed 2026-09-14)
- fix/v2.10-tests-ignore-release-markers (landed 2026-09-14)
- feature/spellbook-feedback-round-1 (landed 2026-09-17)
