# dev-kickoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Replace `parallel-worktree-dev` with a unified `dev-kickoff` skill and
`start-dev-kickoff` command that orchestrate the full proposal-to-implementation
process for both worktree and main-repo strategies.

**Architecture:** New `dev-kickoff` skill with two-path branching
(worktree/main-repo), a unified `DEV_KICKOFF.md` handoff document replacing
`WORKTREE_TASK.md`, and a `start-dev-kickoff` command replacing
`start-worktree`. Scripts move from `parallel-worktree-dev/scripts/` to
`dev-kickoff/scripts/` with `create-worktree.sh` updated to generate
`DEV_KICKOFF.md` from the new template.

**Tech Stack:** Markdown skill/command files, bash scripts, plugin.json
versioning, `npm run build:dist` for dist rebuild.

**Reference:** `docs/projects/dev-kickoff/proposal.md` — full design including
file table, template structure, and two-path workflow detail.

---

### Task 1: Create dev-kickoff skill directory and SKILL.md

**Files:**

- Create: `plugins/project-docs/skills/dev-kickoff/SKILL.md`

**Step 1: Create directories**

```bash
mkdir -p plugins/project-docs/skills/dev-kickoff/templates
mkdir -p plugins/project-docs/skills/dev-kickoff/scripts
```

**Step 2: Write SKILL.md**

Write `plugins/project-docs/skills/dev-kickoff/SKILL.md` with the following
content:

````markdown
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
   > and run `/start-dev-kickoff` to begin."

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
   > session with `/start-dev-kickoff`?"
   - **Continue** → proceed to Step 4
   - **Fresh window** → done. Tell user: "Open a new session and run
     `/start-dev-kickoff` to begin."

### Step 4: Discovery and Planning (if continuing in same session)

**4a. Run dev-discovery** — use the `dev-discovery` skill to explore affected
codebase areas and write a discovery artifact to
`docs/projects/<name>/artifacts/`.

**4b. Run generate-dev-plan** — use the `generate-dev-plan` skill to create
`docs/projects/<name>/plan.md`.

**4c. Have user review the plan** — wait for approval before proceeding.

**4d. Assess test plan** — if the feature is complex (multiple systems, 3+
phases, complex state transitions), ask whether to run `generate-test-plan`.
When in doubt, ask the user.

**4e. Begin implementation** — proceed with the plan.

## DEV_KICKOFF.md Template Reference

The template lives at:
`plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`

The `create-worktree.sh` script auto-generates a filled version for worktrees.
For the main-repo path, generate it using the template as a base.

## Scripts

- **`scripts/create-worktree.sh`** — Creates a git worktree, copies `.env`
  files, and generates `DEV_KICKOFF.md` in the worktree root from the template.
  Usage: `bash scripts/create-worktree.sh <type> <name>`
- **`scripts/copy-env-to-worktree.sh`** — Auto-discovers and copies gitignored
  `.env` files from the main repo to a worktree. Called automatically by
  `create-worktree.sh`.

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

- [Worktree Usage Playbook](docs/playbooks/worktree-usage-playbook.md)
- [Agent Task Handoff Playbook](docs/playbooks/agent-task-handoff-playbook.md)
````

**Step 3: Commit**

```bash
git add plugins/project-docs/skills/dev-kickoff/SKILL.md
git commit -m "feat: create dev-kickoff SKILL.md"
```

---

### Task 2: Create DEV_KICKOFF.template.md

**Files:**

- Create:
  `plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`

**Step 1: Write the template**

The `{{BRANCH}}` and `{{DATE}}` tokens are replaced by `create-worktree.sh` at
creation time. The `{{BASE_BRANCH}}` token from the old template is removed
(worktree-specific, not needed). The completion section is filled in by whoever
creates the doc (script for worktree, agent for main-repo).

Write the file:

