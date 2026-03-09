<!--
USAGE: Copy this file to your project folder as `proposal.md`.

This template helps you tell the story of what you're proposing and why.
Think of it as mapping out the major landmarks without detailing every step.

Adapt sections as needed. Merge, skip, or add sections based on what helps tell your story clearly.

Core questions to answer: What are we building? Why? What's the high-level approach? What's in/out of scope?

For more guidance on proposals, see the projects README: ../README.md
-->

# Migration Script Improvements for update-project-docs

**Status:** Draft **Created:** 2026-03-08 **Author:** Cole Reed

---

## Overview

The `update-project-docs` skill's migration scripts have several rough edges
discovered during a real v1.8.0 → v2.6.0 upgrade. This proposal addresses five
concrete issues: incorrect path examples in migration guides, a `git mv` failure
on empty directories, incomplete archive directory coverage, a scaffold
lifecycle problem that breaks multi-hop migrations, and missing guidance for
chained version upgrades.

All five issues are well-understood with clear fixes. No investigation is
needed.

## Problem Statement

Users running multi-version migrations (e.g. v1.8.0 → v2.6.0) encounter
avoidable friction:

1. **Wrong path examples** — Migration guides show
   `.scaffold-tmp/<project-name>/docs` but cookiecutter outputs to
   `.scaffold-tmp/docs` (no project subfolder). Users following the guide
   manually get path errors.
2. **`git mv` fails on empty archive dirs** — The `rename_archive` function uses
   `git mv` unconditionally when in a git repo. Empty directories (or those with
   only untracked files) cause `git mv` to error:
   `fatal: source directory is empty`. The `mv` fallback only fires in non-git
   repos.
3. **Incomplete archive rename coverage** — `migrate-v2.5-to-v2.6.sh` only
   renames 5 hardcoded archive directories. Projects with additional
   `docs/*/archive/` directories (e.g. `docs/architecture/archive`,
   `docs/lessons-learned/archive`) must rename them manually.
4. **Scaffold deleted mid-migration** — The v2.0-to-v2.3 script deletes
   `.scaffold-tmp/` at the end. Subsequent migration scripts also need the
   scaffold. Users must manually back it up or regenerate it between each
   script.
5. **No multi-hop migration guidance** — The skill explains how to run a single
   migration but not how to chain multiple versions in sequence. The scaffold
   lifecycle problem (#4) isn't documented anywhere.

## Proposed Solution

Fix each issue directly in the migration scripts and skill instructions:

1. **Path examples** — Update all migration guide examples to use
   `.scaffold-tmp/docs` (the actual output path). Document auto-detect as the
   canonical approach; manual `--scaffold-dir` is for advanced use only.
2. **`git mv` fallback** — Update `rename_archive` to catch `git mv` failures
   (exit code != 0) and fall back to plain `mv`. Or add a pre-check: if the
   source directory is empty or untracked, skip `git mv` entirely and use `mv`.
3. **Dynamic archive discovery** — Replace the 5 hardcoded paths in
   `migrate-v2.5-to-v2.6.sh` with a dynamic `find docs -type d -name "archive"`
   approach. Rename all discovered `archive/` dirs to `_archive/`.
4. **Scaffold persistence** — Add a `--keep-scaffold` flag to migration scripts
   (or the orchestrating skill) that prevents `.scaffold-tmp/` deletion. Default
   behavior can remain delete; flag is opt-in.
5. **Multi-hop guidance** — Add a "Running multiple migrations in sequence"
   section to the skill instructions explaining: scaffold is deleted between
   scripts, how to back it up, and recommended workflow for chaining migrations.

## Scope

**In Scope (MVP):**

- Fix `rename_archive` git mv fallback (issue #2)
- Dynamic archive dir discovery in v2.5-to-v2.6 script (issue #3)
- Update path examples in migration guide docs (issue #1)
- Add multi-hop guidance section to skill instructions (issue #5)

**Out of Scope:**

- A full orchestration script that chains all migrations automatically (complex;
  deferred)
- Retrofitting `--keep-scaffold` across all existing migration scripts
  (nice-to-have; can be addressed separately)

**Future Considerations:**

- Parent orchestration script that generates scaffold once and runs all
  applicable migrations end-to-end
- `--keep-scaffold` flag for multi-hop use cases

## Technical Approach

Changes touch three layers:

1. **Shell scripts** (`migrate-v2.x-to-v2.y.sh`) — Fix `rename_archive` fallback
   logic; replace hardcoded paths with `find`-based discovery
2. **Migration guide docs** (`.md` files in `migrations/`) — Update path
   examples and add multi-hop section
3. **Skill instructions** (`update-project-docs` skill) — Add multi-hop
   migration guidance

No architectural changes; all fixes are targeted and isolated to existing files.

## Impact & Risks

**Benefits:**

- Eliminates the most common migration failure modes
- Removes need for manual workarounds during upgrades
- Clearer documentation reduces support burden

**Risks:**

- Dynamic `find`-based archive rename is broader in scope — could rename
  directories in unexpected locations if the project has non-standard structure.
  Mitigation: scope find to `docs/` only and add a dry-run preview.

**Complexity:** Low — targeted fixes to shell scripts and documentation; no new
abstractions needed.

## Success Criteria

- Running `migrate-v2.5-to-v2.6.sh` on a project with additional archive dirs
  renames all of them without manual intervention
- `rename_archive` succeeds on empty directories
- Migration guide path examples match actual cookiecutter output
- Skill instructions include a "Running multiple migrations" section

---

**Related Documents:**

- [Operator Feedback](operator://Agent%20Feedback/2026-03-08-update-project-docs-skill-feedback)

---

## Notes

Issues sourced from real migration run: v1.8.0 → v2.6.0, 2026-03-08. All five
issues have confirmed workarounds — this proposal formalizes the fixes.
