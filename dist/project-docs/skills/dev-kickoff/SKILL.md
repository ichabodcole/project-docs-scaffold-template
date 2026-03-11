---
name: dev-kickoff
description: >
  Orchestrate the full proposal-to-implementation process, either via a git
  worktree (isolated branch) or directly in the main repo. Use when the user has
  a finalized proposal and is ready to begin development — creates a branch or
  worktree, writes a DEV_KICKOFF.md handoff document, optionally runs
  dev-discovery and generates the development plan. Triggers when user says
  "kick off dev", "start implementation", "ready to implement", "let's build
  this", or references a proposal that needs implementation. Replaces
  parallel-worktree-dev.
---

# Dev Kickoff

Orchestrate development startup from a finalized proposal. Handles both worktree
and main-repo strategies — creates the branch or worktree, writes a
DEV_KICKOFF.md handoff document, and optionally runs discovery and planning.

## When to Use

Activate when:

- User has a finalized `proposal.md` in `docs/projects/<name>/`
- User says "kick off dev", "start implementation", "let's implement this",
  "ready to implement"
- A proposal is approved and needs a branch, kickoff doc, and discovery/planning

**Key indicators:**

- "Let's kick off development on X"
- "Ready to start implementing the proposal"
- "Create a worktree for this proposal"
- "Start a branch for this feature"

## Workflow

### Step 1: Locate the Proposal

Identify the project:

- Infer from current context (recent discussion, project folder open)
- Or ask: "Which project proposal are we kicking off?"

Read:

- `docs/projects/<name>/proposal.md` (required)
- `docs/projects/<name>/design-resolution.md` (if it exists)

### Step 2: Choose Strategy

Ask the user:

> "Do you want to work in a **worktree** (isolated copy of the repo, good for
> keeping main clean or parallel work) or directly in the **main repo**
> (simpler, same codebase, same or fresh session)?"

### Step 3A: Worktree Path

1. **Determine branch name** — derive from proposal title or ask user
   - Format: `feature/<hyphenated-name>` (or fix/refactor/chore as appropriate)

2. **Create the worktree** using the bundled script:

   ```bash
   bash plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh <type> <name>
   ```

   The script creates the worktree, copies `.env` files, and generates
   `DEV_KICKOFF.md` in the worktree root from the template.

3. **Edit DEV_KICKOFF.md in the worktree root** — fill in:
   - **Mission** — 2-4 sentences summarizing the proposal (pre-fill from
     proposal; do not leave as placeholder)
   - **Source Documents** — verify proposal link, add design-resolution if
     present
   - **Constraints** — any decisions already made, patterns to follow, things to
     avoid
   - **Strategy** — set to `Worktree`
   - **Completion** — leave as "do not merge" version (already in template)

4. **Done** — tell the user:
   > "Worktree created at `.worktrees/<type>/<name>`. Open a new session there
   > and run `/project-docs:start-dev-kickoff` to begin."

### Step 3B: Main-Repo Path

1. **Create branch** — follow the init-branch flow:

   ```bash
   git checkout develop
   git pull
   git checkout -b <type>/<name>
   ```

   If there are uncommitted changes on develop, handle them (stash or carry over
   per init-branch conventions).

2. **Write DEV_KICKOFF.md** to `docs/projects/<name>/DEV_KICKOFF.md`:
   - Use
     `plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`
     as the base
   - Pre-fill **Mission** from the proposal summary (2-4 sentences — not a
     placeholder)
   - Set **Strategy** to `Main repo`
   - Link all source documents (proposal, design-resolution if present)
   - Set **Completion** to the main-repo version (run finalize-branch, then
     proceed with merge options)

3. **Commit** the kickoff document:

   ```bash
   git add docs/projects/<name>/DEV_KICKOFF.md
   git commit -m "docs: add dev kickoff for <name>"
   ```

4. **Ask** the user:

   > "Continue here (I'll run discovery and planning now) or open a fresh
   > session with `/project-docs:start-dev-kickoff`?"
   - **Continue** → proceed to Step 4
   - **Fresh window** → done. Tell user: "Open a new session and run
     `/project-docs:start-dev-kickoff` to begin."

### Step 4: Discovery and Planning (if continuing in same session)

**4a. Run dev-discovery** — use the `dev-discovery` skill to explore affected
codebase areas and write a discovery artifact to
`docs/projects/<name>/artifacts/`.

**4b. Assess UI prototyping** — if the proposal describes an admin UI,
dashboard, or complex visual interface, ask the user whether to create HTML
mockup prototypes before planning. Prototypes help resolve layout and
interaction questions that would otherwise be speculative in the plan. Use the
`html-mockup-prototyping` skill if yes. Save prototypes to
`docs/projects/<name>/artifacts/`.

**4c. Run generate-dev-plan** — use the `generate-dev-plan` skill to create
`docs/projects/<name>/plan.md`.

**4d. Have user review the plan** — wait for approval before proceeding.

**4e. Assess test plan** — if the feature is complex (multiple systems, 3+
phases, complex state transitions), ask whether to run `generate-test-plan`.
When in doubt, ask the user.

**4f. Begin implementation** — proceed with the plan.

## DEV_KICKOFF.md Template Reference

The template lives at:
`plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`

The `create-worktree.sh` script auto-generates a filled version for worktrees.
For the main-repo path, generate it using the template as a base.

## Scripts

- **`plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh`** —
  Creates a git worktree, copies `.env` files, and generates `DEV_KICKOFF.md` in
  the worktree root from the template. Usage:
  `bash plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh <type> <name>`
- **`plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh`**
  — Auto-discovers and copies gitignored `.env` files from the main repo to a
  worktree. Called automatically by `create-worktree.sh`.

## Managing Active Worktrees

### List All Worktrees

```bash
git worktree list
```

### Check Worktree Status

```bash
for wt in $(git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2); do
  echo "=== $wt ==="
  git -C "$wt" status -s
done
```

### Sync Environment Files

If `.env` files change in the main repo:

```bash
bash plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh .worktrees/feature/my-feature
```

## Completing and Merging Worktree Work

When a worktree's work is complete:

1. **Run finalize-branch** in the worktree (if not already done by the agent):
   `/project-docs:finalize-branch`

2. **Identify the target branch** — check the `Branch:` field in
   `DEV_KICKOFF.md`. Base is always develop unless specified.

3. **Merge into target branch**

   ```bash
   git checkout develop
   git merge feature/my-feature --no-ff
   ```

4. **Smoke test before removing the worktree** — verify the merged work is
   present. Check key files, run the app.

5. **Only then remove the worktree**

   ```bash
   git worktree remove .worktrees/feature/my-feature
   git branch -d feature/my-feature
   ```

## Reference Documents

- [Playbooks](docs/playbooks/README.md) — General workflow playbooks
