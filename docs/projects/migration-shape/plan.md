---
type: plan
title: Migration Shape Implementation Plan
description:
  The route from the approved proposal to a rewritten migration-authoring skill,
  a script-shaped v2.6-to-v2.7 migration, and a first real run on a consuming
  project.
tags: [migrations, agent-execution, tooling]
status: draft
lifecycle: draft
generated: { by: claude-fable-5-1, at: 2026-09-12 }
---

# Migration Shape Implementation Plan

**Related Proposal:** [Migration Shape](./proposal.md)

---

## Overview

The [proposal](./proposal.md) settles what to build: one migration shape, taught
in one place, with `v2.6-to-v2.7` rewritten as a script under the rewritten
skill and the six other guides explicitly marked legacy. This plan is the order
to build it in, the files each phase touches, and what has to be true before the
next phase starts.

The load-bearing constraint is ordering.
`.claude/skills/migration-authoring/SKILL.md` is rewritten **first**, and the
`v2.6-to-v2.7` script is then authored under it — that is the test of whether
the skill teaches the shape. An author who reaches for the old checklist
mid-rewrite has found a gap in the new one, and the gap is fixed in the skill
rather than worked around in the script.

The second constraint is that **this repository cannot dogfood the result**. It
is at the current release with a seed manifest and never carried `docs/lint.ts`;
`v2.6-to-v2.7`'s presence check (`[ ! -f docs/SCHEMA.md ]`) is false here.
Validation is therefore two generated fixtures plus one real run on
`dreamwood/media-forge`, and the plan treats that run as a deliverable, not as a
smoke test after the fact.

The reference is
`plugins/project-docs/skills/update-project-docs/migrations/v2.8-to-v2.9.md` and
its script. Nothing in this plan changes either.

## Outcome & Success Criteria

**Definition of Done:**

- [ ] `migration-authoring/SKILL.md` states the script-vs-guide rule and carries
      a quality checklist that the v2.9 migration satisfies in full and that a
      prose guide with cross-block state fails.
- [ ] `migrations/scripts/migrate-v2.6-to-v2.7.ts` is a whole-migration script
      on the v2.9 shape, with the existing codemod as one self-contained phase,
      and `migrations/v2.6-to-v2.7.md` is a guide that explains it.
- [ ] `grep` for a cross-block shell variable in `v2.6-to-v2.7.md` returns 0
      lines.
- [ ] Every guard in the new script has a test that was **watched failing**,
      plus a wiring witness per phase — and the observation is recorded, not
      inferred. A green `bun test` does not tick this box. The evidence is the
      break-observe-restore round-trip per guard and the neutered call site per
      phase, written down in the project's session note under a
      `Guards watched failing` heading, one line per guard naming the test that
      covers it; the test names themselves carry the guard they exercise so the
      note and the suite can be read against each other.
- [ ] `update-project-docs` § Step 7 contains no table of guide steps to
      hand-assemble; § Step 4 names the script-shaped case; § Creating New
      Migration Guides describes both shapes and the rule for choosing.
- [ ] `v2.7-to-v2.8`'s `Applies If` identifies the v2.7 lint by content and is
      false on `dreamwood/dream-flute`.
- [ ] The six non-current guides carry a legacy banner.
- [ ] `scaffold-update-checklist`'s sync procedure names one validation per
      shape, and the script one is a command.
- [ ] `project-docs` plugin minor-bumped, `dist/` rebuilt, `npm run check`
      clean.
- [ ] The script has run for real on `dreamwood/media-forge`, exiting 0 with the
      gate still off, committed on its own branch there, **and the v2.9 script
      has run after it**; the backfill and the gate follow in later commits.

**Non-Goals:**

- Any change to the v2.8 → v2.9 migration, guide or script. It is the reference.
- Rewriting the six legacy guides.
- Extracting a shared migration framework or library. Scripts stay
  self-contained by design.
- Writing the v2.9 → v2.10 migration.
- Chaining the v2.6 script into the v2.9 script. It hands off; § Step 4 runs
  migrations in sequence.
- Migrating `dreamwood/dream-flute` or `agent-cli-conformance`. They are
  playgrounds, not consumers.

## Approach Summary

Six phases, in dependency order:

1. **The skill, and the routing that points at it.** Doctrine lands before the
   first migration authored under it.
2. **Fixtures.** Two generated trees, so phase 3 has something to fail against
   from its first commit.
