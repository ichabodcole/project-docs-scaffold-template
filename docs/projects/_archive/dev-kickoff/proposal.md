# Proposal: dev-kickoff Skill

**Date:** 2026-03-03 **Status:** Approved

## Problem

The project-docs workflow has a gap between "finalized proposal" and "active
implementation." The `parallel-worktree-dev` skill handles the worktree path,
but there is no equivalent for working in the main repo. More importantly, there
is no single unified entry point that asks "how do you want to kick off
development?" and orchestrates the full process regardless of strategy.

The current state:

- `parallel-worktree-dev` — worktree-only, handles one path
- `dev-discovery`, `generate-dev-plan`, `generate-test-plan` — standalone
  skills, no orchestrator connects them
- `init-branch` — creates a branch, nothing more
- `start-worktree` — cloud agent entry point for worktrees, no main-repo
  equivalent
- No kickoff document for the main-repo path (equivalent to `WORKTREE_TASK.md`)

## Solution

Replace `parallel-worktree-dev` with a single **`dev-kickoff`** skill that
orchestrates the full proposal-to-implementation process for both strategies.
Introduce a unified **`DEV_KICKOFF.md`** handoff document (replacing
`WORKTREE_TASK.md`) and a **`start-dev-kickoff`** command (replacing
`start-worktree`) that works regardless of context.

## Design

### Skill: `dev-kickoff`

**Trigger:** User has a finalized proposal and is ready to begin implementation.
Triggered by "kick off dev", "start implementation", "ready to implement",
"let's build this."

**Entry flow:**

1. Locate and read the proposal (infer from context or ask)
2. Read `design-resolution.md` if present
3. Ask: **worktree strategy** or **main-repo strategy?**
4. Branch into the appropriate path

**Worktree path:**

1. Derive branch name from proposal (ask user if unclear)
2. Run `scripts/create-worktree.sh <type> <name>`
3. Write `DEV_KICKOFF.md` to the worktree root (pre-filled from proposal)
4. Tell user: "Open a new session in `.worktrees/<type>/<name>` and run
   `/start-dev-kickoff`"
5. Done — orchestrator's job is complete

**Main-repo path:**

1. Run `init-branch` flow — checkout develop, pull, create branch
2. Write `DEV_KICKOFF.md` to `docs/projects/<name>/` (co-located with proposal)
3. Commit `DEV_KICKOFF.md` to the branch
4. Ask: "Continue in this session or open a fresh window?"
   - **Continue** → run `dev-discovery` → `generate-dev-plan` → assess
     `generate-test-plan` → implement
   - **Fresh window** → done, tell user to run `/start-dev-kickoff` in a new
     session

### Document: `DEV_KICKOFF.md`

Replaces `WORKTREE_TASK.md`. Used for both strategies. Key differences from the
old template:

- **Mission pre-filled** from the proposal by the skill (not a placeholder)
- **Strategy field** set at write time (`Worktree` or `Main repo`)
- **Completion section** is context-specific: worktree version says "do not
  merge — notify orchestrator"; main-repo version says "run finalize-branch then
  proceed with merge options"
- `Based on:` worktree field removed (was worktree-specific)

Structure:

```
# Dev Kickoff: [Project Name]

**Branch:** `feature/...`
**Created:** YYYY-MM-DD
**Strategy:** Worktree | Main repo

## Mission
## Source Documents
## Constraints
## Your Workflow
## Completion
## Notes
```

### Command: `start-dev-kickoff`

Replaces `start-worktree`. The "fresh session" entry point for both strategies.

1. Find `DEV_KICKOFF.md`:
   - Check repo root (worktree context)
   - If not found, scan `docs/projects/*/DEV_KICKOFF.md` (main-repo context)
   - If multiple found, ask user which project
2. Read the doc — acknowledge mission in 1-2 sentences
3. Read all linked source documents
4. Install dependencies
5. Follow the Workflow section in the doc
6. Follow the Completion section instructions

The command is intentionally thin — the doc drives everything.

### Scripts

Scripts move from `parallel-worktree-dev/scripts/` to `dev-kickoff/scripts/`:

- `create-worktree.sh` — moves with a content update: generates `DEV_KICKOFF.md`
  from `DEV_KICKOFF.template.md` instead of `WORKTREE_TASK.md`
- `copy-env-to-worktree.sh` — moves as-is, pure mechanics

## Files

| Action        | File                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Create        | `plugins/project-docs/skills/dev-kickoff/SKILL.md`                                                      |
| Create        | `plugins/project-docs/skills/dev-kickoff/templates/DEV_KICKOFF.template.md`                             |
| Move + update | `parallel-worktree-dev/scripts/create-worktree.sh` → `dev-kickoff/scripts/create-worktree.sh`           |
| Move          | `parallel-worktree-dev/scripts/copy-env-to-worktree.sh` → `dev-kickoff/scripts/copy-env-to-worktree.sh` |
| Create        | `plugins/project-docs/commands/start-dev-kickoff.md`                                                    |
| Retire        | `plugins/project-docs/skills/parallel-worktree-dev/`                                                    |
| Retire        | `plugins/project-docs/commands/start-worktree.md`                                                       |
| Update        | `plugins/project-docs/.claude-plugin/plugin.json`                                                       |
| Update        | `plugins/project-docs/README.md`                                                                        |
| Update        | `docs/PROJECT_MANIFESTO.md`                                                                             |
| Rebuild       | `dist/`                                                                                                 |

## Retirement Plan

`parallel-worktree-dev` is fully replaced by `dev-kickoff`. No migration guide
needed — this is an internal plugin change, not a docs scaffold change. Any
references to `start-worktree` or `WORKTREE_TASK.md` in playbooks or docs should
be updated to `start-dev-kickoff` and `DEV_KICKOFF.md`.

References to check:

- `docs/playbooks/worktree-usage-playbook.md`
- `docs/playbooks/agent-task-handoff-playbook.md`
- Any `WORKTREE_TASK.md` files in active worktrees (update manually)
