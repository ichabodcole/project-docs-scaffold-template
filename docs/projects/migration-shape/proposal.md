---
type: proposal
title: Migration Shape
description:
  Rewrite migration-authoring around the script shape the v2.9 migration proved,
  correct the two skills that route to it, and give every consuming project —
  all on v2.6 — a migration that verifies itself.
tags: [migrations, agent-execution, tooling]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: draft # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-fable-5-1, at: 2026-09-12 }
---

# Migration Shape

## Overview

The v2.8 → v2.9 migration is one command. Every phase checks its own result, any
failure stops the run with a non-zero exit and a named reason, and the guide
beside it explains what the command does rather than telling an agent how to do
it by hand. It took three review rounds to arrive at that shape, and the
diagnosis that forced it was not about that migration at all: a prose guide
whose executable content is shell blocks run in separate processes makes
splitting a computation from its use the natural act, and makes every check a
string echoed rather than an exit code.

The migration changed. The skill that teaches migrations did not, and neither
did the two skills that route every migration author to it.
`migration-authoring` still specifies the rejected shape as doctrine;
`update-project-docs` still mandates a file structure the v2.9 guide does not
have; and the seven earlier guides are what they were. This proposal brings the
factory to the product: one shape, taught in one place, with each existing guide
either brought to it or explicitly left as legacy.

## Problem Statement

**The next migration is written by the old rules.** The docs-foundation project
shipped `scripts/pdocs/seed.ts`, the API a later migration uses to update a
template only while the adopter has not touched it. Nothing calls it yet; the
v2.9 → v2.10 migration will be the first. An author who follows the routing
today reads `.claude/skills/migration-authoring/SKILL.md` and is told to make
"every step a mechanical find-and-replace", to write "one verification per
change", to add a "scaffold cleanup" step and a "version marker" step, and to
finish with a checklist that has "one item per action". Every one of those is
either an anti-pattern under the new shape (the scaffold is script-owned and
private; a phase owns the markers) or a restatement of the shape that produced
the defects. The skill's own quality checklist cannot be satisfied by the v2.9
migration, which is the best migration the repository has.

**The structure `update-project-docs` mandates is not the structure it ships.**
Its "Creating New Migration Guides" section requires `## What Moved`,
`## What's Removed`, `## Step-by-Step Migration` and `## Checklist`. The v2.9
guide merges the first two under one heading that reads "Nothing, in either
case" and has neither of the last two, because a script has phases rather than
steps and its output is the checklist. The section describes a guide; the
migration is a program with a guide beside it.

**The routing checklist assumes steps that no longer exist.** The
`scaffold-update-checklist` sync procedure says "follow the same steps end users
would, to validate the guide works". For v2.9 there are no steps; there is one
command and a dry run. An author following that instruction literally has
nothing to follow.

**The defect class is measured, not suspected.** Cross-block shell variables
(`$SCAFFOLD`, `$VERSION`, `$SKILL_DIR`) are the signature of the shape — a value
computed in one block and consumed in another, which an agent runs in a
different process. Counted as lines containing one:

| guide             | lines with a cross-block variable | companion script            |
| ----------------- | --------------------------------- | --------------------------- |
| `v2.6-to-v2.7.md` | 23                                | yes — one step of thirteen  |
| `v2.7-to-v2.8.md` | 17                                | none                        |
| `v1-to-v2.md`     | 8                                 | no                          |
| `v2.8-to-v2.9.md` | 2 — both inside one block         | the migration is the script |

