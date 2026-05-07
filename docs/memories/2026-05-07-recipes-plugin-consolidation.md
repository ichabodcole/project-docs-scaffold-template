# Recipes plugin consolidated to umbrella skill

**Date:** 2026-05-07

Consolidated the recipes plugin from 21 individual skills into a single umbrella
`recipes` skill that loads recipes on demand from `library/`. Recipes are now
plain markdown (no frontmatter); the umbrella triggers strictly on the word
"recipe" + context. `create-recipe` stays as its own skill, updated for the new
layout. Plugin bumped to 2.0.0 (major: public skill names disappear). Net
effect: total skills across all plugins dropped from 53 → 34.

**Key files:** `plugins/recipes/skills/recipes/`,
`plugins/recipes/skills/create-recipe/`,
`docs/projects/recipes-plugin-consolidation/proposal.md`,
`docs/projects/recipes-plugin-consolidation/sessions/2026-05-07-initial-consolidation.md`

**Docs:** [Project folder](../projects/recipes-plugin-consolidation/) — proposal
and session journal capturing the rationale, decisions, and the digestify
rendering bug that surfaced as a side effect.
