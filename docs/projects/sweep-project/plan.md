# Project Sweep & Closure Touchpoint Implementation Plan

**Created:** 2026-08-07 **Related Proposal:** [proposal.md](./proposal.md)
**Status:** Completed

_Reconciled 2026-08-07: all six phases complete. Phase 2's archival runs were
held at the confirmation gate until explicitly approved, then executed —
`agent-surface-recipe-evolution` and `hivemind-plugin` are now in
`docs/projects/_archive/`. Phase 4's two open decisions (no `docs_version` bump;
`docs/AGENTS.md` added to the mirrored-files list) were taken under stated
assumptions and recorded in the Phase 4 commit. Three findings from dogfooding
and cold-reading were folded back into the skill: the checkbox evidence
inversion, the backlog discovery pattern, and the plan-vs-proposal status
vocabulary._

---

## Overview

This plan implements the two-piece split from the [proposal](./proposal.md): a
new `sweep-project` skill that reconciles a project against what was actually
built and then either records what's left or archives it, plus a lightweight
reconciliation check inside `finalize-branch` Step 6 that feeds it.

Everything here is authored content — Markdown skill files and documentation.
There is no test framework to write against. The validation gates that exist in
this repo are Prettier (`npm run format:check`, enforced by
`.husky/pre-commit`), the dist build and its validator, the count checks in
`.claude/skills/scaffold-update-checklist/SKILL.md`, cold-read verification, and
— most importantly for a skill — **dogfooding it against real targets**. This
repository is unusually well-supplied with those, and Phase 2 is the real test
suite.

This plan was revised after a gap analysis and a fact-check pass. Several
specifics below (the reference-discovery pattern, the dogfood target list) are
corrections of a first draft that would have shipped a silently destructive bug.

## Outcome & Success Criteria

**Definition of Done:**

- [x] `plugins/project-docs/skills/sweep-project/SKILL.md` exists and is
      discoverable as `/project-docs:sweep-project`
- [x] Running it against a project with remaining work updates the document in
      place and moves nothing
- [x] Running it against `hivemind-plugin` produces a reviewable diff: folder
      moved to `_archive/`, dated memories untouched
- [x] The reference **rewrite** path is demonstrated on real inbound links via
      the Phase 2 Run 2 rehearsal (see that phase — no archival candidate in
      this repo has live inbound references, so rewriting is validated at the
      check-in gate rather than after a move)
- [x] The reference **flag** path is demonstrated against
      `docs/PROJECT_MANIFESTO.md:207`
- [x] `finalize-branch` Step 6 performs plan/backlog reconciliation and offers
      the delegation question when reconciliation comes back clean
- [x] Archival never happens without explicit human confirmation
- [x] Pipeline strings in **all** live current-state locations (see Phase 4's
      file list) show archival as a check-in stage
- [x] `plugins/project-docs` version bumped, README skills table and version
      history updated, manifesto skill count updated (26 → 27)
- [x] `dist/` rebuilt with validation output confirmed clean, and committed
- [x] `npm run format:check` passes

**Non-Goals:**

- Working through the backlog of 24 active project folders. Phase 2 dogfoods
  against a handful; clearing the rest is a separate chore.
- A batch/sweep-all mode.
- Any change to `docs-curator`.
- Automated tests. This repo has no test harness for skill Markdown.
- Sweeping references outside tracked `*.md` files, or outside this repo. Both
  are deliberate scope limits, stated in the skill so the omission is visible
  rather than accidental.

## Approach Summary

Build the skill first and dogfood it standalone before wiring it into
`finalize-branch`. That ordering matters: the proposal's core constraint is that
`sweep-project` must not assume it was invoked from `finalize-branch`, and
building it standalone-first is the cheapest way to guarantee that property
rather than assert it.

Two existing skills are the structural model, and they contribute different
things — the first draft of this plan attributed both to the wrong file:

- `plugins/project-docs/skills/consolidate-long-branch/SKILL.md` — the
  **safety-gated destructive-operation** shape: a `## Prerequisites` block (line
  52), `## Risks & Gotchas` (322), and `## Acceptance Criteria` (381) with
  ordered correctness checks. `sweep-project` mutates documents it doesn't own,
  so it needs all three.
- `plugins/project-docs/skills/finalize-branch/SKILL.md` — the **numbered
  workflow** shape: numbered `### Step N` headings, `## Important Constraints`
  (390), `## Common Mistakes` (402), `## Output` (435).

Packaging obligations (version bump, README, counts, `dist/`) are batched into
one phase near the end rather than sprinkled across phases — rebuilding `dist/`
on every commit produces noisy diffs, and the counts can only be verified once
the final skill set is settled.

## Phases

### Phase 1: The `sweep-project` skill

**Goal:** A standalone, invocable skill that reconciles a project or backlog
item and conditionally archives it.

**Key Changes:**

Create `plugins/project-docs/skills/sweep-project/SKILL.md`.

```yaml
---
name: "sweep-project"
description: >
  Reconcile a project folder or backlog item against what was actually built,
  then either record the work that remains or — with the human's confirmation —
  archive it and update live cross-references. Use when a project or backlog
  item might be finished, when a plan's checkboxes have drifted from reality, or
  when sweeping already-completed work that was never archived. Triggers when
  the user says "is this project done", "archive this project", "sweep this
  project", "reconcile the plan", "check if we can archive this", "clean up
  completed projects", or "this project looks finished".
allowed_tools:
  ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "AskUserQuestion"]
---
```

**Prerequisites section** (modeled on `consolidate-long-branch:52`): require a
clean working tree, or at minimum a clean `docs/`. The skill's own validation
story is "review the diff before accepting," which is unreadable against a dirty
tree. If unclean, warn and ask before proceeding — don't refuse outright, since
a user may legitimately be mid-session.

**Workflow steps to author:**

- **Step 0 — Resolve the target and check its state.** Accept an explicit target
  (project folder name or backlog item path) from the user _or from a calling
  skill_; if none is given, ask. **An explicitly passed target is fine;
  inferring one from branch state, recent commits, or "what we were just working
  on" is not.** That distinction is the whole constraint — state it in the step,
  not only in Constraints.

  Then handle these states explicitly, before anything else:
  - _Target doesn't exist_ → refuse, and list the active project folders.
  - _Target is already under `_archive/`_ → don't re-archive. Offer to run the
    reference pass alone (Step 5), which is also how an interrupted run
    recovers.
  - _A folder of the same name already exists at the destination_ → refuse. Do
    not merge or overwrite.
  - _Neither `plan.md` nor `proposal.md` exists_ (e.g.
    `docs/projects/grapevine-backlog/` holds only `backlog.md`) → reconcile from
    whatever Markdown the folder does contain, in narrative mode, and say so.
  - _`proposal.md` but no `plan.md`_ (e.g. `docs/projects/grapevine/`) →
    reconcile from the proposal and `sessions/`, narrative mode.

- **Step 1 — Gather reconciliation sources.** `plan.md` first, then
  `proposal.md` for scope, then `sessions/` for what actually happened. For a
  backlog item, the single file is all three.

- **Step 2 — Reconcile.** Three signals in priority order: checkboxes (`- [ ]` /
  `- [x]`) as primary evidence; a `**Status:**` line as secondary; a narrative
  completed-vs-remaining read as the fallback. Two rules:
  - **Never add checkboxes to a document that never had them.**
  - **Never normalize a free-form status into the template enum.**
    `PLAN.template.md:19` defines `Draft | Active | Completed | Superseded`, but
    real documents carry things like
    `V1.5 shipped (in spike branch, awaiting merge)` and `Approved (shipped)`.
    Those are more informative than the enum, not less. Treat a free-form status
    as a usable signal, report it verbatim, and ask before changing it.
  - When `plan.md` and `proposal.md` disagree (a real case —
    `agent-surface-recipe-evolution` has `Completed` in one and `Approved` in
    the other), surface the conflict rather than silently preferring one.

