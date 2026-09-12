---
type: plan
title: Docs Foundation Implementation Plan
description:
  Ship the seed manifest and the declarable type vocabulary, in that order, so
  the lifecycle project can retire types without removing capability.
tags: [configuration, ownership, lint]
status: draft
lifecycle: draft # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5, at: 2026-09-11 }
---

# Docs Foundation Implementation Plan

## Overview

Two mechanisms, neither of which changes an existing document: adopters declare
their own document types, and the scaffold states — and honours — which files
they may edit.

Phase 3 is already prototyped. `f327151` landed the declarable type vocabulary
in 46 lines across three files, verified by hand but with no tests, no
documentation and no `find` validation. Treat it as a spike result, not as
finished work.

Source: [proposal](./proposal.md). Evidence:
[brief](../../briefs/2026-09-11-guidance-layer-and-touch-points.md).

## Outcome & Success Criteria

Done when all of these hold:

- A generated project declares `docs/runbooks/` in `.project-docs.json`, adds a
  page, and reaches `pdocs check` exit 0.
- Withdrawing the declaration while leaving the folder returns exit 9.
- A folder declared into `durable` gets the library tier, including
  `ORPHAN ... add its catalog line`.
- `pdocs find --type nonsense` exits non-zero and names the resolved vocabulary
  in `details.choices`.
- A locally-edited seeded file survives two consecutive migration runs, while an
  untouched one updates in the same run.
- A migration reports a diverged file by name — never silently skips it, never
  silently overwrites it.
- A missing manifest entry keeps the adopter's copy and reports it.
- `docs/SCHEMA.md` states the ownership class of every file the scaffold ships.
- `npm run check` green; the payload verified by generating, not reading.

## Approach Summary

Phases 1 and 2 build the seed manifest and reclassify the 16 templates. Phase 3
finishes the type vocabulary the spike started. Phase 4 writes the migration
that delivers both.

The order matters once: the migration in Phase 4 must not run before the
manifest exists, or it overwrites adopter edits on the very run that was
supposed to start protecting them.

**Read before starting:** `scripts/pdocs/lint/registry.ts` (the registry, 629
lines — `buildRegistry` at 533 is the seam), `scripts/pdocs/docs-lint/config.ts`
(the config parser), `scripts/pdocs/commands/new.ts` lines 5–32 (the ownership
boundary, in prose), and `scripts/check-mirror.sh` (`DIFFERS_BY_DESIGN`, line
72).

**Two facts that will save you an hour:**

- **`scripts/pdocs/**`is byte-mirrored into`{{cookiecutter.project_slug}}/scripts/pdocs/**`.**
  Every edit under `scripts/pdocs/` must be copied across in the same commit or
  `check:mirror` fails. The pre-commit hook runs the full gate, so you find out
  immediately.
- **Migration layer numbers are not release versions.** Migrations are named
  `v2.8-to-v2.9`; the scaffold release is `7.0.0`. This work is layer **v2.9**.

## Phases

### Phase 1: The seed manifest ✅

**Goal.** Record what the scaffold installed, so a later migration can tell an
adopter's edit from a scaffold change.

**Key changes.**

- Create `scripts/seed-manifest.ts` — writes and reads `docs/.pdocs-seed.json`,
  a flat `{ "<repo-relative path>": "<sha256>" }` map plus the scaffold
  `version` that wrote it.
- Reconciliation has exactly three outcomes, and the third is the one that
  matters: entry present and hash matches → overwrite, re-record. Entry present
  and hash differs → keep theirs, **report by name**. Entry **absent** → keep
  theirs, report. A missing entry must never mean "safe to overwrite"; fail
  toward the adopter's copy.
- Generate the manifest at build time so the payload ships one, and have
  `hooks/post_gen_project.py` leave it in place on both install branches.

**Tasks.**

1. Write `scripts/seed-manifest.test.ts` covering the three outcomes plus a
   corrupt-JSON manifest. Run it; watch it fail.
2. Implement `scripts/seed-manifest.ts` until it passes.
3. Add manifest generation to `scripts/build-skills-dist.sh`, or a sibling build
   step. **It must be unconditional** — see `537c073`, where a build step gated
   on an optional tool made `check:dist` pass locally and fail in CI.
4. Verify by generating:
   `cookiecutter . --no-input --overwrite-if-exists -o /tmp/cc install_target="New project folder"`,
   then confirm `/tmp/cc/my-project/docs/.pdocs-seed.json` exists and its hashes
   match the files on disk.
