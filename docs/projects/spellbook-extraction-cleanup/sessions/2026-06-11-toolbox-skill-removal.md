# Toolbox Skill Removal — 2026-06-11

## Context

Executing the [proposal](../proposal.md): remove the four agent-surface spells
(`digestify`, `tuskboard`, `grapevine`, `magpie`) from the `toolbox` plugin now
that they live in the standalone `spellbook` repo as their single source of
truth. Keep the rest of `toolbox` intact. Done on branch
`refactor/toolbox-remove-spellbook-skills`.

## What Happened

Straightforward removal, with the interesting work being reference hygiene
rather than the deletion itself.

- **Deleted** the four skill directories from `plugins/toolbox/skills/`. One
  wrinkle: `git rm -r` left the `digestify/` directory on disk because of an
  untracked `.DS_Store` — removed the leftover dirs manually. Retained:
  `html-mockup-prototyping`, `maestro-testing`, `screenshot-optimization`.
- **Version bump:** `toolbox` `2.10.0 → 3.0.0`. Removing skills is breaking, so
  major per the scaffold-update-checklist semver guidance.
- **`dist/` rebuild** via `./scripts/build-skills-dist.sh` (which `rm -rf`s and
  regenerates `dist/`), so the removed skills dropped out of the bundle cleanly.
  Validation passed; 38 skills total.
- **Live current-state references** updated to stop naming removed skills as
  present here: `PROJECT_MANIFESTO.md` toolbox blurb and `PROJECT-SUMMARY.md`
  tree comment.
- **Historical records left untouched** — `docs/projects/*`, `docs/memories/*`,
  investigations, reports, `CHANGELOG.md`. They document work that happened;
  this repo treats `docs/` as append-only history.
- **Decoupled the `agent-surface-bun` recipe.** It was built around the
  now-removed implementations with hard pointers like
  `plugins/toolbox/skills/digestify/scripts/review.ts`. Rewrote it to be
  implementation-agnostic, naming `spellbook` as the canonical example home
  without hardcoding its internal layout. Bumped `recipes` `2.0.0 → 2.1.0`
  (minor — guidance change). Also softened the matching `INDEX.md` blurb.

## Notable Discoveries

- **`tuskboard` is `bounty` in `spellbook`** — a branding rename. So every soft
  reference that points _at_ spellbook uses `bounty`, while references
  describing the historical toolbox skill keep `tuskboard`. The other three
  spells kept their names. Caught and corrected the recipe + manifesto +
  proposal accordingly mid-session.
- The recipe is intentionally an abstraction; most recipes in this library point
  at sources in other repos anyway, so dropping the in-repo pointers is in
  keeping with house style, not a regression.

## Follow-up

- As patterns improve in `spellbook`, fold learnings back into the
  `agent-surface-bun` recipe via PR/issue (noted in the recipe itself).
- If/when `spellbook`'s public URL and file layout stabilize, the recipe can
  graduate from naming the repo to linking specific canonical files.

---

**Related Documents:**

- [Proposal](../proposal.md)
