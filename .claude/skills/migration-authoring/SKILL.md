---
name: migration-authoring
description:
  How to write a migration for the update-project-docs skill — as a script under
  `migrations/scripts/` with a guide that explains it, or as a prose guide when
  the rule allows one. Use when creating or reviewing anything under
  `migrations/`, when the user says "write a migration", "write a migration
  guide", "create migration steps", "document the upgrade path", or "review
  migration quality". States the rule that picks the shape, describes the script
  shape from the v2.8 → v2.9 reference, and carries the quality checklist a
  migration must pass before it ships.
---

# Migration Authoring

A migration is run by an agent in a consuming project with none of the context
you have. Two shapes exist. Pick one by the rule below, build it to the
description of that shape, and pass the checklist. The reference for the script
shape is
[`migrations/v2.8-to-v2.9.md`](../../../plugins/project-docs/skills/update-project-docs/migrations/v2.8-to-v2.9.md)
and
[`migrations/scripts/migrate-v2.8-to-v2.9.ts`](../../../plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.8-to-v2.9.ts);
read both before writing either kind.

## The rule

A migration is a **script** when any of these is true:

- a later step depends on a value an earlier step computed — a scaffold path, a
  version string, a count, a generated directory;
- a check must be able to stop the run — anything whose failure means the
  adopter's tree is now wrong;
- the migration must be re-runnable or partially applicable, so each phase has
  to test its own precondition.

A migration may remain a **guide** only when every shell block is self-contained
— nothing flows between blocks — and every check exits non-zero on failure
rather than echoing a word. A draft guide that cannot meet that becomes a
script.

**In practice, any migration that generates a scaffold is a script.** The
scaffold's path is the first cross-block value: `v2.7-to-v2.8.md` sets
`SCAFFOLD=$(ls -d .scaffold-tmp/*/ | head -1)` in step 3 and reads `$SCAFFOLD`
in steps 4, 8 and 12. An agent runs each block in a different process, so the
value is empty by step 4, `cp -R "$SCAFFOLD/scripts/pdocs/."` copies from
`/scripts/pdocs/`, and the block exits 0. Its guard for that —
`[ -n "$SCAFFOLD" ] ... || echo "STOP — re-derive SCAFFOLD"` — exits 0 as well.
One process and real exit codes make both defects impossible.

The rule is not "every migration is a script". A migration that adds one
template and one README paragraph computes nothing and can stay prose.

## Which shape is mine

Answer these about the draft, in order. The first "yes" decides.

1. Does it generate a scaffold, or read a version from one? **Script.**
2. Does any block use a variable, path or number produced by an earlier block?
   **Script.**
3. Is there a check whose failure must stop the run — a copy that must have
   arrived, a lint that must be clean before the markers move? **Script.**
4. Might an adopter run it twice, or arrive with some of it already done?
   **Script.**
5. None of the above, and every check you can write ends in `exit 1`? **Guide.**

## Script-shaped migration

Two files under `migrations/`, plus a test file. Everything below is what the
v2.9 migration does; describe it, do not reinvent it.

### The script: `migrations/scripts/migrate-vX-to-vY.ts`

- **One entry point, run with `bun` from the adopter's project root.** The
  header comment carries a `Usage:` block and the exit codes; `parseArgs` is the
  authority on the flag set, aliases included.
  `if (import.meta.main) process.exit(main(process.argv.slice(2)))` at the
  bottom; `main` is exported so the test file can call it.
