# Session — Slim the project-cli-toolkit Skill

**Date:** 2026-04-19 **Branch:** `recipe/project-cli-toolkit-slim` **Base:**
`develop`

## Summary

Rewrote the `project-cli-toolkit` recipe skill to act as the companion document
for the new
[`create-project-cli`](https://github.com/ichabodcole/seed-project-cli)
installer (`bunx create-project-cli`). The installer now ships the working
scaffold; the skill carries the design rationale and extension guide.

## Rationale

The original 1071-line recipe enumerated every file of the scaffold verbatim —
Phases 1-4 were essentially "here is the code, copy it." With the installer
live, that duplication becomes a drift hazard: update `agent-layer.ts` in the
installer, the skill's code block silently goes stale. Revising in place (rather
than creating a sibling skill) keeps one authoritative document and avoids
confusing users about which path to take.

## Shape change

- 1071 → 386 lines (~64% reduction).
- New "Two Paths" section at the top routes the default case to the installer.
- Mental model keeps the architecture diagram + core concepts + trade-offs but
  cuts the per-phase code walkthroughs.
- New "Extending the Scaffold" section covers what the installer doesn't: adding
  commands, app-scope patterns (short-ID resolver, pagination, long-running),
  growing past the flat commands layout, renaming scope labels, adapting auth to
  non-BetterAuth stacks, and test scaffolding.
- Gotchas trimmed to a file-pointer table (most gotchas live as comments in the
  installer-generated code) plus a short list of items that only matter when
  extending.
- Related Work section links the installer and sibling recipes.

## Bridge collaboration

CLI Project Starter Dev (building the installer) confirmed:

- The 11 gotchas from the original recipe are embedded as file/header comments
  in the generated code — the skill's new file-pointer table replaces duplicated
  prose.
- Short-ID resolver is deferred from v1 of the installer (server-side `idPrefix`
  filter is a paired precondition); the skill presents it as "wire this in
  yourself" with a note about potentially extracting as its own paired recipe
  later.

## Work Done

1. Reshape plan posted to bridge, confirmed with CLI Project Starter Dev.
2. Wrote new `SKILL.md` with the two-paths framing + extension guide.
3. Bumped `plugins/recipes` to 1.12.0 (minor — meaningful behavioral content
   change even though recipe count is unchanged).
4. Rebuilt `dist/` to sync.

Manifesto recipe count unchanged (still 20) — rewrote one skill, didn't add or
remove any.

## Quality Checks

- `npx prettier --check` on changed file — ✅ clean.
- `./scripts/build-skills-dist.sh` — ✅ 52 skills, 0 errors.

## Follow-ups

- Consider extracting the short-ID prefix resolver as its own recipe covering
  both halves (client helper + server `idPrefix` filter).
- If a "meta-starter" composing CLI + quality-gates + project-docs ever
  materializes, this skill should cross-link it.
