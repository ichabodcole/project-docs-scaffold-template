---
description:
  "Bootstrap a worktree session — read WORKTREE_TASK.md and begin the
  development workflow"
allowed_tools: ["Bash", "Read", "Glob", "Grep", "Task", "Skill"]
---

You are an agent starting work inside a git worktree that was set up for you.

## Step 1: Confirm You're in a Worktree

Check for `WORKTREE_TASK.md` in the current directory:

```bash
ls WORKTREE_TASK.md
```

If it doesn't exist, tell the user this doesn't appear to be a prepared worktree
and stop.

## Step 2: Read the Task

```bash
# Read the handoff document
```

Read `WORKTREE_TASK.md` and understand:

- **Mission** — What to build
- **Source documents** — Proposal, investigation, or other references
- **Constraints** — Decisions already made, things to avoid

## Step 3: Read Source Documents

Read the proposal and/or investigation linked in WORKTREE_TASK.md. These provide
the full context for the work.

## Step 4: Acknowledge

Summarize what you'll be building in 1-2 sentences. Confirm the scope before
proceeding.

## Step 5: Begin the Workflow

Follow this sequence:

1. **Install dependencies** — Set up the project environment
2. **Run `/dev-discovery`** — Understand affected codebase areas
3. **Create development plan** — In the project folder as `plan.md`
4. **Assess test plan need** — If the feature is complex (multiple systems,
   complex state, 3+ phases), create a test plan using `/generate-test-plan`. If
   simple, note testing strategy inline in the plan. When in doubt, ask.
5. **Implement** — Follow the plan
6. **Test** — Run the project's test/verification commands
7. **Commit** — With clear commit messages
8. **Notify** — Update WORKTREE_TASK.md with completion status

## Important Constraints

- **Stay in scope** — Only do what WORKTREE_TASK.md describes. If you discover
  out-of-scope work, note it in WORKTREE_TASK.md but don't pursue it.
- **Plan in the project folder** — Plans go in `docs/projects/<name>/plan.md`,
  not in the worktree root.
- **Discovery artifacts go with the project** — Write to
  `docs/projects/<name>/artifacts/`, not `.artifacts/`.