```markdown
# Dev Kickoff: [Project Name]

**Branch:** `{{BRANCH}}`\
**Created:** {{DATE}}\
**Strategy:** [Worktree | Main repo]

---

## Mission

[2-4 sentences describing what to build and why. Pre-fill from proposal — do not
leave this as a placeholder.]

## Source Documents

**Project:**

- [Proposal](docs/projects/<project-name>/proposal.md)
- [Design Resolution](docs/projects/<project-name>/design-resolution.md) (if
  applicable)
- [Plan](docs/projects/<project-name>/plan.md) (created during kickoff)
- [Test Plan](docs/projects/<project-name>/test-plan.md) (if applicable)

**Background context:**

- [Project Manifesto](docs/PROJECT_MANIFESTO.md) - Design principles

## Constraints

[Any decisions already made, patterns to follow, things to avoid]

- [Constraint 1]
- [Constraint 2]

## Your Workflow

1. Read the project documents linked above
2. Install dependencies
3. Use the `dev-discovery` skill to understand the relevant codebase areas
4. Create a development plan in the project folder using the `generate-dev-plan`
   skill
5. Have the user review the development plan and provide feedback
6. Assess whether a test plan is needed — if the feature is complex (multiple
   systems, complex state, 3+ phases), use the `generate-test-plan` skill; if
   simple, testing strategy in the plan itself is sufficient
7. Implement according to the plan using your best judgement on how to execute
   efficiently (parallel sub-agents, agent team, etc.)
8. Test and verify
9. Commit with clear messages
10. Update the Completion Status checklist below

## Completion Status

- [ ] Discovery complete
- [ ] Plan created and reviewed
- [ ] Test plan created (if applicable)
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Ready for merge

## Completion

[Fill in the appropriate version when creating this document:]

**Worktree strategy:** When implementation is complete and all tests pass:

1. Run `/project-docs:finalize-branch` to perform code review, create a session
   document, and prepare the branch for merge
2. Do NOT merge or remove the worktree — the orchestrator handles integration

**Main-repo strategy:** When implementation is complete and all tests pass:

1. Run `/project-docs:finalize-branch` to perform code review, create a session
   document, and prepare the branch for merge
2. Finalize-branch will present merge options — proceed with the appropriate
   option

## Notes

[Any additional context, warnings, or tips]
```

**Step 2: Commit**

```bash
git add plugins/project-docs/skills/dev-kickoff/templates/
git commit -m "feat: add DEV_KICKOFF.template.md"
```

---

### Task 3: Move and update create-worktree.sh

**Files:**

- Read:
  `plugins/project-docs/skills/parallel-worktree-dev/scripts/create-worktree.sh`
- Create: `plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh`

The script has four locations that reference the old names (lines 103–119):

- Line 105: `TASK_FILE="$WORKTREE_PATH/WORKTREE_TASK.md"`
- Line 106: `TEMPLATE_FILE="$SCRIPT_DIR/templates/WORKTREE_TASK.template.md"`
- Line 112: error message references `parallel-worktree-dev`
- Line 119: echo references `WORKTREE_TASK.md`
- Line 137–138: next-steps echo references `WORKTREE_TASK.md`

The template path also changes: template moves from
`scripts/templates/WORKTREE_TASK.template.md` to
`templates/DEV_KICKOFF.template.md` (one level up from scripts). The script
needs to reference `$(dirname "$SCRIPT_DIR")/templates/DEV_KICKOFF.template.md`.

The `sed` substitution on line 116 removes the `{{BASE_BRANCH}}` substitution
since `DEV_KICKOFF.template.md` no longer has that token.

**Step 1: Copy the script**

```bash
cp plugins/project-docs/skills/parallel-worktree-dev/scripts/create-worktree.sh \
   plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh
chmod +x plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh
```

**Step 2: Update the script**

Make these targeted edits to
`plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh`:

**Change line 105** — output filename:

```bash
# Before:
TASK_FILE="$WORKTREE_PATH/WORKTREE_TASK.md"

# After:
TASK_FILE="$WORKTREE_PATH/DEV_KICKOFF.md"
```

**Change line 106** — template path (moves up one directory from scripts/):

```bash
# Before:
TEMPLATE_FILE="$SCRIPT_DIR/templates/WORKTREE_TASK.template.md"

# After:
TEMPLATE_FILE="$(dirname "$SCRIPT_DIR")/templates/DEV_KICKOFF.template.md"
```

**Change line 112** — error message:

```bash
# Before:
echo -e "${RED}This indicates an installation problem with the parallel-worktree-dev skill.${NC}"

# After:
echo -e "${RED}This indicates an installation problem with the dev-kickoff skill.${NC}"
```

