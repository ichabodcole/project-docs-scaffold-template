# HTML Mockup Prototyping Skill Upgrade — Theming + Starter Template

**Status:** Draft **Created:** 2026-03-11 **Author:** Cole Reed

---

## Overview

Upgrade the `html-mockup-prototyping` skill with a semantic theming layer and a
starter template file, reducing boilerplate and improving consistency across
prototypes.

## Problem Statement

The current skill describes the full HTML boilerplate (CDN imports, core
pattern, Alpine setup, Lucide initialization, loading states CSS) in prose
within SKILL.md. Every prototype starts by recreating this from the skill
description, which leads to:

- **Inconsistency** — each prototype reinvents badge styles, button patterns,
  and form controls with slightly different Tailwind utility combinations
- **Verbose markup** — dense utility strings like
  `bg-slate-900 border border-slate-700 text-sm text-slate-300 px-3 py-2 rounded-md`
  repeated throughout, making HTML harder to read and review
- **Bloated skill text** — ~260 lines mixing guidance with boilerplate. The
  valuable parts (when to use, flow design process, common mistakes) are buried
  in implementation details
- **No theme adaptability** — no guidance on matching the prototype's look to
  the target app's design system

## Proposed Solution

### 1. Starter Template: `templates/state-flow.html`

A self-contained HTML file that serves as the copy-and-fill starting point for
all prototypes. Includes:

- CDN imports (Tailwind, Alpine.js, Lucide)
- Theme block with ~25 semantic CSS classes via `@apply`
- State switcher bar (amber prototype navigation)
- `Alpine.data()` registration pattern (avoids inline x-data parsing issues with
  complex state)
- Lucide icon initialization with debounced MutationObserver
- Empty content area — blank canvas, no layout opinions

The template is dark-themed by default (slate-950 base). The theme block is
clearly marked so the agent can adjust colors for light themes or to match a
project's design system.

### 2. Semantic Theme Layer

CSS classes using Tailwind's `@apply` organized into categories:

- **Typography:** `page-title`, `section-title`, `label`, `text-body`,
  `text-muted`, `text-faint`, `text-mono`, `link`
- **Surfaces:** `card`, `inset`, `panel-section`
- **Badges:** `badge-accent`, `badge-muted`, `badge-warning`
- **Status:** `status-dot-open`, `status-dot-success`
- **Buttons:** `btn-primary`, `btn-outline`, `btn-ghost`, `btn-icon`
- **Forms:** `input`, `select`, `textarea`
- **Navigation:** `nav-item`, `nav-item-active`, `nav-item-inactive`
- **Utilities:** `filter-pill`, `skeleton` (loading shimmer)

These are baked into the template file, not a separate CSS file — maintaining
the single-file philosophy.

### 3. SKILL.md Rewrite

Slim from ~260 lines to ~120-150 lines by moving boilerplate into the template
and keeping the skill focused on guidance:

**Keeps:**

- Overview and stack description
- When to Use / Not For
- Template reference — "copy `templates/state-flow.html` as your starting point"
- Theme summary — quick reference of available semantic classes
- Theme adaptation — guidance on checking the project for a theme file and
  optionally adapting the prototype's colors to match the app's look (light hand
  — visual correspondence, not pixel-perfect reproduction)
- Flow Design Process (5-step process)
- Key Conventions (state switcher, realistic shell, file location, resist logic)
- Common Mistakes (MutationObserver loop, `$watch` cascading, `x-if` table rows)
- Lucide icon reference table (common icons by category)
- Skill Feedback section

**Removes:**

- Core Pattern HTML block (replaced by template file)
- Lucide setup instructions (baked into template)
- Alpine.js Quick Reference table (generic docs, not skill-specific)
- Loading States CSS (moved to template as `.skeleton` class)

### 4. Theme Adaptation Guidance

New section in the skill advising agents to check if the target project has a
theme file (CSS variables, Tailwind config, shadcn theme, etc.) before building.
If one exists, ask the user whether the prototype should reflect the app's look.
If yes, adapt the template's theme block to approximate the app's color palette
and general feel. Keep it lightweight — the goal is visual correspondence, not
pixel-perfect reproduction.

## File Layout

```
plugins/project-docs/skills/html-mockup-prototyping/
  SKILL.md                    (rewritten — guidance focused)
  templates/
    state-flow.html           (starter template with theme)
```

## Design Decisions

**Single template, not multiple.** All prototypes built so far use the same
state-flow pattern. A comparison/A-B template was considered but deferred — no
actual use yet, and A/B exploration naturally produces multiple HTML files
rather than one file holding variants. Add when real usage demands it.

**Theme inlined, not separate file.** Duplicating a ~40-line theme block across
future templates is acceptable. Keeping each prototype fully self-contained is
the core value proposition. No external CSS dependencies.

**`Alpine.data()` registration, not inline `x-data`.** Inline x-data with
complex objects causes parsing issues in Alpine.js. The
`Alpine.data('app', () => ({}))` pattern in a `<script>` block before Alpine
loads is more reliable and proven across three prototypes.

**Blank canvas content area.** The template provides the prototyping framework
(state switcher, theme, CDN setup) but makes no layout decisions about the
content area. Sidebar nav, single column, split pane — that's determined by the
agent based on what's being prototyped.

## Scope

**In Scope:**

- Create `templates/state-flow.html` with theme block
- Rewrite SKILL.md to reference template and focus on guidance
- Add theme adaptation guidance
- Move loading states CSS into template
- Version bump for project-docs plugin

**Out of Scope:**

- Comparison/A-B template (deferred to real usage demand)
- Light theme variant (agent adapts the dark template as needed)
- Retrofitting existing prototypes (separate backlog item below)
- Changes to how the skill is triggered or described

## Follow-up: Retrofit Existing Prototypes

After the skill upgrade ships, go back through existing prototype mockups and
update them to use the standardized theme classes and `Alpine.data()` pattern.
This ensures all reference prototypes are consistent and serve as good examples
of the new conventions.

Prototypes to retrofit:

- `plugins/recipes/skills/openrouter-model-categories/references/ai-models-admin-mockup.html`
- `plugins/recipes/skills/nuxt-betterauth-admin/references/admin-dashboard-mockup.html`

(The agent-feedback-reporting mockup already uses the new theme pattern.)

## Validation

The theme layer has been prototyped and validated on the
agent-feedback-reporting mockup. The semantic classes produce visually identical
output to the raw Tailwind version while making the HTML significantly more
readable.

---

**Origin:**

- Experience building three prototypes: openrouter-model-categories,
  nuxt-betterauth-admin, agent-feedback-reporting
- Brief:
  [UI Experimentation Framework](../../briefs/2026-03-11-ui-experimentation-framework.md)
  (related but independent — that brief envisions an orchestration layer; this
  proposal improves the execution layer it would sit on)
