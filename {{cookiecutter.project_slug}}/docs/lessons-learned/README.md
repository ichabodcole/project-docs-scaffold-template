# Lessons Learned

This directory contains lessons learned from issues encountered during development. Each lesson captures a specific problem, its context, and the solution pattern, making it easier to recognize and resolve similar issues in the future.

## Purpose

The main purpose of lessons learned is to **preserve hard-won knowledge** that isn't obvious or easily found in documentation. These entries help developers and AI agents avoid repeating mistakes and quickly identify solutions to previously-solved problems.

Lessons learned differ from other documentation:
- **Sessions** document what happened during work
- **Plans** describe how to implement something
- **Playbooks** provide repeatable patterns for common tasks
- **Lessons learned** capture specific problems and their fixes

## When to Create a Lesson

Create a lesson learned when you encounter:
- Non-obvious bugs that took significant time to diagnose
- Configuration issues with specific tools or versions
- Behavior that contradicts documentation or expectations
- Integration problems between dependencies
- Platform-specific quirks or edge cases

**Don't create lessons for:**
- Obvious mistakes (typos, syntax errors)
- Well-documented behavior in official docs
- Trivial issues that are quickly resolved

## File Naming

- `short-descriptive-topic.md`
- Examples:
  - `nuxt-image-optimization-memory-leak.md`
  - `vitest-esm-import-resolution.md`
  - `postgres-connection-pool-exhaustion.md`

## Recommended Structure

```markdown
# <Short Descriptive Title>

## Symptom

- What error or behavior did you observe?
- What made you notice something was wrong?

## Environment

- Tool/framework versions (e.g., Node 20.5, Nuxt 4.1.2)
- Platform details (macOS, Linux, Docker, etc.)
- Any relevant configuration

## Behavior Observed

- What was happening vs. what you expected
- Steps to reproduce if applicable
- Any misleading error messages

## Fix Pattern

- The solution that worked
- Why this fix addresses the root cause
- Code example or configuration snippet

```example
// Minimal code showing the fix
```

## References

- Link to related issues, PRs, or documentation
- Date discovered: YYYY-MM-DD
```

## Tips

- **Be specific** with version numbers and product names so we can recognize when a lesson becomes stale
- **Include minimal code examples** that demonstrate the fix pattern
- **Focus on the "why"** behind the fix, not just the "what"
- **Keep it concise** — aim for quick reference, not exhaustive explanation
- **Link to external resources** (GitHub issues, Stack Overflow, official docs) when relevant
- **Update or archive** lessons when dependencies change and the issue no longer applies
