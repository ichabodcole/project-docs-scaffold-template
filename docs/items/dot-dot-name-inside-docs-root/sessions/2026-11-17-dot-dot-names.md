---
type: session
title: Names starting with two dots — 2026-11-17
description:
  Replaced three bare two-dot prefix tests with one shared helper, so a folder
  named ..notes is read as inside the docs root by pdocs new and by the lint.
tags: [pdocs, lint]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# Names starting with two dots — 2026-11-17

Part of
[Check fixes and board research](../../../cycles/2026-11-check-fixes-and-board-research.md).

## Context

Issue #209: three places decided "is this path outside the docs root?" with a
bare `startsWith("..")`, which also matches a name that only begins with two
dots, such as `..notes`.

## What Happened

Tests came first. `pdocs new item --from docs/..notes/x.md` was refused as
outside the docs root, and the lint's template test did not find a seeded file
in such a folder. Both tests failed before the change.

`leavesRoot(rel)` in `scripts/pdocs/docs-lint/index.ts` now answers the question
once: `..`, a `../` prefix and an absolute path leave; anything else does not.
`resolveFrom` in `commands/new.ts`, `templateTest` and `linkBoundary` in
`lint/rules.ts`, `ownerPosition` in `work.ts` and the lint's own `within` use
it. The payload copies match.

## Notable Discoveries

- **`ownerPosition` never showed the bug.** It accepts only paths whose first
  segment is `features` or `items`, so a two-dot name was rejected two lines
  later anyway. The change there is for consistency, and its test is a
  regression guard that also passes on the old code.
- **`resolveFrom` now refuses an absolute relative path.** On Windows, a
  `--from` on another drive used to be written into `from:` as an absolute path.
  It is now the "outside the docs root" usage error. This is not tested.
- **The pre-commit hook does not run in a fresh worktree**, because husky's
  generated hook folder is untracked. `npm run check` was run by hand.

## Review

- **Roster:** the agent types this session can dispatch, as its Agent tool lists
  them.
- **Checked:** `general-purpose` (all tools, so it has a shell) and
  `feature-dev:code-reviewer` (its list has `BashOutput` and `KillShell` but no
  `Bash`, so it cannot run anything). The second was rejected on that ground.
- **Chosen:** `general-purpose`, briefed with the item's definition of done.
- **What it ran:** `git diff develop..HEAD`; greps for other two-dot
  comparisons; `cmp` of the four mirrored files; `npm run check:mirror` (clean);
  `npx tsc --noEmit` (exit 0); `bun test` on the three touched test files (327
  pass); and, in a scratch copy with the three source files restored from
  `develop`, the new tests again (2 fail, 1 pass). It started the full suite and
  stopped it after 180 s, so it did not verify the full suite.
- **Verdict:** ready to merge. Its one suggestion, using the helper in
  `linkBoundary` too, was applied after the review; the full gate ran after that
  change.

---

**Related Documents:**

- [Treat a name starting with two dots as inside the docs root](../item.md)
