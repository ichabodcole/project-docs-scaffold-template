# Archive to \_archive Rename — 2026-02-25

## Context

Quality-of-life improvement to the documentation structure. Archive directories
(`archive/`) were renamed to `_archive/` so they consistently sort to the top of
directory listings in file browsers, reducing visual noise when scanning for
active content.

## What Happened

Straightforward mechanical change across the entire scaffold:

1. **Renamed 10 physical directories** via `git mv` — 5 under `docs/` and 5
   mirrored under `{{cookiecutter.project_slug}}/docs/`
2. **Updated path references** across 31 files: docs READMEs, templates,
   cookiecutter mirrors, plugin skills, migration guides, historical project
   docs, and root-level AGENTS.md/README.md
3. **Created v2.5→v2.6 migration guide** for end users
4. **Rebuilt dist/** — 38/38 skills validated

Care was taken to only update path references and leave conceptual/verb uses of
"archive" unchanged (e.g., "archive it", "Archive when done", status values).

The v1-to-v2 migration guide has `proposals/archive/` and `plans/archive/` in
source-path positions (the FROM side of mv commands) — these were kept as-is
since they reference the old v1 directory structure that users would be
migrating from.

## Changes Made

- `docs/*/archive/` → `docs/*/_archive/` (5 directories)
- `{{cookiecutter.project_slug}}/docs/*/archive/` →
  `{{cookiecutter.project_slug}}/docs/*/_archive/` (5 directories)
- Path references updated in ~30 markdown files
- New:
  `plugins/project-docs/skills/update-project-docs/migrations/v2.5-to-v2.6.md`
- Plugin version: 1.8.4 → 1.8.5

---

**Related Documents:**

- [Proposal](../proposal.md)