**Every consuming project is on v2.6.** A survey of the 36 project trees on this
machine that carry a `docs/README.md` found none with `docs/SCHEMA.md`,
`scripts/pdocs/` or a seed manifest, and none with the single-file lint that
`v2.7-to-v2.8` exists to replace. That guide's population is zero. One tree,
`dreamwood/dream-flute`, does have a `docs/lint.ts` — its own whole-tree lint,
wired to its own tooling — and the guide's precondition, a bare
`[ -f docs/lint.ts ]`, would tell it to run a migration whose step 5 deletes
that file. The precondition is a false positive in the wild. dream-flute is not
a consumer at all: it and `agent-cli-conformance` are playgrounds where the
wiki-shaped frontmatter and lint were tried before this scaffold adopted them,
and they may migrate to project-docs one day or may not. `v2.6-to-v2.7` already
copies the current CLI from a fresh scaffold, so a project running it today
lands on the tooling directly and `v2.7-to-v2.8` never applies to it. The path
every other consumer will actually run is `v2.6-to-v2.7`, then the v2.9 script.
The first of those is 616 lines and carries the most cross-block state of any
guide, because its script is step 8 of 13 and the other twelve are the old shape
around it. A script beside a guide does not remove the shape. That is why the
skill is the target and not any single guide — and why the guide that matters is
the v2.6 one.

This repository is not in that population. Its markers read 7.0.0, it has a seed
manifest, and it never had `docs/lint.ts`; it is the one tree that cannot
dogfood the v2.6 path.

**The repair path is an instance of the problem.** `update-project-docs` § Step
7 tells an agent whose tree has the frontmatter layer but no CLI to run seven of
`v2.7-to-v2.8`'s twelve steps and skip five, with a table of which and a note to
"re-derive `$SCAFFOLD` in every shell". That table exists because the guide
cannot be run partially; a script whose phases each check their own precondition
would make the repair "run it". The tree it describes is what a partial
`v2.6-to-v2.7` leaves behind, so the fix belongs to that migration.

**Two defects were authored by the repair written to remove them.** In the v2.9
round: a guard computed in one block and consumed in the next, and a count check
that pattern-matched the manifest's own `version` line so an empty manifest
passed. Neither was caught by a test; both were caught by review, and the lesson
[A guard must be able to fail](../../lessons-learned/a-guard-must-be-able-to-fail.md)
records the class. The skill that teaches migration authoring does not yet point
at it.

## Proposed Solution

### The rule, stated once

A migration is a **script** when any of these is true:

- a later step depends on a value an earlier step computed — a path, a version,
  a count, a generated directory;
- a check must be able to stop the run — anything whose failure means the
  adopter's tree is now wrong;
- the migration must be re-runnable or partially applicable, so each phase has
  to test its own precondition.

A migration may remain a **guide** only when every shell block is self-contained
— nothing flows between blocks — and every check exits non-zero on failure
rather than echoing a word. A guide that cannot meet that in its draft becomes a
script. In practice, any migration that generates a scaffold is a script,
because the scaffold's path is the first cross-block value.

The rule is not "every migration is a script". A migration that adds one
template and one README paragraph has no computed state and can stay prose. The
skill says which is which, so an author does not have to argue it each time.

### What a script-shaped migration is

The v2.9 migration is the reference, and the skill describes it rather than
inventing a second one:

- **One entry point**, `migrations/scripts/migrate-vX-to-vY.ts`, run with `bun`
  from the project root. `--dry-run` reports every phase's plan and changes
  nothing; `--root` names the project; `--scaffold-dir` skips the fetch. Exit
  codes are a published contract: `0` success, `1` could not complete, `2` bad
  invocation.
- **Phases, each self-verifying.** Preflight, scaffold, the change itself,
  verify, version markers, cleanup. A phase that finds its work already done
  says so and continues; a phase that cannot confirm its result stops the run.
- **An end-of-run invariant check** for anything the ordering of phases
  guarantees, so a reordering fails in the adopter's repository rather than only
  while a test happens to exist. `manifestMatchesDisk` in the v2.9 script is the
  model.
- **A test file beside it** whose tests include, for every guard, the case that
  makes the guard fire — per the lesson, a guard that has not been watched
  failing is not a guard.
- **A guide that explains, not instructs.** Summary; what changes in the tree;
  "this migration is a script" with the two-sentence reason; what's new, moved,
  removed; how to run it; the phases; what to look for in the output; what the
  script cannot check. The Verification section lists output lines and an exit
  code, not commands to run.

### Bring the factory to the product

Three documents change, in dependency order:

