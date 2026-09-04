---
type: memory
title: Added zed-biome-husky-quality-gates recipe
status: stable
generated: { by: unknown, at: 2026-04-02 }
---

# Added zed-biome-husky-quality-gates recipe

Added a new recipe skill for setting up Biome as the single formatting/linting
authority with Zed editor integration and Husky pre-commit enforcement. Covers
the full pipeline: Biome config, Zed settings, Husky + lint-staged, and the
three-config-sync discipline needed to prevent drift.

**Key files:** `plugins/recipes/skills/zed-biome-husky-quality-gates/SKILL.md`

**Docs:** Recipe is self-contained — no separate project folder needed.
