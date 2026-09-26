---
type: test-plan
title: Work Taxonomy Test Plan
description:
  Tiered end-to-end and integration verification for the feature/item/cycle
  model and its migration, weighted toward what per-task unit tests cannot reach
  — a whole item's life through the CLI, the migration on a real tree, the
  dogfood run, and the skill touch points.
tags: [taxonomy, migration, cli, lint]
status: draft
lifecycle: active # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Test Plan: Work Taxonomy

**Related Plan:** [Development Plan](./plan.md)\
**Related Proposal:** [Proposal](./feature.md), landing with
[Guidance Lifecycle](../guidance-lifecycle/feature.md)

---

## Overview

[The plan](./plan.md) specifies TDD unit tests per task in Phases 1, 2 and 5.
This test plan does not restate them. Its value is the verification a per-task
unit test structurally cannot give: does an **item's whole life** hold together
across several `pdocs` verbs in sequence; does the **migration** actually
convert a realistic tree, twice, without drifting; does the **dogfood run**
leave this repository's own gate green before and after retirement; and do the
**skill touch points** — `init-branch`, `finalize-branch`, `triage-items`,
consult, reflect, override — behave the way the two proposals' success criteria
describe, in a scratch repository rather than in a mocked test harness.

Scope: CLI and file-tree behavior, lint output, migration output, and skill
behavior in a scratch or generated project. Out of scope: anything the plan
already covers with a task-level unit test (position typing, individual
`registry.ts` constants, individual `documentProblems` rules in isolation), UI,
and anything needing infrastructure this environment does not have (a second
consumer not yet on v2.10).

## Test Environment

**Prerequisites:**

- `bun` — runs `scripts/pdocs/cli.ts` and the test suite.
- `cookiecutter` — required for every generated-payload scenario. Verify with
  `cookiecutter --version`; without it, T1-02 and T1-03 are **blocked, not
  failed**.
- `git` — the no-silent-deletion checks (D9) and the migration's link rewriter
  both shell out to it.
- A scratch directory (this session's scratchpad, or `/tmp/cc` per the plan's
  own examples) — never the working tree, for anything that writes files.

**Verification command:**

```bash
bun --version && cookiecutter --version && git --version
```

**Notes specific to this plan:**

- Every spawned test child (git, bun, cookiecutter) must pass `env: childEnv()`
  from `scripts/pdocs/test-env.ts`. A git spawned in-process from a hook
  environment inherits `GIT_INDEX_FILE` and reads the wrong index (Task 1.8) —
  this applies to scenario execution as much as to the unit tests the plan
  already specifies.
- The pre-commit hook runs the full `npm run check` gate on every commit, so a
  scenario that leaves the working tree dirty at the end of a session will block
  the next commit unless it cleans up (or works entirely in a scratch
  directory).
- **Visual Artifacts are not applicable.** This is CLI and file-tree work with
  no UI; the screenshot directory
  `docs/projects/work-taxonomy/artifacts/screenshots/` is expected to stay
  empty. Any failing scenario captures a terminal transcript instead (command,
  full output, exit code), per the `docs-foundation` test plan's convention.

**External Dependencies:**

- **Human actions required:**
  - **Deleting this repository's own memories by hand before the dogfood run**
    (plan Phase 5, dogfood step 1) — the script does not delete on an adopter's
    behalf (D11), so this is a manual step that must happen before T2-08 can run
    for real, not something the implementing agent can automate.
  - **The story-loom migration to v2.10** is a prerequisite for the
    second-consumer run (plan Phase 6) and is outside this project's control. If
    story-loom has not reached v2.10 by the time T3-01 is attempted, mark it
    **Blocked**, not Failed, and note what is missing.

---

## Verification Scenarios

### Tier 1 — Smoke Tests

_Always required. Cheap checks that the feature doesn't break anything._

#### T1-01: The gate passes

**Type:** Integration\
**Source:** Baseline; plan's Testing & Validation Strategy

**Steps:**

1. `npm run check`
2. `npx tsc --noEmit`

**Expected:** Both exit 0. `npm run check`'s sub-checks (`format:check`,
`docs:lint`, `check:version`, `check:mirror`, `check:dist`, `bun test`) all
report clean.

---

#### T1-02: A generated payload passes `pdocs check`, has the new layout, and ships no tests

