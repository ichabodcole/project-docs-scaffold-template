# Generalize and Bundle Worktree Scripts — 2026-02-14

## Context

The `parallel-worktree-dev` skill referenced project-level scripts
(`scripts/create-worktree.sh`, `scripts/copy-env-to-worktree.sh`) that had to be
copy-pasted and rewritten for each new project. This session generalized those
scripts and bundled them directly with the skill so any project using the
project-docs plugin gets them automatically.

## What Happened

Started from project-specific scripts copied into `tmp/scripts/` from a
dream-clock project. Analyzed what was project-specific vs generic:

- **`create-worktree.sh`** — was mostly generic already. Made configurable via
  `$BASE_BRANCH` and `$WORKTREE_BASE` env vars. Removed project-specific
  `pnpm --filter` commands from output.
- **`copy-env-to-worktree.sh`** — replaced hardcoded `.env.local` path list with
  auto-discovery:
  `git ls-files --others --ignored --exclude-standard | grep -E '(^|/)\.env($|\.)'`.
  Works with any project structure.
- **`WORKTREE_TASK.template.md`** — removed project-specific commands section.
  Kept generic workflow steps.

Code review caught two critical bugs:

1. `MAIN_REPO_DIR="$(dirname "$0")/.."` resolved to the skill directory, not the
   consuming project root. Fixed with
   `git -C "$SCRIPT_DIR" rev-parse --show-toplevel`.
2. Script silently switched branches (`git checkout develop`) as a side effect.
   Replaced with `git fetch origin "$BASE_BRANCH"` which updates the ref without
   touching the working tree.

Also fixed: overly broad `.env` grep pattern, relative worktree paths in cleanup
instructions, and replaced the inline fallback template with a hard error (since
the template is always bundled alongside the script).

Updated SKILL.md to use relative paths (`scripts/create-worktree.sh` not
`./scripts/create-worktree.sh`), removed all `pnpm` references, and described
bundled scripts accurately.

## Changes Made

**New files:**

- `plugins/project-docs/skills/parallel-worktree-dev/scripts/create-worktree.sh`
- `plugins/project-docs/skills/parallel-worktree-dev/scripts/copy-env-to-worktree.sh`
- `plugins/project-docs/skills/parallel-worktree-dev/scripts/templates/WORKTREE_TASK.template.md`

**Modified:**

- `plugins/project-docs/skills/parallel-worktree-dev/SKILL.md` — relative paths,
  generic content
- `plugins/project-docs/.claude-plugin/plugin.json` — version 1.2.1 → 1.3.0
- `plugins/project-docs/README.md` — version history entry

## Lessons Learned

- Scripts bundled in skill `scripts/` directories should use
  `git rev-parse --show-toplevel` to find the project root, not relative `..`
  paths — the nesting depth depends on where the plugin is installed.
- `git worktree add <path> -b <branch> <base>` doesn't require being on the base
  branch, so the checkout step was always unnecessary.

---

**Related Documents:**

- [parallel-worktree-dev SKILL.md](../../../plugins/project-docs/skills/parallel-worktree-dev/SKILL.md)