5. Commit.

**Validation.** `bun test`; the generated project carries a manifest whose
hashes verify.

**Dependencies.** None. Start here.

### Phase 2: Reclassify templates as seeded ✅

**Goal.** Hand the 16 templates to adopters without putting OKF at risk.

**Key changes.**

- 10 category templates (`docs/*/TEMPLATE*.md`) and 6 project templates
  (`docs/projects/TEMPLATES/*.template.md`) enter the manifest as seeded.
- Each gains a one-line note directly under the frontmatter: the frontmatter
  block is the contract, everything below it is yours. This matters most for
  hand-copiers — `new.ts`'s header records that copying a template by hand is
  still the majority path, and a hand-copier gets no `type` repair.
- `docs/SCHEMA.md` gains an **Ownership** section naming all three classes and
  listing which files are in each.

**Correction to the proposal.** The proposal says seeded files need
`check-mirror.sh` exemptions. **They do not, and adding them would be a
regression.** The mirror compares this repo against the payload — both copies
are project-docs'. "Seeded" describes migration behaviour in a _consumer_. The
two are orthogonal, and exempting the templates would stop the check that keeps
16 file pairs honest. Exempt a file only if project-docs deliberately tailors
its own copy; `PROJECT_MANIFESTO.md` and `index.md` are exempt for that reason
and nothing here joins them.

**Tasks.**

1. Add the contract note to one template; run `npm run check`. Confirm
   `check:mirror` fails because the payload copy has not been updated — proving
   the mirror is live before relying on it.
2. Copy to the payload; confirm the gate goes green.
3. Repeat for the remaining 15, committing in one batch.
4. Write the `SCHEMA.md` ownership section. Mirror it.
5. Commit.

**Validation.** `npm run check` green; `check:mirror` reports 52+ files
matching.

**Dependencies.** Phase 1 (the manifest must exist to list them in).

### Phase 3: Finish the type vocabulary ✅

**Goal.** Make `f327151` shippable — tests, discoverability, and `find`
validation.

**Already done in `f327151`** (verify rather than repeat): `lint.types` parsed
in `scripts/pdocs/docs-lint/config.ts`; adopter rows appended in `buildRegistry`
(`scripts/pdocs/lint/registry.ts`); both position→type resolvers in
`scripts/pdocs/lint/rules.ts` falling back to the declared map.

**Key changes.**

- `scripts/pdocs/lint/registry.test.ts` and `rules.test.ts` — tests for the
  three hand-verified cases.
- `scripts/pdocs/commands/find.ts` line 87 compares `page.type !== f.type` with
  no validation, so a mistyped type returns `ok: true, count: 0` at exit 0 —
  indistinguishable from "nothing matches." Reject unknown types using the
  existing envelope: `UsageError(msg, { token, choices })`, the shape
  `new.ts:229` already uses. **`choices` must be the resolved vocabulary**
  including declared types, or it rejects valid local types — a worse failure
  than the one it replaces.
- `docs/SCHEMA.md` documents `lint.types`: the key, the folder→type shape, and
  that tier follows from listing the folder in `durable` or `workbench`.

**Tasks.**

1. Write the three registry/rules tests: declared+workbench → clean; declaration
   withdrawn, folder present → `WRONG TYPE`; declared+durable → `ORPHAN`. Run;
   watch them pass (the implementation is already in).
2. Write a failing test for `find --type nonsense` expecting non-zero and
   `details.choices`.
3. Implement the rejection in `find.ts`. Run; watch it pass.
4. Add a test asserting a **declared** type is accepted by `find --type` — this
   is the regression the naive fix causes.
5. Document `lint.types` in `docs/SCHEMA.md`; mirror it.
6. Commit.

**Validation.** `bun test`; the four success criteria about types.

**Dependencies.** None on Phases 1–2; can run in parallel if useful.

### Phase 4: The v2.9 migration ✅

**Goal.** Deliver both mechanisms to an existing project.

**Key changes.**

- `plugins/project-docs/skills/update-project-docs/migrations/v2.8-to-v2.9.md`.
- A row in `update-project-docs`'s migration table. Its detection predicate is
  the manifest's absence: `[ ! -f docs/.pdocs-seed.json ]`.
- The migration seeds the manifest for an existing project. **On first run every
  file is unknown**, and by Phase 1's rule that means "keep theirs and report" —
  so the first migration adopts whatever the project already has and records it.
  That is correct: it cannot know what they edited before the manifest existed.
