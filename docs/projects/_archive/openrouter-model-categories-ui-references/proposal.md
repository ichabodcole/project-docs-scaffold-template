# OpenRouter Model Categories UI References

**Status:** Complete **Created:** 2026-03-11 **Author:** Cole Reed

---

## Overview

Add HTML mockup prototypes as visual references to the
`openrouter-model-categories` recipe skill. The skill currently describes
complex admin UI layouts (category list page, model browser with 70/30 split,
detail pane) in prose, which leads to inconsistent implementations — missing
elements, layout variations, and ambiguous component relationships.

## Problem Statement

The `openrouter-model-categories` skill (in the `recipes` plugin) describes a
multi-component admin UI through text and ASCII diagrams. Agents interpreting
this produce inconsistent results: sometimes the detail pane is missing, the
model browser layout differs, or the category list page is incomplete. There's
no visual ground truth for what the UI should look like.

## Proposed Solution

Create self-contained HTML mockup prototypes (using the
`html-mockup-prototyping` skill) that serve as visual references for the two
main admin pages:

1. **Category List Page** — table of configured categories, add category dialog
2. **Category Edit Page** — 70/30 split with category settings, model browser,
   and model detail pane

These prototypes will be added to a `references/` directory within the skill
folder, and the skill's prose will reference them as the canonical UI starting
point. The prototypes are not rigid requirements — they're a clear baseline that
agents can adapt to the target framework and design system.

## Scope

**In Scope:**

- Screenshot review of existing implementations for reference
- HTML mockup prototypes for category list and category edit pages
- Adding prototypes to
  `plugins/recipes/skills/openrouter-model-categories/references/`
- Updating skill text to reference the prototypes

**Out of Scope:**

- Changing the skill's architecture, data model, or API design
- Production UI components
- Prototypes for client-facing routes (only admin UI)

---

**Related Documents:**

- Skill: `plugins/recipes/skills/openrouter-model-categories/SKILL.md`
- Reference screenshots:
  `docs/projects/openrouter-model-categories-ui-references/artifacts/`