1. **`migration-authoring/SKILL.md` is rewritten** around the rule and the shape
   above. The authoring principles that survive — uniform specificity, artifacts
   over descriptions, copy from scaffold rather than inline — move to the
   guide-shaped branch and to the script's own copy phases. The quality
   checklist is replaced by one the v2.9 migration passes and a prose guide with
   cross-block state fails. The skill's Lessons Learned section points at
   [A guard must be able to fail](../../lessons-learned/a-guard-must-be-able-to-fail.md)
   as the input it was written from.
2. **`update-project-docs` § Creating New Migration Guides** describes both
   shapes and names the rule for choosing. Its mandated structure becomes the
   script-guide structure, with the prose structure kept for the guide-shaped
   case. The § Step 7 orphan-repair table is replaced by whatever the
   `v2.6-to-v2.7` disposition below makes possible.
3. **`scaffold-update-checklist`** routes to the rewritten skill and its sync
   procedure says what validation is under each shape: run the script's dry run
   and then the script against this repository's own tree, or follow the steps
   for a guide.

### Each existing guide gets a disposition

- **`v2.6-to-v2.7` is rewritten as a script.** It is the migration every
  consuming project has to run, and its thirteen steps are already phase-shaped
  — install, generate, copy the layer, copy the templates, run the codemod, work
  the report, fill the catalog, open a cycle, turn the gate on, mark. The
  existing codemod, `migrate-v2.6-to-v2.7.ts`, is the hard part and already has
  the right shape; it becomes one phase of the script rather than step 8 of a
  guide. The script ends where a person has to think: tooling installed, codemod
  run, `pdocs report` printed, exit 0 — with the gate **not yet on**. The lint
  requires `description` on every document and the codemod deliberately does not
  write it, so a fresh migration cannot pass the gate; the current guide already
  orders "work the report" before "turn the gate on", and the script keeps that
  boundary. The guide then names the backfill as a defined step an agent
  performs — the worklist is the report, the precedent is this repository's own
  backfill — and turning the gate on as the step after it. Choosing a first
  cycle stays a person's call. The preflight phase also reports every folder
  under the docs root that is in no tier and not skipped, and stops: an unlisted
  folder gets the full graph tier by default, the strictest checks, and a
  consumer should declare it or skip it knowingly rather than discover that from
  the first failing run. With phases that test their own precondition, the §
  Step 7 repair path collapses to "run the script", and the seven-row table
  goes.
- **`v2.7-to-v2.8` is marked legacy, and its precondition is tightened.** Its
  population is zero, and the bare file-exists test misfires on a project that
  has a `docs/lint.ts` of its own. The guide stays in the table with the same
  banner as the older five, but its `Applies If` must identify the v2.7 lint by
  content — a string only that file carries — rather than by name, so a homonym
  is never told to delete itself.
- **`v1-to-v2` through `v2.5-to-v2.6` are marked legacy.** Each gets a short
  banner: written before the script shape, run as-is, no longer maintained to
  the current skill. They are short, four of five already ship a shell script,
  and nothing is on the far side of them. Rewriting them costs more than the
  drift they carry.

## Scope

**In scope:**

- The rule and the two shapes, stated in `migration-authoring/SKILL.md`, with a
  quality checklist the v2.9 migration passes.
- The corrections to `update-project-docs` § Creating New Migration Guides and §
  Step 7, and to `scaffold-update-checklist`'s routing and sync procedure. §
  Step 4 gains a sentence for the script-shaped case — it says "follow its
  steps", and a script has none — and otherwise stays as the mechanism that runs
  migrations in sequence.
- `v2.6-to-v2.7` rewritten as a script with a guide that explains it, tested
  against a generated v2.6 tree and against the orphaned tree Step 7 describes,
  then run for real on `dreamwood/media-forge` before it is called done.
- Legacy banners on the six guides that are not `v2.6-to-v2.7` or the v2.9
  script.
- A minor version bump of the `project-docs` plugin and a `dist/` rebuild, since
  `update-project-docs` ships.

**Out of scope:**

- Any change to the v2.9 migration. It is the reference, not a target.
- Rewriting the six legacy guides. Nothing is on the far side of five of them,
  and the sixth has no population.
- A shared migration framework or library. Each script stays self-contained by
  design, because it runs inside a repository that has not adopted whatever the
  migration adds. The skill may name the phases and flags scripts share; it does
  not extract them.
