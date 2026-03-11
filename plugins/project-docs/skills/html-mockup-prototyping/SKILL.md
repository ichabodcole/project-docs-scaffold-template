---
name: html-mockup-prototyping
description: >-
  Trigger on any request to build a mockup, prototype, or rough visual of a UI —
  especially when the goal is design exploration before implementation. Use when
  someone wants to SEE what something could look like: sketching out a flow,
  visualizing multiple UI states (idle/loading/error/success), comparing two
  layout options, or building a clickable preview before writing real code or a
  proposal. Also invoke proactively when reading a proposal, investigation, or
  design resolution that contains complex or undecided UI — suggest a
  prototyping step before locking in an implementation plan. The output is a
  self-contained interactive HTML file, not production code. Do NOT invoke for
  implementing real UI components, adding states to existing code, reviewing
  designs, or answering general UX questions.
---

# HTML Mockup Prototyping

## Overview

Single-file HTML prototypes using Tailwind CDN + Alpine.js. Open in a browser —
no build step, no server, no framework. Best for exploring flows and interaction
states quickly.

**Stack:** Tailwind CSS (utility styling) + Alpine.js (declarative
state/behavior) + Lucide (icons). All load from CDN.

## When to Use

- Design is unclear and needs visual exploration before a proposal or plan
- Feature has multiple states (loading, success, error, empty) that need to be
  shown
- Stakeholder needs to review a flow before implementation begins
- UX patterns are undecided (e.g., single-step vs multi-step upload)

**Not for:**

- Production code or anything that will be committed to the app
- Complex data-driven interactions (use the real UI for that)

## Starter Template

Copy `templates/state-flow.html` as your starting point. It includes:

- CDN imports (Tailwind, Alpine.js, Lucide)
- Semantic theme block (~25 CSS classes via `@apply`)
- State switcher bar (amber prototype navigation)
- `Alpine.data()` registration pattern
- Lucide icon initialization with debounced MutationObserver
- Empty content area — blank canvas, no layout opinions

The content area is yours to fill. Sidebar nav, single column, split pane —
whatever the prototype needs.

## Theme Classes

The template provides semantic classes so markup stays readable. Use these
instead of raw Tailwind utility strings:

| Category   | Classes                                               |
| ---------- | ----------------------------------------------------- |
| Typography | `page-title`, `section-title`, `label`, `text-body`,  |
|            | `text-muted`, `text-faint`, `text-mono`, `link`       |
| Surfaces   | `card`, `inset`, `panel-section`                      |
| Badges     | `badge-accent`, `badge-muted`, `badge-warning`        |
| Status     | `status-dot-open`, `status-dot-success`               |
| Buttons    | `btn-primary`, `btn-outline`, `btn-ghost`, `btn-icon` |
| Forms      | `input`, `select`, `textarea`                         |
| Navigation | `nav-item`, `nav-item-active`, `nav-item-inactive`    |
| Utilities  | `filter-pill`, `skeleton` (loading shimmer)           |

Add new semantic classes to the theme block as needed — follow the same `@apply`
pattern. Keep raw Tailwind for one-off layout utilities (flex, padding, gap,
etc.).

## Theme Adaptation

Before building, check if the target project has a theme file (CSS variables,
Tailwind config, shadcn theme, etc.). If one exists, ask the user whether the
prototype should reflect the app's look. If yes, adapt the template's theme
block to approximate the app's color palette and general feel.

Keep it lightweight — the goal is visual correspondence, not pixel-perfect
reproduction. Swap the slate palette for the project's colors, adjust accent
colors, match light/dark mode. The semantic class names stay the same; only the
`@apply` definitions change.

## Lucide Icons