**Type:** Integration\
**Source:** Plan Task 1.10 verification; Definition of Done, "the payload has
been checked by generating it (not by reading it)"

**Steps:**

1. `cookiecutter . --no-input --overwrite-if-exists -o "$SCRATCH/cc" install_target="New project folder"`
2. `cd "$SCRATCH/cc/my-project" && bun scripts/pdocs/cli.ts check --format text`
3. `ls docs/` and confirm `features/`, `items/`, `cycles/`, `TEMPLATES/` exist
   and `backlog/`, `briefs/`, `fragments/`, `investigations/`, `reports/`,
   `projects/`, `memories/`, `lessons-learned/` do not.
4. `find . -name '*.test.ts' -o -name 'test-env.ts' | grep . && echo FAIL || echo "no tests shipped"`

**Expected:** Step 2 exits 0. Step 3 shows the new layout only. Step 4 prints
"no tests shipped".

---

#### T1-03: `pdocs new item` and `pdocs view board` run in a generated project

**Type:** Integration\
**Source:** Definition of Done — `pdocs new item` and `pdocs view` work end to
end

**Steps:**

1. From T1-02's generated project,
   `bun scripts/pdocs/cli.ts new item smoke-check --kind task`
2. `bun scripts/pdocs/cli.ts view board`

**Expected:** Step 1 exits 0 and writes `docs/items/smoke-check.md` with a v7
`id` and `lifecycle: triage`. Step 2 exits 0 and lists the new item under the
unstarted group.

---

#### T1-04: The mirror stays in sync

**Type:** Integration\
**Source:** Plan's "risky part" note (Task 2.9) — a new non-test file under
`scripts/pdocs/` missing from the payload is not caught by `check:mirror`, only
by this diff

**Steps:**

1. `diff -rq scripts/pdocs '{{cookiecutter.project_slug}}/scripts/pdocs'`

**Expected:** The only differences reported are test files, `test-env.ts`, and
`__fixtures__`. Anything else (a new command, a new lib file present on one side
only) is a real gap.

---

### Tier 2 — Critical Path

_Core user flows mapped directly from the plan's phases and the two proposals'
goals._

#### T2-01: An item's whole life through the CLI

**Type:** UI/E2E (CLI)\
**Source:** Phase 2 validation walk; proposal touch-points list

**Steps:**

1. On a scratch copy of a generated payload: `pdocs new feature a`
2. `pdocs new item b --kind task --parent feature/a` — confirm
   `lifecycle: triage` (D8, agent-created items default to triage).
3. `pdocs set item/b --lifecycle ready`
4. `pdocs new plan --owner item/b` — confirm the item is promoted to a folder
   (`items/b/item.md`) and every inbound/own link still resolves.
5. `pdocs set item/b --lifecycle active`
6. `pdocs view board` — confirm `item/b` appears under `started`.
7. `pdocs set item/b --lifecycle done`
8. `pdocs archive item/b` — confirm the folder moves to `items/_archive/b/`, its
   `id` is unchanged, and inbound links (e.g. from `features/a/plan.md` if one
   references it) are rewritten.
9. `pdocs check`

**Expected:** Every step exits 0, and step 9 is clean. The item's UUID is
identical from step 2 through step 8 (`resolveRef` by `id` still finds it
post-archive).

---

#### T2-02: The lint rules that matter, all in one fixture

**Type:** Integration\
**Source:** Phase 1 validation, "a hand-written fixture with every Task 1.7
defect reports every one of them, each once"

**Steps:**

1. Build a fixture tree containing: an item with `parent: feature/nope`
   (unresolved), an item with `blocked_by: [<unknown uuid>]`, a `scope:` not
   declared in `lint.scopes`, an archived item (`items/_archive/x.md`) with
   `lifecycle: active`, and a slug present both live and in `_archive/`.
2. `pdocs check --format json`

**Expected:** One finding for each defect: `BAD PARENT`, `BAD BLOCKED_BY`,
`BAD SCOPE`, `ARCHIVED NOT TERMINAL`, `DUPLICATE SLUG` — each reported exactly
once, naming its path.

---

#### T2-03: No silent deletion (D9) — a move is not a deletion

**Type:** Integration\
**Source:** Task 1.8; D9

**Steps:**

