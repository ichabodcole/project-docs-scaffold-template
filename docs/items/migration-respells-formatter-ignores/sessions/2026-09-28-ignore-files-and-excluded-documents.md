---
type: session
title: Ignore files and excluded documents — 2026-09-28
description:
  The v3.0 migration keeps a formatter's ignore file protecting moved files at
  every point of a run, stop included, and never edits a document lint.exclude
  names.
tags: [migrations, prettier]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-28 }
---

# Ignore files and excluded documents — 2026-09-28

Part of
[Story-loom migration](../../../cycles/_archive/2026-09-story-loom-migration.md).

## Context

Row 5 of the story-loom readiness write-up. Story-loom's `.prettierignore`
protects byte-exact canon files under `docs/projects/…/checkpoint/canon/`, which
a tool reads back. The migration moved the folder and left the ignore line
behind, so the guide's after-run `prettier --write docs/` would have rewritten
them.

## What Happened

The first pass respelled `.prettierignore`, `.eslintignore`, `.gitignore` and
Biome's globs in place at phase 7, and flagged the ignore configs that are code
(`eslint.config.*`, `prettier.config.*`, `.prettierrc*`). A wildcard in the
entity position expands to one line per entity it covered, never to
`docs/features/*/…`, which would also ignore every feature filed later.
Negations, a leading `/`, comments and CRLF are kept; what can't be covered
exactly is left as written and named. `.gitignore` was added beyond the brief,
because Prettier 3 reads it.

The review ran it on a real story-loom clone: the canon survived the run and
`prettier --write docs/` byte for byte, where Prettier would otherwise have
changed 12 files. It also confirmed a data-loss bug already on develop: the
migration synthesized frontmatter and rewrote links in documents `lint.exclude`
names, because its exclude filter only covered files outside `docs/`. A
frontmatter-less canon file came out with ten lines of frontmatter prepended.
Story-loom's canon all has frontmatter and no links, so it wasn't exposed.

Cole decided the three open questions:

- **The stop window:** close it, not document it. Phase 5 now adds each new
  spelling beside its old line before the first move, and phase 7 drops the old
  lines, so a stop between the moves and phase 7 leaves the moved files ignored.
- **`.gitignore`:** respell paths, but a wildcard entity pattern becomes
  category-wide globs (`docs/features/*/…` and `docs/items/*/…`), because
  git-ignored content is machine-local and per-entity lines would un-ignore a
  teammate's folders and every entity filed later.
- **The excluded-documents bug:** fix it on this branch. A `docs/` file matched
  by `lint.exclude`, at its old or new path, moves with its folder and is never
  edited, and the run names it.

The review's smaller findings were fixed with them: `biome.jsonc` gets the parse
guard, a Biome string outside a list is never expanded into several, a spelled
path whose new form no longer covers its files is flagged, and brace patterns
and escaped `\!`/`\#` lines are flagged, not rewritten.

## Review

Census: the roster was read from this session's Agent tool listing of
dispatchable agent types. `general-purpose` (all tools, shell access) was the
review of record, briefed with the item, the write-up rows and the implementer's
open risk about excluded files. `feature-dev:code-reviewer` was rejected on
capability: `BashOutput` and `KillShell`, no `Bash`. `Plan` and `doc-reviewer`
were not the right shape for a code change of this size.

First pass, **With fixes**: no blocker caused by the branch; the excluded-files
data loss confirmed on develop; the stop window, `.gitignore` narrowing, an
unparseable `biome.jsonc`, unchecked coverage in the spelled-path branch and
gitignore brace semantics. It ran `npm run typecheck` (the editor's missing-name
errors were a stale language server), the test file (187 pass), `check:dist`,
the full gate (1867 pass), scratch-worktree integration tests including a
mid-phase-5 stop, direct calls with 28 patterns and real Biome 2.4.8, and a real
story-loom clone taken through v2.9 → v2.10 → v3.0.

Re-review, **Ready to merge: Yes**: each fix run, not read. The canon stayed
ignored at a mid-phase-5 stop, after `prettier --write` at the stop, after
deleting either spelling during the stop, and after completion; `git status`
stayed empty for later entities under the widened `.gitignore`; a bare canon
file with links under `lint.exclude` was byte-identical. On a fresh story-loom
clone the canon (16 files) and both Slidev decks were byte-identical, and the
run stopped at phase 10 on the same 293 known problems as before. It ran
`tsc --noEmit`, the test file (196 pass) and the full gate (1885 pass). Three
non-blocking edge cases were filed.

## Changes Made

- `migrate-v2.10-to-v3.0.ts`: an Ignore files section (`respellIgnorePattern`,
  `respellIgnoreText` and `respellBiomeText` in replace, add and drop modes;
  `addIgnoreSpellings` in phase 5 and `respellIgnoreFiles` in phase 7;
  `jsoncToJson`), and `computeChanges` skipping `lint.exclude` documents.
- `migrate-v2.10-to-v3.0.test.ts`: pattern tables, the canon integration test
  checked with Prettier's own `--file-info`, the mid-move stop, `.gitignore`
  with `git check-ignore`, the bare excluded canon, Biome `.jsonc`, and
  `--dry-run`.
- `v2.10-to-v3.0.md`: a new Ignore files section, phases 5 and 7, the stop and
  recovery notes, and `lint.exclude` documents moved but never edited.

## Follow-up

Filed from this session, in `triage`:

- [An excluded entity's entry document keeps its retired frontmatter](../../excluded-entity-keeps-retired-frontmatter.md)
- [A whole-folder wildcard in .gitignore widens silently](../../gitignore-whole-folder-wildcard-widens.md)
- [Dropping an old ignore line can move a negation's anchor](../../ignore-drop-reorders-negation.md)
- [Synthesized frontmatter reads a setext underline as the description](../../synthesized-description-reads-setext-underline.md)

---

**Related Documents:**

- [The migration respells retired paths in formatter ignore files](../item.md)