**Change line 116** — sed substitution (remove `{{BASE_BRANCH}}` line, keep
`{{BRANCH}}` and `{{DATE}}`):

```bash
# Before:
sed -e "s|{{BRANCH}}|$FULL_BRANCH|g" \
    -e "s|{{BASE_BRANCH}}|$BASE_BRANCH|g" \
    -e "s|{{DATE}}|$TODAY|g" \
    "$TEMPLATE_FILE" > "$TASK_FILE"

# After:
sed -e "s|{{BRANCH}}|$FULL_BRANCH|g" \
    -e "s|{{DATE}}|$TODAY|g" \
    "$TEMPLATE_FILE" > "$TASK_FILE"
```

**Change line 119** — success echo:

```bash
# Before:
echo -e "${GREEN}  Created WORKTREE_TASK.md from template${NC}"

# After:
echo -e "${GREEN}  Created DEV_KICKOFF.md from template${NC}"
```

**Change line 120** — instruction echo:

```bash
# Before:
echo -e "${YELLOW}  Edit this file to provide task context for agent handoff${NC}"

# After:
echo -e "${YELLOW}  Edit DEV_KICKOFF.md to fill in mission and constraints${NC}"
```

**Change lines 137–138** — next steps echo:

```bash
# Before:
echo "  2. Edit WORKTREE_TASK.md with task details (for agent handoff)"

# After:
echo "  2. Edit DEV_KICKOFF.md with mission and constraints"
```

**Step 3: Verify no remaining old references**

```bash
grep -n "WORKTREE_TASK\|parallel-worktree-dev" \
  plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh
```

Expected: no output.

**Step 4: Commit**

```bash
git add plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh
git commit -m "feat: move and update create-worktree.sh for dev-kickoff"
```

---

### Task 4: Move copy-env-to-worktree.sh

**Files:**

- Create:
  `plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh`

**Step 1: Copy the script**

```bash
cp plugins/project-docs/skills/parallel-worktree-dev/scripts/copy-env-to-worktree.sh \
   plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh
chmod +x plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh
```

**Step 2: Check for any old references**

```bash
grep -n "parallel-worktree-dev\|WORKTREE_TASK" \
  plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh
```

Expected: no output. If any found, update them.

**Step 3: Commit**

```bash
git add plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh
git commit -m "feat: move copy-env-to-worktree.sh to dev-kickoff"
```

---

### Task 5: Create start-dev-kickoff command

**Files:**

- Create: `plugins/project-docs/commands/start-dev-kickoff.md`

**Step 1: Write the command**

````markdown
---
description:
  "Start development work from a DEV_KICKOFF.md file. Use when opening a fresh
  session to begin or resume implementation — finds DEV_KICKOFF.md, reads the
  mission, and follows the workflow defined in the document."
allowed_tools:
  ["Read", "Glob", "Bash", "AskUserQuestion", "Task", "Write", "Edit", "Grep"]
---

You are starting a development session from a DEV_KICKOFF.md handoff document.

## Step 1: Find DEV_KICKOFF.md

Check in order:

1. **Repo root / worktree root** — look for `DEV_KICKOFF.md` in the current
   directory

   ```bash
   ls DEV_KICKOFF.md 2>/dev/null
   ```

2. **Project folders** — scan for any project-level kickoff docs

   ```bash
   find docs/projects -name "DEV_KICKOFF.md" 2>/dev/null
   ```

If multiple files are found, ask: "I found DEV_KICKOFF.md in multiple projects.
Which one should I start?"

If none found, tell the user: "No DEV_KICKOFF.md found. Run
`/project-docs:dev-kickoff` to create one first."

## Step 2: Read and Acknowledge

Read the `DEV_KICKOFF.md`. Summarize the mission in 1-2 sentences so the user
knows you've understood the task before proceeding.

## Step 3: Read Source Documents

Read all documents listed in the Source Documents section that currently exist:

- Proposal (always read — required)
- Design resolution (if present)
- Plan (if already created — skip the planning steps below if so)
- Test plan (if already created)

## Step 4: Install Dependencies

Check the project's standard dependency installation method and run it (e.g.,
`npm install`, `pnpm install`, `bun install`). If unclear, check `package.json`,
`bun.lockb`, or similar.

## Step 5: Follow the Workflow Section

