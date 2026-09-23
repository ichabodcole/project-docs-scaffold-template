---
type: cycle
title: Work Taxonomy release
description:
  Ship Work Taxonomy and Guidance Lifecycle as one major release — the new
  model, this repository migrated onto it, and one consumer migrated after it.
tags: [taxonomy, migrations]
status: draft
lifecycle: planned
started: 2026-09-22
appetite:
  Until this repository runs on the new model with the old types retired, and
  story-loom has completed the v2.10-to-v3.0 migration.
scope: [project/work-taxonomy, project/guidance-lifecycle]
after: [] # cycles or projects this one waits on
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Work Taxonomy release

## Why now

The work vocabulary grew ad hoc and no longer composes: backlog is a state with
a folder, the project folder does three jobs, and nothing closes. The
[investigation](../investigations/2026-09-22-work-taxonomy-for-agent-first-development-investigation.md)
settled the model, and Guidance Lifecycle retires types from the same schema, so
the two ship together as one breaking release rather than two.

This cycle is `planned` while
[Story-loom feedback, round 1](./2026-09-story-loom-feedback.md) is still active
— at most one cycle may be active, and that one closes when story-loom runs
v2.10. Branches are listed below by hand until this cycle becomes active.

## Scope

- **[project/work-taxonomy](../projects/work-taxonomy/proposal.md)** — the six
  phases of [the plan](../projects/work-taxonomy/plan.md) landed, this
  repository migrated and the old types retired, the
  [test plan](../projects/work-taxonomy/test-plan.md)'s Tier 1 and Tier 2 green.
- **[project/guidance-lifecycle](../projects/guidance-lifecycle/proposal.md)** —
  its success criteria hold (test plan T2-11), landed through the same phases.

Out of scope, deliberately: a UI over the new files; deriving `released_in` from
commit trailers; the skill-set changes the Phase 4 audit finds that the taxonomy
does not require — those are filed as items for later.

## Outcome

_Written at close, not before._

## Sessions

- feature/work-taxonomy-p1-schema-lint (landed 2026-09-22)
- feature/work-taxonomy-p2-pdocs-verbs (landed 2026-09-22)
