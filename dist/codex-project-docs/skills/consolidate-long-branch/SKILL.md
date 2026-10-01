---
name: "consolidate-long-branch"
description: >
  Safely collapse a long-running feature branch's many commits into a small
  number of coherent "chapter" commits before merging, using a cherry-pick +
  soft-reset workflow gated by two independent backup refs and a byte-exact
  tree-equivalence check. Use when a branch has accumulated dozens of WIP
  commits, fixups, and reversals that shouldn't land verbatim in the target
  branch's history. Triggers when the user says "consolidate this branch",
  "squash these commits into chapters", "clean up branch history before merge",
  "collapse commits safely", "too many commits on this branch", "rewrite this
  long branch's history", or "turn this messy branch into clean commits".
allowed-tools:
  - Read
  - Bash
  - TodoWrite
  - AskUserQuestion
---

# Consolidate Long Branch

A safe, repeatable workflow for collapsing a long-running feature branch into a
small number of coherent "chapter" commits before merging — without losing work,
scrambling the diff, or relying on the unforgiving ergonomics of interactive
rebase for mass operations.

The core technique is **cherry-pick + soft-reset onto a fresh branch**, gated by
a backup tag, a backup branch, and an exact tree-equivalence check at the end.
It was developed while consolidating a 46-commit branch down to 7 chapter
commits with zero conflicts.

## When to Use

**Use this skill when:**

- A long-running branch has accumulated many commits (roughly 20+) and is about
  to merge
- The individual commits are mostly small fixes, iterations, or WIP saves that
  don't need to be preserved as standalone history