Execute the steps in the Workflow section of DEV_KICKOFF.md in order. Standard
steps:

1. Use the `dev-discovery` skill to understand relevant codebase areas
2. Use the `generate-dev-plan` skill to create the plan — wait for user review
3. Assess test plan need — use `generate-test-plan` if complex
4. Implement according to the plan
5. Test and verify
6. Commit with clear messages
7. Update the Completion Status checklist in DEV_KICKOFF.md

**Skip any steps already done** — if a plan.md exists, skip discovery and
planning and proceed to implementation.

## Step 6: Follow the Completion Section

When implementation is complete and all tests pass, follow the completion
instructions in DEV_KICKOFF.md:

- **Worktree strategy**: Run `/project-docs:finalize-branch`, then do NOT merge
  — notify the orchestrator
- **Main-repo strategy**: Run `/project-docs:finalize-branch`, then proceed with
  the merge options it presents
````

**Step 2: Commit**

```bash
git add plugins/project-docs/commands/start-dev-kickoff.md
git commit -m "feat: add start-dev-kickoff command"
```

---

### Task 6: Update references in active docs

The following docs reference old names and should be updated. Historical session
docs, proposals, and plans from past projects should NOT be updated — they are
permanent records.

**Files to update (active docs only):**

- `docs/PROJECT_MANIFESTO.md` — one conceptual reference to `WORKTREE_TASK.md`
- `docs/memories/2026-02-14-generalize-worktree-scripts.md` — references script
  paths that have moved
- `docs/backlog/2026-03-01-explore-agent-orchestration-patterns.md` — this
  backlog item is likely resolved by this work; archive it

**Step 1: Find all references to update**

```bash
grep -rn "WORKTREE_TASK\|start-worktree\|parallel-worktree-dev" docs/ \
  --include="*.md" \
  | grep -v "projects/.*/sessions/\|projects/.*/plan\.\|projects/.*/proposal\.\|projects/.*/design-resolution\.\|projects/.*/artifacts/"
```

This excludes historical project documents (sessions, plans, proposals,
design-resolutions, artifacts).

**Step 2: Update PROJECT_MANIFESTO.md**

Find the `WORKTREE_TASK.md` reference (around line 192):

```bash
grep -n "WORKTREE_TASK" docs/PROJECT_MANIFESTO.md
```

Update it to reference `DEV_KICKOFF.md`.

**Step 3: Update memories file**

In `docs/memories/2026-02-14-generalize-worktree-scripts.md`, update script
paths from `parallel-worktree-dev/scripts/` to `dev-kickoff/scripts/`.

**Step 4: Archive the backlog item**

The backlog item at
`docs/backlog/2026-03-01-explore-agent-orchestration-patterns.md` was tracking
the gap that `dev-kickoff` now resolves. Move it to archive:

```bash
git mv docs/backlog/2026-03-01-explore-agent-orchestration-patterns.md \
       docs/backlog/_archive/2026-03-01-explore-agent-orchestration-patterns.md
```

Update its status frontmatter if it has one.

**Step 5: Commit**

```bash
git add docs/
git commit -m "docs: update manifesto, memory, archive resolved backlog item"
```

---

### Task 7: Retire parallel-worktree-dev and start-worktree

**Files:**

- Delete: `plugins/project-docs/skills/parallel-worktree-dev/` (entire
  directory)
- Delete: `plugins/project-docs/commands/start-worktree.md`

**Step 1: Remove parallel-worktree-dev**

```bash
git rm -r plugins/project-docs/skills/parallel-worktree-dev/
```

**Step 2: Remove start-worktree command**

```bash
git rm plugins/project-docs/commands/start-worktree.md
```

**Step 3: Verify no remaining live references**

```bash
grep -rn "parallel-worktree-dev\|start-worktree\|WORKTREE_TASK" \
  plugins/ docs/ \
  --include="*.md" --include="*.json" --include="*.yml" --include="*.sh" \
  | grep -v "projects/.*/sessions/\|projects/.*/plan\.\|projects/.*/proposal\.\|projects/.*/design-resolution\.\|projects/.*/artifacts/\|_archive/"
```

Expected: no output (only historical project docs remain, which are fine to
leave).

**Step 4: Commit**

