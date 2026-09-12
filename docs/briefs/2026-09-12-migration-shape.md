---
type: brief
title: Migration Shape, and the Factory That Makes It
description:
  One migration was rebuilt as a script after three review rounds; the skill
  that teaches the old shape, the structure it mandates, and seven existing
  guides were not touched.
tags: [migrations, agent-execution, tooling]
status: draft
lifecycle: active # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5, at: 2026-09-12 }
---

# Migration Shape, and the Factory That Makes It

---

## The Spark

`v2.8-to-v2.9` was rebuilt as a script after three review rounds. The diagnosis
that forced it was not about that migration:

> A prose guide whose executable content is shell blocks run in separate
> processes makes splitting a computation from its use the natural act, and
> makes every check a string echoed rather than an exit code.

The migration changed. **The document that teaches that shape did not.**

## Inspiration & Influences

- **`.claude/skills/migration-authoring/SKILL.md`** — 180 lines specifying the
  rejected shape as doctrine: "every step a mechanical find-and-replace", "one
  verification per change", a "scaffold cleanup" step (now an anti-pattern — the
  scaffold is script-owned and private), a "version marker" step (phase 7 owns
  it), and "checklist matches steps — one item per action".
- **`update-project-docs/SKILL.md` § Creating New Migration Guides** — mandates
  `## Step-by-Step Migration`, `## What Moved`, `## What's Removed` and
  `## Checklist`. The v2.9 guide has none of the four.
- **`.claude/skills/scaffold-update-checklist/SKILL.md`** — routes every
  migration author to `migration-authoring`, and its sync procedure says "follow
  the same steps end users would, to validate the guide works". There are no
  steps; there is one command.
- **`repair-chain`** (in `agent-cli-conformance`) — the workflow that produced
  the diagnosis, by asking whether a defect had RETURNED rather than whether it
  was new.

## Vision

One shape, taught in one place, with the existing guides brought to it or
explicitly exempted. A migration author reads a skill that describes what the
v2.9 migration actually is, and the checklist that routes them there agrees.

## Core Use Cases

1. **Authoring the next migration** — v2.9-to-v2.10 is written as a script with
   a guide that explains it, because that is what the skill teaches.
2. **Repairing an orphaned tree** — `update-project-docs` § Step 7 currently
   tells an agent to hand-assemble a subset of `v2.6-to-v2.7`'s steps and
   "re-derive it in every shell". That path is an instance of the shape.
3. **Running an older migration** — a project three versions behind still runs
   `v2.6-to-v2.7` and `v2.7-to-v2.8` as they stand.

## What Makes It Interesting

The blast radius is measured, not guessed. Cross-block shell variables
(`$SCAFFOLD`, `$VERSION`, `$SKILL_DIR`) per guide:

| guide             | occurrences | companion script |
| ----------------- | ----------- | ---------------- |
| `v2.6-to-v2.7.md` | 21          | yes              |
| `v2.7-to-v2.8.md` | 17          | **none**         |
| `v1-to-v2.md`     | 8           | no               |

`v2.7-to-v2.8.md` is 626 lines with no script at all, and it is the migration
every v2.7 project still has to run.

The v2.9 round also produced two defects worth keeping as evidence, because both
were authored **by the repair written to remove them**: a guard computed in one
block and consumed in the next, and a count check that matched the manifest's
own `version` line so an empty manifest passed. Neither was caught by a test;
both were caught by review.

## What It Is / What It Isn't

**It is:**

- A rewrite of `migration-authoring` around the script shape.
- A correction to `update-project-docs` § Creating New Migration Guides and to
  `scaffold-update-checklist`'s routing and sync procedure.
- A decision, per existing guide, between rewriting it and marking it legacy.

**It is not:**

- Part of `docs-foundation`. That project shipped the seed manifest, declarable
  types and the ownership model; the migration redesign arrived from review and
  the factory work is its dependent, not its scope.
- A claim that every migration must be a script. A migration that edits only
  prose may not need one — the skill should say which is which, rather than
  teaching one shape as though it were the only one.

## Open Questions

- [ ] Rewrite the older guides, or mark them legacy and leave them working? A
      project three versions behind runs them unchanged today.
- [ ] Does `v2.7-to-v2.8` get a script? It is the largest guide, has none, and
      is the one most projects still need.
- [ ] Should `migration-authoring` teach both shapes with a rule for choosing,
      or one shape with named exceptions?
- [ ] Is there a lesson page owed here? The repo's own maintenance contract says
      durable knowledge ships with the branch that produced it, and
      `docs/lessons-learned/` gained nothing from three rounds that produced a
      replicated, cross-round finding.

## Suggested Next Steps

- [ ] Write the lesson first — it is the input to the skill rewrite, not its
      output.
- [ ] Rewrite `migration-authoring/SKILL.md`.
- [ ] Correct `update-project-docs` § Creating New Migration Guides and
      `scaffold-update-checklist`'s two references.
- [ ] Decide per guide: rewrite, or mark legacy.

---

**Origin:**

- [Docs Foundation Implementation Plan](../projects/docs-foundation/plan.md) —
  the project whose review produced this