[Lucide](https://lucide.dev) provides 1500+ consistent SVG icons via CDN. Use
them for nav items, buttons, status indicators, and anywhere text alone is
ambiguous.

**Usage:** `<i data-lucide="icon-name" class="w-4 h-4"></i>` — the template's
MutationObserver handles initialization, including icons inside `x-show`/`x-if`
blocks.

**Sizing:** `w-3 h-3` (12px), `w-4 h-4` (16px — default), `w-5 h-5` (20px),
`w-6 h-6` (24px).

**Color:** Icons inherit `currentColor` — Tailwind text color classes work
directly.

**Common icons:**

| Category   | Icons                                                            |
| ---------- | ---------------------------------------------------------------- |
| Navigation | `menu`, `x`, `chevron-right`, `chevron-down`, `arrow-left`       |
| Actions    | `plus`, `pencil`, `trash-2`, `download`, `upload`, `search`      |
| Status     | `check`, `check-circle`, `alert-triangle`, `alert-circle`, `x`   |
| Objects    | `file-text`, `folder`, `image`, `link`, `settings`, `user`       |
| UI chrome  | `bell`, `layout-dashboard`, `shield`, `eye`, `eye-off`, `loader` |

Browse all icons at [lucide.dev/icons](https://lucide.dev/icons).

## Flow Design Process

1. **List states first** — write out every distinct screen/state before touching
   HTML (e.g., `idle → analyzing → populated → uploading → success`)
2. **Build the state switcher** — wire up all states even if some are
   placeholders; label each `N · Description`
3. **Fill most important states** — happy path first, then edge cases
4. **Add realistic app chrome** — sidebar nav, top header, card container even
   if not the focus
5. **Review with user** — click through states; iterate on design before
   committing to a plan

## Key Conventions

**State switcher** — Always the amber bar at top. This is what makes it a flow
mockup vs. a static screenshot.

**Realistic shell** — Wrap the mockup in app chrome. Avoids "floating widget"
syndrome where design looks good in isolation but context is unclear.

**File location** — `docs/projects/<project>/artifacts/<feature>-mockup.html`.
Commit to the branch as part of the project record.

**Resist real logic** — Buttons should just set `state = 'next'`, not implement
actual behavior. The goal is to show what happens, not make it work.

## Common Mistakes

- **Too many states in one file** — keep to one user flow (max 6-7 states).
  Split into multiple files if exploring multiple flows.
- **Missing the state switcher** — without it, reviewers can only see one state.
- **No app chrome** — floating a form on a white page makes layout decisions
  ambiguous.
- **Skipping states** — build all states (including error/empty) early, even as
  placeholders. This is where the most valuable design decisions happen.
- **Lucide + MutationObserver infinite loop** — calling `lucide.createIcons()`
  inside a raw `MutationObserver` callback creates an infinite loop: icons
  modify DOM → observer fires → icons modify DOM again. Always debounce with
  `requestAnimationFrame` as shown in the template.
- **`$watch` in `x-init` for state switcher setup** — using `$watch('state')` to
  auto-configure demo states (e.g., selecting a user when switching to
  "user-selected") causes cascading reactive updates that can freeze the page.
  Instead, put setup logic directly in the state button's `@click` handler:
  `@click="state = 'user-selected'; selectedUser = users[0];"`.
- **`x-if` on table rows** — wrapping `<tr>` elements in `<template x-if>` can
  break table column alignment because the conditional rows render in a separate
  DOM context. Use `x-show` on `<tr>` elements instead — they stay in the same
  table structure and columns align correctly.
- **Inline `x-data` with complex state** — large inline `x-data` objects cause
  Alpine.js parsing errors. Always use the `Alpine.data()` registration pattern
  in the template's script block.

## Skill Feedback

If anything in this skill was unclear, didn't work as expected, or could be
improved, write a `skill_feedback.md` file alongside the mockup output. Keep it
brief — a sentence or two is enough. Only do this if you have something
genuinely useful to report; don't force it.

```
## Skill Feedback
- [What was confusing or broken]
- [What would have helped]
```

This helps the skill evolve based on real usage.
