---
type: memory
title: Story-loom's nine, and what two agents in one tree taught
description:
  The first consumer's nine issues were reproduced before scoping and landed one
  commit each; running two implementers in one working tree showed that a build
  mirror couples every commit to every uncommitted change.
tags: [feedback, lint, codemod, orchestration]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-14 }
---

# Story-loom's nine, and what two agents in one tree taught

Story-loom adopted 8.0.0 as the first consumer and filed nine issues. Two
verifiers reproduced every claim on this repository's code before anything was
scoped: eight confirmed as filed, one confirmed as an effect but misdescribed as
a mechanism, and two proposed fixes refuted though the defects stood. The fixes
landed as one commit per issue on `fix/story-loom-feedback-round-1`, scoped by
the first cycle opened for real work
([story-loom feedback](../cycles/2026-09-story-loom-feedback.md)).

**Key files:** `scripts/pdocs/lint/rules.ts`, `scripts/pdocs/seed.ts`,
`plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.6-to-v2.7.codemod.ts`

**Docs:**
[the backlog item](../backlog/2026-09-14-story-loom-feedback-round-1.md) carries
the verdict table; the issues are #163–#171 upstream.

## What was non-obvious

- **Verify the claim, not the fix.** Every defect was real; two of the proposed
  fixes were wrong. The pattern list for templates missed two shipped files, and
  the formatter grep matched the reporter's own workaround line, so a correctly
  fixed project would fail forever. Reproduction before scoping is what caught
  both.
- **Two implementers in one working tree works only until a build mirror.**
  Their source files were disjoint, but `dist/` mirrors the whole plugin, so
  either agent's uncommitted edits made `check:dist` fail the other's commit.
  The workaround was rebuild-dist-then-commit with retry; the fix next time is a
  worktree for the second agent.
- **Pathspec commits break the pre-commit hook here.** `git commit -- <paths>`
  runs the hook with a temporary index, and a fixture test that shells out to
  `git status` inherits it and reports dirt that is not there. Stage by path,
  then commit plain.
- **The template rule lived in three places and agreed in none.** The lint used
  a case-insensitive substring, the seed record a case-sensitive one, and the
  schema described a third. One function in `seed.ts` now decides, and the v2.9
  script's frozen copy is pinned as a superset on the shipped set.
