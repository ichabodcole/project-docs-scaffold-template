---
name: "finalize-branch"
description: >
  Code review, documentation, and merge workflow for completed branches. Use
  this instead of generic branch-completion skills — determines the base branch,
  performs independent code review via subagent, runs quality checks (format,
  lint, types, test), creates session documentation in docs/projects/, writes
  memory docs, checks test plan results, and squash-merges (or consolidates, for
  long branches) back to the base. Triggers when user says "finalize branch",
  "merge to develop", "merge to main", "finish this branch", "ready to merge",
  "wrap up this work", or wants to complete feature work with documentation and
  code review.
allowed_tools:
  ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "Task", "AskUserQuestion"]
---

# Finalize Branch

Code review, documentation, and merge workflow for completed branches.

## Workflow

### Step 0: Determine the Base Branch

**Do not assume `develop` or `main`.** Every command in the remaining steps
needs a base branch — the branch this feature branch was created from. Different
projects and different branches use different bases (`develop`, `main`,
`master`, `trunk`, `staging`, or a long-lived feature branch). Guessing wrong
leads the scope calculation and all subsequent steps to operate on the wrong
delta.

**How to figure it out:**

1. Check the upstream tracking branch if set:
   `git rev-parse --abbrev-ref @{upstream} 2>/dev/null`
2. Check the repo's default branch and recent merge history:
   - `git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null` (often
     `origin/main` or `origin/develop`)
   - `git log --oneline --decorate -20` to see what's recently merged
3. If the user has project conventions documented (CLAUDE.md, AGENTS.md, or a
   root README), check there for a stated default branch workflow.
4. If after those checks you're still unsure, **ask the user explicitly**:
   _"What branch was this work based on / should it merge back into?"_ Don't
   guess.

Once established, use this base branch in every subsequent command — the
examples below use `<base>` as a placeholder. Replace it with the actual base
branch name (e.g., `develop`, `main`, `trunk`) for execution.

### Step 1: Understand Branch Scope

Review commits, files changed, and overall accomplishment.

```bash
git log <base>..HEAD --oneline
git diff --stat <base>
```

### Step 2: Independent Code Review (Mandatory)

**This step is not optional and cannot be self-performed.** Dispatch a subagent
to perform the review — do not review the code yourself.

**Why:** The agent that wrote the code is the worst possible reviewer of it.
Tunnel vision makes self-review miss the things a fresh pair of eyes catches in
minutes. An "I've been reviewing as I go, so this is covered" reflex is exactly
the failure mode this step exists to prevent. If that thought appears, treat it
as the signal to delegate, not to skip.

**How:**

1. Dispatch a code review subagent. Preferred, in order:
   - `feature-dev:code-reviewer` (project convention for high-confidence
     filtered review)
   - `superpowers:code-reviewer`
   - A generic `general-purpose` agent if neither is available
2. Give the subagent the **net diff** as its scope: `git diff <base>..HEAD`
   (adjust base branch as needed). Commit count on the branch is irrelevant —
   the reviewer reviews the final delta against the base, not the commit
   history.
3. Include in the subagent's prompt: what the branch is supposed to accomplish,
   the base branch, any known constraints or conventions, and an instruction to
   flag bugs, security issues, convention drift, and missed edge cases.
4. Wait for the subagent's findings before proceeding.

**After review:**

- Surface the findings to the user — don't silently act on them.
- Address high-confidence issues (bugs, security, clear convention violations)
  before moving to quality checks.
- For subjective or low-confidence suggestions, defer to the user.
- If the reviewer produces nothing actionable, that's a valid result — say so
  explicitly rather than pretending no review happened.

### Step 3: Run Quality Tools

Run these in sequence, fixing issues as they arise. **This is a hard gate** — do
not proceed to documentation or merge with failing checks.

```bash
pnpm run format
pnpm run lint
pnpm run check-types
pnpm run test
```

### Step 4: Create Session Document

Always create in the relevant project's `docs/projects/<project-name>/sessions/`
folder. If no project folder exists for this work, create the session in a new
or existing project folder. See `docs/projects/README.md` for conventions.

### Step 5: Create Memory

Create a short memory in `docs/memories/` summarizing what was done. Use the
template at `docs/memories/TEMPLATE.md`. Name it
`YYYY-MM-DD-short-description.md`. Skip for trivial changes where the commit
message alone provides sufficient context.

### Step 6: Assess Additional Documentation

Present recommendations to user and get confirmation before creating:

- **Handoff** — Does this work require specific deployment steps beyond merging
  code? (DB migrations, service redeployments, environment config changes,
  manual coordination.) If so, create `handoff.md` in the project folder using
  `docs/projects/TEMPLATES/HANDOFF.template.md`.
- **Architecture** — Reference
  [docs/architecture/README.md](../../docs/architecture/README.md)
- **Interaction design** — Reference
  [docs/interaction-design/README.md](../../docs/interaction-design/README.md)
- **Specifications** — Check if `docs/specifications/` exists and whether
  changes affect documented behavior. Flag any that may need updating.
- **Test plan** — If `docs/projects/<project-name>/test-plan.md` exists, verify
  that a Results Addendum section is present with pass/fail/blocked statuses.
  Flag any Tier 1 or Tier 2 scenarios without results. This is a soft check —
  don't block the merge, but surface it to the user.

### Step 7: Commit Documentation

Stage and commit any new docs.

### Step 8: Choose a Squash Strategy and Execute