3. **The `v2.6-to-v2.7` script, guide and tests.** The bulk of the work, and the
   test of phase 1.
4. **The rest of the migrations folder.** Legacy banners, the `v2.7-to-v2.8`
   precondition, the Available Migrations table, and the § Step 7 collapse that
   phase 3 makes possible.
5. **Ship.** Version bump, `dist/` rebuild, `npm run check`.
6. **The real run.** `dreamwood/media-forge`, on its own branch: the v2.6
   script, then the v2.9 script it hands off to, then the backfill, catalog and
   gate as follow-up commits.

Phases 1 and 2 are independent of each other and can run in parallel. Phase 4's
§ Step 7 collapse cannot be written before phase 3 proves per-phase
preconditions handle the orphaned tree. Phase 5 gates phase 6: the real run uses
the shipped script, not a working copy.

## Decisions This Plan Makes

The proposal deferred two questions. Both are decided here.

### 1. The legacy banner names the last plugin version that maintained the guide

**Yes.** The banner reads, on each of the six guides:

> **Legacy.** This guide was written before the script shape and is no longer
> maintained to the current `migration-authoring` skill. Run it as-is — it
> works. Last maintained at `project-docs` 3.9.0.

The version is cheap to write once and tells a reader how far behind the current
skill the guide is, which is the only thing a reader of a legacy guide actually
needs to calibrate. It is a frozen literal, not a field anything updates: a
guide that gets maintained again stops being legacy and loses the banner
entirely, so there is no drift surface. `3.9.0` is the version at the time of
writing; use whatever `plugins/project-docs/.claude-plugin/plugin.json` holds
**before** phase 5's bump, since that is the last release under which those
guides were current.

### 2. § Step 7's orphan repair gets no dedicated flag — preconditions cover it

**Default: no flag.** Each phase of the new script tests its own precondition,
so a tree that has the frontmatter layer but no `scripts/pdocs/` runs the same
command as a v2.6 tree and the phases that have nothing to do say so and
continue. § Step 7's repair path therefore collapses to "run `v2.6-to-v2.7`",
and its seven-row table goes.

**The orphaned-tree fixture decides it** (phase 2, exercised in phase 3). The
fallback, if that fixture cannot pass through the unmodified script: add a
single `--repair` flag that skips only the phases whose preconditions cannot
express the orphaned state, document it in the guide's options table, and keep §
Step 7 as one sentence naming the flag — still not a table. Record which of the
two happened in the phase 3 exit criteria before moving on.

## Phases

### Phase 1: Rewrite `migration-authoring`, and correct the routing

**Goal:** An author who follows today's routing reads doctrine that agrees with
the best migration in the repository.

**Key Changes:**

- `.claude/skills/migration-authoring/SKILL.md` — rewritten (currently 180
  lines). It must contain:
  - **The rule**, stated once: a migration is a **script** when a later step
    depends on a value an earlier step computed, when a check must be able to
    stop the run, or when the migration must be re-runnable or partially
    applicable. It may remain a **guide** only when every shell block is
    self-contained and every check exits non-zero on failure. In practice any
    migration that generates a scaffold is a script.
  - **What a script-shaped migration is**, described from
    `migrate-v2.8-to-v2.9.ts` rather than invented: one entry point under
    `migrations/scripts/`, run with `bun`; `--dry-run`, `--root`,
    `--scaffold-dir`; the exit-code contract `0` / `1` / `2`; self-verifying
    phases; an end-of-run invariant check (`manifestMatchesDisk` is the model);
    a test file beside it; a guide that explains rather than instructs.
  - **The guide-shaped branch**, which is where the surviving authoring
    principles go: uniform specificity, artifacts over descriptions,
    before/after pairs, copy-from-scaffold rather than inline content. These
    also apply to a script's copy phases.
  - **A replacement quality checklist.** Delete the four items the current one
    carries that are now anti-patterns or restatements of the rejected shape:
    "one verification per change", "scaffold cleanup" as a step, "version
    marker" as a step, "checklist matches steps — one item per action". The new
    checklist must be satisfiable in full by the v2.9 migration and must fail a
    prose guide carrying cross-block state.
  - **A Lessons Learned section** pointing at
    [A guard must be able to fail](../../lessons-learned/a-guard-must-be-able-to-fail.md)
    as the input the rewrite started from, with its "Do this" clauses restated
    as authoring requirements: write the failing case first; a shell check is
    `|| { echo "..."; exit 1; }`, never an echoed word; a wiring claim is tested
    by neutering the call site; a count parses structure and never
    pattern-matches; prefer a runtime assertion over a test for an invariant
    that must hold in someone else's repository.
