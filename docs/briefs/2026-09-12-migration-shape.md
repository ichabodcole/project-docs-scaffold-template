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
  `## Checklist`. The v2.9 guide has two of the four, merged into one heading
  that reads "Nothing, in either case"; it has no step list and no checklist.
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
(`$SCAFFOLD`, `$VERSION`, `$SKILL_DIR`, braced or not) per guide, counted as
lines containing one:

| guide             | lines with a cross-block variable | companion script |
| ----------------- | --------------------------------- | ---------------- |
| `v2.6-to-v2.7.md` | 23                                | yes              |
| `v2.7-to-v2.8.md` | 17                                | **none**         |
| `v1-to-v2.md`     | 8                                 | no               |

`v2.7-to-v2.8.md` is 626 lines with no script at all, and it is the migration
every v2.7 project still has to run.

`v2.6-to-v2.7.md` has a companion script and carries the most cross-block state
of the three. A script beside a guide does not remove the shape; the guide does.
That is why the skill is the target and not any single guide.

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
      is the one most projects still need. A script alone is not the answer —
      `v2.6-to-v2.7` has one and the same shape — so the question is whether the
      guide is rewritten around one.
- [ ] Should `migration-authoring` teach both shapes with a rule for choosing,
      or one shape with named exceptions?
- [x] Is there a lesson page owed here? It was:
      [A guard must be able to fail](../lessons-learned/a-guard-must-be-able-to-fail.md)
      landed with the session record (`c7b17be`). It names both defects kept as
      evidence above and the replicated, cross-round shape they share.

## Suggested Next Steps

- [ ] Rewrite `migration-authoring/SKILL.md`, starting from
      [A guard must be able to fail](../lessons-learned/a-guard-must-be-able-to-fail.md)
      — the lesson is the input to the rewrite, not its output.
- [ ] Correct `update-project-docs` § Creating New Migration Guides and
      `scaffold-update-checklist`'s two references.
- [ ] Decide per guide: rewrite, or mark legacy.

---

**Origin:**

- [Docs Foundation Implementation Plan](../projects/docs-foundation/plan.md) —
  the project whose review produced this
