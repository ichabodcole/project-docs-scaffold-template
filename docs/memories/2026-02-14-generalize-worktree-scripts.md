# Generalized worktree scripts and bundled with skill

**Date:** 2026-02-14

Moved project-specific worktree management scripts into the
`parallel-worktree-dev` skill as bundled, generic scripts. They auto-discover
gitignored `.env` files and use `git rev-parse --show-toplevel` for correct repo
root resolution. Plugin version bumped to 1.3.0.

**Key files:**
`plugins/project-docs/skills/parallel-worktree-dev/scripts/create-worktree.sh`,
`plugins/project-docs/skills/parallel-worktree-dev/scripts/copy-env-to-worktree.sh`

**Docs:**
[Session](../projects/generalize-worktree-scripts/sessions/2026-02-14-generalize-and-bundle-scripts.md)
