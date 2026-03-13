# Skill Improvements from Auth Flows Mockup — 2026-03-13

## Context

While building `auth-flows-mockup.html` for the nuxt-betterauth-admin recipe
skill, several gaps and rough edges in the `html-mockup-prototyping` skill were
identified. This session applies those improvements as a targeted patch.

## What Happened

Applied 7 improvements captured in memory after the auth flows mockup session:

1. **Two-level state switcher** — documented in Key Conventions with full markup
   snippet and reference to
   `nuxt-betterauth-admin/references/auth-flows-mockup.html`
2. **State count rule softened** — changed "max 6-7 states" to acknowledge that
   the two-level switcher can handle multi-flow coverage; real concern is
   reviewability, not a hard count
3. **Form error classes** — added `input-error` and `field-error` to the Forms
   row in the Theme Classes table
4. **Alert classes** — added new Alerts row: `alert-error`, `alert-success`,
   `alert-info`, `alert-warning`
5. **Realistic shell guidance** — clarified step 4 of Flow Design to distinguish
   dashboard chrome (sidebar + header) from auth/focused page chrome (centered
   card on plain background)
6. **Light theme guidance** — added explicit note that adapting to a light theme
   is a near-complete rewrite of all `@apply` definitions, not just a palette
   swap
7. **Lucide CDN URL** — fixed `templates/state-flow.html` to use
   `cdn.jsdelivr.net` for Lucide (was `unpkg.com`), matching the Alpine CDN

Also updated Pattern References table to include the two-level switcher example.

## Changes Made

- `plugins/project-docs/skills/html-mockup-prototyping/SKILL.md` — 7
  improvements applied
- `plugins/project-docs/skills/html-mockup-prototyping/templates/state-flow.html`
  — Lucide CDN URL fixed
- `plugins/project-docs/.claude-plugin/plugin.json` — version bump 1.12.2 →
  1.13.0
- `plugins/project-docs/README.md` — version history entries added for 1.12.0
  through 1.12.3 (prior versions were missing)
- `dist/` — rebuilt via build script

---

**Related Documents:**

- [Proposal](../proposal.md)
- [Auth flows mockup session](../../nuxt-betterauth-admin-ui-references/sessions/2026-03-13-auth-flows-mockup.md)
