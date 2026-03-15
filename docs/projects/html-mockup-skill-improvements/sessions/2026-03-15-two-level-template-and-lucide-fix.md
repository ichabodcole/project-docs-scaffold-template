# Two-Level Template and Lucide Fix — 2026-03-15

## Context

Two improvements to the `html-mockup-prototyping` skill: adding a second starter
template for multi-group flows, and fixing a Lucide icon initialization bug that
was present in the original template.

## What Happened

**Lucide init bug fix (`state-flow.html`):** The template called
`lucide.createIcons()` before `alpine:initialized`, meaning icons inside
`x-for`-rendered rows (which don't exist in the DOM until Alpine processes them)
were never initialized on first load. The fix — moving the call inside the
`alpine:initialized` listener — was already validated while building the MCP
management mockup, where the same bug was discovered and fixed in production.

**New template (`group-state-flow.html`):** Previously the skill pointed to
`nuxt-betterauth-admin/references/auth-flows-mockup.html` as the two-level
switcher example. That external reference breaks self-containment — agents
working in projects without the recipes plugin can't access it. The new template
is a clean, minimal starting point with 3 placeholder groups and 7 states,
correct `selectGroup`/`selectState` separation, and a comment explaining the
content structure pattern (modals inside group sections, `x-show` on group vs.
state).

**SKILL.md updates:** Expanded "Starter Template" → "Starter Templates" with
when-to-use guidance for each. Replaced the external recipe reference in Key
Conventions with the local template pointer. Updated the Pattern References
table to match.

## Changes Made

- `plugins/project-docs/skills/html-mockup-prototyping/templates/state-flow.html`
  — Lucide init fix
- `plugins/project-docs/skills/html-mockup-prototyping/templates/group-state-flow.html`
  — new two-level switcher template
- `plugins/project-docs/skills/html-mockup-prototyping/SKILL.md` — updated
  Starter Templates section and Pattern References table
- `plugins/project-docs/.claude-plugin/plugin.json` — bumped to 1.17.0
- `plugins/project-docs/README.md` — version history entry

---

**Related Documents:**

- [html-mockup-prototyping SKILL.md](../../../plugins/project-docs/skills/html-mockup-prototyping/SKILL.md)