- The work can be naturally grouped into 5–10 coherent chapters (e.g., "schema
  migration", "API surface", "UI integration", "test coverage")
- You want the merged history on the target branch to be readable months later

**Don't use this skill when:**

- The branch is short (under ~10 commits) — interactive rebase or just merging
  as-is is fine
- Each commit tells a story worth preserving individually (e.g., a series of
  small refactors meant to be reviewed or reverted independently)
- The branch has already been pushed and others are basing work on it —
  rewriting shared history is a separate, higher-stakes problem
- Commits in the branch heavily interleave (a fix to area A, then a feature in
  B, then another fix to A) and significant reordering would be required to
  group them — see Phase 2 for the trade-off

## Prerequisites

Before starting, verify:

- Clean working tree at the branch tip (no uncommitted or staged changes)
- All tests and typechecks passing at HEAD — start from a known-good state
- A clear mental model of the branch's logical chapters (5–10 groups)
- Willingness to pause and diagnose at any step. This is **not** a one-shot
  workflow; it's a deliberate sequence with verification gates

## Agent Instructions

**Before starting:**

1. Create a TodoWrite checklist with one item per phase below. Do not skip
   phases or merge them.
2. Announce each phase before running its commands.
3. Pause at every validation gate — especially the Phase 5 tree-equivalence
   check — and confirm the gate passed before continuing.
4. **Never `git push --force`** without explicit user confirmation of the
   consolidated result.
5. If anything goes wrong, the fastest recovery is almost always
   `git checkout <feature>` or `git reset --hard backup/pre-consolidate` and
   restarting Phase 4 on a freshly-created `consolidated` branch. The backups
   exist precisely so restarting is cheap.

## Key Principles

- **Safety first.** Two independent recovery paths (tag + branch) before any
  history-rewriting command runs.
- **Plan-then-execute.** Write the full commit-to-group mapping and draft every
  final commit message _before_ running a single `git cherry-pick`. Surprises
  mid-rebase are where disasters happen.
- **Prefer contiguous groups, no reordering.** If you can group commits into
  chapters without changing their chronological order, conflict risk drops to
  near zero. Accept minor semantic blur at group boundaries rather than reorder
  for perfection.
- **Cherry-pick + soft-reset over interactive rebase.** Each group is applied
  forward onto a fresh branch — there's no in-place rewriting, every group is a
  checkpoint, and a bad group can be aborted without losing prior progress.
- **Verify the tree, not just the build.** `git diff <backup> HEAD` must produce
  zero output. Typecheck and tests can pass even when content has silently
  drifted.

## Workflow

### Phase 1: Safety Nets

**Goal:** Two independent recovery paths in case anything goes wrong.

**Actions:**

1. Confirm you're on the branch you want to consolidate and the working tree is
   clean: `git status`
2. Create a backup tag at the current HEAD: `git tag backup/pre-consolidate`
3. Create a backup branch at the current HEAD:
   `git branch backup/<feature>-pre-consolidate`
4. Verify both refs exist and point at the same SHA:
   `git rev-parse backup/pre-consolidate backup/<feature>-pre-consolidate HEAD`
   — all three lines should match.

**Validation:**

- [ ] `git tag --list 'backup/*'` shows the new tag
- [ ] `git branch --list 'backup/*'` shows the new branch
- [ ] All three refs point at the same SHA as the current HEAD

**Rationale:** Tags and branches are independent refs. If you accidentally
delete one, the other recovers you. Belt and suspenders.

### Phase 2: Plan the Groups

**Goal:** A written mapping from every commit to a target group, with no group
requiring reordering.

**Actions:**

1. Identify the merge base or branch point: `git merge-base <feature> <target>`
   (typically `develop` or `main`).
2. List every commit on the branch in chronological order:
   `git log --oneline --reverse <base>..HEAD`
3. Sketch 5–10 logical chapters for the final history (e.g., "schema +
   migrations", "API endpoints", "studio UI", "test coverage", "docs").
4. Map each commit's SHA to a group ID. A simple table works — sha, subject,
   group:

   ```
   abc1234  feat: add hash column                  -> 1 schema
   def5678  fix: nullable hash for legacy rows     -> 1 schema
   1112222  feat: hash check in plan endpoint      -> 2 api
   ...
   ```

5. **Verify each group's commits are contiguous in chronological order.** If
   group 1's commits are at positions [1,2,3] and group 2's at [4,5,6,7], you're
   golden. If group 1 is at [1,2,7] and group 2 is at [3,4,5,6], you have a
   choice:
   - **(a) Accept some blur:** let commit 7 land in group 2 instead of group 1.
     Tiny semantic imperfection; near-zero conflict risk.
   - **(b) Reorder:** keep clean grouping but accept higher conflict risk during
     cherry-pick.
   - **Prefer (a) unless the blur is genuinely unacceptable.** This is the
     single most important risk-reducing decision in the whole workflow.

**Validation:**

- [ ] Every commit in `<base>..HEAD` is mapped to exactly one group
- [ ] Every group's commits are contiguous in chronological order
- [ ] Group count is in the 5–10 range (or whatever makes sense)
- [ ] The mapping is written down somewhere durable (a `/tmp` file, a scratch
      doc, a comment block — not just in your head)

### Phase 3: Draft the Final Commit Messages

**Goal:** A finished commit message for every group, ready to feed to
`git commit -F`.

**Actions:**

1. Create a directory for the message files: `mkdir -p /tmp/consolidate-msgs`
2. For each group, write the squashed commit message to
   `/tmp/consolidate-msgs/<N>.txt`. Use the project's commit conventions (e.g.,
   Conventional Commits). A short imperative subject plus a body explaining what
   the group accomplishes and why.
3. Read each one back to make sure it's right. Once the rebase starts, you don't
   want to be editing prose.

**Validation:**

- [ ] One message file per group, numbered to match the group order
- [ ] Each subject line is short and imperative
- [ ] Each body explains the _why_, not just the _what_

**Rationale:** Messages crafted in advance are dramatically better than messages
typed under time pressure during a rebase. Using `-F <file>` also avoids the
editor-per-commit friction that derails many interactive rebases.

### Phase 4: Execute via Cherry-Pick + Soft-Reset

**Goal:** A new branch, built from the merge base, with one squashed commit per
group.

**Actions:**

1. Create a fresh working branch from the base:
   `git checkout -b consolidated <base-branch>`
2. For each group, in order:
   1. Apply all the group's commits with cherry-pick:
      - Range form (clean when the group is a contiguous range):
        `git cherry-pick <first-sha>^..<last-sha>`
      - Enumerated form (when the range syntax doesn't fit):
        `git cherry-pick <sha1> <sha2> <sha3> ...`
   2. Soft-reset to collapse those commits into staged changes:
      `git reset --soft HEAD~<N>` where `<N>` is the number of commits in the
      group.
   3. Commit with the pre-written message:
      `git commit -F /tmp/consolidate-msgs/<N>.txt --no-verify`
   4. Sanity check: `git log --oneline <base>..HEAD` should now show exactly the
      number of groups completed so far.
3. After all groups are processed, you should have one commit per group.

**Validation:**

- [ ] `git log --oneline <base>..HEAD | wc -l` equals the planned group count
- [ ] Each commit's subject matches the corresponding draft message
- [ ] No cherry-pick was left in a `--continue` or unfinished state

**Why cherry-pick + soft-reset over interactive rebase:** Cherry-pick applies
commits _forward_ onto a fresh branch — the original branch (and the backups)
are untouched while you work. If a group conflicts, `git cherry-pick --abort`
returns you cleanly to the prior group's checkpoint without rewriting any
history in place. Each group is a verifiable savepoint. Interactive rebase, by
contrast, rewrites history in place; a problem partway through can cascade and
the recovery model is less forgiving.

**Why `--no-verify`:** Pre-commit hooks already ran when each original commit
was created. Re-running them on every squashed commit during the consolidation
is redundant and slow. The full hook suite still runs via the typecheck/test
gate in Phase 6, so nothing is skipped overall.

### Phase 5: Verify Tree Equivalence

**Goal:** Prove the consolidated branch produces the exact same working tree as
the original.

**Actions:**

1. Run: `git diff backup/pre-consolidate HEAD`
2. The expected output is **nothing**. Empty. Zero bytes.
3. If output is non-empty: **STOP.** Do not proceed to swap. Something was lost
   or duplicated during cherry-pick.
4. To diagnose: read the diff to find which files differ. Common causes are a
   skipped commit, a double-applied commit, or an incorrect `HEAD~<N>` count in
   a soft-reset. Cross-reference your group plan and the actual `git log`
   history.
5. To recover: `git checkout <feature>` (the original branch is intact),
   inspect, fix the plan, and restart Phase 4 on a freshly-created
   `consolidated` branch.

**Validation:**

- [ ] `git diff backup/pre-consolidate HEAD` produces zero output
- [ ] If non-empty, you have stopped and are diagnosing — not pressing forward

### Phase 6: Verify Code Quality

**Goal:** Confirm the consolidated branch builds and tests cleanly.

**Actions:**

1. Run the project's typecheck command (e.g., `bun run typecheck`,
   `npm run typecheck`, `tsc --noEmit`, whatever this project uses).
2. Run the project's test command (e.g., `bunx --bun vitest run`, `npm test`,
   `pytest`).
