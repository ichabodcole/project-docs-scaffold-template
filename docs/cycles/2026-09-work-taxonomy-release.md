---
type: cycle
title: Work Taxonomy release
description:
  Ship Work Taxonomy and Guidance Lifecycle as one major release — the new
  model, this repository migrated onto it, and one consumer migrated after it.
tags: [taxonomy, migrations]
status: draft
lifecycle: closed
started: 2026-09-22
appetite:
  Until this repository runs on the new model with the old types retired, and
  story-loom has completed the v2.10-to-v3.0 migration.
after: [] # cycles or projects this one waits on
generated: { by: claude-opus-5-5, at: 2026-09-22 }
closed: 2026-09-26
---

# Work Taxonomy release

## Why now

The work vocabulary grew ad hoc and no longer composes: backlog is a state with
a folder, the project folder does three jobs, and nothing closes. The
[investigation](../items/work-taxonomy-for-agent-first-development/write-up.md)
settled the model, and Guidance Lifecycle retires types from the same schema, so
the two ship together as one breaking release rather than two.

This cycle is `planned` while
[Story-loom feedback, round 1](./2026-09-story-loom-feedback.md) is still active
— at most one cycle may be active, and that one closes when story-loom runs
v2.10. Branches are listed below by hand until this cycle becomes active.

## Scope

- **[project/work-taxonomy](../features/work-taxonomy/feature.md)** — the six
  phases of [the plan](../features/work-taxonomy/plan.md) landed, this
  repository migrated and the old types retired, the
  [test plan](../features/work-taxonomy/test-plan.md)'s Tier 1 and Tier 2 green.
- **[project/guidance-lifecycle](../features/guidance-lifecycle/feature.md)** —
  its success criteria hold (test plan T2-11), landed through the same phases.

Out of scope, deliberately: a UI over the new files; deriving `released_in` from
commit trailers; the skill-set changes the Phase 4 audit finds that the taxonomy
does not require — those are filed as items for later.

## Outcome

Both features shipped in scaffold 9.0.0 and plugin 4.0.0 on 2026-09-26, through
the six phase branches below. This repository runs on the new model: `backlog/`
and `projects/` are gone, items, features and cycles replace them, and the lint
enforces the vocabulary.

Cut: the appetite's last clause, story-loom completing the v3.0 migration.
Story-loom had live work, so Spellbook ran it first (8.1.0 → 9.0.0). Its
findings and wocky-talky's became
[v9 rollout feedback](./2026-09-v9-rollout-feedback.md); story-loom's run is
carried by [Story-loom migration](./2026-09-story-loom-migration.md). The Phase
4 audit's findings went to
[skill surface cleanup](../features/skill-surface-cleanup/feature.md), as Scope
said they would.

Learned: this cycle was never `active`. The one-active rule held the slot for
story-loom feedback round 1 throughout, so the largest cycle to date was
recorded as `planned`, its branches listed by hand. And because its scope was
two features rather than items, `pdocs view cycle` lists nothing and can never
call it closable: membership lives on items, and a feature has no `cycle` field.
Closed by hand on 2026-09-28, dated to the release.

## Sessions

- feature/work-taxonomy-p1-schema-lint (landed 2026-09-22)
- feature/work-taxonomy-p2-pdocs-verbs (landed 2026-09-22)
- feature/work-taxonomy-p3-templates-prose (landed 2026-09-24)
- feature/work-taxonomy-p4-skills (landed 2026-09-25)
- feature/work-taxonomy-p5-migration (landed 2026-09-25)
- chore/work-taxonomy-p6-release-checks (landed 2026-09-25)
- release 9.0.0 (released 2026-09-26)