- Bump the plugin minor; add a version-history entry in
  `plugins/project-docs/README.md`.

**Tasks.**

1. Write the guide following `migration-authoring`, taking uniform step
   specificity from
   [Migration Steps Must Be Uniformly Specific](../../lessons-learned/migration-steps-uniform-specificity.md).
2. Reconstruct a v2.8 tree in a scratch dir; run the guide end to end.
3. Run it a **second** time. Assert idempotence and that an edit made between
   runs survives.
4. Rebuild `dist/` (`./scripts/build-skills-dist.sh`) and commit it.
5. Commit.

**Validation.** The guide runs twice cleanly against a reconstructed tree;
`npm run check` green.

**Dependencies.** Phases 1–3.

## Key Risks & Mitigations

- **The migration runs before the manifest exists** and overwrites adopter edits
  on the run meant to start protecting them. Mitigation: Phase 4 depends on
  Phase 1, and first-run treats every file as theirs.
- **`find --type` validation rejects declared types.** The obvious fix validates
  against the built-in list. Mitigation: task 4 of Phase 3 exists only to catch
  this.
- **A mirror edit ships to consumers unnoticed.** Everything under
  `scripts/pdocs/` is byte-mirrored. Mitigation: the pre-commit hook runs
  `check:mirror`; never bypass with `--no-verify`.
- **Verifying the payload by reading it.** Read it and it looks right; generate
  from it and the install branch surfaces. Mitigation: every payload change is
  verified by `cookiecutter ... install_target="New project folder"`.
- **A build step gated on an optional tool.** Exactly the `537c073` defect —
  `check:dist` passed locally and was unpassable in CI. Mitigation: manifest
  generation is unconditional and stdlib-only.

## Testing & Validation Strategy

`bun test` (589 passing today) is the unit layer; `npm run check` is the gate
and runs `format:check`, `docs:lint`, `check:version`, `check:mirror`,
`check:dist` and `test`. The pre-commit hook runs the whole gate, so a red
commit is not possible without `--no-verify`.

Three things unit tests structurally cannot cover, each needing a real run:

1. **Payload correctness** — generate a project and run its CLI. Reading is not
   verifying.
2. **Migration idempotence** — run the guide twice against a reconstructed tree.
3. **Manifest reconciliation across a version boundary** — edit a seeded file
   between two migration runs and assert it survives.

**Perturbation-test every new guard.** A check that cannot fail is worse than no
check, because it reports success. For each of the three manifest outcomes,
deliberately produce the condition and confirm the failure fires. This repo has
shipped guards that were structurally unable to report failure; see
[What seven self-run phase gates missed](../../memories/2026-09-06-self-review-blind-spots.md).

## Assumptions & Constraints

- Cole is the sole consumer. No compatibility shims; defaults change and old
  documents are deleted rather than migrated.
- No new runtime dependencies. `pdocs` is zero-dependency Bun; the manifest uses
  `node:crypto` and nothing else.
- Non-breaking: a minor bump. Nothing here removes a type or changes a
  document's meaning — that is
  [guidance-lifecycle](../guidance-lifecycle/proposal.md).
- Phases 1–2 and Phase 3 are independent and may be worked in either order.

## Open Questions

- Does `docs/.pdocs-seed.json` belong at the docs root or the repository root?
  Docs root keeps it beside what it describes and inside `docsRoot`; repo root
  keeps a dotfile out of a browsable documentation tree. Resolve in Phase 1 — it
  is a one-line change either way, and both are lint-invisible.
- Should the manifest record the scaffold version per file, rather than once for
  the file as a whole? Per-file would let a report say "yours diverged, and ours
  changed in 7.2." Deferred unless Phase 4 finds the single version
  insufficient.

## Implementation Notes

**All four phases complete, 2026-09-11.** Both open questions resolved in Phase
1: the manifest lives at `docs/.pdocs-seed.json`, and a seeded file the adopter
deleted stays deleted. One deviation: the manifest is written by the
cookiecutter post-gen hook rather than at build time, because hashing the files
actually installed cannot go stale where a committed artifact would need its own
gate. A fifth verdict — `install`, for a file neither recorded nor present —
surfaced while implementing; without it a template added in a later version
would have been skipped for ever.

`f327151` is on `feat/docs-foundation` and is a spike: hand-verified, untested,
undocumented. Phase 3 task 1 should confirm the three cases still hold before
writing anything new — if a test fails there, the spike regressed rather than
the test being wrong.
