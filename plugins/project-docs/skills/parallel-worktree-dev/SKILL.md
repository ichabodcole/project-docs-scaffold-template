---
name: parallel-worktree-dev
description: >
  Orchestrate parallel development using git worktrees with lightweight handoffs
  to cloud-managed agents. Use this instead of generic worktree skills when
  working with the project-docs workflow — creates worktrees with
  WORKTREE_TASK.md handoff documents, manages env file copying, and provides a
  structured completion flow (merge → smoke test → remove). Triggers when user
  mentions "worktree", "parallel branches", "set up worktrees", "delegate to
  agents", "hand off tasks", or wants to prepare work for cloud agent sessions.
---

# Parallel Worktree Development

Orchestrate parallel development work by creating git worktrees with lightweight
handoff documents. Cloud agents manage the full lifecycle: discovery → planning
→ implementation.

## When to Use

Activate when:

- User wants to set up parallel development across multiple features
- User mentions "worktree", "parallel branches", or "multiple features at once"
- User asks to "delegate work to agents" or "hand off tasks"
- A proposal or investigation exists that's ready for implementation
- User wants to prepare work for cloud agent sessions

**Key indicators:**

- "Set up worktrees for these features"
- "Create branches for parallel development"
- "Kick off this proposal in a worktree"
- "I want to work on X, Y, and Z at the same time"

## Core Concepts

### The Workflow

```
Main Repo                          Worktree (Cloud Agent)
─────────────────────────────────  ────────────────────────────────
Proposal/Investigation exists
         ↓
   Create Worktree
         ↓
   Write WORKTREE_TASK.md
   (lightweight - links to proposal)
         ↓
   Delegate to Cloud Agent ──────→ Read WORKTREE_TASK.md
                                           ↓
                                   Run dev-discovery
                                           ↓
                                   Run dev-plan-generator
                                           ↓
                                   Implement
                                           ↓
                                   Commit & notify
```

### Why This Pattern?

- **Don't block main repo** - Planning happens in the worktree, not main
- **Parallel work** - Multiple cloud agents work simultaneously
- **Self-contained** - Each worktree manages its own lifecycle
- **Clean handoffs** - Lightweight task doc, agent figures out the rest
- **Resumable** - If context is lost, WORKTREE_TASK.md + proposal provides
  briefing

### What Goes Where

| Artifact            | Location                       | Created By                  |
| ------------------- | ------------------------------ | --------------------------- |
| Project folder      | `docs/projects/<name>/`        | Main repo (before worktree) |
| Investigation       | `docs/investigations/`         | Main repo (before worktree) |
| WORKTREE_TASK.md    | Worktree root                  | Main repo (during setup)    |
| Discovery artifacts | `.artifacts/<branch>/`         | Cloud agent (in worktree)   |
| Development plan    | `docs/projects/<name>/plan.md` | Cloud agent (in worktree)   |
| Implementation      | Various                        | Cloud agent (in worktree)   |

## Quick Start

### Creating a Single Worktree

```bash
# 1. Create worktree (template is auto-generated)
scripts/create-worktree.sh feature my-feature

# 2. Edit WORKTREE_TASK.md with lightweight handoff:
# - Mission statement
# - Link to proposal/investigation (NOT a full plan)
# - Any key constraints or decisions
```

### Creating Multiple Parallel Worktrees

```bash
# Create worktrees for each feature
scripts/create-worktree.sh feature feature-a
scripts/create-worktree.sh feature feature-b
scripts/create-worktree.sh feature feature-c

# Each gets a lightweight WORKTREE_TASK.md pointing to its proposal
```

## Orchestration Workflow

### Step 1: Ensure Proposal/Investigation Exists

Before creating a worktree, you need:

- A **project folder** (`docs/projects/<name>/proposal.md`) - What to build and
  why
- OR an **investigation** (`docs/investigations/`) - Research that's ready for
  implementation

**Don't need a development plan yet** - the cloud agent will create that.

### Step 2: Identify Parallelizable Work

Look for proposals/investigations that:

- Have no dependencies on each other
- Touch different parts of the codebase
- Can be verified independently

**Good candidates for parallel work:**

- Features in different packages (`packages/shared/` vs `apps/desktop/`)
- Independent bug fixes
- Unrelated feature proposals

