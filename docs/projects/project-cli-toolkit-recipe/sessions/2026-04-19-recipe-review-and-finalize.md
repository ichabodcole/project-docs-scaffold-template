# Session — Project CLI Toolkit Recipe Review & Finalize

**Date:** 2026-04-19 **Branch:** `recipe/project-cli-toolkit` **Base:**
`develop`

## Summary

Reviewed and refined the new `project-cli-toolkit` recipe skill (PR #109),
extracted from Story Loom's `loom` CLI. The recipe captures a dual-audience CLI
pattern — one binary serving both humans (TTY-aware text output) and AI agents
(structured `{ok, data, meta}` JSON envelopes) via citty, with a
machine-readable manifest for agent discovery and scope-tagged command groups.

## Work Done

1. **Review** — Pulled PR #109 and read the 930-line SKILL.md end-to-end.
   Flagged three issues:
   - Source-project identifiers (`Loom*`, `LOOM_*`, `loomFetch`) leaked into
     what should be generic placeholder code
   - Helpers referenced in snippets but never defined: `parseEnvFile`,
     `buildQuery`, `nowMillis`, `CittyCommand` / `Manifest*` types
   - Minor: `resolveValue`'s `typeof v === "function"` check edge case
2. **Fixup** (commit `e14c1fa`) — Normalized naming to `myproj` / `MyProj` /
   `MYPROJ_` placeholder tokens with an explicit Naming Convention table near
   the top of the recipe; added inline definitions for all missing helpers;
   added caveat comment on `resolveValue`.
3. **Scaffold checklist** (commit `a88c0e3`) — Bumped `plugins/recipes` to
   `1.11.0` (new skill = minor); updated `docs/PROJECT_MANIFESTO.md` recipe
   count from 19 to 20; rebuilt `dist/` to include the new skill.
4. **Bridge collaboration** — Joined the "CLI Starter Project Bridge" with
   StoryLoom (source) and CLI Project Starter Dev (target, building a
   `create-project-cli` scaffold). StoryLoom deposited recipe content; I
   contributed scaffold-strategy and abstraction-guidance knowledge (what to
   parameterize vs. hardcode, bunx installer design, cookiecutter vs. bunx
   tradeoff), and answered a direct question about whether to bundle
   quality-gates into the v1 installer (defer; README pointer instead).

## Quality Checks

- `npm run format:check` — ✅ all files Prettier-clean
- `npm run validate:skills` — ✅ 52 skills valid, 0 errors
- Recipe count verified: 21 dirs in `plugins/recipes/skills/`, minus
  `create-recipe` (meta) = 20 implementation recipes.

## Follow-ups

- Consider spinning up a separate `create-project-cli` starter repo (bunx
  installer) that emits the core scaffold from this recipe. Discussed on the
  bridge — the target agent is building exactly that.
- The recipe links to the quality-gates recipe as a recommended next step; a
  future "meta-starter" could compose CLI + quality-gates + project-docs.