- **Step 3 — Discover and classify references.** **This runs _before_ any
  move.** The exclusion filter below is only correct against the pre-move path,
  and showing the human exactly what will change before anything moves is the
  point of the check-in.

  ```bash
  ROOT=$(git rev-parse --show-toplevel)
  NAME=<project-folder-name>
  git -C "$ROOT" grep -nE "(projects/|\.\./)${NAME}([/)\"'[:space:]]|$)" -- '*.md' \
    | grep -v "^docs/projects/${NAME}/"
  ```

  Every part of that command is load-bearing, and the naive version is wrong in
  three separate ways:
  - `(projects/|\.\./)` — sibling projects link each other with **bare relative
    paths** (`[V1.5 proposal](../grapevine/proposal.md)`) that never contain the
    string `projects/`. This is the _dominant_ cross-project reference form in
    this repo. A pattern matching only `projects/<name>` reports "zero
    references" while silently breaking every sibling link.
  - `([/)\"'[:space:]]|$)` — enforces a path-segment boundary. Without it,
    `projects/grapevine` matches `grapevine-v1.6`, `grapevine-v1.6.7`,
    `grapevine-v1.7`, and `grapevine-backlog`. Verified: the naive pattern
    returns 6 hits for `grapevine`, **all false positives**; the bounded pattern
    returns 5, all true.
  - `git -C "$ROOT"` — `git grep` prints paths relative to cwd, so the `^docs/`
    anchor in the filter silently matches nothing when invoked from a
    subdirectory.

  Classify each hit into three buckets:
  - link or path in an active README/index/doc → **rewrite**
  - path inside a dated session note, memory, or retrospective → **leave**, and
    report it as deliberately left
  - path inside a prose current-state claim → **flag, do not rewrite.** Show the
    surrounding sentence and ask.

- **Step 4 — Present and check in.** Show completed-vs-remaining _and_ the
  classified reference list, then ask via `AskUserQuestion`. Everything checked
  off makes it an _archival candidate_, not an archived project.

- **Step 5a — Not complete.** Write the reconciliation in place: check boxes,
  update `Status:` if it's a template enum value. Add a short dated note
  explaining _why_ work remains **only when the reason isn't self-evident from
  the document's own structure** — "phases 1 and 2 done, phase 3 is its own
  branch" needs no note; an abandoned approach or an external blocker does. The
  failure mode to guard against is a skill that reflexively appends prose on
  every run.

- **Step 5b — Complete and confirmed.**
  `git mv docs/projects/<name> docs/projects/_archive/<name>` (or the single
  file to `docs/backlog/_archive/`). Internal relative links survive by
  construction — `docs/projects/README.md:277` guarantees this. Then apply the
  rewrites recorded in Step 3.

  **Rewrite rule:** insert `_archive/` immediately before the project name in
  the matched path — `projects/<name>` → `projects/_archive/<name>`, and
  `../<name>/` → `../_archive/<name>/`. This local transformation is correct at
  every depth, which a single normalized form would not be.

- **Step 6 — Report.** What was reconciled (including any conflicting signals),
  what moved, what was rewritten, what was deliberately left, what was flagged.
  State explicitly when nothing needed doing — "already reconciled, nothing to
  change" is a successful outcome, not a silent one. Note the two scope limits
  (tracked `*.md` only; nothing outside this repo) so a reader knows what wasn't
  searched.

Then `## Important Constraints`, `## Common Mistakes` (at minimum: inferring the
target from branch context; using the naive discovery pattern; running discovery
after the move; fabricating checkboxes; normalizing a free-form status;
rewriting historical documents; archiving without confirmation),
`## Acceptance Criteria`, and `## Output`.

**Validation:**

- [x] `npm run format:check` passes
- [x] Frontmatter parses: `head -20` shows `name`, `description`,
      `allowed_tools`
- [x] Description covers both "Use when..." and "Triggers when...", per
      `scaffold-update-checklist:107-113`
- [x] Commit