1. In a git-initialized scratch tree, commit an item at `items/x.md`.
2. Delete it outright, commit, run `pdocs check --format json`.
3. Restore it, set `lifecycle: dropped`, commit, delete it again, run check.
4. Move `items/x.md` to `items/x/item.md` (same `id`), commit, run check.
5. Set it `done`, `pdocs archive item/x`, commit, run
   `pdocs check --against HEAD` and separately `--against HEAD~1`.

**Expected:** Step 2 reports `ITEM DELETED` naming the path and `id`. Step 3 is
clean (dropped before leaving). Step 4 is clean (a promotion, same `id`). Step
5's `--against HEAD` is clean (archived, not deleted); `--against HEAD~1` still
reports the earlier deletion if replayed against that ref — confirming
`--against` is not a no-op.

---

#### T2-04: Derived views agree with the files on disk

**Type:** Integration\
**Source:** Definition of Done — "`pdocs view` derives the backlog, the board,
the ready-and-unblocked list... None of these is an authored file"

**Steps:**

1. In a fixture tree, hand-author items across every state, with priorities set
   on some, and one `ready` item whose `blocked_by` includes a not-yet-`done`
   item.
2. `pdocs view backlog` — compare the returned set against a manual read of the
   frontmatter (unstarted group only, ordered by priority then `generated.at`
   then path).
3. `pdocs view ready` — confirm the blocked item is excluded and an
   otherwise-identical unblocked item is included.
4. `pdocs view board` — confirm every item appears exactly once, in its state's
   group.
5. Run `view backlog` twice and diff the output.

**Expected:** Every view's output matches a hand count from the files, with no
authored index file anywhere in the tree. Step 5's two runs are byte-identical.

---

#### T2-05: "Done, no `released_in`" is visible without failing the lint

**Type:** Integration\
**Source:** Proposal Open Questions — `released_in` "stays optional and the lint
does not check it"; Definition of Done, "a scope's work, and 'done without
`released_in`'"

**Steps:**

1. In a fixture tree, set an item `lifecycle: done` with no `released_in` key at
   all.
