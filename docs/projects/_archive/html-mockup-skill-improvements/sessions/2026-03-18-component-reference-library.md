# Component Reference Library — 2026-03-18

## Context

Adding a reusable UI component reference to the `html-mockup-prototyping` skill.
Components were extracted from patterns that appeared across multiple recipe
mockups (media-library, MCP management, admin dashboard, agent feedback).

## What Happened

Surveyed 7 mockup files across 5 recipe skills to identify repeated UI patterns.
Selected components based on frequency (appeared in 3+ files) and complexity
(non-trivial to get right from scratch).

Built `references/components.html` with 12 interactive component demos:

1. Toggle group / segmented control (icon and text variants)
2. Switch / toggle (sliding dot)
3. Search input with clear button
4. Tag input (add/remove with clear all)
5. Modal dialog (confirm + form variants with close X)
6. Collapsible section (self-contained x-data)
7. Empty state (filter-aware messaging)
8. Custom select dropdown (replaces native select for consistent styling)
9. Dropdown menu (3-dot trigger with divider and destructive action)
10. Tooltip (above and right positions with CSS arrow)
11. Tabs (bottom-border active indicator)
12. Theme toggle (sun/moon, toggles dark class on html element)

**Issues discovered and fixed during development:**

- **Tag removal click handler on wrong element** — `@click` was on the `<i>`
  icon which had `pointer-events-none`, so clicks never fired. Moved handler to
  parent `<span>`.
- **overflow-hidden clipping** — `.card` class includes `overflow-hidden` which
  clips absolutely-positioned dropdowns, tooltips, and select option lists.
  Fixed with `!overflow-visible` on affected cards. Added as a Common Mistake in
  SKILL.md since this is a recurring issue.
- **Native select inconsistency** — replaced native `<select>` elements with
  custom Alpine-powered dropdowns for consistent cross-browser styling.
- **Light/dark theme support** — all semantic classes updated with `dark:`
  variants. Theme toggle demonstrates the power of semantic class abstraction —
  switching themes requires zero markup changes.

## Changes Made

- `plugins/project-docs/skills/html-mockup-prototyping/references/components.html`
  — new file, 12 interactive component demos with light/dark theme support
- `plugins/project-docs/skills/html-mockup-prototyping/references/index.md` —
  added components.html entry
- `plugins/project-docs/skills/html-mockup-prototyping/SKILL.md` — added
  overflow-hidden common mistake, updated Pattern References table
- `plugins/project-docs/.claude-plugin/plugin.json` — bumped to 1.18.0
- `plugins/project-docs/README.md` — version history entry

---

**Related Documents:**

- [html-mockup-prototyping SKILL.md](../../../plugins/project-docs/skills/html-mockup-prototyping/SKILL.md)
- [components.html](../../../plugins/project-docs/skills/html-mockup-prototyping/references/components.html)