```bash
git commit -m "feat: retire parallel-worktree-dev and start-worktree"
```

---

### Task 8: Update plugin metadata

**Files:**

- Modify: `plugins/project-docs/.claude-plugin/plugin.json`
- Modify: `plugins/project-docs/README.md`

**Step 1: Read current state**

```bash
cat plugins/project-docs/.claude-plugin/plugin.json
grep -n "parallel-worktree\|start-worktree\|version" plugins/project-docs/README.md | head -20
```

**Step 2: Bump version in plugin.json**

Increment the patch version (current is 1.10.1 → bump to 1.10.2).

**Step 3: Update README.md**

In `plugins/project-docs/README.md`:

- In the Skills table: replace `parallel-worktree-dev` row with `dev-kickoff`
  row
- In the Commands table: replace `start-worktree` row with `start-dev-kickoff`
  row
- Add version history entry for 1.10.2:
  ```
  **1.10.2** — Replace `parallel-worktree-dev` and `start-worktree` with unified
  `dev-kickoff` skill and `start-dev-kickoff` command. Introduces `DEV_KICKOFF.md`
  replacing `WORKTREE_TASK.md`.
  ```

**Step 4: Commit**

```bash
git add plugins/project-docs/.claude-plugin/plugin.json plugins/project-docs/README.md
git commit -m "chore: bump plugin version to 1.10.2, update README for dev-kickoff"
```

---

### Task 9: Update PROJECT_MANIFESTO.md skill counts

**Files:**

- Modify: `docs/PROJECT_MANIFESTO.md`

**Step 1: Verify counts**

```bash
# Skills
ls plugins/project-docs/skills/ | wc -l

# Commands
ls plugins/project-docs/commands/ | grep -c '\.md$'
```

Net change: +1 skill (dev-kickoff), -1 skill (parallel-worktree-dev) = same
count. +1 command (start-dev-kickoff), -1 command (start-worktree) = same count.

**Step 2: Update manifesto**

Check if the manifesto mentions skill/command counts and verify they still
match:

```bash
grep -n "skill\|command\|agent" docs/PROJECT_MANIFESTO.md | grep -i "count\|[0-9]"
```

Update any counts if they changed. Also update any prose references to
`parallel-worktree-dev` or `start-worktree` that aren't in historical sections.

**Step 3: Commit**

```bash
git add docs/PROJECT_MANIFESTO.md
git commit -m "docs: update manifesto for dev-kickoff"
```

---

### Task 10: Rebuild dist and verify

**Files:**

- Rebuild: `dist/`

**Step 1: Run build**

```bash
npm run build:dist
```

Expected output: all skills valid, 0 errors. The build runs
`validate-skills-dist.py` automatically.

**Step 2: Verify dev-kickoff is in dist**

```bash
ls dist/project-docs/skills/dev-kickoff/
ls dist/project-docs/commands/start-dev-kickoff.md
```

**Step 3: Verify parallel-worktree-dev is gone from dist**

```bash
ls dist/project-docs/skills/parallel-worktree-dev/ 2>/dev/null \
  && echo "STILL EXISTS — problem" \
  || echo "Gone — correct"
```

**Step 4: Run format check**

```bash
npm run format:check
```

If formatting issues: `npx prettier --write` on affected files, re-stage.

**Step 5: Commit dist**

```bash
git add dist/
git commit -m "chore: rebuild dist for dev-kickoff (v1.10.2)"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] `plugins/project-docs/skills/dev-kickoff/SKILL.md` exists
- [ ] `plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`
      exists
- [ ] `plugins/project-docs/skills/dev-kickoff/scripts/create-worktree.sh`
      exists and references DEV_KICKOFF
- [ ] `plugins/project-docs/skills/dev-kickoff/scripts/copy-env-to-worktree.sh`
      exists
- [ ] `plugins/project-docs/commands/start-dev-kickoff.md` exists
- [ ] `plugins/project-docs/skills/parallel-worktree-dev/` is gone
- [ ] `plugins/project-docs/commands/start-worktree.md` is gone
- [ ] No live references to `parallel-worktree-dev`, `start-worktree`, or
      `WORKTREE_TASK` in active docs
- [ ] Plugin version bumped to 1.10.2
- [ ] dist/ rebuilt with 0 errors
- [ ] `npm run format:check` passes