**Dependencies:** None.

---

### Phase 2: Dogfood the skill standalone

**Goal:** Prove the skill works cold, before any `finalize-branch` wiring exists
to lean on. This phase is where the design actually gets tested — expect to
revise Phase 1's file here.

**Key Changes:** No new files. Four runs, chosen so that between them they cover
every branch of the workflow. Inspect `git diff` before accepting each.

1. **`agent-surface-recipe-evolution`** — archival happy path with a twist:
   `plan.md:4` says `**Status:** Completed` while `proposal.md:3` says
   `**Status:** Approved`. Exercises conflicting-signal reconciliation, then a
   clean archival with a genuinely empty reference pass (verified: zero external
   references).
2. **`grapevine` — rehearsal, stop at the check-in.** This folder has **no
   `plan.md`** (only `proposal.md`), a free-form status
   (`V1.5 shipped (in spike branch, awaiting merge)`), and **5 real inbound
   sibling links** from `grapevine-backlog`, `grapevine-v1.6` (×2),
   `grapevine-v1.7`, and `toolbox-migration`. Run through Step 3 and Step 4,
   verify the proposed rewrites are correct, then **decline at the check-in** —
   the project isn't done. This is the only way to exercise the rewrite bucket
   in this repo, since no actual archival candidate has inbound references. It
   simultaneously validates the no-`plan.md` path, the free-form-status rule,
   and the segment-boundary pattern against the worst-case prefix collision.
3. **`hivemind-plugin`** — `proposal.md:3` says `Completed`; its `plan.md` has
   **no status line at all**, so this tests the checkbox-primary path with the
   secondary signal absent. Larger folder, zero external references. Full
   archival.
4. **`documentation-restructuring` — reference pass only.** Already in
   `_archive/`, and `docs/PROJECT_MANIFESTO.md:207` still makes a live prose
   claim about its old path. Exercises the already-archived Step 0 branch (the
   interrupted-run recovery path) _and_ the flag-don't-rewrite bucket, against a
   real pre-existing defect.

**Known limitation:** `docs/backlog/` currently holds zero active items, so the
backlog path ships validated only structurally. Record this in the session doc;
the first real backlog sweep validates it.

**Validation:**

- [x] Run 1 surfaces the status conflict rather than silently picking one —
      _amended: there was no conflict to surface. `plan.md: Completed` beside
      `proposal.md: Approved` looked like one when this plan was written, but
      the two document types use different status vocabularies
      (`Draft | Active | Completed | Superseded` vs
      `Draft | Under Review | Approved | Rejected | Superseded`), so both were
      in their own terminal state. The criterion was built on a false premise;
      the skill now says so explicitly rather than manufacturing the conflict._
- [x] Run 2 proposes correct rewrites for all 5 sibling links, matches zero
      `grapevine-*` siblings, and moves nothing after the decline
- [x] Run 3 archives cleanly; `git status` shows renames, not delete+add
- [x] Run 4 classifies the manifesto prose as flag-and-ask, not auto-rewrite
- [x] A second run against an already-reconciled target reports "nothing to do"
      explicitly
- [x] Skill revisions committed separately from archival commits, so the skill
      diff stays readable

**Dependencies:** Phase 1.

---

### Phase 3: `finalize-branch` Step 6 integration

**Goal:** The per-branch reconciliation check, plus the delegation question.

**Key Changes:**

