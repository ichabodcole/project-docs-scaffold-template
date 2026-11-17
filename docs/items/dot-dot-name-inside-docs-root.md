---
type: item
title: Treat a name starting with two dots as inside the docs root
description:
  Two outside-the-root tests use a bare startsWith on two dots, so a folder
  named ..notes is refused by pdocs new and judged differently by two lint
  rules.
status: stable
lifecycle: ready
id: 01a1eaa7-44ae-748c-8a20-e44a70bde5f8
kind: bug
generated: { by: claude-fable-5-2, at: 2026-11-17 }
source: "#209"
priority: low
cycle: 2026-11-check-fixes-and-board-research
---

# Treat a name starting with two dots as inside the docs root

Three places decide "is this path outside the root?" with a bare
`startsWith("..")`, which also matches a name that only begins with two dots
(`..notes`, `...draft.md`):

- `scripts/pdocs/commands/new.ts`, `resolveFrom`:
  `pdocs new … --from docs/..notes/x.md` is refused with "is outside the docs
  root".
- `scripts/pdocs/lint/rules.ts`: one nesting check uses it, and disagrees with
  the other nesting check and with `within()` in `docs-lint/index.ts`.
- `scripts/pdocs/work.ts`, `ownerPosition`: the same test. The issue does not
  name this one.

`within()` already spells it correctly
(`rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)`), and
`seed.ts` carries a comment about the same mistake.

Reported in
[#209](https://github.com/ichabodcole/project-docs-scaffold-template/issues/209).

## Definition of done

- [ ] One exported helper answers "is this relative path outside?" and all three
      sites use it.
- [ ] A test shows `..notes/x.md` is inside the docs root for `pdocs new --from`
      and for the lint.