- **Flags:** `--root <path>` (the project; default the current directory),
  `--dry-run` (report every phase's plan; change nothing in the project),
  `--scaffold-dir <path>` (use an already-generated scaffold; skips the
  network). Add others only for a behaviour the migration needs — v2.9 adds
  `--skip-format` and `--re-adopt`. Reject an unknown flag; reject a flag whose
  value is missing or empty.
- **Exit codes are a contract:** `0` success · `1` the migration could not
  complete · `2` bad invocation. Every failure is a `MigrationError` thrown from
  inside a phase, caught in `main`, printed as `STOPPED: <named reason>`, and
  exited `1`. Any other exception is also exit `1` with a named reason and a
  line saying re-running is safe — a stack trace is not a reason.
- **Phases, each self-verifying.** The v2.9 order: preflight, scaffold, the
  change itself (refresh, format, adopt), verify, version markers, cleanup.
  Every phase prints what it did (`✓`), what it skipped and why (`·`), or
  throws. A phase that finds its work already done says so and continues; a
  phase that cannot confirm its result stops the run. A phase whose precondition
  is false for this tree reports that and continues, so the same command serves
  a fresh tree and a partly-migrated one.
- **Preflight** confirms this is a project-docs tree (`.project-docs.json`,
  `docsRoot` resolves), the tools exist (`bun`, `cookiecutter` unless
  `--scaffold-dir`), and reports a dirty git tree. Reported, not enforced — it
  is the adopter's repository, and the report is what keeps this migration's
  changes separable from theirs.
- **Scaffold** generates into a private temp directory (`mkdtempSync`), never
  into the project, and verifies the generated root has `docs/SCHEMA.md` and
  `scripts/pdocs/`. **A dry run generates it too** — without one the version
  phase has nothing to read and reports a number taken from the adopter's own
  tree. Cleanup removes it in both modes.
- **Copy phases copy from the scaffold and verify arrival.** `cpSync` from the
  generated root, then check a file or marker that only the new version carries
  (v2.9: `seed.ts` present, both new `SCHEMA.md` sections present). State
  whether the copy merges or replaces; classify each path by `docs/SCHEMA.md` §
  "Who owns which file" — **owned** is replaced, **seeded** is negotiated by
  hash, **theirs** is never written.
- **Counts parse structure.** A count of manifest entries is
  `Object.keys(JSON.parse(...)).length`, never `grep -c`. `grep -c '": "'` on
  the manifest matched its own `version` line, so an empty manifest counted 1
  and passed the guard written to catch it.
- **Version markers belong to a phase.** Both markers — `docs_version` in
  `docs/README.md` and `version` in `.project-docs.json` — set together from the
  scaffold's version, reported separately, and with a distinct line for "no such
  line" versus "already at that value". The JSON is parsed and re-serialised,
  never regex-substituted: a line-based `sed` rewrote every nested `"version"`
  in a file the ownership table classifies as theirs.
- **An end-of-run invariant check**, inside the program, for anything the phase
  ordering guarantees. `manifestMatchesDisk` is the model: after every phase,
  every recorded hash must still match the bytes on disk, and a mismatch fails
  the run with a message naming the phase ordering that must hold. A test guards
  an invariant only while the test exists; this guards every run in every
  adopter's repository.
- **Self-contained.** It runs inside a repository that has not adopted whatever
  it installs, so it imports nothing from the tree it migrates — `node:` modules
  and `Bun` only. Anything it needs from the lint is its own copy, pinned to the
  original by a test in this repository: v2.9's `isSeeded` template predicate is
  pinned to the registry by `scripts/seeded-coverage.test.ts`; the v2.6
  codemod's folder → type table is pinned to `scripts/pdocs/lint/rules.ts` by
  `describe("the copied tables equal the ones the lint enforces")` in its own
  test file.
- **One test seam, if wiring must be witnessed** — an environment variable read
  at a single, commented call site (v2.9: `PDOCS_MIGRATE_TEST_MUTATE` corrupts a
  recorded file between adopt and the self-check).

### The tests: `migrations/scripts/migrate-vX-to-vY.test.ts`

- **A `describe` of guards, each test breaking one guarded thing in a fixture
  and asserting exit `1` and the reason text** — `expect(r.exitCode).toBe(1)`
  and `expect(out(r)).toContain("...")`. v2.9's
  `describe("guards that must be able to fire")` is the shape. Read the script's
  `fail(` sites against these tests before shipping; a guard you cannot make
  fail is redesigned, not annotated.
- **A wiring witness** for every claim that a function is called: neuter the
  call site in a disposable copy and expect the end-to-end run to fail. v2.9's
  `"the self-check is WIRED, not merely exported"` is the shape.
- **The already-done path and the dry run**: a second run verifies rather than
  rewrites; `--dry-run` leaves the tree byte-identical.
- **The bad-invocation path** exits 2, not 1.

### The guide: `migrations/vX-to-vY.md`

It **explains** the command. It does not instruct an agent through steps,
because there are none. Headings, in the v2.9 order:

- `## Summary` — what changed and why, ending with a bold **What changes in your
  tree:** sentence naming every path the script writes.
- `## This migration is a script` — one command does the whole migration, every
  phase verifies itself, any failure stops the run with a non-zero exit and a
  named reason; then the two-sentence reason (a guard computed in one block and
  consumed in the next runs in a different process; an echoed string cannot fail
  a run).
- `## What's New` / `## What Moved` / `## What's Removed` — merged when the
  answer is "nothing, in either case".
- `## Run it` — the `--dry-run` command, what to read in its output, the real
  command, what to commit; an `### Options` table; the three exit codes. Any
  shell variable in a block is either set in that block or replaced by the
  literal path, and the prose says so.
- `## What it does, phase by phase` — one numbered entry per `step()` in the
  script, in the script's order, naming what stops the run.
- `## What it cannot check` — what a person must confirm: that the result is
  committed, that a sentence is true, that a chosen thing is the right one. v2.9
  carries this as the last bullets of its Verification section; either placement
  satisfies the checklist.
- Any section the migration's own behaviour needs — v2.9:
  `## If you run it twice`, `## What adoption does not do`.
- `## Cross-Reference Updates` — even when it reads "None".
- `## Verification` — **output lines and an exit code**, not commands to run.
  Each line the script prints on success, in order, and `Migration complete.`
  with exit 0 as the check.

No `[Agent] N.` steps. No `## Checklist`. The script's output is the checklist.

## Guide-shaped migration

Use only when the rule allows it. The shape is
`plugins/project-docs/skills/update-project-docs/SKILL.md` § "Creating New
Migration Guides", guide-shaped structure: `## Summary`, `## What's New`,
`## What Moved`, `## What's Removed`, `## Step-by-Step Migration`,
`## Cross-Reference Updates`, `## Verification`, `## Checklist`.

Write every step so a fresh agent completes it without judgment:

- **Every shell block is self-contained.** Nothing set in one block is read in
  another. If a step needs a path or a version, the block that uses it computes
  it — and if two blocks need the same computed value, the migration is a
  script.
- **Every check exits non-zero on failure.** A check is
  `<test> || { echo "STOP — <why>"; exit 1; }`. Never `&& echo ok || echo STOP`,
  which exits 0 either way.
- **Uniform specificity.** Every step is at the same level of detail. Nine
  before/after steps and one "add a decision diamond matching the existing
  style" means the tenth is where the guide drifts — the v2.3 → v2.4 flowchart.
  After drafting, scan the steps side by side and flag any that needs more
  judgment than its neighbours.
- **Artifacts over descriptions.** Provide the block to insert — ASCII art,
  tables, multi-line markdown — with its exact characters and spacing.
- **Before/after pairs** for every modification: the exact text to find, with
  enough surrounding lines to match one place in the file, and the exact text to
  put there.
- **Copy from the scaffold, not inline content.** New and replaced files come
  from a generated scaffold with `cp`, verified with `ls` or `diff`, and the
  generation and the copy sit in the same block. Inline the full contents only
  when no scaffold can be generated. Say for each file whether to overwrite or
  merge, and what to preserve when merging.
- **Removals** are `rm` with the exact path, verified by `ls ... 2>/dev/null`
  printing nothing.

The same four principles — uniform specificity, artifacts, before/after,
copy-from-scaffold — apply to a script's copy phases and to any content a
script-shaped guide still asks a person to write.

## Quality checklist

Run it before the migration ships. The v2.8 → v2.9 migration passes every item
below; `v2.7-to-v2.8.md` fails **No cross-block state** — of its 17 lines
carrying `$SCAFFOLD` or `$VERSION`, 8 are fenced reads of a value another block
produced (lines 162, 174, 185, 369, 371, 404, 411, 516; the rest are prose, the
assigning block, or the same-block `$VERSION` reads) — and **Every check can
fail** (`|| echo "STOP — re-derive SCAFFOLD"`). A checklist the reference cannot
pass is the defect, not the reference.

**Both shapes:**

- [ ] **Shape matches the rule.** If the migration generates a scaffold, reads a
      value across blocks, needs a stopping check, or must be re-runnable, it is
      a script. A guide that does any of these is the wrong shape.
- [ ] **No cross-block state.** `grep -nE '\$\{?[A-Z_]+' migrations/vX-to-vY.md`
      — every variable name, not a fixed list. A fenced hit passes only if its
      value is known before any block runs (the skill directory is the one such
      value) and the guide tells the reader to set it in the block that reads it
      or paste the literal. A value that exists only because an earlier block
      produced it — a generated path, a version read from a file, a count — is
      computed whatever the prose says, and a hit reading one fails.
      `v2.8-to-v2.9.md:79` passes: `$SKILL_DIR` is the reader's own path, set at
      line 61, and line 65 says to set it again in the same block or paste it.
      `v2.7-to-v2.8.md:185` fails: line 155's `ls` produced `$SCAFFOLD`.
- [ ] **Every check can fail.** Each shell check ends
      `|| { echo "..."; exit 1; }`; each script check throws. Nothing ends in
      `&& echo "ok" || echo "STOP"`.
- [ ] **The precondition is a shell test that is true when work remains**, in
      the `Applies If` cell of `## Available Migrations`. A script tests it
      again in its first phase; a guide may repeat it in prose. Where a file
      name is ambiguous, test content: `[ -f docs/lint.ts ]` is true on a
      project with its own unrelated `docs/lint.ts`.
- [ ] **Files that land come from a generated scaffold and are verified on
      arrival** — a marker only the new version carries, or a per-file `ls`.
      Inline content only when no scaffold can be generated.
- [ ] **Overwrite or merge is stated per path**, by ownership: owned is
      replaced, seeded is negotiated by hash, theirs is never written.
- [ ] **What it cannot check is named** — a commit, a sentence's truth, a choice
      — so the reader knows what is still theirs.
- [ ] **`## Cross-Reference Updates` is present**, even when it reads "None".
- [ ] **Verification names outcomes, not intentions.** A script guide lists the
      output lines and the exit code; a prose guide lists commands that exit
      non-zero on failure.
- [ ] **The `## Available Migrations` row exists**, with the precondition in
      `Applies If`; a script's Summary leads with **Run as a script** and names
      the command and `--dry-run`.

**Script-shaped only:**

- [ ] **One entry point, `bun`, and the three flags** `--root`, `--dry-run`,
      `--scaffold-dir`; the guide's options table and `parseArgs` accept the
      same flag set, aliases included.
- [ ] **Exit codes are `0` / `1` / `2`**, every stop is `STOPPED: <reason>`, and
      an unexpected exception is still exit 1 with a named reason.
- [ ] **The dry run generates the scaffold and changes nothing in the project**;
      the test proves the tree is byte-identical afterwards.
- [ ] **Every phase reports** — did, skipped-and-why, or stopped — and a phase
      whose work is already done says so and continues.
- [ ] **Counts parse structure**, never pattern-match.
- [ ] **Both version markers are set by one phase**, reported separately, and
      the JSON is parsed and re-serialised.
- [ ] **An end-of-run invariant check runs inside the program** for anything the
      phase ordering guarantees.
- [ ] **The script imports nothing from the tree it migrates.** Any copied table
      or predicate is pinned to its original by a test here.
- [ ] **The test file has a `describe` of guards whose every test asserts exit
      `1` and the reason text**, a wiring witness exists for every "this is
      called" claim, and any test seam is a single commented call site.
- [ ] **The guide explains and does not instruct**: the script-shaped headings,
      one phase entry per `step()` in the script's order, no `[Agent]` steps, no
      `## Checklist`.

**Guide-shaped only:**

- [ ] **Uniform specificity** — no step requires more judgment than its
      neighbours.
- [ ] **Artifacts over descriptions** — every insertion provides the block.
- [ ] **Before/after pairs with unique match context** for every modification.
- [ ] **The guide-shaped headings**, `## Step-by-Step Migration` through
      `## Checklist`, are all present.

## Lessons Learned

**[A guard must be able to fail](../../../docs/lessons-learned/a-guard-must-be-able-to-fail.md)**
— its "Do this" clauses are authoring requirements here:

- **Write the failing case first and watch it fail.** Before trusting a guard,
  break the thing it guards and confirm the guard reports it. If you cannot make
  it fail, it is not a guard. A green suite is not the observation; record it in
  the project's session note under a `Guards watched failing` heading, one line
  per guard naming the test that covers it, so the note and the suite can be
  read against each other.
- **A shell check is `|| { echo "..."; exit 1; }`**, never an echoed word. The
  exit code is the result.
- **A claim about wiring is tested by neutering the call site**, not the
  function. A unit test of a function never shows that anything calls it.
- **A count parses the structure and counts its keys.** Never pattern-match.
- **Prefer a runtime assertion over a test** for an invariant that must hold in
  someone else's repository later. A test guards it only while the test exists
  and only where it runs; a check inside the program guards every run.

**[Migration Steps Must Be Uniformly Specific](../../../docs/lessons-learned/migration-steps-uniform-specificity.md)**
— provide the artifact, never a description of it, at the same specificity in
every step. It is the source of the guide-shaped principles above and applies to
a script wherever the script asks a person to write content.

---

## Related Resources

- [Update Project Docs skill](../../../plugins/project-docs/skills/update-project-docs/SKILL.md)
  — runs migrations in sequence (§ Step 4) and states both file structures (§
  Creating New Migration Guides)
- [Migration: v2.8 → v2.9](../../../plugins/project-docs/skills/update-project-docs/migrations/v2.8-to-v2.9.md)
  and
  [its script](../../../plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.8-to-v2.9.ts)
  — the reference for the script shape
- [Scaffold Update Checklist](../scaffold-update-checklist/SKILL.md) — the
  release workflow that triggers a migration, and how each shape is validated
- [Lessons Learned](../../../docs/lessons-learned/README.md) — where migration
  authoring failures are documented
