---
name: "finalize-branch"
description: >
  Code review, documentation, and merge workflow for completed branches. Use
  this instead of generic branch-completion skills — performs code review, runs
  quality checks (format, lint, types, test), creates session documentation in
  docs/projects/, writes memory docs, checks test plan results, squash-merges to
  develop. Triggers when user says "finalize branch", "merge to develop",
  "finish this branch", "ready to merge", "wrap up this work", or wants to
  complete feature work with documentation and code review.
allowed_tools:
  ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "Task", "AskUserQuestion"]
---

# Finalize Branch

Code review, documentation, and merge workflow for completed branches.

**Playbook reference:** Follow the workflow in
[docs/playbooks/branch-finalization-playbook.md](../../docs/playbooks/branch-finalization-playbook.md)

## Workflow

### Step 1: Understand Branch Scope

Review commits, files changed, and overall accomplishment.

```bash
git log develop..HEAD --oneline
git diff --stat develop
```

### Step 2: Code Review

- Review all commits and check new/modified files against existing patterns
- Use Grep/Glob to find similar implementations for comparison
- Read files to understand established patterns before judging new code
- Use Task tool with Explore agent for broader codebase understanding if needed

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

### Step 8: Squash Commits

```bash
git reset --soft develop
git commit -m "<single descriptive commit message>"
```

### Step 9: Present Completion Options

After documentation and squash are done, present these options:

```
Ready to integrate. What would you like to do?

1. Merge to develop (default)
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work
```

**Option 1: Merge to develop** (default workflow)

```bash
git checkout develop
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
git checkout develop
git branch -D <branch>
# Remove worktree if applicable
```

### Step 10: Cleanup

Delete branch and remove worktree if applicable (Options 1 and 4 only).

## User Checkpoints

Ask for user confirmation at these points:

- After code review findings (before proceeding)
- Before creating additional documentation (beyond session)
- Before squashing commits (review commit message)
- Before merging to develop

## Important Constraints

- **Default is local** — Only push to remote if user selects Option 2 (PR)
- **Fast-forward only** — Never create merge commits when merging locally
- **Squash before merge** — One clean commit per branch on develop
- **Always create session doc** — Even for smooth work

## Common Mistakes

- **Skipping test verification** — Never proceed to merge/PR with failing tests.
  Quality checks (step 3) are a hard gate, not a suggestion.
- **Open-ended questions** — Don't ask "What should I do next?" Present the
  structured completion options instead.
- **Premature worktree cleanup** — Only remove worktrees for Options 1 and 4.
  Options 2 and 3 need the worktree preserved.
- **No confirmation for discard** — Always list what will be lost and get
  explicit confirmation before deleting branches.
- **Merging without verifying the result** — After merging to develop, verify
  tests pass on the merged result before deleting the branch.

## Output

At completion, summarize:

- Branch finalized
- Code review findings and resolutions
- Quality check results
- Documentation created/updated
- Final commit message
- Any follow-up items