**Poor candidates (do sequentially):**

- Feature B depends on Feature A's types
- Both features modify the same files heavily

### Step 3: Create Worktrees

For each piece of parallel work:

```bash
scripts/create-worktree.sh <type> <name>
```

Types: `feature`, `fix`, `refactor`, `chore`, `docs`

### Step 4: Write Lightweight Handoffs

For each worktree, edit `WORKTREE_TASK.md` with:

**Required sections:**

1. **Mission** - What to build (2-4 sentences)
2. **Source Document** - Link to proposal or investigation
3. **Constraints** - Any decisions already made, things to avoid

**The cloud agent handles:**

- Running dev-discovery
- Creating the development plan
- Implementation
- Testing

Keep the handoff lightweight - just enough for the agent to know what to build
and where to find context.

### Step 5: Delegate to Cloud Agents

Each cloud agent:

1. Opens in the worktree directory
2. Reads WORKTREE_TASK.md
3. Installs dependencies
4. **Runs dev-discovery** to understand the codebase
5. **Creates development plan** in the project folder
   (`docs/projects/<name>/plan.md`)
6. Implements according to the plan
7. Commits and notifies when complete

## Example: Setting Up Three Parallel Features

```bash
# User has three proposals ready for implementation

# 1. Create worktrees
scripts/create-worktree.sh feature milkdown-editor
scripts/create-worktree.sh feature media-file-types
scripts/create-worktree.sh feature document-linking

# 2. Verify worktrees exist
git worktree list

# 3. Edit each WORKTREE_TASK.md with lightweight handoffs
# (See examples below)
```

### Example WORKTREE_TASK.md Content (Lightweight)

```markdown
# Worktree Task: Milkdown Editor Integration

**Branch:** `feature/milkdown-editor` **Created:** 2026-02-04

---

## Your Mission

Replace the current textarea-based editor in the desktop app with Milkdown, a
ProseMirror-based markdown editor. This is a technical spike to validate the
approach.

## Source Documents

**Proposal:**
[Milkdown Editor Integration Spike](docs/projects/milkdown-editor/proposal.md)

**Related Investigation:**
[Rich Text Editor Library Investigation](docs/investigations/2026-02-04-rich-text-editor-library-investigation.md)

## Constraints

- Focus on desktop only (mobile is separate effort)
- Must validate: basic editing, find/replace, markdown round-trip
- Use Crepe for batteries-included setup:
  https://milkdown.dev/docs/recipes/vue#using-crepe

## Your Workflow

1. Install dependencies
2. Run `/dev-discovery` to understand the current editor implementation
3. Create a development plan in the project folder
4. Implement according to the plan
5. Document findings in the proposal (update "Findings" section)
```

### Key Differences from Old Approach

| Old Approach                      | New Approach                         |
| --------------------------------- | ------------------------------------ |
| Plan created in main repo         | Plan created in worktree by agent    |
| Detailed WORKTREE_TASK.md         | Lightweight - links to proposal      |
| Agent follows plan                | Agent discovers → plans → implements |
| Main repo blocked during planning | Main repo free immediately           |

## Managing Active Worktrees

### List All Worktrees

```bash
git worktree list
```

### Check Worktree Status

```bash
# From main repo, check all worktree branches
for wt in $(git worktree list --porcelain | grep "^worktree" | cut -d' ' -f2); do
  echo "=== $wt ==="
  git -C "$wt" status -s
done
```

### Sync Environment Files

If `.env` files change in the main repo:

```bash
scripts/copy-env-to-worktree.sh .worktrees/feature/my-feature
```

### Completing and Merging Worktree Work

When a worktree's work is complete:

1. **Identify the target branch** — check the "Based on" field in
   WORKTREE_TASK.md. If missing, use `git reflog show <branch> | tail -1` to see
   what the branch was created from.

2. **Merge into the target branch**

   ```bash
   # From main repo
   git checkout develop  # or whatever the base branch is
   git merge feature/my-feature --no-ff
   ```

3. **Smoke test before removing the worktree** — switch to the target branch and
   verify the merged work is actually present. Check that key features work, new
   files exist, and nothing was lost in the merge.

   ```bash
   # Verify key files exist
   ls docs/projects/<name>/plan.md
   # Run the app, check the feature, etc.
   ```