3. Both should pass trivially given Phase 5 succeeded — the working tree is
   byte-identical to the backup. If either fails, something unusual is
   happening; investigate before swapping.

**Validation:**

- [ ] Typecheck passes
- [ ] Tests pass

### Phase 7: Swap the Canonical Branch

**Goal:** The original feature branch ref now points at the consolidated
history; backups remain in place.

**Actions:**

1. Force-update the canonical branch to the consolidated tip:
   `git branch -f <feature> consolidated`
2. Switch to it: `git checkout <feature>`
3. Delete the temporary working branch: `git branch -D consolidated`
4. **Do not** delete `backup/pre-consolidate` (tag) or
   `backup/<feature>-pre-consolidate` (branch). They stay until the merge has
   shipped.
5. **Do not** `git push --force` yet. Wait for explicit user confirmation that
   the consolidated version is what they want.

**Validation:**

- [ ] `git log --oneline <base>..HEAD` shows the consolidated chapters
- [ ] `git diff backup/pre-consolidate HEAD` still produces zero output
- [ ] Backup tag and backup branch still exist

### Phase 8: Merge and Clean Up

**Goal:** The consolidated work lands on the target branch; backups are removed
only after success is proven end-to-end.

**Actions:**

1. Merge or fast-forward into the target branch following project conventions
   (many project-docs-derived projects branch off `develop`, merge to `develop`,
   and let the user handle `develop` → `main`).
2. Confirm the merge looks correct in `git log` and a quick smoke test of the
   merged code passes.
3. **After** the merged branch has been verified end-to-end (not just typecheck
   — actual functional verification), remove the backups:
   - `git tag -d backup/pre-consolidate`
   - `git branch -D backup/<feature>-pre-consolidate`
4. If a remote backup was pushed, delete it too.

**Validation:**

