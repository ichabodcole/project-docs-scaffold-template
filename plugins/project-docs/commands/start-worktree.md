---
description:
  "Initialize a Claude session in a worktree by reading the task handoff
  document"
allowed_tools: ["Read", "Glob", "Grep", "Bash", "Task"]
---

You are starting work in a git worktree that was set up for parallel
development.

## Your First Step

Read the `WORKTREE_TASK.md` file in the current directory. This file contains:

- **Your Mission** - What you're building
- **Key Documents** - Links to proposals, plans, and related code
- **Implementation Steps** - How to approach the work
- **Testing Checklist** - How to verify completion
- **Scope Boundaries** - What's in and out of scope

```bash
# First, confirm you're in a worktree
cat WORKTREE_TASK.md
```

## After Reading

1. **Acknowledge the mission** - Summarize what you'll be building in 1-2
   sentences
2. **Review key documents** - Read any linked proposals or plans
3. **Run setup commands** - Usually `pnpm install` first
4. **Begin implementation** - Follow the implementation steps

## Context

This worktree was created using the parallel-worktree-dev workflow. The branch
is already set up and the `WORKTREE_TASK.md` serves as your complete briefing
for this work.

**Important:** Stay focused on the scope defined in the task document. If you
discover work that's out of scope, note it but don't pursue it.
