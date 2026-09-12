---
type: test-plan
title: Docs Foundation Test Plan
description:
  Tiered verification for the seed manifest and the declarable type vocabulary,
  weighted toward the failure modes unit tests cannot reach.
tags: [configuration, ownership, lint]
status: draft
lifecycle: draft # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5, at: 2026-09-11 }
---

# Test Plan: Docs Foundation

## Overview

Verification for [the plan](./plan.md) and [the proposal](./proposal.md): the
seed manifest, the 19 reclassified templates, the declarable type vocabulary,
and the v2.9 migration.

The weighting is deliberate. `bun test` already covers unit behaviour well — so
this plan spends its Tier 2 budget on the three things unit tests structurally
cannot reach: **payload correctness** (reading a payload is not verifying it),
**migration idempotence** (a second run is a different test from the first), and
**manifest reconciliation across a version boundary** (requires two runs with an
edit between them).

Two scenarios exist solely as regression guards against traps the plan names:
`T2-05` (the obvious `find --type` fix rejects the declared types this project
exists to allow) and `T1-04` (a build step gated on optional tooling, which is
`537c073` verbatim).

## Test Environment

**Prerequisites:**

- `bun` 1.4+ — runs the CLI and the test suite.
- `python3` on `PATH` — `npm run check` invokes it via `check-version.sh` and
  the frontmatter normalizer. A missing `python3` fails the gate, not the code.
- `cookiecutter` — required for every payload scenario. Verify with
  `cookiecutter --version`; without it, T1-02, T1-03 and T2-01 are **blocked,
  not failed**.
- A scratch directory. Use the session scratchpad, never `/tmp` directly.

**External Dependencies:** None. No accounts, credentials, API keys or
environment variables. Everything runs offline against the local tree.

**Verification command:**

```bash
bun --version && python3 --version && cookiecutter --version
```

All three must print a version before executing any scenario.

---

## Verification Scenarios

### Tier 1 — Smoke Tests

#### T1-01: The gate passes

**Type:** Integration\
**Source:** Baseline

**Steps:**

1. `npm run check`

**Expected:** Exit 0. All six sub-checks report clean: `format:check`,
`docs:lint`, `check:version`, `check:mirror`, `check:dist`, and `bun test` with
0 failures.

---

#### T1-02: A generated project's CLI runs

**Type:** Integration\
**Source:** Plan Phase 1, "verify by generating"

**Steps:**

1. `cookiecutter . --no-input --overwrite-if-exists -o "$SCRATCH/cc" install_target="New project folder"`
2. `cd "$SCRATCH/cc/my-project"`
3. `bun scripts/pdocs/cli.ts check`

**Expected:** Exit 0. Note that `--no-input` alone picks the current-directory
install, which moves `docs/` to the parent and leaves no project to inspect —
`install_target` must be passed explicitly.

---

#### T1-03: The payload ships a valid manifest

**Type:** Integration\
**Source:** Plan Phase 1

**Steps:**

1. Generate as in T1-02.
2. Confirm `docs/.pdocs-seed.json` exists in the generated project.
3. Recompute the sha256 of every path it lists and compare to the recorded
   value.

**Expected:** The file exists, every listed path exists on disk, and every hash
matches. A manifest that ships stale hashes is worse than none — it certifies
files as untouched that are not.

---

#### T1-04: The build is deterministic without optional tooling

**Type:** Integration\
**Source:** Plan Phase 1, risk "a build step gated on an optional tool"

**Steps:**

1. `./scripts/build-skills-dist.sh && ./scripts/check-dist.sh` — record the
   result.
2. Temporarily make `uv` unavailable to the build (the `537c073` reproduction
   moved `pyproject.toml` aside).
3. Rebuild and re-run `check-dist.sh`.

**Expected:** Identical output both times. This is the exact defect in
`537c073`, where `check:dist` passed locally and was structurally unpassable in
CI; manifest generation must not reintroduce it.

---

### Tier 2 — Critical Path

#### T2-01: A project declares its own type

**Type:** Integration\
**Source:** Proposal success criterion 1; Plan Phase 3

**Steps:**

1. Generate a project as in T1-02.
2. Add `"types": { "runbooks": "runbook" }` under `lint` in
   `.project-docs.json`, and add `"runbooks"` to `workbench`.
3. Create `docs/runbooks/restart-the-queue.md` with `type: runbook` and valid
   OKF frontmatter.