The goal is a clean, readable merged history on the base branch. Two strategies
exist depending on branch size and commit shape. **Propose a strategy, explain
why, and confirm with the user before executing.**

**Strategy A — Single-commit squash (default for most branches):**

Use when the branch has roughly **under 20 commits** and the work is small or
medium enough to summarize in one coherent commit message. This is the default —
simpler, cleaner, easier to revert as one unit.

```bash
git reset --soft <base>
git commit -m "<single descriptive commit message>"
```

**Strategy B — Multi-commit consolidation (for large branches):**

Use when the branch has **~20+ commits** and the work naturally splits into 5–10
logical chapters (e.g., "schema + migrations", "API", "UI", "tests", "docs").
Preserving those chapters on the base branch makes the feature's evolution
readable months later, which matters more for big features.

For this strategy, **invoke the `consolidate-long-branch` skill** — it provides
the full safe workflow (backup refs, cherry-pick + soft-reset, tree-equivalence
verification) so the consolidation cannot silently drop or duplicate changes. Do
not attempt a hand-rolled multi-commit squash; the tree-equivalence check is the
only reliable way to verify the consolidated branch matches the original tip.

**How to decide:**

- Commit count under ~10 → Strategy A, no question.
- Commit count 10–20 → Strategy A unless the user explicitly wants to preserve
  chapters.
- Commit count 20+ → Propose Strategy B, but let the user choose.
- Always present your recommendation with the count and reasoning, then ask:
  _"This branch has N commits. I recommend [Strategy A/B] because [reason].
  Proceed with that, or use the other approach?"_

### Step 8.5: Verify the Squashed Result

After squashing (either strategy), do a quick sanity check:

1. Run `git log --oneline <base>..HEAD` — confirm the commit count and subjects
   match the chosen strategy (1 commit for A, planned count for B).
2. Run `git diff <base>..HEAD --stat` and spot-check that the files and line
   counts match what the feature should have touched.
3. For Strategy A: read back the squashed commit message and confirm it
   accurately summarizes the diff — not a generic "implement feature X" line
   that drifted from reality.
4. For Strategy B: the `consolidate-long-branch` skill's tree-equivalence check
   (Phase 5) is the authoritative correctness gate — confirm it ran and produced
   zero output.

This is a sanity check, not another code review. If anything looks wrong, stop
and diagnose before offering completion options.

### Step 9: Present Completion Options

After documentation and squash are done, present these options:

```
Ready to integrate. What would you like to do?

1. Merge to <base> (default)
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work
```

**Option 1: Merge to `<base>`** (default workflow)

```bash
git checkout <base>
git merge --ff-only <branch>
```

Then delete branch and remove worktree if applicable.

**Option 2: Push and create PR**

```bash
git push -u origin <branch>
gh pr create --title "<title>" --body "<summary>"
```

Keep worktree intact — user may need to address review feedback.

**Option 3: Keep as-is**

Report the branch name and worktree path. Do not merge, push, or clean up.

**Option 4: Discard**

Confirm before proceeding — list the branch name, commits that will be lost, and
worktree path. Require explicit confirmation from the user.

```bash
git checkout <base>
git branch -D <branch>
# Remove worktree if applicable
```

### Step 10: Cleanup

Delete branch and remove worktree if applicable (Options 1 and 4 only).

## User Checkpoints

Ask for user confirmation at these points:

- After independent code review findings (before proceeding)
- Before creating additional documentation (beyond session)
- Before squashing commits (confirm strategy A vs B and commit message)
- Before merging to the base branch

## Important Constraints

- **Default is local** — Only push to remote if user selects Option 2 (PR)
- **Fast-forward only** — Never create merge commits when merging locally
- **Squash or consolidate before merge** — One clean commit per branch for
  small/medium branches, or a small number of chapter commits for large branches
  via the `consolidate-long-branch` skill. Never merge a messy commit diary
  directly onto the base branch.
- **Always create session doc** — Even for smooth work

## Common Mistakes

- **Self-reviewing the code** — The single most common failure mode. If you
  catch yourself thinking "I've been reviewing as I worked, this is fine," stop.
  Dispatch a subagent per Step 2. Always. No exceptions.
- **Asking the subagent to review commit-by-commit** — Give it the net diff
  (`git diff <base>..HEAD`), not the commit history. The commit log is noise;
  the delta is the truth.
- **Rolling your own multi-commit squash** — If Strategy B is chosen, use the
  `consolidate-long-branch` skill. Ad-hoc interactive rebase without the
  tree-equivalence gate is how silent content drift enters the merged history.
- **Skipping test verification** — Never proceed to merge/PR with failing tests.
  Quality checks (step 3) are a hard gate, not a suggestion.
- **Open-ended questions** — Don't ask "What should I do next?" Present the
  structured completion options instead.
- **Premature worktree cleanup** — Only remove worktrees for Options 1 and 4.
  Options 2 and 3 need the worktree preserved.
- **No confirmation for discard** — Always list what will be lost and get
  explicit confirmation before deleting branches.
- **Merging without verifying the result** — After merging to the base branch,
  verify tests pass on the merged result before deleting the branch.
- **Assuming the base branch is `develop` or `main`** — Always determine the
  actual base in Step 0. Guessing wrong makes every subsequent diff and merge
  operate on the wrong scope.

## Output

At completion, summarize:

- Branch finalized
- Code review findings and resolutions
- Quality check results
- Documentation created/updated
- Final commit message
- Any follow-up items
