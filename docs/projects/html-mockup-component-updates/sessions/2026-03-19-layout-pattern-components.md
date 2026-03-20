# Layout Pattern Components — 2026-03-19

## Context

Adding layout-level component patterns to the `html-mockup-prototyping` skill's
component reference. These were identified during an agent builder prototype in
a separate project — the agent flagged common layout patterns that were tricky
to implement correctly and would benefit from reusable examples.

## What Happened

Received an updated `components.html` from an external agent session. The file
added 3 new layout components (sections 13-15) under a "Layout Patterns" section
divider, separate from the existing widget-level components (1-12).

New components:

1. **Collapsible Sidebar** — expanded mode with labels + collapsed icon-only
   mode. Smooth width transition, badge indicators, active state, title
   attribute tooltips in collapsed mode.

2. **List/Detail Split Pane** — scrollable list on left, content pane on right
   with pinned header. Demonstrates the `min-h-0` scroll containment pattern
   that's easy to get wrong in flex layouts.

3. **Stepper / Multi-Step Flow** — numbered dots with connecting lines,
   Back/Next navigation, step content switching. Final step shows "Complete"
   action instead of "Continue".

All components follow established conventions: `dark:` variants on all colors,
`pointer-events-none` on icons inside buttons, self-contained `x-data` where
appropriate, semantic CSS classes in the theme block.

## Changes Made

- `plugins/project-docs/skills/html-mockup-prototyping/references/components.html`
  — added 3 layout components + new CSS classes
- `plugins/project-docs/skills/html-mockup-prototyping/references/index.md` —
  updated component list
- `plugins/project-docs/.claude-plugin/plugin.json` — bumped to 1.19.0
- `plugins/project-docs/README.md` — version history entry
- `dist/` — rebuilt
