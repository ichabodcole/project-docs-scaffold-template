---
name: "finalize-branch"
description: >
  Code review, documentation, and merge workflow for completed branches. Use
  this instead of generic branch-completion skills — determines the base branch,
  performs independent code review via subagent (verifying the reviewer can
  execute code first), runs quality checks (format, lint, types, test), creates
  session documentation in docs/projects/, writes memory docs, checks test plan
  results, and lands the branch per the project's own landing policy if one is
  defined (squash, consolidate, or leave history untouched) back to the base.
  Triggers when user says "finalize branch", "merge to develop", "merge to
  main", "finish this branch", "ready to merge", "wrap up this work", or wants
  to complete feature work with documentation and code review.
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

1. **Verify the reviewer exists and can execute code before dispatching.** Check
   the Agent tool's currently available types first — a name below may no longer
   exist in this environment (plugins get removed, renamed, or restructured
   independently of this skill) or may exist only as a skill-driven prompt
   template rather than a directly dispatchable agent type. For whichever
   exists, check its tool list for `Bash` (or equivalent shell access) before
   choosing it. A mandatory review that can only read and grep shares the
   author's blind spot — reasoning about what the code does instead of observing
   it. It cannot run tests, run the CLI, or reproduce a reported defect, and a
   static read presented as a review is worse than no review if it isn't
   disclosed as one. `feature-dev:code-reviewer` in particular does **not**
   currently have a `Bash` tool (only
   `Glob, Grep, LS, Read, NotebookRead, WebFetch, TodoWrite, WebSearch, KillShell, BashOutput`)
   — useful as a confidence-filtered second opinion, not sufficient alone for a
   review that claims to verify behavior.

2. **Choose a reviewer** based on what this branch needs, from whatever
   execution-capable reviewers are currently available:
   - **A plan-aware reviewer** — prefer when the branch has an approved
     `proposal.md`, `plan.md`, design resolution, or similar spec to validate
     against. Look for an available agent or skill-driven review specialized for
     plan-alignment ("did we build what we said we'd build?"), architecture, and
     design-pattern review — check what's actually dispatchable in the current
     environment rather than assuming a previously-known name still resolves. If
     none exists, brief a general-purpose reviewer explicitly to check the diff
     against the plan.
   - **A confidence-filtered reviewer** (e.g. `feature-dev:code-reviewer`) —
     tight, low-noise report focused on real bugs, security issues, and clear
     convention violations. Per the capability check above, pair it with an
     execution-capable reviewer rather than dispatching it alone.
   - **Dual review (both in parallel)** — for meaty branches: large diffs (~500+
     lines), work spanning multiple subsystems, significant architectural
     decisions, or anything high-stakes. The two reviewers flag different things
     — one's confidence filter catches bugs the other misses, the other catches
     architecture and plan drift. Dispatch them in parallel (one message,
     multiple Task calls), then reconcile findings into a single merged report
     for the user.
   - **A dedicated subagent spun up specifically for this review** — worth it
     for a substantial review: full tooling, persistent context, and can be
     re-dispatched with that context intact for follow-up questions.
   - **Fallback:** `general-purpose` (full tool access) if no specialized
     reviewer with shell access is available. Note this in the session doc.

3. **Scope the review to the net diff.** `git diff <base>..HEAD` is the truth —
   commit history is noise. Tell the reviewer to review the delta, not the
   commit log.

