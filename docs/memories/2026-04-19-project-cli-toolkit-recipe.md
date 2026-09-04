---
type: memory
title: Project CLI Toolkit Recipe Added
description:
  "A recipe for the dual-audience CLI pattern: TTY-aware text for people, a
  machine-readable envelope for agents, from one command."
tags: [recipes, cli, agent-surfaces]
status: stable
generated: { by: unknown, at: 2026-04-19 }
---

# Project CLI Toolkit Recipe Added

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