4. `bun scripts/pdocs/cli.ts check`

**Expected:** Exit 0, `docs-lint: clean`.

---

#### T2-02: Withdrawing the declaration restores the rejection

**Type:** Integration\
**Source:** Proposal success criterion 2

**Steps:**

1. From T2-01's end state, remove the `types` entry, leaving the folder and the
   document in place.
2. `bun scripts/pdocs/cli.ts check`

**Expected:** Exit 9. This is the perturbation test for T2-01 — without it,
T2-01 passing proves only that the lint is quiet, not that it is looking.

---

#### T2-03: A declared type may be durable

**Type:** Integration\
**Source:** Proposal, resolved open question

**Steps:**

1. From T2-01's end state, move `"runbooks"` from `workbench` to `durable`.
2. `bun scripts/pdocs/cli.ts check`
3. Add the catalog line for the page to `docs/index.md`.
4. Re-run.

**Expected:** Step 2 exits 9 with
`ORPHAN ... (unreachable from index.md — add its catalog line)`. Step 4 exits 0.
The library tier's obligations apply to declared types with no special casing.

---

#### T2-04: `find --type` rejects an unknown type

**Type:** Unit\
**Source:** Proposal success criterion 4; Plan Phase 3

**Steps:**

1. `bun scripts/pdocs/cli.ts find --type nonsense; echo $?`

**Expected:** Non-zero exit. The error names the resolved vocabulary in
`error.choices`. It must **not** return `ok: true, count: 0` at exit 0, which is
today's behaviour and is indistinguishable from "nothing matches."

---

#### T2-05: `find --type` accepts a declared type

**Type:** Unit\
**Source:** Plan Phase 3 task 4 — regression guard

**Steps:**

