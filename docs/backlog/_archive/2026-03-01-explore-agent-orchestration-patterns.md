# Explore Agent Orchestration Patterns and Infrastructure

**Added:** 2026-03-01

The current orchestration approach (parallel-worktree-dev skill + WORKTREE_TASK
handoffs + finalize-branch) works, but the space is moving fast. There may be
better patterns for multi-agent coordination, progress tracking, and task
decomposition that we're not seeing because we built what we have in relative
isolation.

## What to Explore

**How others are orchestrating agents:**

- TMUX-based approaches (multiple Claude Code sessions coordinated from a
  terminal multiplexer)
- Anthropic Agent SDK patterns (programmatic agent spawning and management)
- Claude Code's built-in subagent/worktree capabilities and how people extend
  them
- Open-source orchestration frameworks and how they handle task decomposition,
  progress tracking, and inter-agent communication

**Where the gaps might be in our current approach:**

- We have documentation infrastructure (docs/) and skill-based workflows, but no
  real technical infrastructure layer for orchestration
- Parallel-worktree-dev is skill-level orchestration — could there be a
  programmatic layer beneath it?
- How do other systems handle: agent-to-agent handoffs, shared state between
  agents, progress visibility, error recovery, task dependency graphs?
- Is there a model where documentation-driven development (our strength) plugs
  into a more capable orchestration runtime?

**Mental model questions:**

- Are we thinking about this correctly, or are we stuck in a local optimum?
- Should orchestration be a skill, a script, a daemon, an SDK app, or something
  else entirely?
- What's the right boundary between "documentation system" and "orchestration
  system"?
- Could this project evolve from "docs scaffold + skills" into something with
  more technical infrastructure, or should that be a separate project?

## What This Is Not

This isn't about rebuilding what we have. It's about seeing what's out there,
finding intersection points, and deciding whether there's an evolution path that
keeps our documentation-first approach while adding more capable orchestration.

## Suggested Approach

Investigation-first. Read, explore, talk to the codebase of tools doing this.
Write up findings as an investigation document before proposing any changes.

## References

- `plugins/project-docs/skills/parallel-worktree-dev/SKILL.md` — current
  orchestration approach
- `plugins/project-docs/commands/start-worktree.md` — current agent entry point
- [Anthropic Agent SDK](https://github.com/anthropics/anthropic-sdk-python)
- Claude Code subagent patterns (Agent tool, worktree isolation)