Modify `plugins/project-docs/skills/finalize-branch/SKILL.md`. Step 6 ("Assess
Additional Documentation," line 174) is a list of soft checks. Add a **Plan
reconciliation** bullet in the same register as the existing Test plan bullet,
which is verbatim "This is a soft check — don't block the merge, but surface it
to the user" (line 191).

Four sequencing questions the bullet must answer explicitly:

- **Target passing.** Step 6 will have just identified the relevant `plan.md`;
  it passes that path to `sweep-project` as an explicit argument. This is
  allowed — the forbidden thing is the skill _inferring_ a target. Re-asking a
  user who just answered is bad interaction.
- **Re-reconciliation.** `sweep-project` re-reads from disk, which already
  includes Step 6's in-place edits, so the second pass is idempotent rather than
  conflicting. Say so, so a reader doesn't assume duplicated work.
- **Committing.** When invoked from `finalize-branch`, `sweep-project` leaves
  its changes uncommitted for Step 7 ("Commit Documentation") to pick up. Step 7
  currently says "stage and commit any **new** docs" — widen that to cover moves
  and edits, or the archival lands uncommitted.
- **Interaction with Step 8.** If archival happens at Step 6, Step 8's branch-
  facts grep and any squash operate on the post-move tree. That's correct, but
  worth stating so it isn't discovered as a surprise.

Note the delegation precedent accurately: Step 8 presents strategies with a
recommendation and asks (lines 305-309), then invokes `consolidate-long-branch`
once the user chooses (line 273). It's offer-then-perform-on-choice, not
offer-only — mirror that, not a weaker version.

Add a `Common Mistakes` bullet: reconciling by restructuring the plan rather
than updating it in place.

`allowed_tools` needs no change — already
`["Read", "Write", "Edit", "Grep", "Glob", "Bash", "Task", "AskUserQuestion"]`.

**Validation:**

- [x] `npm run format:check` passes
- [x] Re-read Step 6 whole — the new bullet reads as a peer of the Test plan
      bullet, not a new mandatory gate
- [x] Step 6 itself archives nothing
- [x] Step 7's wording covers moved/edited docs, not just new ones
- [x] Commit

**Dependencies:** Phase 1, and Phase 2 strongly preferred — wiring in a skill
whose behavior hasn't been observed means debugging two things at once.

---

### Phase 4: Pipeline documentation

**Goal:** Show archival as an operational check-in stage rather than a described
one.

**Key Changes:**

`docs/README.md` and `docs/projects/README.md` are **mirrored files** — the
cookiecutter copy is the source of truth and must be edited first. The cycle
string appears in **more places than a first pass suggests**; the full live
list:

| File                                                   | Lines            | Note                                           |
| ------------------------------------------------------ | ---------------- | ---------------------------------------------- |
| `{{cookiecutter.project_slug}}/docs/README.md`         | 254              | mirrored — **edit first**                      |
| `docs/README.md`                                       | 254              | mirrored counterpart                           |
| `{{cookiecutter.project_slug}}/docs/AGENTS.md`         | 40, 48           | mirrored pair **not listed** in the checklist  |
| `docs/AGENTS.md`                                       | 48, 57           | mirrored counterpart                           |
| `{{cookiecutter.project_slug}}/docs/reports/README.md` | 39               | mirrored category README                       |
| `docs/reports/README.md`                               | —                | apply the counterpart change                   |
| `docs/PROJECT_MANIFESTO.md`                            | 99-102, 145, 169 | checklist requires **ALL** pipeline references |

The cookiecutter cycle string currently reads:

```
Brief → Investigation → Project (proposal → [design-resolution] → plan → [test-plan] → sessions) → Report → ...
```

Archival is absent entirely. Add it, phrased as a check-in rather than an
automatic terminal step. Also check the Quick Reference list (starts line 260,
entries from 262) — every other stage has an entry.

`PROJECT_MANIFESTO.md:99-102` already names archival but as a passive terminal
stage; reframe as a check-in.

Sweep for stragglers with `grep -rn "test-plan\] → sessions" --include='*.md' .`
— the regex works (verified). But **"no remaining hits" is the wrong success
condition**: 13 hits exist today and at least 5 must survive by design —
migration guides in `plugins/` and `dist/` (historical text),
`docs/projects/_archive/` (archived history), and this plan quoting itself. The
check is that no hit remains in a **live current-state** file.

**Two decisions to confirm with Cole before editing:**

1. This is a wording change to mirrored files, not a structural one — no new
   directories, no moved files, `_archive/` already exists in the scaffold. On
   that reading it needs **no `docs_version` bump and no migration guide**
   (migrations top out at `v2.5-to-v2.6.md` while `docs_version` is `4.4.0`,
   confirming they're written only for genuinely structural changes).
2. `docs/AGENTS.md` is a cookiecutter-mirrored pair that is **absent from**
   `scaffold-update-checklist`'s Mirrored Files list. Adding it is exactly the
   checklist's own "Meta: does this skill need updating?" item.

**Validation:**

- [x] Cookiecutter copies edited before project copies, for all four mirrored
      pairs
- [x] Extracted cycle-string lines compare equal between each mirrored pair
      (compare the extracted line, not a fixed line range — ranges drift)
- [x] Straggler grep returns hits only in migrations, `dist/`, `_archive/`, and
      this plan
- [x] `scaffold-update-checklist`'s Mirrored Files list updated if decision 2 is
      yes
- [x] `npm run format:check` passes
- [x] Commit

**Dependencies:** None strictly, but after Phase 2 the prose can describe
behavior that has actually been observed.

---

### Phase 5: Packaging, counts, and distribution

**Goal:** Discharge every obligation the `scaffold-update-checklist` attaches to
adding a plugin skill.

**Key Changes:**

- `plugins/project-docs/.claude-plugin/plugin.json` — `3.1.0` → `3.2.0` (minor:
  new skill plus additive behavior change; the documented rule is minor-for-any-
  behavioral-change, `scaffold-update-checklist:230-233`)
- `plugins/project-docs/README.md` — add `sweep-project` to the Skills table
  under "Project Lifecycle Skills" (header at line 172), and add a
  `### 3.2.0 (YYYY-MM-DD)` entry above the `3.1.0` entry at line 281
- `docs/PROJECT_MANIFESTO.md:80` — `6 commands, 26 skills, 9 agents` → 27
  skills. All three counts are currently accurate, so this is an update, not a
  fix.
- `./scripts/build-skills-dist.sh`

**No `Root-Level Conventions` row is needed** — this introduces no dependency on
project-owned content in root `AGENTS.md`/`CLAUDE.md`, so the checklist's
conditional (lines 122-133) doesn't fire.

**Validation:**

- [x] `ls plugins/project-docs/skills/ | wc -l` → 27, matching the manifesto
- [x] **Read the build output for `WARNING: Some skills failed validation`.**
      The script gates validation behind
      `command -v uv && [ -f pyproject.toml ]` and, on failure, warns and
      continues — **it exits 0 even when validation fails**, so exit status is
      not a signal.
- [x] The per-plugin `Skills: N` line under `=== Packaging: project-docs ===`
      reads 27. The final "Build complete" summary is a cross-plugin total (38
      → 39) and is not the number to check.
- [x] `dist/project-docs/skills/sweep-project/` created
- [x] `npm run format:check` passes
- [x] `dist/` committed alongside source changes

**Dependencies:** Phases 1, 3, 4 — all content final before `dist/` is rebuilt.

---

### Phase 6: Cold-read verification and finalization

**Goal:** Catch what the author's context hides, then land the branch.

**Key Changes:**

Per the checklist's Final Checks (lines 370-383), dispatch a **fresh agent — not
a fork** — with no context from the implementation conversation, scoped to
`sweep-project/SKILL.md` plus what it explicitly links to, and to the modified
Step 6. Report-only.

Then run `finalize-branch` on this branch. Note the recursion: Step 6 will
reconcile _this project's own_ `plan.md`, and if it comes back clean, offer to
run `sweep-project` on the `sweep-project` project. Let it happen — it's a
legitimate final acceptance test of the delegation.

**Validation:**

- [x] Cold-read findings triaged — fixed or explicitly declined, not silently
      dropped
- [x] `finalize-branch` Step 6 reconciles this plan's own checkboxes
- [x] All Definition of Done criteria checked

**Dependencies:** All prior phases.

---

## Key Risks & Mitigations

- **The reference pass silently corrupts links.** The single highest risk, and
  the naive discovery pattern in this plan's first draft would have done exactly
  that — reporting "zero references" while breaking five real sibling links. →
  The pattern is now specified precisely, with each part's purpose stated, and
  Phase 2 Run 2 validates it against the worst-case prefix collision before any
  archival depends on it.
- **Discovery running after the move**, causing the archived project's own
  internal links to be reported as external and rewritten. → Step 3 is ordered
  before Step 5b by construction, and the ordering rationale is written into the
  step so a later editor doesn't "tidy" it back.
- **The skill reads well but behaves badly.** No test harness; the only real
  signal is running it. → Phase 2's four runs cover every workflow branch,
  including both outcome paths and all three reference buckets.
- **Rewriting other people's documents.** → Three-bucket classification with the
  prose carve-out, human confirmation, clean-tree prerequisite, and every run
  reviewed as a diff.
- **`git mv` losing rename detection.** → Explicitly checked in Phase 2.
- **Step 6 becoming a hard gate.** `finalize-branch` is already 12 steps (Step
  0-10 plus 8.5). → Author in the soft-check register and verify by re-reading
  Step 6 whole.
- **Mirrored-file drift.** → Phase 4 orders the edits and compares extracted
  lines per pair.

## Testing & Validation Strategy

1. **Structural** — `npm run format:check` (pre-commit enforced) and
   `validate-skills-dist.py` via the build script, with the caveat that its
   failures are non-fatal and must be read, not inferred from exit status.
2. **Count** — the checklist's count commands against the manifesto's claims.
3. **Behavioral** — Phase 2's four runs. This is the real test suite: two
   outcome paths, three reference buckets, three Step 0 target states.
4. **Comprehension** — cold-read verification by a context-free agent, which has
   caught genuine issues on every occasion it has been run in this repo.

## Assumptions & Constraints

**Assumptions:**

- The Phase 2 target folders are still in their current state when
  implementation begins. If any is archived manually first, substitute from the
  proposal's stale-folder list — but preserve the _coverage_ each run provides,
  not just the count.
- No external dependencies, accounts, or environment setup — authored Markdown
  plus git operations.

**Constraints:**

- `docs/README.md`, `docs/projects/README.md`, category READMEs, and (de facto)
  `docs/AGENTS.md` are mirrored; cookiecutter is the source of truth.
- Root `AGENTS.md`/`CLAUDE.md` are explicitly project-specific and out of
  bounds.
- Archival requires explicit human confirmation — a design constraint, not a
  configurable default.

## Open Questions

None remaining.

_Resolved during this plan's revision:_ what `sweep-project` does when a project
has no `plan.md` — Step 0 now handles it alongside three other target states,
rather than deferring to Phase 2.

_Resolved before implementation (2026-08-07), both as read:_

- The Phase 4 pipeline wording change needs **no** `docs_version` bump and no
  migration guide. It changed wording in already-mirrored files — no new
  directories, no moved files, `_archive/` already existed in the scaffold.
  Shipped that way in `0baf1cf`. (`docs_version` tracks releases automatically
  via release-please and has since reached 6.2.0; migration guides remain
  written only for genuinely structural changes, and still top out at
  `v2.5-to-v2.6.md`.)
- `docs/AGENTS.md` **was** added to `scaffold-update-checklist`'s Mirrored Files
  list, in the same commit.

---

**Related Documents:**

- [Proposal](./proposal.md)
- [Investigation](../../investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
- [scaffold-update-checklist](../../../.claude/skills/scaffold-update-checklist/SKILL.md)
  — the obligations Phases 4-6 discharge
- [consolidate-long-branch skill](../../../plugins/project-docs/skills/consolidate-long-branch/SKILL.md)
  — model for Prerequisites / Risks & Gotchas / Acceptance Criteria
- [finalize-branch skill](../../../plugins/project-docs/skills/finalize-branch/SKILL.md)
  — model for numbered Steps / Important Constraints / Common Mistakes / Output;
  also modified by Phase 3
- [Sessions](./sessions/) (created during implementation)
