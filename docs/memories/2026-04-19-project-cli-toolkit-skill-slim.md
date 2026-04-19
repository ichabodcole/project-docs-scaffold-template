# Slimmed project-cli-toolkit Skill to Companion Doc

**Date:** 2026-04-19

Rewrote the `project-cli-toolkit` recipe (1071 → 386 lines) as the companion doc
for the new `create-project-cli` installer (`bunx create-project-cli`).
Installer now owns the scaffold; skill owns the design rationale and extension
guide (adding commands, app-scope patterns, scope rename, auth adaptation, test
scaffolding). Revised in place rather than creating a sibling skill to avoid
drift. Bumped recipes plugin to 1.12.0.

**Key files:** `plugins/recipes/skills/project-cli-toolkit/SKILL.md`,
`docs/projects/project-cli-toolkit-recipe/sessions/2026-04-19-skill-slim.md`

**Docs:**
[Session note](../projects/project-cli-toolkit-recipe/sessions/2026-04-19-skill-slim.md)
