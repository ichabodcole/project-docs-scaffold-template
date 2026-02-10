# Migration Guide Improvements — 2026-02-09

## Context

After testing the v1-to-v2 migration on a real project, several gaps were
identified in the migration guide. This session addresses that feedback.

## What Happened

Applied 7 pieces of real-world feedback to the migration guide:

1. **Cookiecutter scaffold approach** — Instead of manually creating directories
   or fetching files from GitHub, the migration now starts by generating a v2
   scaffold locally via `cookiecutter`. All new READMEs and templates are copied
   from the scaffold.

2. **Additional doc types** — Added `specifications/`, `fragments/`,
   `interaction-design/`, and `reports/` as v2 directories. These were added
   between v1 and v2 but before versioning was established.

3. **Bulk archive guidance** — For large repos (50+ archived files), added a
   "legacy bucket" approach instead of requiring per-project grouping.

4. **`.claude/` audit step** — New step for checking local command/agent/skill
   overrides that may reference old paths.

5. **Scaffold cleanup step** — Remove the temp directory after migration.

6. **Skill file references** — Updated 4 skills to use markdown links
   `[file](file)` instead of backtick paths for referencing supporting files,
   per Claude Code skill conventions.

## Changes Made

- `plugins/project-docs/skills/update-project-docs/migrations/v1-to-v2.md` —
  Major rewrite of migration steps
- `plugins/project-docs/skills/update-project-docs/skill.md` — Updated migration
  table link format
- 4 skill files — Updated file reference format (generate-spec, idea-to-spec,
  implementation-blueprint, create-recipe)

---

**Related Documents:**

- [Plan](../plan.md)
- [Proposal](../proposal.md)
