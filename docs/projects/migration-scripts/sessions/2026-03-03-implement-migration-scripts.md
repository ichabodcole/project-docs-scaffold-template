# Migration Scripts for update-project-docs — 2026-03-03

## Context

The `update-project-docs` skill had migration guides that mixed mechanical file
operations (mkdir, cp, mv, sed) with judgment-based editing (ASCII flowcharts,
README prose). Agents were doing all of it step by step, which was slow and
error-prone. The goal was to extract the mechanical steps into shell scripts
following the same pattern as `parallel-worktree-dev`.

## What Happened

Work proceeded cleanly from an approved plan. Four scripts were written in the
`migrations/scripts/` directory:

- `migrate-v2.5-to-v2.6.sh` — fully automated; no agent steps remain after
  running it. Renames `archive/` → `_archive/` across all five category dirs,
  fixes path references in all `docs/**/*.md`, updates AGENTS.md/CLAUDE.md, and
  bumps `docs_version`.
- `migrate-v2.4-to-v2.5.sh` — scaffold-dependent; creates briefs dir structure,
  copies files, updates the documentation cycle string, bumps version, cleans
  up.
- `migrate-v2.3-to-v2.4.sh` — scaffold-dependent; copies TEST-PLAN template,
  exposes `--replace-design-resolution-template` and `--replace-projects-readme`
  flags for wholesale file replacement when files haven't been customized.
- `migrate-v2.0-to-v2.3.sh` — scaffold-dependent; copies DESIGN-RESOLUTION and
  HANDOFF templates (no-clobber), exposes `--replace-projects-readme`.

v1→v2 was intentionally excluded — that migration is fundamentally about
judgment (grouping related documents, handling orphaned sessions), not
mechanical operations.

All scripts share the same design:

- `--dry-run` flag with a `run()` helper wrapping every mutating operation
- `--scaffold-dir PATH` plus `SCAFFOLD_DIR` env var plus auto-detect fallback
- Improved `sed_inplace()` helper that extracts the search term from the sed
  pattern for accurate line counts in dry-run output
- macOS/GNU sed compatibility (`sed -i ''` vs `sed -i`)
- Colored output with step numbers, green checkmarks, yellow warnings, red
  errors
- Summary block at the end listing remaining agent steps

Migration `.md` files were updated with "Run the Script First" sections at the
top of Step-by-Step, and remaining agent-only steps labeled `[Agent]`. The
v2.5→v2.6 guide became very short — run the script, verify, done.

Prettier pre-commit hook caught formatting issues on two migration guides and
SKILL.md (line wrapping). Fixed before committing.

## Notable Discoveries

The `sed_inplace()` helper in the existing `migrate-v2.5-to-v2.6.sh` (written in
the prior session) had a subtle bug: it passed the full sed pattern
(`s|/archive/|/_archive/|g`) to `grep -c`, which always returned 0 since that
string doesn't appear in the files. The new scripts use a smarter extraction:

```bash
local delim="${pattern:1:1}"
local search="${pattern#s$delim}"
search="${search%%$delim*}"
count=$(grep -Fc "$search" "$file" 2>/dev/null || true)
```

This correctly extracts the search term and counts actual matching lines.

## Lessons Learned

- The `--replace-*` flag pattern is a clean way to give agents an explicit
  opt-in for wholesale file replacement vs. manual merging. Worth using in
  future scripts where "replace if uncustomized, merge if customized" is the
  decision.
- `local` keyword in bash is only valid inside functions — worth checking before
  writing main-body variable declarations.

## Follow-up

The `sed_inplace()` bug in the existing `migrate-v2.5-to-v2.6.sh` (from prior
session) was noticed but not fixed to avoid scope creep. Could be cleaned up in
a follow-on patch.

---

**Related Documents:**

- [Commit d7f7ac3](d7f7ac3) — feat: add migration scripts for
  update-project-docs skill