- The v2.9 → v2.10 migration itself. This project makes the next author's
  reading correct; it does not write what they will write.

**Future considerations:**

- One script that takes a v2.6 tree to the current release, chaining the v2.9
  phases after the v2.7 ones, so a consumer runs one command rather than two.
  Deferred because the v2.9 script is the reference and should stay untouched
  until the v2.6 script exists to chain into it.
- A `pdocs migrate` verb that finds the applicable script and runs it, once
  every non-legacy migration is one.

## Technical Approach

The skill rewrite is the load-bearing change and has no code dependency; it
reads the v2.9 script and guide as its reference and the lesson as its input.
Order the work so the skill lands first, because the `v2.6-to-v2.7` rewrite is
the first migration authored under it — that is the test of whether the skill
teaches the shape, and an author who reaches for the old checklist mid-rewrite
has found a gap in the new one.

The `v2.6-to-v2.7` script follows the v2.9 script's structure directly: the same
argument parser shape, the same phase list, the same exit-code contract, its own
copy of anything it needs rather than an import from the tree it is migrating.
The existing codemod keeps its self-contained folder-to-type table and the test
that pins it to the lint's; it becomes a phase the new script calls, and the
test that neuters that call site is the wiring witness. Two fixtures test the
script: a generated v2.6 tree, and the orphaned tree — frontmatter layer
present, no `scripts/pdocs/` — that the § Step 7 table currently serves. The
v2.6 tree is reproducible without a checked-in snapshot: the last release before
the frontmatter layer is tagged `project-docs-scaffold-template-v6.3.0`, and
cookiecutter with `--checkout` of that tag generates it. Each phase's
precondition test is what lets both fixtures pass through the same script.

The script stops where a person has to think. The codemod deliberately does not
write `description`, and choosing a first cycle is a decision; the script's last
phase turns the gate on and prints the report, and the guide says what to do
with it. That boundary is the one the v2.6 guide already draws at step 9, kept.

This repository cannot dogfood the result, so the sync procedure's "apply the
migration to this project's own docs" has no meaning for it. Validation is the
two fixtures and then a real run on **`dreamwood/media-forge`**: on `develop`
with a clean tree as of 2026-09-12, 115 documents outside `_archive/`, one of
them already carrying frontmatter, and active — its last commit is a day old. It
is the first consumer to take the script, with `--dry-run` read before the run
and the result committed on its own branch so it can be reverted whole.

Every guard in the new script gets the treatment the lesson prescribes before
the script is trusted: break the thing it guards and watch it report. Per-phase
tests call the phase; one test neuters each phase's call site and expects the
end-to-end run to fail, so wiring is witnessed rather than assumed.

Documents that change and ship:
`plugins/project-docs/skills/update-project-docs/SKILL.md` and its `migrations/`
folder, which rebuild into `dist/`. Documents that change and stay local: the
two skills under `.claude/skills/`. The mirror check does not cover any of them.

## Impact & Risks

**Benefits:** The next migration is written to the shape that survived review,
by an author reading one skill that agrees with the checklist that sent them
there. Every consuming project gets the migration it actually needs in a shape
that verifies itself, and the codemod that already exists is finally the centre
of it. The orphan-repair path stops being a hand-assembled subset of a guide.

**Risks:**

- _The skill rewrite reproduces the shape in new words._ The mitigation is the
  ordering: `v2.6-to-v2.7` is authored under the new skill before the skill is
  called done, and a reviewer asks whether the defect class returned rather than
  whether it is new.
- _The `v2.6-to-v2.7` script's population is every consuming project._ That is
  the whole reason to write it and the whole reason to be careful; none of them
  is this repository. The dry run, the two fixtures, a first real run on one
  project, and the guide's "what the script cannot check" section are the
  mitigation; the script reports a dirty tree and does not proceed silently past
  it.
- _Legacy banners read as abandonment._ The banner says "run as-is" and means
  it; the guides still work, and the table still lists them.

**Complexity:** Medium. The skill rewrite is judgment work with a concrete
reference. The script is a second instance of a pattern that exists, with a
known population and two fixtures.