- `plugins/project-docs/skills/update-project-docs/SKILL.md`:
  - **§ Creating New Migration Guides** — describe both shapes and name the rule
    for choosing. The current mandated structure (`## What Moved`,
    `## What's Removed`, `## Step-by-Step Migration`, `## Checklist`) is kept as
    the **guide-shaped** structure; the **script-shaped** structure is the v2.9
    guide's headings: Summary; What changes in your tree; "This migration is a
    script" with the two-sentence reason; What's New / What Moved / What's
    Removed; Run it (with an options table and the exit codes); What it does,
    phase by phase; What it cannot check; Cross-Reference Updates; Verification
    as output lines and an exit code.
  - **§ Step 4 "Execute Each Migration"** — one sentence for the script-shaped
    case. Its step 2 currently says "follow its steps in order", and a script
    has none: for a script-shaped migration, read the guide, run `--dry-run`,
    read the plan, run it, and read the output lines the guide's Verification
    section names. The sequencing mechanism itself is unchanged — this is what
    makes "hand off to the v2.9 script" work without chaining.
- `.claude/skills/scaffold-update-checklist/SKILL.md`:
  - **Sync procedure step 3** — currently "Apply the migration to this project's
    own `docs/` — follow the same steps end users would". Replace with one
    validation per shape: for a **script**, run the script's `--dry-run` and
    then the script, against a generated fixture (this repository cannot be its
    own subject — see the note it must carry); for a **guide**, follow its steps
    as an end user would.
  - **The "Migration path (dogfood the update-project-docs skill)" checklist**
    (under _Adding or Modifying a Document Type_) and the near-identical bullet
    later in the file — same correction, plus routing that names the rewritten
    skill's rule rather than only "use the `migration-authoring` skill for
    quality checks".
  - Both places must record that **this repository is not in the v2.6
    population** and that "apply it to our own docs" is not available for a
    migration whose precondition is false here.

**Validation:**

- [ ] Read the v2.9 guide and script against the new quality checklist, item by
      item. Every item passes. Any item it fails is a defect in the checklist.
- [ ] Read `v2.7-to-v2.8.md` against the same checklist. It fails on the
      cross-block-state item. If it passes, the checklist does not discriminate
      and is not done.
- [ ] The rewritten skill contains no instruction that the v2.9 migration
      violates. Specifically: no "scaffold cleanup step", no "version marker
      step", no "one item per action" checklist rule, no "one verification per
      change".
- [ ] `grep -n "Step-by-Step Migration" plugins/project-docs/skills/update-project-docs/SKILL.md`
      shows it only inside the guide-shaped branch.
- [ ] `npx prettier --write` on all four changed files; `npm run format:check`
      clean.

**Dependencies:** None.

---

### Phase 2: The two fixtures

**Goal:** Phase 3 has something to run against, and something to fail against,
from its first commit.

**Key Changes:**

- **Fixture A — a real v2.6 tree.** Generated with cookiecutter using
  `--checkout project-docs-scaffold-template-v6.3.0`, the last release tag
  before the frontmatter layer. Reproducible from a tag rather than checked in
  as a snapshot, so it cannot rot silently. It must be generated into a temp
  directory, `git init`-ed and committed (the script reports a dirty tree), and
  have **no** `docs/SCHEMA.md`, **no** `scripts/pdocs/`, **no**
  `docs/.pdocs-seed.json`.
- **Fixture B — the orphaned tree.** Fixture A with the frontmatter layer
  present and `scripts/pdocs/` absent: the state § Step 7 describes, produced by
  copying `docs/` from a current generated scaffold without `scripts/`. This is
  the fixture that decides Decision 2.
- **Fixture construction lives in the test file**, not as checked-in trees:
  `plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.6-to-v2.7.test.ts`
  already builds a fixture repository for its
  `describe("the whole script, on a fixture repository")` block; extend that
  approach rather than inventing a second one.
