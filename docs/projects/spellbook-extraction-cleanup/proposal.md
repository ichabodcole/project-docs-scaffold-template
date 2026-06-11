# Spellbook Extraction — Toolbox Cleanup

**Status:** Approved **Created:** 2026-06-11 **Author:** Cole Reed

---

## Overview

The four "agent-surface spells" — `digestify`, `tuskboard`, `grapevine`, and
`magpie` — have been extracted into a standalone [`spellbook`] repo, which is
now their single source of truth. (`tuskboard` was renamed `bounty` in
`spellbook` as a branding change; the other three kept their names.) This
project records removing those skills from the `toolbox` plugin so there is
exactly one canonical home for each.

[`spellbook`]: the standalone repo the spells were extracted into.

## Problem Statement

The spells originated and matured here, inside the `toolbox` plugin, but are now
maintained in `spellbook`. Keeping copies in `toolbox` creates two sources of
truth: divergence risk, double-maintenance, and ambiguity about which copy is
canonical. (The most recent example: a V1.6.8 grapevine guidance fix landed here
days before this cleanup — exactly the kind of change that would have to be
mirrored twice.)

## Proposed Solution

Remove the four skills from `toolbox` (source + `dist/`), keep everything else
in the plugin, and bump `toolbox` to a **major** version (removing skills is a
breaking change). Update the live, current-state references that named the
removed skills; leave the historical record untouched.

**Kept in toolbox:** `html-mockup-prototyping`, `maestro-testing`,
`screenshot-optimization`.

## Scope

**In Scope:**

- Delete the four skill directories from `plugins/toolbox/skills/` and rebuild
  `dist/`.
- Bump `toolbox` `2.10.0 → 3.0.0` (major — breaking removal).
- Update live current-state references: `PROJECT_MANIFESTO.md` toolbox blurb,
  `PROJECT-SUMMARY.md` tree comment.
- Decouple the `agent-surface-bun` recipe from the now-removed in-repo
  implementations (it kept hard file pointers into `toolbox/skills/...`). Make
  it implementation-agnostic and point at `spellbook` as the canonical example
  home. Bump `recipes` `2.0.0 → 2.1.0` (minor — guidance change).

**Out of Scope:**

- Rewriting historical records. `docs/projects/*`, `docs/memories/*`,
  investigations, reports, and `CHANGELOG.md` document work that genuinely
  happened; removing a skill does not un-happen its development history. They
  stay as-is.
- Hardcoding `spellbook`'s internal file layout or URL into the recipe — the
  recipe names the repo as the canonical example home without coupling to a
  structure that may still move.

## Impact & Risks

**Benefits:** One source of truth per spell; no double-maintenance; `toolbox`
narrows to documentation-adjacent utilities.

**Risks:** Anyone who installed `toolbox` for these spells loses them on upgrade
— signalled by the major bump. The `agent-surface-bun` recipe loses its in-repo
"read the real thing" pointers; mitigated by naming `spellbook` as the example
home and establishing a feedback loop (improvements found in `spellbook` flow
back into this recipe via PR/issue).

**Complexity:** Low.

## Success Criteria

- `plugins/toolbox/skills/` contains only the three retained skills; `dist/`
  matches after rebuild; validation passes.
- No live (current-state) reference names a removed skill as present in this
  repo.
- `format:check` passes and the scaffold-update-checklist is satisfied.

---

## Notes

The `agent-surface-bun` recipe is intentionally an abstraction, not tied to one
implementation — consistent with how most recipes in this library reference
sources in other repos. `spellbook` is its concrete example home going forward.
