# Project CLI Toolkit Recipe Added

**Date:** 2026-04-19

Added `project-cli-toolkit` recipe skill capturing Story Loom's dual-audience
CLI pattern (humans get TTY-aware text, agents get `{ok, data, meta}` JSON
envelopes; citty-based with a machine-readable manifest). Reviewed the original
PR, normalized source-project identifiers to generic placeholders (`myproj` /
`MyProj` / `MYPROJ_`), and filled missing helper definitions. Bumped
`plugins/recipes` to 1.11.0 and manifesto count from 19 → 20 recipes.

**Key files:** `plugins/recipes/skills/project-cli-toolkit/SKILL.md`,
`docs/projects/project-cli-toolkit-recipe/sessions/2026-04-19-recipe-review-and-finalize.md`

**Docs:**
[Session note](../projects/project-cli-toolkit-recipe/sessions/2026-04-19-recipe-review-and-finalize.md)
