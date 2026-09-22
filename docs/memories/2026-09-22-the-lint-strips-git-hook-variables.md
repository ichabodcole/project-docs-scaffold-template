---
type: memory
title: The lint strips git's hook variables, and reads only what is on disk
description:
  pdocs check spawns git without the repository variables a commit hook exports,
  so it runs from a package in a linked worktree; a tracked page that is being
  deleted is skipped, and report records come from findings, not rows.
tags: [lint, git, hooks]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# The lint strips git's hook variables, and reads only what is on disk

A commit hook in a linked worktree inherits `GIT_DIR`, and git told its
directory but not its work tree takes the working directory as the top level —
so `pdocs check` run from `packages/app` read paths relative to the wrong root
and crashed. Both of the lint's git spawns now go through `gitEnv()`, which
drops `git rev-parse --local-env-vars`.

Dropping `GIT_INDEX_FILE` has a cost: `ls-files` then reads the real index, not
the one being committed, and the real index still lists what `git commit -a` is
deleting. The index git hands the hook cannot be used instead (`index.lock` for
`commit -a`, a relative path for a plain commit), so the outside corpus skips a
tracked path that is not on disk. Anything new that lists files through git in a
hook has the same exposure.

`pdocs report` records are built from `documentProblems`' `missing` fields, not
parsed back out of the problem rows.

**Key files:** `scripts/pdocs/lint/rules.ts` (`gitEnv`, `documentProblems`),
`scripts/pdocs/lint/collect.ts`, `scripts/pdocs/docs-lint/unlinted-links.ts`
(the `env` seam on `trackedMarkdown`)

**Docs:**
[Session record](../projects/spellbook-feedback/sessions/2026-09-22-check-inherits-git-hook-variables.md),
[backlog item](../backlog/2026-09-17-check-inherits-git-hook-variables.md)
