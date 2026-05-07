# Recipes Plugin Consolidation

**Status:** Approved (shipped) **Created:** 2026-05-07 **Author:** Cole Reed

---

## Overview

Consolidate the recipes plugin from **21 individual skills → 1 umbrella
`recipes` skill** that loads recipes on demand. Recipes become plain markdown
documents under `library/`, no longer carrying their own skill frontmatter. The
`create-recipe` skill stays as a separate dev workflow, lightly updated for the
new layout. Recipes plugin bumps to 2.0.0 (major: public skill names disappear).

## Problem Statement

Every installed plugin contributes its skills to the agent's available- skill
catalog. The recipes plugin had grown to 21 skills — each representing a
tech-stack pattern (BetterAuth APIs, PowerSync sync, Electron IPC, Expo
voice-to-text, etc.). Every one carried a rich frontmatter description with
trigger phrases, all loaded into the harness's metadata pool. Two compounding
problems:

1. **Metadata bloat.** Coding harnesses (Claude Code, Codex CLI) need to reason
   over the full skill list to decide when to fire what. Adding 21 entries per
   recipe install meant every other skill's triggering had to compete with this
   catalog.
2. **Triggering noise.** Soft phrases like _"set up X"_ or _"add Y"_ would
   partially match many recipes' descriptions, leading to ambiguous or unwanted
   auto-fires. The pattern wasn't matching the actual usage shape: recipes are
   reference material consulted on demand, not skills meant to fire ambiently
   across all conversations.

## Proposed Solution

A single umbrella `recipes` skill that:

- **Triggers strictly on the word "recipe" + context.** Examples: _"use the X
  recipe"_, _"what recipes are available"_, _"is there a recipe for X"_. Soft
  cues (set up, add, build) explicitly stay in chat unless the user opts in by
  saying "recipe".
- **Reads `INDEX.md`** to find the recipe matching the user's request.
- **Loads `library/<recipe-name>/RECIPE.md`** for the implementation guide and
  follows it.
- **Lists available recipes** when asked.

Each recipe is now a plain markdown file with no frontmatter — the umbrella is
the only thing the harness sees.

## Scope

**Shipped:**

- New umbrella skill: `plugins/recipes/skills/recipes/SKILL.md` + `INDEX.md`.
- 20 recipes moved into `plugins/recipes/skills/recipes/library/<name>/`,
  renamed `SKILL.md` → `RECIPE.md`, frontmatter stripped, `references/`
  preserved.
- INDEX organized into 7 categories (Authentication & API, Sync & Real-Time,
  Desktop & Mobile, Editor & Document, AI & MCP, Asset Management, Tooling &
  Build).
- `create-recipe` skill updated for the new layout: paths, terminology (recipe
  vs recipe skill), commit/PR conventions, added a "Phase 4.5: Update the Index"
  step. Reference template renamed and its frontmatter section stripped.
- Plugin version 1.14.0 → 2.0.0 (major bump for breaking change).
- Dist mirror rebuilt and validated.

**Out of scope (deferred):**

- Recipe content updates — recipes were copied verbatim. Any content refinement
  is its own work.
- Cookiecutter template changes — the recipes plugin isn't mirrored there.
- A migration guide for end users (would only matter if the recipes plugin had
  external consumers tracking specific skill names; the plugin's audience is
  small enough that the changelog suffices).

## Architecture

```
plugins/recipes/
  .claude-plugin/plugin.json                  <- v2.0.0
  skills/
    recipes/                                  <- umbrella skill
      SKILL.md                                <- triggers on "recipe"
      INDEX.md                                <- categorized index
      library/
        <recipe-name>/
          RECIPE.md                           <- implementation guide
          references/                         <- optional supporting files
    create-recipe/                            <- dev workflow, unchanged role
      SKILL.md                                <- updated for new layout
      references/recipe-template.md           <- renamed from recipe-skill-template
```

Net effect: total skills across all plugins drops from **53 → 34**.

## Impact & Risks

**Benefits:**

- ~36% reduction in total skill count, dominated by recipes shrinking from 21
  → 2.
- Cleaner triggering: recipes only surface when the user explicitly asks.
- Adding a recipe is now lower ceremony — drop a folder, add an INDEX entry, no
  skill metadata to tune.

**Risks (and mitigations):**

- _Discoverability loss._ Users won't see recipe names listed in the skill
  picker individually. Mitigated by the umbrella skill exposing "what recipes
  are available" as a first-class action and by INDEX.md acting as the catalog.
- _Auto-trigger granularity loss._ Previously, _"add OAuth to BetterAuth"_ would
  auto-fire `elysia-betterauth-oauth`. Now the user has to say _"recipe"_ or the
  agent has to know to suggest it. **Decided acceptable** — the user explicitly
  opted into strict-on-recipe-only triggering to escape the noise of partial
  soft-cue matches.
- _Breaking change._ Anyone who memorized specific skill names (e.g.
  `recipes:powersync-local-first-sync`) needs to relearn. Mitigated by the major
  version bump signaling the change and the consistent one-line invocation
  pattern (_"use the X recipe"_).

**Complexity:** Low — purely mechanical work (file moves, frontmatter strips,
path updates). The only design decisions were the umbrella skill's trigger
surface and the INDEX format, both of which were discussed and agreed on before
the work started.

## Open Questions

- Will the strict trigger model feel right in practice, or will users forget the
  magic word? Iterate based on real use.
- Should the `create-recipe` skill itself be folded into the umbrella as an "add
  a recipe" branch? Decision so far: keep separate, since it's a dev workflow
  (analyze project + scaffold + PR) distinct from recipe lookup. Revisit if the
  boundary feels arbitrary in use.

## Success Criteria

- Recipes load cleanly from the umbrella when the user says "recipe".
- Soft cues like _"set up X"_ no longer trigger recipe skills unexpectedly.
- Adding a new recipe stays low-effort: scaffold under `library/`, update INDEX,
  done.

---

**Related Documents:**

- [Initial implementation session](./sessions/2026-05-07-initial-consolidation.md)
- Branch: `feat/recipes-plugin-consolidation` (1 commit at finalize).