2. `pdocs check` — confirm it is clean (D9's non-rule).
3. `pdocs view unreleased` — confirm the item appears.
4. `pdocs view unreleased --since <date after the item's generated.at>` —
   confirm it is excluded.

**Expected:** Step 2 exits 0 (no lint finding for missing `released_in`). Step 3
lists the item. Step 4 filters it out, demonstrating the view addresses
migrated-history flooding (Key Risks) without any check gating on the field.

---

#### T2-06: The migration runs, and re-running is a no-op

**Type:** Integration\
**Source:** Phase 5, "script phases"; plan Testing & Validation Strategy

**Steps:**

1. Reconstruct (or generate offline, per the plan's fixture-O approach) a v2.10
   tree with a mix of backlog items, a fragment, a project with an active plan,
   an archived project with no frontmatter, an investigation with a report, and
   a cycle with scoped entries.
2. Run the migration with `--dry-run`; confirm it prints a move map and writes
   nothing (`git status --short` empty).
3. Run it for real. Record exit code.
4. Run `pdocs check` on the result.
5. Run the migration a second time against the now-migrated tree.

**Expected:** Step 2 changes nothing on disk. Step 3 exits 0. Step 4 is clean.
Step 5 reports the work already done and makes no further changes (idempotent,
matching the `docs-foundation` precedent's T2-08).

---

#### T2-07: The migration's conversions are correct, not just clean

**Type:** Integration\
**Source:** Plan's migration conversion table (Phase 5); D2; D11; D4

**Steps:**

1. From T2-06's fixture, after the real run, inspect specific conversions:
   - A `projects/<x>/proposal.md` became `features/<x>/feature.md` with
     `type: feature`, and every link that pointed at `proposal.md` now resolves
     to `feature.md`.
   - An archived project (no frontmatter) landed in `features/_archive/` with
     synthesized frontmatter (`type`, `title` from the H1, `status: stable`,
     `generated.by: unknown`) and a terminal `lifecycle`.
   - The investigation became `items/<slug>/item.md` (`kind: research`) plus
     `items/<slug>/write-up.md` (`type: write-up`, no `lifecycle` key), with its
     linked report moved under the item's `reports/` (D4's three-part split).
   - `memories/` and `lessons-learned/`, if present in the fixture, still exist
     on disk, unmodified, and are declared in the resulting
     `.project-docs.json`'s `lint.types` (D11 — kept, not deleted).
2. `pdocs check` on the result.

**Expected:** Every bullet above holds. The migration's own end-to-end unit test
already checks this at the fixture level per-row; this scenario verifies the
same claims by reading the resulting tree directly, which is what a consumer
actually experiences.

---

#### T2-08: The dogfood run leaves this repository's own gate green, before and after retirement

**Type:** Manual + Integration\
**Source:** Phase 5 "Dogfood on this repository"; Definition of Done, "The
migration script and its guide ship together. The script has been run to
completion here"

**Steps:**

1. Before the script runs: confirm this repository's memories have been deleted
   by hand (the human-action prerequisite above) and their inbound links fixed,
   per `pdocs backlinks`.
2. Run the migration `--dry-run` on this repository, read the move map.
3. Run it for real; run `npm run check`.
4. Confirm no legacy folder remains
   (`find docs -maxdepth 1 -type d -name 'projects' -o -name 'backlog' ...`
   returns nothing).
5. Perform the retirement commit (deleting the `retired` registry rows,
   `PROJECTS_FOLDER`, the legacy `ownedType` branch, the legacy golden fixture
   rows); run `npm run check` again.
6. Confirm the session document this move creates
   (`docs/features/work-taxonomy/sessions/<date>-dogfood-migration.md`) records
   counts, time taken, every stop, and every script fix the run forced.

**Expected:** `npm run check` is green at step 3 (post-migration,
pre-retirement) and again at step 5 (post-retirement). Step 4 is empty. Step 6's
session exists and contains the required content, not just a placeholder.

---

#### T2-09: Skill touch points, exercised in a scratch repo

**Type:** UI/E2E (CLI + skill invocation)\
**Source:** Phase 4 validation; proposal touch-points list; Guidance Lifecycle's
Reflect

**Steps:**

1. In a scratch project on the Phase 2 CLI, create an item and set it `ready`.
2. Invoke `init-branch` — confirm it selects the item (`pdocs view ready`), sets
   `lifecycle: active`, and sets `cycle` to the active cycle if one exists.
3. Do trivial, non-notable work on the branch.
4. Invoke `finalize-branch` — confirm: the item ends `lifecycle: done`; the
   session document lands in the item's (or feature's) `sessions/`, not a
   central `sessions/` folder; Reflect is run and its default "nothing this
   time" exit is taken and said explicitly (not silently skipped); the landing
   commit message carries `Work-Item: <uuid>` (D10).
5. Repeat steps 1–4 but do notable work worth a playbook append; confirm
   Reflect's positive path appends a Step and Verification to an existing or new
   playbook rather than authoring a new document type.
6. Repeat step 1–2 for work that ran without a prior item; confirm
   `finalize-branch` creates an item born `lifecycle: done`.

**Expected:** All of the above hold in one scratch-repo run each. No memory
document is created at any point (Guidance Lifecycle's success criterion).

---

#### T2-10: `triage-items` proposes, then applies only after the user has seen it

**Type:** Manual (skill invocation)\
**Source:** D8; D12; proposal, "Items created by agents start in `triage`... and
leave it through a triage step the user has seen"

**Steps:**

1. In a scratch project, create two items via `pdocs new item ... --kind bug`
   (both land in `triage`, D8's default, with no CLI flag to bypass it).
2. Invoke `triage-items`. Confirm it lists both items and proposes a disposition
   (accept to `backlog`/`ready`, or drop, plus `priority`, `assignee`, and a
   candidate `parent`) **without** having written anything yet.
3. Confirm the proposal is shown before any `pdocs set` call is made.
4. Approve one disposition and reject/modify the other; confirm only the
   approved change is applied via `pdocs set`, and the tree is unchanged for the
   rejected one until re-run.

**Expected:** No item leaves `triage` without the propose-then-apply sequence
being visibly separated into two steps. This is the D8 safeguard that lives in
skill instructions, not the CLI, so it has to be observed in the skill's actual
behavior, not just by reading `pdocs set --help`.

---

#### T2-11: Guidance Lifecycle's success criteria hold

**Type:** Integration + Manual\
**Source:** [Guidance Lifecycle proposal](../guidance-lifecycle/feature.md),
Success Criteria

**Steps:**

1. `grep -rn "type: memory\|type: lesson" docs/ '{{cookiecutter.project_slug}}/docs/'`
2. Invoke `generate-dev-plan` (or `dev-kickoff`) on a scratch project that has
   at least one playbook whose `description` matches the kind of work requested.
   Confirm the output names the playbook, quoting
   `pdocs find --type playbook --format json` output rather than asserting it
   consulted something.
3. Repeat with no matching playbook present; confirm it says "0 matches" (or
   equivalent), not silence.
4. Add `docs/playbooks/branch-finalization-playbook.md` to a scratch project;
   invoke `finalize-branch`; confirm it follows the override and says so.

**Expected:** Step 1 returns nothing. Step 2's consult evidence is the
`pdocs find` output itself, not a self-report — this is the exact failure mode
the proposal names (constraining wording did nothing in the 3.4.0
reviewer-capability check). Step 3 makes the negative case visible. Step 4
confirms the override precedence.

---

### Tier 3 — Edge Cases & Robustness

_Deferred unless covering critical infrastructure. Each item includes why._

#### T3-01: The second-consumer migration run (story-loom)

**Type:** Integration\
**Source:** Plan Phase 6, "Story-loom first, once it is on v2.10"\
**Deferred rationale:** Blocked on an external prerequisite this project does
not control — story-loom must reach v2.10 first (its `.project-docs.json` read
`"version": "8.0.0"` on `develop` when checked on 2026-09-22, and it had not run
the v2.10 migration). Mark this scenario **Blocked**, not Failed, until that
prerequisite is met; do not substitute Spellbook or MediaForge without
re-checking the plan, since the plan names story-loom as the required first run
and the others as a secondary check on a differently-shaped tree.

---

#### T3-02: `released_in` derivation from commit trailers

**Type:** Integration\
**Source:** Plan Non-Goals — "Deriving `released_in` from commit trailers.
Commits start carrying the trailer in this release, but nothing reads it yet."\
**Deferred rationale:** Explicitly out of scope for this release. The only
deliverable is the "done, no `released_in`" view (covered in T2-05); nothing in
this release reads the `Work-Item:` trailer to derive the field, so there is
nothing to verify here yet.

---

#### T3-03: UI ordering within a state

**Type:** Manual\
**Source:** Plan Non-Goals — "A UI. Ordering within a state (a rank field) is
left to whoever builds one."; Open Questions\
**Deferred rationale:** No UI ships in this release. `pdocs view`'s sort
(priority, then `generated.at`, then path) is exercised as a side effect of
T2-04; a rank field or view-time reordering is explicitly left to a future UI
project.

---

#### T3-04: A retroactive Reflect pass over the 266 existing memories (other repos)

**Type:** Manual\
**Source:** [Guidance Lifecycle proposal](../guidance-lifecycle/feature.md), Out
of Scope and Future Considerations\
**Deferred rationale:** Explicitly out of scope — "Rewriting the 86 existing
playbooks and lessons in consuming repositories... Any compatibility shim," and
a retroactive pass is listed under Future Considerations, not this release. This
repository's own 30–35 memories are handled by the dogfood prerequisite (T2-08
step 1), which is a "keep or delete" decision, not a Reflect pass.

---

## Out of Scope

- **All Phase 1, 2 and 5 unit tests the plan already TDDs** — position typing,
  individual registry constants, `documentProblems` field rules, `resolveRef`
  resolution forms, the pure migration functions, the golden fixture diffs.
  Restating them here would duplicate the plan rather than add verification
  value.
- **The Phase 3 cold-read validation** ("a cold-read agent is given
  `docs/items/README.md`, `SCHEMA.md` and `ITEM.template.md`... can file an item
  and say who moves it next") — this is a docs-quality check the plan already
  specifies as its own Phase 3 validation step; it is a reading comprehension
  check on prose, not a behavior this test plan's tiers are built to score.
- **Performance and concurrency** — single-developer tool; not a contemplated
  failure mode, consistent with the `docs-foundation` test plan's precedent.
- **The `operator-triage` and `hivemind-consult`/`hivemind-digest` skill edits**
  — named in the plan's Phase 4 audit as minor-bump changes in other plugins;
  they follow the same
  `pdocs new item ... --lifecycle triage --source operator:<id>` and
  playbook-destination pattern already verified in T2-09/T2-10/T2-11, and a
  separate scenario would test the same mechanism twice.

---

## Results Addendum

Run 2026-09-25 on `chore/work-taxonomy-p6-release-checks` (develop at
`9ce6824`), before the release. Generated payloads came from
`cookiecutter . --no-input -o <scratch> install_target="New project folder"`,
then `git init` and a commit; nothing was written to this tree except these
documents. The payload still reports `8.1.0` (`pdocs --version`,
`.project-docs.json`), because release-please has not bumped it yet. The
installed `project-docs` plugin is 3.x, so the skill scenarios (T2-09 to T2-11)
followed this tree's `SKILL.md` and `commands/init-branch.md` literally rather
than going through the Skill tool. A sub-agent ran each one in its own scratch
payload, and its evidence was spot-checked afterwards.

| Scenario | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1-01    | Pass     | `npm run check` exit 0: format, docs-lint clean, 7 version markers, mirror 53 files, dist 152 files, `bun test` 1736 pass / 0 fail. `npx tsc --noEmit` exit 0.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| T1-02    | Pass     | In the generated payload `pdocs check` is clean (exit 0). `docs/` has `features/ items/ cycles/ TEMPLATES/ STYLE.md` and none of the eight retired folders. No `*.test.ts`, `test-env.ts` or `__fixtures__` shipped.                                                                                                                                                                                                                                                                                                                                                                                  |
| T1-03    | Pass     | `new item smoke-check --kind task` wrote a v7 `id` with `lifecycle: triage`, and `view board` lists it under `unstarted`. Both exit 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| T1-04    | Pass     | `diff -rq` finds 21 differences, all test files, `test-env.ts` or `__fixtures__`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| T2-01    | Pass     | Ran new feature, new item (`triage`), set `ready`, then `new plan --owner item/b`, which promoted the item to `items/b/item.md`. Then set `active` (board shows it under `started`), set `done`, and `archive`, which moved it to `items/_archive/b/` and rewrote 1 inbound link from `features/a/feature.md`. The id was unchanged and `find --id <prefix>` resolves it post-archive. Check clean.                                                                                                                                                                                                   |
| T2-02    | Pass     | A hand-built fixture gives exactly 5 findings: BAD PARENT, BAD BLOCKED_BY, BAD SCOPE, ARCHIVED NOT TERMINAL, DUPLICATE SLUG. Each appears once and names its path, and the check exits non-zero.                                                                                                                                                                                                                                                                                                                                                                                                      |
| T2-03    | Pass     | An outright delete reports `ITEM DELETED` with the path and id. Deleting a `dropped` item is clean, and so is a promotion to `x/item.md` (same id). After `archive`, `--against HEAD` and `--against HEAD~1` are clean. Replayed against the parent of the delete commit, `--against` still reports the deletion, so it is not a no-op.                                                                                                                                                                                                                                                               |
| T2-04    | Pass     | Tested 12 items across all states. `view backlog` orders by priority, then `generated.at`, then path, matching a hand count. `ready` excludes the item blocked by an `active` one and includes its twin. `board` puts every item once in its group. Two runs are byte-identical (text and JSON). There is no authored index file.                                                                                                                                                                                                                                                                     |
| T2-05    | Pass     | A `done` item with no `released_in` key passes the check and appears in `view unreleased`. `--since 2026-09-02` excludes it (its `generated.at` is 2026-09-01).                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| T2-06    | Pass     | Built a fixture from tag `v8.1.0` with 2 backlog items, a fragment, a project with an active plan, an archived project with no frontmatter, an investigation with its report, an active cycle with mixed scope, a memory and a lesson. `--dry-run` exit 0 printed the move map and left `git status` empty. The real run exit 0 and `pdocs check` was clean. A second run exit 0 reported "nothing left in a retired folder" with 0 moves and 0 writes.                                                                                                                                               |
| T2-07    | Pass     | `projects/widgets/proposal.md` became `features/widgets/feature.md` (`type: feature`, `active` because its plan is active), and every link to `proposal.md` now points at `feature.md`. The archived project landed in `features/_archive/old-gizmo/` with synthesized frontmatter (title from H1, `status: stable`, `generated.by: unknown`, `lifecycle: done`). The investigation split into `items/can-we-widget/item.md` (`kind: research`, `done`), `write-up.md` (no `lifecycle`) and `reports/…`. `memories/` and `lessons-learned/` are unmodified and declared in `lint.types`. Check clean. |
| T2-08    | Pass     | Ran on this tree's state; the migration itself was not re-run in place. `npm run check` at the pre-retirement commit `96dd103`, in a scratch clone, is green (1741 pass). At HEAD, after retirement, it is green (T1-01). No legacy folder remains, and `_archive/` exists only under `features/` and `items/`. Memories were deleted by hand before the run (`fc71f85`). The [dogfood session](./sessions/2026-09-25-dogfood-migration.md) records counts, time, stops, manual steps and script fixes.                                                                                               |
| T2-09    | Pass     | `init-branch` picked the item from `view ready`, set it `active` and wrote the active cycle. `finalize-branch` moved it `review` → `done`, put the session in `items/<slug>/sessions/` and said "Reflect: nothing this time." On a history-untouched landing the `Work-Item:` trailer sits on the session commit (D21). The positive path created a playbook and later appended a Step and a Verification to it. A branch with no item produced an item born `done`. No memory was written. Deviation: a self-review stood in for the review subagent.                                                |
| T2-10    | Pass     | Two `--kind bug` items land in `triage`. `triage-items` showed its proposal (disposition, priority, parent, grouping and parallelism per D22) with `git status` empty. Approving one and rejecting the other applied only the approved `pdocs set`; the rejected item was untouched. Check clean. Superseded step: step 1's "no CLI flag to bypass it" no longer holds as written. `pdocs new item --lifecycle <state>` exists by design (D23, `docs/items/README.md`), and D8's guard is the skill rule.                                                                                             |
| T2-11    | Pass     | Step 1's grep returns only the command quoting itself (3 lines) and a fenced example in [a research write-up](../../items/wiki-structure-and-okf-schema/write-up.md). No document is typed `memory` or `lesson`. `generate-dev-plan` quoted the real `pdocs find --type playbook --format json` output (`count: 1`) and named the playbook. With none present it wrote "`pdocs find --type playbook`: 0 matches". With `branch-finalization-playbook.md` present, `finalize-branch` announced the override and followed its distinctive steps.                                                        |
| T3-01    | Blocked  | Waits for the release. D16 pins each older migration to its own scaffold tag, so story-loom no longer has to reach v2.10 first. After the release, one `update-project-docs` session runs v2.9→v2.10 and then v2.10→v3.0.                                                                                                                                                                                                                                                                                                                                                                             |
| T3-02    | Deferred | Explicit non-goal: nothing reads the `Work-Item:` trailer to derive `released_in` in this release.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| T3-03    | Deferred | Explicit non-goal: no UI ships. The view sort is exercised in T2-04.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| T3-04    | Deferred | Out of scope per Guidance Lifecycle: no retroactive Reflect pass over other repositories' memories.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

**Blocked scenarios:** T3-01 needs `project-docs-scaffold-template-v9.0.0`
tagged and published, since the v2.10-to-v3.0 script fetches it without
`--scaffold-dir`. After that, story-loom runs the chain in one
`update-project-docs` session. This test plan stays `active` until it runs.

**Findings the skill walks raised (none failed a scenario; for triage):**
`pdocs set` drops the inline comment on a `lifecycle:` line (already filed). An
item born in `finalize-branch` Step 4 keeps its template placeholders, and the
lint passes them (related to the filed placeholder gap). A born item's `--cycle`
is only mentioned in a parenthetical. The misnested `## Branch Landing Policy`
bullet in `finalize-branch` Step 8.2. `generate-dev-plan` asks for
`related: [playbook/…]` on a workbench plan, where the lint does not check it
and `finalize-branch` says not to write `related:`. Step 3 of `finalize-branch`
gives no fallback when there is no `package.json`. The cycle template writes
`feat/` while `init-branch` names `feature/`. A new cycle's placeholder dates
pass the lint. `triage-items` has six unclear lines: no fallback without
AskUserQuestion; "settled definition of done" versus `docs/items/README.md`; who
sets `blocked_by`; Step 1 notes with no column in the table; the empty
plan-overlap check; and no mention of `new item --lifecycle`.

## Visual Artifacts

No UI ships in this project.
`docs/projects/work-taxonomy/artifacts/screenshots/` is expected to stay empty.
Capture terminal transcripts (command, full output, exit code) for any failing
or blocked scenario in `docs/projects/work-taxonomy/artifacts/`, per the
`docs-foundation` test plan's convention — an exit code is the assertion
throughout this plan, and a transcript without one proves nothing.