4. **Only then remove the worktree** — if something is missing, the worktree
   still has the full working state and git history for recovery

   ```bash
   git worktree remove .worktrees/feature/my-feature
   git branch -d feature/my-feature  # If merged
   ```

**Why this order matters:** Once a worktree is removed, its working directory is
gone. If the merge was incomplete or something was missed, the worktree is your
audit trail and recovery path. Deleting it prematurely means lost work with no
way to inspect what happened.

## Coordination Between Parallel Work

### When Features Need to Share Types

If Feature B needs types from Feature A:

1. Complete Feature A's shared types first
2. Merge Feature A to develop
3. Rebase Feature B onto develop
4. Continue Feature B with the new types

### Avoiding Merge Conflicts

- Coordinate which files each feature modifies
- Use barrel exports (`index.ts`) to reduce conflicts
- Communicate shared interfaces early

### Status Tracking

Track parallel work progress:

```markdown
## Active Worktrees

| Feature   | Branch                           | Status      | Agent   |
| --------- | -------------------------------- | ----------- | ------- |
| Pipelines | feature/pipelines                | In Progress | Agent 1 |
| Formatter | feature/markdown-formatter       | In Progress | Agent 2 |
| XML Tags  | feature/ai-instruction-structure | Complete    | Agent 3 |
```

## Reference Documents

**Playbooks:**

- [Worktree Usage Playbook](docs/playbooks/worktree-usage-playbook.md) - Git
  worktree mechanics
- [Agent Task Handoff Playbook](docs/playbooks/agent-task-handoff-playbook.md) -
  Writing effective handoffs

**Bundled Scripts** (relative to this skill):

- `scripts/create-worktree.sh` - Creates worktree with env file copying and task
  template
- `scripts/copy-env-to-worktree.sh` - Auto-discovers and copies gitignored
  `.env` files to a worktree
- `scripts/templates/WORKTREE_TASK.template.md` - Handoff document template

## Troubleshooting

### Agent Reports "Missing Plan"

- Verify the plan path in WORKTREE_TASK.md is correct
- Plans live in the project folder: `docs/projects/<name>/plan.md`

### Agent Makes Wrong Architectural Decisions

- Key decisions weren't documented in WORKTREE_TASK.md
- Add explicit "don't do X" notes in the Notes section

### Worktree Branch Already Exists

- Can't create a worktree for an existing branch that's checked out elsewhere
- Use a different branch name, or remove the existing worktree first

### Merge Conflicts When Integrating

- Features modified same files
- Resolve in the later branch, or coordinate file ownership upfront

## Checklist: Parallel Development Setup

- [ ] Proposal or investigation exists for each feature
- [ ] Identify features that can run in parallel (no dependencies)
- [ ] Create worktree for each feature
- [ ] Edit WORKTREE_TASK.md with mission, source doc link, and constraints
- [ ] Verify proposal/investigation links are valid
- [ ] Delegate to cloud agents (they will install deps, run discovery, plan)
- [ ] Document which agent/session is working on which worktree
- [ ] Plan merge order based on dependencies
- [ ] After completion: merge worktree branch into target branch
- [ ] Smoke test merged work on target branch before removing worktree
- [ ] Remove worktree only after confirming work is present

## Cloud Agent Responsibilities

When a cloud agent starts in a worktree, it should:

1. **Confirm you're in a worktree** — Check for `WORKTREE_TASK.md` in the
   current directory
2. **Read WORKTREE_TASK.md** — Understand mission and constraints
3. **Acknowledge the mission** — Summarize what you'll be building in 1-2
   sentences before proceeding
4. **Read source documents** — Proposal and/or investigation linked in the task
5. **Install dependencies** — Set up the project environment
6. **Run `/dev-discovery`** — Understand affected codebase areas
7. **Create development plan** — In the project folder as `plan.md`
8. **Implement** — Follow the plan it created
9. **Test** — Run the project's test/verification commands
10. **Commit** — With clear commit messages
11. **Notify** — Update WORKTREE_TASK.md with completion status

**Important:** Stay focused on the scope defined in the task document. If you
discover work that's out of scope, note it in the WORKTREE_TASK.md Notes section
but don't pursue it.