1. In a project declaring `runbook` (T2-01's state), run
   `bun scripts/pdocs/cli.ts find --type runbook`.

**Expected:** Exit 0, the runbook page returned. **This scenario exists because
the obvious implementation of T2-04 breaks it** — validating against the
built-in list rejects exactly the types this project was built to allow. T2-04
passing while T2-05 fails is a worse outcome than shipping neither.

---

#### T2-06: An adopter's edit survives migration; an untouched file updates

**Type:** Integration\
**Source:** Proposal success criterion 5; Plan Phase 1

**Steps:**

1. Generate a project; confirm its manifest (T1-03).
2. Edit the **body** of `docs/playbooks/TEMPLATE.md` — below the frontmatter —
   leaving `docs/architecture/TEMPLATE.md` untouched.
3. Change both templates in the scaffold, so the source has genuinely moved.
4. Run the v2.9 migration against the project.

**Expected:** The edited playbook template is unchanged and **reported by name**
as diverged. The untouched architecture template is updated and its hash
re-recorded. Both halves must hold — a run that preserves everything is
indistinguishable from a run that did nothing.

---

#### T2-07: A missing manifest entry keeps the adopter's copy

**Type:** Integration\
**Source:** Proposal success criterion 7; Plan Phase 1 risk

**Steps:**

1. From a project with a manifest, delete one entry from
   `docs/.pdocs-seed.json`, leaving the file on disk.
2. Run the migration.

**Expected:** The file is **kept and reported**, never overwritten. Unknown must
fail toward the adopter's copy. The same rule makes the first-ever migration
safe, when nothing is known.

---

#### T2-08: The migration is idempotent

**Type:** Integration\
**Source:** Plan Phase 4 task 3

**Steps:**

1. Reconstruct a v2.8 tree in a scratch directory.
2. Run the v2.9 guide end to end. Record the tree state.
3. Run it a second time.

**Expected:** The second run makes no changes to the manifest and reports
`every recorded hash still matches, and nothing is unrecorded`, exit 0. It is
**not** a silent no-op: a stale hash or an unrecorded template stops the run at
exit 1 and names the file. A migration that is not idempotent cannot be safely
retried — but one that is silent about drift is worse.

---

### Tier 3 — Edge Cases & Robustness

#### T3-01: A corrupt manifest

**Type:** Unit\
**Source:** Plan Phase 1 task 1

**Steps:** Truncate `docs/.pdocs-seed.json` mid-object; run the migration.

**Expected:** A clear error naming the file. It must not crash with a raw JSON
parse error, and must not silently treat every file as unknown-and-overwritable.

**Deferral:** Covered by a unit test in Phase 1; listed here for completeness
rather than manual execution.

---

#### T3-02: A seeded file the adopter deleted

**Type:** Integration\
**Source:** Not in the proposal — surfaced while writing this plan

**Steps:** Delete `docs/fragments/TEMPLATE.md` from a project; run the
migration.

**Expected:** Undecided. Reinstalling respects the scaffold; leaving it absent
respects a deliberate deletion. **Resolve during Phase 1 and record the choice**
— this plan does not assert which is correct.

**Deferral:** Genuinely open. Deferred because guessing here would bake an
unexamined decision into the manifest's semantics.

---

#### T3-03: `SCHEMA.md` ownership completeness

**Type:** Manual\
**Source:** Proposal success criterion 8

**Steps:** Cross-check every file the payload ships against the ownership table
in `docs/SCHEMA.md`.

**Expected:** Every shipped file appears in exactly one class.

**Deferral:** Manual for now. Worth automating later — an uncovered file is
exactly the silent gap this project exists to close — but a hand check is
adequate for one pass over a known file set.

---

## Out of Scope

- **Rewriting the 86 existing playbooks and lessons** in consuming repositories.
  Out of scope in the proposal; they stay valid.
- **Type retirement.** `memory` and `lesson` removal is
  [guidance-lifecycle](../guidance-lifecycle/proposal.md). Nothing here changes
  the shipped type set.
- **Migrating a real consuming repository.** The scenarios use generated and
  reconstructed trees. A live migration is a separate, manual decision.
- **Performance.** The manifest hashes tens of files, not thousands.
- **Concurrent migration runs.** Single-user tool; not a contemplated failure
  mode.

## Results Addendum

_Filled in during and after test execution by the implementing agent._

| Scenario | Status   | Notes                                                               |
| -------- | -------- | ------------------------------------------------------------------- |
| T1-01    | Pass     | `npm run check` green.                                              |
| T1-02    | Pass     | Generated project, `pdocs check` exit 0.                            |
| T1-03    | Pass     | 19 hashes recomputed, all match.                                    |
| T1-04    | Pass     | `check-dist` 0 with and without uv.                                 |
| T2-01    | Pass     | Generated project, exit 0.                                          |
| T2-02    | Pass     | Withdrawn declaration, exit 9.                                      |
| T2-03    | Pass     | ORPHAN then exit 0 once catalogued.                                 |
| T2-04    | Pass     | Unit; `cli.test.ts`, `read.test.ts`.                                |
| T2-05    | Pass     | Regression guard holds.                                             |
| T2-06    | Deferred | The v2.9 migration compares nothing; verified via `seed.ts` only.   |
| T2-07    | Deferred | Same: no migration consumes `seed.ts` yet.                          |
| T2-08    | Pass     | Second run no-op; manifest byte-identical.                          |
| T3-01    | Pass     | Unit: corrupt manifest throws, names file.                          |
| T3-02    | Pass     | Resolved: deletion is an edit. `keep-deleted`.                      |
| T3-03    | Partial  | 4 payload paths fall in no class; 2 were real templates, now fixed. |

**Blocked scenarios:** none. `cookiecutter` 2.6.0 was available, so every
payload scenario executed rather than being reported green while never running.

**T2-06 and T2-07 are Deferred, not Pass — a correction.** Both scenarios say
"run the v2.9 migration against the project." That migration ADOPTS and does not
reconcile: with a manifest present it verifies the recorded hashes and reports,
but it never compares the project's templates against the scaffold's, which is
what T2-06 and T2-07 describe. The behaviours were verified against `seed.ts`
directly, which is a different and weaker claim, and recording them as Pass
overstated the result. They become executable with the first migration that
consumes `seed.ts`.

**T3-03 is Partial.** The by-category classification left four payload paths in
no class at all — and two of them,
`docs/investigations/YYYY-MM-DD-TEMPLATE-investigation.md` and
`docs/reports/YYYY-MM-DD-TEMPLATE-report.md`, were real templates the shape
predicate silently skipped. Both are fixed, and
`scripts/seeded-coverage.test.ts` now asserts the predicate covers every
template the registry declares. The remaining gap is that the classification is
still by category rather than file by file; automating it stays the right
follow-up.

## Visual Artifacts

No UI. Capture terminal transcripts for any failing scenario — the command, its
full output, and its exit code — in `docs/projects/docs-foundation/artifacts/`.
Exit codes are the assertion throughout this plan, and a transcript without one
proves nothing.