- **Fixture A has two states, and the distinction is load-bearing.** The
  preflight tier check is a hard stop, so one tree cannot both trip it and
  complete a full run.
  - **A0** — fixture A plus a docs-root folder that is in neither `durable` nor
    `workbench` and not in `lint.skip` (see `scripts/pdocs/docs-lint/config.ts`
    for the tier arrays). Used by the preflight test **only**: the run is
    expected to name the folder and exit non-zero before writing anything.
  - **A1** — fixture A with that folder removed. Used by the full-run test.
    Removal rather than declaration, because a v2.6 tree has no
    `.project-docs.json` to declare it in — the migration itself writes that
    file — so pre-declaring would mean hand-building the config the run is
    supposed to produce, and the fixture would stop being a v2.6 tree.
  - Both states come from one generator with a flag, so they cannot drift.

**Validation:**

- [ ] Fixture A generates offline-reproducibly from the tag, and
      `[ ! -f docs/SCHEMA.md ]` is true on it.
- [ ] Fixture B has `docs/SCHEMA.md` and no `scripts/pdocs/cli.ts` — the exact
      pair that makes both existing presence checks false, which is why § Step 7
      exists.
- [ ] A note records how long fixture generation takes and whether it needs the
      network; if `--checkout` requires a fetch, the test must be able to reuse
      a cached clone rather than hitting the network per test.

**Dependencies:** None. Runs in parallel with phase 1.

---

### Phase 3: `v2.6-to-v2.7` as a script, authored under the new skill

**Goal:** The migration every consuming project has to run becomes one command
that verifies itself — and, in becoming that, tests whether phase 1's skill
actually teaches the shape.

**Key Changes:**

- **`migrations/scripts/migrate-v2.6-to-v2.7.ts` becomes the whole migration.**
  It currently is the codemod (606 lines) and is step 8 of a thirteen-step
  guide. Either the file grows into the whole-migration script with the codemod
  as an internal phase, or the codemod is kept as its own module and a new entry
  point calls it — decide at implementation time, but **the codemod's
  self-contained folder → type table must survive either way**, and so must
  `migrate-v2.6-to-v2.7.test.ts`'s
  `describe("the copied tables equal the ones the lint enforces")`. That test is
  what stops the copy drifting from `scripts/pdocs/lint/rules.ts`, and the
  codemod's header comment states the self-containment as a design commitment:
  it runs inside a repository that has not adopted the layer, so it imports
  nothing from the tree it migrates.
- **The phase list**, derived from the current guide's thirteen steps:
  1. **Preflight** — this is a project-docs tree; resolve `docsRoot`; `bun` and
     `cookiecutter` exist; report a dirty git tree; **and report every folder
     under the docs root that is in no tier and not in `lint.skip`, then stop.**
     An unlisted folder silently gets the full graph tier — the strictest checks
     — and a consumer should declare it or skip it knowingly rather than
     discover it from the first failing run. This is a hard stop, not a warning.
  2. **Scaffold** — generate the current template into a private temp directory,
     never into the project. `--scaffold-dir` skips the fetch.
  3. **Copy the layer** — `scripts/pdocs/` (contents, not the directory), and
     verify it arrived.
  4. **Copy the templates** — from the scaffold, verified per file.
  5. **Codemod** — the existing frontmatter writer, over the docs root.
  6. **Write `.project-docs.json`** — with `lint.adopting: true`, and the
     project's existing version carried forward, never invented (the existing
     `docsVersionOf` / `UNKNOWN_VERSION` behaviour).
  7. **Report** — run `pdocs report --format text` and print it. This is the
     worklist the guide's backfill step consumes.
  8. **Version markers** — both, set together, JSON parsed and re-serialised
     rather than pattern-substituted.
  9. **Cleanup** — remove the generated scaffold.
- **Where it stops.** Tooling installed, codemod run, `pdocs report` printed,
  exit 0, **gate off** (`lint.adopting: true`). The lint requires `description`
  on every document and the codemod deliberately does not write it, so a fresh
  migration cannot pass the gate; the current guide already orders "work the
  report" before "turn the gate on", and the script keeps that boundary. Turning
  the gate on and choosing a first cycle are not script phases.