## Open Questions

- [x] Does the v2.6 script hand off to the v2.9 script or chain into it? Hand
      off. § Step 4 already runs migrations in sequence and moves to the next;
      the cost is a second scaffold generation, and the v2.9 script stays
      untouched as the reference.
- [x] Which consuming project takes the first real run? `dreamwood/media-forge`
      — clean on `develop` as of 2026-09-12. Re-check before the run.
- [ ] Should the legacy banner name the last plugin version that maintained the
      guide, so a reader can tell how far behind the skill it is?
- [ ] Does the § Step 7 repair path need a dedicated flag on the new script, or
      do per-phase preconditions cover it without one? The proposal assumes the
      latter and the fixture decides.

## Success Criteria

- `migration-authoring`'s quality checklist is one the v2.9 migration satisfies
  in full, and a prose guide with cross-block state cannot.
- No non-legacy guide contains a shell variable computed in one block and used
  in another. The count in the table above reaches 0 for `v2.6-to-v2.7`.
- `update-project-docs` § Step 7 has no table of steps to hand-assemble.
- `v2.7-to-v2.8`'s `Applies If` is false on `dreamwood/dream-flute`.
- On a v2.6 tree with an undeclared folder, the script's preflight names the
  folder and exits non-zero before changing anything.
- On the MediaForge run, the script exits 0 with the gate off and the report
  printed; the gate goes on in a later commit, after the backfill.
- `scaffold-update-checklist`'s sync procedure names one validation per shape,
  and the script one is a command.
- The `v2.6-to-v2.7` script passes both fixtures and the real run on
  `dreamwood/media-forge`, and every guard in it has a test that watched it
  fail.
- The v2.9 → v2.10 migration, when written, is authored under the new skill
  without a review round finding the class the lesson names.

---

**Related Documents:**

- [Migration Shape, and the Factory That Makes It](../../briefs/2026-09-12-migration-shape.md)
  — the brief this proposal is drawn from
- [A guard must be able to fail](../../lessons-learned/a-guard-must-be-able-to-fail.md)
  — the lesson the skill rewrite starts from
- [Docs Foundation](../docs-foundation/proposal.md) — the project whose review
  produced the diagnosis, and which shipped `seed.ts` for the next migration to
  call
- [Migration: v2.8 → v2.9](../../../plugins/project-docs/skills/update-project-docs/migrations/v2.8-to-v2.9.md)
  — the reference migration

---

## Notes

**The population, stated once.** Every project consuming this scaffold is on
v2.6 and has not run the frontmatter migration. None is on v2.7's single-file
lint. This repository is the exception in the other direction: it is at the
current release with a seed manifest, and never passed through v2.7. The brief
was written as though projects on v2.7 existed; none do, which is what moved the
script target from `v2.7-to-v2.8` to `v2.6-to-v2.7`.

The survey used presence checks, not `docs_version`. That field is the
release-please tag of the scaffold last copied from and ranges from 2.0 to 6.0
across projects that are structurally identical; `update-project-docs` says as
much. What separates the tiers is `docs/SCHEMA.md`, `scripts/pdocs/` and
`docs/.pdocs-seed.json`. `docs/lint.ts` is not a reliable marker:
`dreamwood/dream-flute` has one that is its own, and the survey had to open the
file to tell.

**Two trees are playgrounds, not consumers.** `dreamwood/dream-flute` and
`agent-cli-conformance` each carry a wiki library, a `SCHEMA.md` inside it, and
their own `scripts/docs-lint/`. They are where the frontmatter layer and the
lint were tried before the scaffold adopted them — the lint core was ported from
`agent-cli-conformance` — and they are still where new ideas get tried first. No
migration in this proposal targets them. If either adopts project-docs later, it
arrives with frontmatter and libraries already in place, which is a path none of
the existing guides describes and this proposal does not attempt to.

The brief's "Core Use Cases" names the orphan-repair path as hand-assembling a
subset of `v2.6-to-v2.7`'s steps. The skill's § Step 7 actually draws on
`v2.7-to-v2.8`; the proposal uses the correct guide. The point stands either
way.
