---
type: session
title: Heading anchors that match GitHub — 2026-11-17
description:
  Ported github-slugger's rules into the docs lint so non-ASCII headings,
  headings with links and repeated headings get the anchors GitHub gives them.
tags: [pdocs, lint, anchors]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# Heading anchors that match GitHub — 2026-11-17

Part of
[Check fixes and board research](../../../cycles/2026-11-check-fixes-and-board-research.md).

## Context

Issue #208: `pdocs check` reported links to valid GitHub anchors as
`MISSING ANCHOR`. The lint's `slug` dropped non-ASCII letters and slugged a
heading link's target with its text, and `headingSlugsOf` collapsed repeated
headings into one anchor.

## What Happened

`slug` and `headingSlugsOf` in `scripts/pdocs/docs-lint/index.ts` are now an
in-tree port of `github-slugger`, which `pdocs` cannot depend on:

- **Characters.** Letters, marks, decimal digits, letter numbers and `_` are
  kept in any script. Only literal spaces become hyphens.
- **Links.** An inline link is reduced to its text. A code span and a backslash
  escape are matched first and kept.
- **Repeats.** A repeated heading is numbered `-1`, `-2` in document order,
  skipping an anchor another heading already took.

Tests were written first; nine failed on the old code. Two existing tests
asserted the bug and were replaced. This repository linted clean before and
after.

## Notable Discoveries

- **`²` and `½` are dropped, against the item's first wording.** The issue
  suggested `\p{N}`. `github-slugger` drops "other numbers", and matching GitHub
  is the point, so the code follows it and the item's definition of done was
  reworded to say so.
- **The first link regex broke two rare forms** that were right before: a link
  inside a code span, and escaped brackets. The review found both; they are
  fixed and tested.
- **A tab or non-breaking space in a heading is now dropped**, where it used to
  become a hyphen. This matches GitHub.
- **75 anchors this repository used to expose are gone**, 73 of them in
  `CHANGELOG.md`: old slugs that included a link's target. Nothing linked to
  them.
- **Not confirmed against a rendered GitHub page.** GitHub's markdown API
  returns headings without anchor ids. The evidence is `github-slugger`'s source
  and GitHub's "Section links" documentation.

## Review

- **Roster:** the agent types this session can dispatch, as its Agent tool lists
  them.
- **Checked:** `general-purpose` (all tools, so it has a shell) and
  `feature-dev:code-reviewer` (its list has `BashOutput` and `KillShell` but no
  `Bash`, so it cannot run anything). The second was rejected on that ground.
- **Chosen:** `general-purpose`, briefed to test against the real package.
- **What it ran:** `git diff develop..HEAD`; `bun add github-slugger` and
  `@unicode/unicode-13.0.0` in a scratch directory; a sweep of every code point,
  20,000 random headings, 3,015 repeat sequences and 33 markup cases against
  `github-slugger` 2.0.0; the branch's tests against `develop`'s source (8 fail,
  198 pass); `pdocs check` timed five times on each tree (no change);
  `npm run check:mirror`, `npx tsc --noEmit` and `bun test` on the lint's test
  file (all clean).
- **Verdict:** with fixes. The character class differs from `github-slugger`'s
  only on code points assigned after Unicode 13, and repeat numbering agreed on
  every sequence. Its three asks were all done: the item's wording was
  corrected, the two link regressions were fixed, and the gaps that predate this
  branch were filed. The full gate ran after those changes.

## Follow-up

Filed from the review, all in `triage`:

- [Slug a heading's rendered text, not its markup](../../heading-anchor-inline-markup.md)
- [Find the headings GitHub finds](../../heading-detection-phantoms-and-misses.md)
- [Decode and lowercase a link's anchor before checking it](../../anchor-link-encoding-and-case.md)

---

**Related Documents:**

- [Match GitHub's heading anchors in the link check](../item.md)