- [ ] Target branch contains the consolidated commits
- [ ] Functional smoke test passes on the merged target branch
- [ ] Backups deleted only after end-to-end verification

## Risks & Gotchas

### Gotcha 1: Starting without backups

- **Symptom:** A mistyped command (`git reset --hard`, accidental branch delete)
  destroys uncommitted or unmerged work.
- **Root cause:** No recovery path because no ref preserves the original tip.
- **Mitigation:** Always create both the tag _and_ the branch in Phase 1 before
  any other command. Verify they point at HEAD. Two refs is cheap insurance.

### Gotcha 2: Mid-cherry-pick conflicts

- **Symptom:** A `git cherry-pick` halts on a conflict you didn't expect.
- **Root cause:** Usually a sign of subtle reordering (the group's commits
  weren't truly contiguous after all) or a dependency on a commit assigned to a
  later group.
- **Mitigation:** **Stop and read the conflict.** Don't reflexively pick "ours"
  or "theirs." If you don't fully understand the conflict, abort with
  `git cherry-pick --abort`, return to the plan, and either re-group or accept
  the blur option from Phase 2. Pressing through unknown conflicts is how silent
  content drift enters the consolidated branch.

### Gotcha 3: Skipping the tree-equivalence check

- **Symptom:** Code works in basic testing but a subtle behavior difference
  appears days or weeks later in production.
- **Root cause:** A commit was silently skipped or double-applied. Typecheck and
  tests passed because the change was in an untested area.
- **Mitigation:** `git diff backup/pre-consolidate HEAD` is non-negotiable. Zero
  output is the only acceptable result. If non-zero, do not proceed under any
  circumstances.

### Gotcha 4: Fixing by fixing

- **Symptom:** Something looks off, you make a small adjustment, then another,
  then you're three layers deep in compensating tweaks.
- **Root cause:** Trying to patch a consolidation in place rather than
  restarting from a known-good state.
- **Mitigation:** When in doubt, `git checkout <feature>` (or worst case
  `git reset --hard backup/pre-consolidate`) and restart Phase 4 from a clean
  `consolidated` branch. The backups exist precisely so restarting is cheap.

### Gotcha 5: Deleting backups too early

- **Symptom:** Days after merge, a regression surfaces and there's no clean
  reference to compare against.
- **Root cause:** Backups deleted as soon as the swap completed, before the
  merged code had real-world validation.
- **Mitigation:** Keep backups until the merge has been functionally exercised
  end-to-end. Git refs cost effectively nothing.

### Gotcha 6: Force-pushing before human sign-off

- **Symptom:** You push the consolidated branch, the human looks at the new
  history, and they want a different grouping.
- **Root cause:** Treating swap (Phase 7) as the same step as publish.
- **Mitigation:** Do the swap locally, show the result, get sign-off, then push.
  If the branch is shared, coordinate the force-push.

## Acceptance Criteria

- [ ] Final commit count on the consolidated branch equals the planned group
      count
- [ ] `git diff backup/pre-consolidate HEAD` produces zero output
- [ ] Typecheck and tests pass
- [ ] Each final commit's subject and body tell a coherent story someone could
      understand without reading the original branch's history
- [ ] Backups remained in place through the swap and were only deleted after
      end-to-end verification of the merged result

**Correctness checks, in order of authority:**

1. The tree-equivalence diff is the primary correctness check — it is exact, not
   heuristic.
2. Typecheck and test suite are secondary checks; they should pass trivially if
   tree equivalence holds.
3. A functional smoke test on the merged target branch is the final gate before
   deleting backups.

## Example

### 46 → 7 on `feature/storyline-engine-hash-staleness`

A long-running branch addressing artifact hash staleness had accumulated 46
commits — a mix of schema migrations, API plumbing, UI surfacing, test
additions, and small fixes. Collapsed to 7 chapter commits with zero conflicts.
Cherry-picks ran cleanly because the groups were contiguous in chronological
order and required no reordering. The tree-equivalence diff was empty on the
first attempt; typecheck and tests passed without modification.

**Lesson:** The single biggest factor in conflict-free execution was accepting
minor group-boundary blur instead of reordering for clean grouping. Pre-writing
all seven commit messages to `/tmp/consolidate-msgs/` made Phase 4 mechanical.
