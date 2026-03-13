# Auth Flows Mockup — 2026-03-13

## Context

Adding UI reference prototypes for authentication and account management flows
to the nuxt-betterauth-admin recipe skill. The admin dashboard mockup already
existed; this session fills in the missing auth-facing UX states.

## What Happened

Built `auth-flows-mockup.html` covering all auth and account management flows
across 22 states in 7 groups. Both reference apps (operator-mono and
dreamwood-app) were explored to pull actual field/state/copy patterns.

Started with a single flat switcher bar, which quickly ran too wide. This
prompted a design conversation about multi-flow mockups — settled on a
**two-level switcher**: group tabs on row 1, state buttons for the active group
on row 2. This pattern isn't documented in the html-mockup-prototyping skill yet
(captured in memory for a follow-on skill improvement branch).

Key structural decision: Change Email and Change Password were initially modeled
as standalone groups. After review, recognized they belong in a unified Account
Settings interface with tabs (Profile / Email / Password), matching how
operator-mono actually presents them. Collapsed the three groups into one and
rebuilt as a full app shell with a tab bar.

Dark theme applied to match `admin-dashboard-mockup.html` for consistency across
the reference set.

## Notable Discoveries

- The skill's html-mockup-prototyping starter template imports Lucide from
  `unpkg.com` but Alpine from `cdn.jsdelivr.net` — inconsistency worth fixing
- The `.card` semantic class includes `max-w-md` which can't be reliably
  overridden with `max-w-full` in Tailwind CDN; settings cards needed explicit
  full-width classes instead
- `alert-success` had `text-center` baked in while other alert classes were
  left-aligned — removed for consistency

## Changes Made

- `plugins/recipes/skills/nuxt-betterauth-admin/references/auth-flows-mockup.html`
  — new file
- `dist/recipes/skills/nuxt-betterauth-admin/references/auth-flows-mockup.html`
  — dist copy
- `plugins/recipes/.claude-plugin/plugin.json` — version bump 1.4.0 → 1.4.1

## Follow-up

- html-mockup-prototyping skill improvements captured in memory: two-level
  switcher pattern, form error classes, alert classes, light theme guidance,
  state count rule softening, Lucide CDN consistency

---

**Related Documents:**

- [Proposal](../proposal.md)
