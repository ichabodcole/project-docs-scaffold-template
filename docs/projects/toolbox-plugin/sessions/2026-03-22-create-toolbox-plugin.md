# Create Toolbox Plugin — 2026-03-22

## Context

Creating a new `toolbox` plugin namespace for specialist development utilities
that aren't specific to project documentation. Two existing skills in
project-docs (`maestro-testing` and `screenshot-optimization`) don't fit the
project-docs category and were moved to the new plugin.

## What Happened

Straightforward reorganization:

1. Created `plugins/toolbox/` with `.claude-plugin/plugin.json` (v1.0.0)
2. Moved `maestro-testing` and `screenshot-optimization` from
   `plugins/project-docs/skills/` to `plugins/toolbox/skills/`
3. Bumped project-docs to v2.0.0 (major — removing skills is breaking per semver
   convention)
4. Updated project-docs README: removed skills from table, added version history
5. Updated manifesto: skill count 25 → 23
6. Rebuilt dist — 4 plugins now (project-docs, recipes, toolbox, operator)

## Changes Made

- `plugins/toolbox/` — new plugin with 2 skills
- `plugins/project-docs/` — removed 2 skills, bumped to 2.0.0
- `docs/PROJECT_MANIFESTO.md` — updated skill count
- `dist/` — rebuilt with 4 plugins