- **`migrations/v2.6-to-v2.7.md` is rewritten** to the script-guide structure
  phase 1 defined. It must additionally name, as defined agent steps after the
  script:
  1. **The backfill.** The worklist is `pdocs report`; the precedent is this
     repository's own backfill (commit `ada5b7e`, "the backfill, and what
     checking 137 documents turned up"). `description` is one sentence a person
     has to mean.
  2. **Fill the catalog** — `docs/index.md`. `pdocs orphans --format text` names
     every library page missing a line; re-run it until it says `none` (it
     always exits 0, so read the output, not the exit code). This comes
     **after** the backfill and **before** the gate, for the reason the current
     guide's step 10 gives: each catalog line's hook after the dash must equal
     that page's `description` **exactly**, and the lint reports `STALE HOOK` on
     drift. A catalog written before the descriptions exist is a catalog written
     twice. It is also why the gate cannot go on without this step — the graph
     tier checks catalog reachability.
  3. **Turn the gate on** — which is two things, not one:
     `lint.adopting: false`, edited as that **one key in place** so `docsRoot`
     and the tier arrays survive; **and** wiring `npm run check` in, at
     `.husky/pre-commit` if the project uses husky and as a CI job
     (`.github/workflows/docs-check.yml`). A flag flipped with nothing running
     the check is not a gate.
  4. **Choosing a first cycle** stays a person's call and is named as optional —
     the lint passes with an empty `docs/cycles/`. And a **"What the script
     cannot check"** section: that the result is committed, that `description`
     sentences are true, that the catalog hooks say what the pages say, that the
     chosen cycle is the right one.
- **`--dry-run` reports every phase's plan and changes nothing**, including the
  preflight tier report and the codemod's file list.
- **Tests** — `migrations/scripts/migrate-v2.6-to-v2.7.test.ts`:
  - Per-phase tests that call the phase against each fixture, including the
    already-done path (fixture B) and the not-applicable path.
  - **For every guard, a test that was watched failing.** Break the thing the
    guard guards, confirm it reports, restore. A guard that cannot be made to
    fail is not a guard and gets redesigned, not annotated.
  - **A wiring witness per phase:** neuter each phase's call site in a
    disposable copy and expect the end-to-end run to fail. A unit test of a
    phase never shows that anything calls it.
  - The existing table-pinning test keeps passing, unchanged.
  - The preflight tier test, against **fixture A0**: the undeclared folder is
    named in the output and the run exits non-zero before anything is written.

**Validation:**

- [ ] `bun test` green, including the pre-existing codemod tests.
- [ ] Fixture **A1**: `--dry-run` then a real run exits 0 with the gate off and
      the report printed; `pdocs check` on the result reports the missing
      `description`s rather than erroring, because `adopting` is true.
- [ ] Fixture **A0**: the same command exits non-zero from preflight, naming the
      undeclared folder, and the tree is byte-identical afterwards. A0 is never
      run to completion — that is what A1 is for.
- [ ] Fixture B passes through the **same** command with no flag. If it does
      not, apply Decision 2's fallback and record it here.