4. **Prompt template** — include all of these in the dispatch:
   - What the branch is supposed to accomplish (1–2 sentences).
   - Base branch and link to any approving proposal/plan if one exists.
   - Known constraints, conventions, or project guidelines (e.g., "follow
     patterns in CLAUDE.md / AGENTS.md").
   - Explicit asks: flag bugs, security issues, convention drift, missed edge
     cases.
   - **Tests-vs-mocks check:** "Do the tests actually test logic, or do they
     mostly exercise mocks? Flag tests that pass without proving the code under
     test works."
   - **Ship verdict:** "End your report with a clear verdict — _Ready to merge:
     Yes / No / With fixes_ — and a one-sentence reasoning."

5. Wait for the subagent's findings (or both, for dual review) before
   proceeding.

**After review:**

- Surface the findings to the user — don't silently act on them.
- For dual review, present both reports side-by-side (or as a merged summary
  noting which reviewer flagged what) rather than picking one.
- Address high-confidence issues (bugs, security, clear convention violations)
  before moving to quality checks.
- For subjective or low-confidence suggestions, defer to the user.
- If the reviewer(s) produce a "Ready to merge: No" or "With fixes" verdict,
  treat those fixes as blocking before Step 3.
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

### Step 8: Determine Landing Policy and Execute

**Whether and how to squash is a project decision, not something this skill can
assume.** Different projects have different reasons to want one clean commit
(readability) or to explicitly forbid squashing (SHA-pinned doc citations,
multi-author attribution trailers — e.g. a multi-agent team where each agent's
commits carry an identifying trailer like `Anthill-Seat:` — or wanting to bisect
the reasoning behind a branch where documentation commits are rulings, not
commentary). This skill's job is to find and follow that decision, not make it.

**How:**

1. **Compute the branch facts — always, regardless of policy.** This part is a
   fact about the branch, not a judgment call, so the skill can own it outright:

   ```bash
   git log <base>..HEAD --oneline | wc -l                     # commit count
   for sha in $(git log <base>..HEAD --format=%h); do
     git grep -l "$sha" -- '*.md' && echo "  ^ cited by $sha"
   done                                                        # shas cited in docs
   git log <base>..HEAD --format='%an%n%(trailers)' | sort -u  # distinct identities
   ```

   If the sha loop finds any hit, or the identities command's output contains
   more than one distinct name across the `%an` author lines and any
   `Co-Authored-By:`/`Anthill-Seat:`-style trailers combined, **squashing would
   destroy that information.** Surface this explicitly no matter which strategy
   follows.

2. **Look for a project-owned landing policy.** Check, in order:
   - Root `AGENTS.md`, then root `CLAUDE.md`, for a `## Branch Landing Policy`
     heading (exact match).
   - If that section only points to another file (e.g. "see
     `docs/BRANCH_POLICY.md`"), follow the pointer one level and read the linked
     file.
   - Within that section, a fenced code block only counts as a **runnable
     check** — run it and show the output, don't paraphrase — if it's introduced
     as something to run (a `bash`/`sh`-tagged block, or prose like "run:"
     immediately before it). Fenced blocks that are clearly illustrative
     (example output, a diagram) are not commands to execute.

3. **If a policy was found:** print the section's content inline — not "see your
   project's policy"; a pointer that needs a second lookup is a pointer that
   gets skipped — and follow it. If it conflicts with what step 1 found (e.g.
   the policy says "always squash" but this branch has cited shas or multiple
   identities), surface the conflict to the user before proceeding. Don't
   silently pick one.

4. **If no policy was found**, say so explicitly — an announced absence, not a
   silent guess — then present three options and ask the user to choose, or to
   go define `## Branch Landing Policy` in `AGENTS.md` first:
   - **Strategy A or Strategy B** (below), with their tradeoffs, informed by the
     branch facts from step 1.
   - **Leave history untouched** — merge or PR as-is, no squash/consolidation.
     Lead with this option whenever step 1 found cited shas or multiple
     identities, since squashing would destroy real information in that case.

**Strategy A — Single-commit squash:**

Use when the work is small or medium enough to summarize in one coherent commit
message. Simpler, cleaner, easier to revert as one unit.

```bash
git reset --soft <base>
git commit -m "<single descriptive commit message>"
```

**Strategy B — Multi-commit consolidation:**

Use when the branch naturally splits into 5–10 logical chapters (e.g., "schema
and migrations", "API", "UI", "tests", "docs"), **and each chapter is
functionally independent** — it builds and delivers value on its own, not only
once a later chapter lands. Preserving those chapters on the base branch makes
the feature's evolution readable months later, which matters more for big
features.

For this strategy, **invoke the `consolidate-long-branch` skill** — it provides
the full safe workflow (backup refs, cherry-pick + soft-reset, tree-equivalence
verification) so the consolidation cannot silently drop or duplicate changes. Do
not attempt a hand-rolled multi-commit squash; the tree-equivalence check is the
only reliable way to verify the consolidated branch matches the original tip.

**Reasoning to offer when presenting the options — lead with functional
independence, not commit count:**

The real question is **"does each proposed chapter deliver something useful and
buildable on its own?"** — not "how many commits are there?" Chapters are only
justified when each one stands alone: it builds and delivers value _without_ the
later chapters. A chapter that "only makes sense once the next chapter lands" is
exactly the partial, interdependent commit Strategy B is meant to avoid, just at
a coarser grain — collapse those into a single squash.

- **Apply the independence test first.** Can each candidate chapter be checked
  out and built/run in isolation, delivering self-contained value? If not, lean
  toward Strategy A regardless of commit count.
  - _Failure mode to watch for:_ a new daemon whose `server.ts` imports its own
    bundled UI surface — a "daemon" chapter won't build without the "surface"
    chapter, and the surface is inert without the daemon. Neither stands alone,
    so despite a high commit count the branch correctly collapses to one commit.
- **Commit count is a secondary signal** — it _prompts_ the question, it doesn't
  answer it. A high count hints there may be separable work; it doesn't
  establish it.
  - Under ~10 commits → Strategy A is usually the easy call.
  - 10–20 → Strategy A unless chapters are both wanted _and_ independently
    buildable.
  - 20+ → run the independence test; Strategy B only makes sense if the chapters
    pass it.
- Present the recommendation with the count, the independence judgment, and
  reasoning, then ask: _"This branch has N commits. No landing policy is defined
  in AGENTS.md, so here are the options: [Strategy A/B], with [costs]. I'd lean
  toward [X] because [reason] — which do you want, or should we define a policy
  first?"_

### Step 8.5: Verify the Squashed Result

Skip this step if the landing policy called for preserving history untouched —
nothing was squashed. Otherwise, after squashing (either strategy), do a quick
sanity check:

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
- Before squashing commits (confirm landing policy found or absent, strategy A
  vs B, and commit message)
- Before merging to the base branch

## Important Constraints

- **Default is local** — Only push to remote if user selects Option 2 (PR)
- **Fast-forward only** — Never create merge commits when merging locally
- **Landing policy is project-owned** — Check `AGENTS.md`/`CLAUDE.md` for a
  `## Branch Landing Policy` section before choosing squash vs. consolidate vs.
  neither (Step 8). Absent a policy, present the options and their costs rather
  than silently defaulting — some projects have real reasons (SHA-cited docs,
  multiple distinct commit authors/attribution trailers) to forbid squashing
  entirely.
- **Always create session doc** — Even for smooth work

## Common Mistakes

- **Self-reviewing the code** — The single most common failure mode. If you
  catch yourself thinking "I've been reviewing as I worked, this is fine," stop.
  Dispatch a subagent per Step 2. Always. No exceptions.
- **Dispatching a reviewer without verifying it has shell access** — A reviewer
  limited to reading and grepping produces a static read, not a verified review
  — it can't run tests or reproduce a defect. Check the agent's tool list for
  `Bash` before choosing it (Step 2).
- **Asking the subagent to review commit-by-commit** — Give it the net diff
  (`git diff <base>..HEAD`), not the commit history. The commit log is noise;
  the delta is the truth.
- **Assuming a squash strategy without checking for a landing policy** —
  `AGENTS.md`/`CLAUDE.md` may explicitly forbid squashing (SHA-cited docs,
  multiple author/attribution trailers). Check for `## Branch Landing Policy`
  before executing Step 8, and announce it explicitly if none exists.
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