- [ ] `grep -nE '\$\{?(SCAFFOLD|VERSION|SKILL_DIR)' migrations/v2.6-to-v2.7.md`
      returns nothing, except inside a single self-contained block (the v2.9
      guide's two-line precedent).
- [ ] Every item of phase 1's quality checklist passes against the new guide and
      script. **Any item that cannot be satisfied is a phase 1 defect** — go
      back and fix the skill, then re-check. Record each such round-trip; they
      are the evidence that the ordering was worth it.
- [ ] A cold read of the guide by a reader who has not seen the script: can they
      tell what the command does, when to stop, and what it will not check?

**Dependencies:** Phases 1 and 2.

---

### Phase 4: The rest of the migrations folder

**Goal:** Every other guide is either correctly scoped or explicitly legacy, and
the routing table tells the truth.

**Key Changes:**

- **Legacy banners** on the six guides that are neither `v2.6-to-v2.7` nor
  `v2.8-to-v2.9`: `v1-to-v2.md`, `v2.0-to-v2.3.md`, `v2.3-to-v2.4.md`,
  `v2.4-to-v2.5.md`, `v2.5-to-v2.6.md`, `v2.7-to-v2.8.md`. Wording and the
  version literal are fixed in Decision 1. The banner goes immediately under the
  `# Migration: vX → vY` heading, before `## Summary`, identically in all six.
- **`v2.7-to-v2.8.md`'s precondition tightened.** Its `Applies If` is
  `[ -f docs/lint.ts ]`, which is a false positive on `dreamwood/dream-flute` —
  that tree has its own whole-tree `docs/lint.ts`, and this guide's step 5
  deletes the file. Replace with a content test that identifies the **v2.7**
  lint: it imports the ported core directly, so
  `grep -q 'scripts/docs-lint/index.ts' docs/lint.ts 2>/dev/null`. Verified:
  that string, and the header phrase "The documentation gate", and the
  identifier `thinTier` each occur **0 times** in dream-flute's file and are all
  present in the v2.7 lint (recoverable at `git show 1dde782^:docs/lint.ts`).
  Change it in **both** places — the guide's "Does this migration apply to you?"
  block and the Available Migrations table's `Applies If` cell — and say in the
  guide why the bare name test was wrong.
- **`## Available Migrations` table** in
  `plugins/project-docs/skills/update-project-docs/SKILL.md`:
  - `v2.6-to-v2.7`'s Summary becomes the script phrasing, matching the
    `v2.8-to-v2.9` row's "**Run as a script**, not a checklist" lead and naming
    the command and `--dry-run`.
  - `v2.7-to-v2.8`'s `Applies If` gets the content test.
  - The six legacy rows are marked legacy in the table too, so a reader choosing
    from the table sees it without opening the file.
- **§ Step 7 collapse.** Remove the seven-row table and the "Steps 1, 5, 9, 10
  and 12 do not apply" paragraph. Replace the "If check 1 fails and
  `docs/SCHEMA.md` exists" branch with: this is a partial adoption, not a
  version step; run `v2.6-to-v2.7` — its phases test their own preconditions and
  the ones with nothing to do will say so. Keep the existing explanation of
  **how** a tree gets into that state, and keep the "then re-run this step, and
  Step 6" instruction: Step 6 ran before the CLI existed, so its Documentation
  CLI pointer row was skipped by its own precondition. The four `bash` checks at
  the top of § Step 7 stay as they are.

**Validation:**

- [ ] `grep -c "Legacy" migrations/*.md` shows exactly the six.
- [ ] The tightened test, run against
      `/Users/colereed/Projects/dreamwood/dream-flute`, is **false**; run
      against a tree carrying the real v2.7 lint (recoverable from history),
      **true**. Both directions, actually executed — an untested precondition is
      the defect this phase is fixing.
- [ ] § Step 7 contains no table of migration steps.
- [ ] Every `Applies If` cell in the table is a shell test that still parses;
      run each one from this repository's root and confirm it does not error.

**Dependencies:** Phase 3 (the § Step 7 collapse depends on per-phase
preconditions actually covering the orphaned tree).

---

### Phase 5: Version bump, `dist/` rebuild, and the gate

**Goal:** What ships is what was written.

**Key Changes:**

- `plugins/project-docs/.claude-plugin/plugin.json` — **minor** bump (3.9.0 →
  3.10.0). The change is behavioral and non-breaking: `update-project-docs`
  routes differently and one migration changes shape, but no consumer's existing
  invocation breaks. Per the recorded convention, minor for any behavioral
  change; patch only for typos and formatting.
- `npm run build:dist`, then `npm run check:dist` clean. `update-project-docs`
  ships, so `dist/` is stale the moment its SKILL.md or `migrations/` folder
  changes, and `build:dist` is wired into nothing that runs automatically.
- `.release-please-manifest.json` and any other version marker —
  `npm run check:version` is the arbiter.
- **No mirror work.** `npm run check:mirror` covers the cookiecutter payload
  against `docs/`; nothing in this project touches either side. Run it anyway as
  part of `npm run check`, and if it reports anything, something unintended was
  changed.
- The two `.claude/skills/` documents are repo-local and ship nowhere. They are
  not in `dist/`, not in the payload, and not covered by the mirror check.

**Validation:**

- [ ] `npm run check` clean — `format:check`, `docs:lint`, `check:version`,
      `check:mirror`, `check:dist`, `test`.
- [ ] `git diff --stat dist/` shows the `update-project-docs` skill and its
      `migrations/` folder, and nothing else.
- [ ] `bun scripts/pdocs/cli.ts check --format text` clean, including this plan.

**Dependencies:** Phases 3 and 4.

---

### Phase 6: The MediaForge run

**Goal:** The script's population is every consuming project; before it is
called done, one of them has actually run it.

**Key Changes:** None in this repository. The work happens in
`/Users/colereed/Projects/dreamwood/media-forge` — clean on `develop`, 115
documents outside `_archive/`, one already carrying frontmatter.

**Sequence:**

1. **Re-check the preconditions on the day.** `git status` clean, on `develop`,
   `[ ! -f docs/SCHEMA.md ]` true. The proposal's snapshot is 2026-09-12; do not
   trust it. **If any of the three is false**, the run does not happen today:
   either wait for MediaForge to be clean on `develop`, or pick another project
   from the v2.6 population and re-survey it the same way. Never run on a dirty
   tree, and **never `git stash` to make one clean** — the script reports a
   dirty tree on purpose, so this migration's changes stay separable from
   somebody's work in progress, and stashing defeats exactly that. A tree that
   has to be emptied to qualify is a tree whose owner has not finished with it.
2. **Branch first.** A dedicated branch in MediaForge so the whole migration can
   be reverted as one unit.
3. **`--dry-run`, and read it.** Specifically the preflight's tier report: any
   folder MediaForge has that is in no tier gets named, and the run stops. That
   is the expected first outcome on a real tree, and the fix is declaring or
   skipping those folders in `.project-docs.json` — which is itself a decision a
   person makes, not a default the script picks.
4. **Run it.** Expect exit 0, the gate off, the report printed.
5. **Hand off to the v2.9 script.** The v2.6 script hands off rather than
   chaining, and `update-project-docs` § Step 4 runs migrations in sequence — so
   `v2.8-to-v2.9` is next, and its precondition `[ ! -f docs/.pdocs-seed.json ]`
   is now true. It can run **before** the backfill: its verify phase requires
   `pdocs check` to exit 0, and while `lint.adopting` is `true` the lint reports
   problems and exits 0 anyway (`scripts/pdocs/commands/check.ts`,
   `lint/collect.ts`), so the missing `description`s do not block it. Read its
   `--dry-run` first — especially the list of templates it would record, which
   must name the templates the v2.6 script just copied in — then run it, and
   **commit it separately** from the v2.6 commit. Two migrations, two diffs, two
   things that can be reverted independently.
6. **Commit the migration alone**, before the backfill. The diff is then
   reviewable as "the tooling arrived" separately from "115 descriptions were
   written".
7. **The backfill, as a follow-up.** `pdocs report --format text` is the
   worklist. `description` is one sentence per document that has to be true;
   this repository's own backfill over 137 documents is the precedent for both
   the effort and what it turns up.
8. **Fill the catalog** — `pdocs orphans` until it says `none`, each hook copied
   verbatim from the page's freshly written `description`.
9. **Turn the gate on** — `lint.adopting: false` **and** `npm run check` wired
   into pre-commit and CI — in a later commit, once the report is empty and the
   catalog is full. Choosing a first cycle is optional and separate.
10. **Write what the run taught back into the guide**, if anything. A real tree
    producing an outcome the guide does not describe is a guide defect.

**Validation:**

- [ ] The dry run's output was read before the real run, not after — for both
      scripts.
- [ ] Exit 0; `lint.adopting` is still `true` in the migration commit.
- [ ] MediaForge ends with `docs/.pdocs-seed.json` present **and committed**
      (`git check-ignore -v docs/.pdocs-seed.json` prints nothing), in a commit
      of its own separate from the v2.6 one. A manifest that never reaches the
      repository cannot be read by the migration after it.
- [ ] `bun scripts/pdocs/cli.ts check` in MediaForge reports the missing
      `description`s and exits 0, because the gate is off.
- [ ] The gate-on commit is separate, and `pdocs check` is clean when it lands.

**Dependencies:** Phase 5. The run uses the shipped script.

---

## Key Risks & Mitigations

- **The skill rewrite reproduces the rejected shape in new words.** → The
  ordering is the mitigation: phase 3 authors a real migration under the new
  skill before it is called done, and every round-trip back to phase 1 is
  recorded. The review question is "has the defect class **returned**", not "is
  this defect new".
- **The `v2.6-to-v2.7` script's population is every consuming project.** → Two
  fixtures, a dry run, a first real run on one project, and a guide section
  saying what the script cannot check. The script reports a dirty tree rather
  than proceeding silently past it.
- **The codemod is the hard part and already works.** Folding it into a larger
  script risks breaking it. → Its self-containment and its table-pinning test
  are non-negotiable; the wiring witness is what proves the fold actually
  happened.
- **The tier hard-stop in preflight annoys a real adopter.** → It is a stop
  precisely because the silent default is the strictest tier. If MediaForge's
  run shows the message is unclear, fix the message, not the stop.
- **Legacy banners read as abandonment.** → The banner says "run as-is" and
  means it; the guides still work and the table still lists them.
- **`--checkout` fixture generation needs the network.** → Cache the clone; if
  the tests cannot be made hermetic, mark the fixture-A test as the one that
  needs network and keep every other test independent of it.

## Testing & Validation Strategy

Four levels, in order of what each can prove:

1. **Unit, per phase.** Each phase called directly against each fixture, in each
   of its states: work to do, work already done, precondition false.
2. **Guard tests, written failing first.** For every guard in the script: break
   the thing it guards, watch it report, restore. This is the requirement from
   [A guard must be able to fail](../../lessons-learned/a-guard-must-be-able-to-fail.md),
   and it is not satisfied by a test that passes on the first run — the failing
   observation is the deliverable, and it is recorded in the session note's
   `Guards watched failing` section rather than left as something the author
   remembers doing.
3. **Wiring witnesses.** Neuter each phase's call site; expect the end-to-end
   run to fail. Level 1 can be entirely green with a phase wired to nothing.
4. **The real run.** MediaForge. Fixtures are what the author imagined; a real
   tree is what exists.

Two things are checked by reading rather than by running, because nothing can
run them: the new quality checklist against the v2.9 migration (phase 1), and a
cold read of the rewritten guide (phase 3). Both are named as validation items
so they are not skipped.

`npm run check` is the gate for everything in this repository and runs in the
pre-commit hook and CI.

## Assumptions & Constraints

**Assumptions:**

- MediaForge is still clean on `develop` when phase 6 runs. Re-checked, not
  assumed.
- `project-docs-scaffold-template-v6.3.0` remains the correct
  last-release-before- frontmatter tag. If the tag is wrong, fixture A is wrong
  and every phase-3 result is suspect — verify by asserting `docs/SCHEMA.md` is
  absent in the generated tree.
- The six legacy guides work today. Nobody re-validates them; the banner says
  "as-is" honestly because that is the claim being made.
- No consuming project is on v2.7. `v2.7-to-v2.8`'s population is zero and the
  precondition tightening is defensive, not urgent.

**Constraints:**

- This repository cannot be the subject of `v2.6-to-v2.7`. Its presence check is
  false here.
- Scripts are self-contained by design — no shared library, no import from the
  tree being migrated.
- `dreamwood/dream-flute` and `agent-cli-conformance` are playgrounds. Nothing
  here targets them, and the precondition work exists so nothing accidentally
  does.

## Rollback Plan

**In this repository:** everything is documents, a script and a `dist/` rebuild.
Revert the branch. `npm run check` proves the revert is complete because
`check:dist` rebuilds and compares.

**In MediaForge** — the only place with real risk:

- The migration runs on its own branch. Rollback is deleting the branch; nothing
  reaches `develop` until it is reviewed.
- The migration commit is separate from the backfill commit and from the gate-on
  commit, so any one of the three can be reverted without the others.
- The script never writes into the project before preflight passes, and it
  generates the scaffold into a private temp directory, so an aborted run leaves
  the tree as it found it.
- If the run corrupts documents in a way review does not catch: the
  pre-migration commit on `develop` is the restore point, and the codemod's only
  write is a frontmatter block prepended to each file plus the removal of the
  `**Status:**` line it consumed.

## Open Questions

- [ ] Does the `v2.6-to-v2.7` entry point grow into the whole-migration script,
      or does a new entry point call the existing codemod as a module? Decide in
      phase 3; either satisfies the constraint, and the constraint is that the
      codemod stays self-contained and its table-pinning test keeps passing.
- [ ] Does the preflight tier report belong in the v2.9 script too? Out of scope
      here — the v2.9 migration is the reference and is not a target — but worth
      recording if phase 3 shows the check is general rather than specific to
      first adoption.
- [ ] After phase 6, is a second consuming project worth running before the
      script is considered settled? Decide on what the MediaForge run turns up.

---

**Related Documents:**

- [Proposal](./proposal.md)
- [Migration Shape, and the Factory That Makes It](../../briefs/2026-09-12-migration-shape.md)
  — the origin brief
- [A guard must be able to fail](../../lessons-learned/a-guard-must-be-able-to-fail.md)
  — the requirement on every guard in the new script
- [Migration Steps Must Be Uniformly Specific](../../lessons-learned/migration-steps-uniform-specificity.md)
  — the principle that survives into the guide-shaped branch
- [Docs Foundation](../docs-foundation/proposal.md) — shipped `seed.ts`, the API
  the migration after this one calls
