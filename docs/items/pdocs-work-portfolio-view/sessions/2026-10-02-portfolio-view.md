---
type: session
title: Portfolio view — 2026-10-02
description:
  pdocs view portfolio summarises current cycles and features with item counts
  by work state, folds empty history under --all, and carries the archive
  advisory in a hidden-view wording.
tags: [pdocs, views, portfolio]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-02 }
---

# Portfolio view — 2026-10-02

Part of
[pdocs work views and advisories](../../../cycles/2026-10-pdocs-views.md)

## Context

`find` listed cycles and features one record at a time, and
`view board --features` mixed features into every item group. There was no
concise answer to "what cycles and features are in play, and how far along is
each". The branch was built in a git worktree, in parallel with the
[archive advisory](../../pdocs-board-archive-advisory/item.md), and rebased onto
it once that landed.

## What Happened

- **`viewPortfolio(model, {all})` in `work.ts`** is a pure function.
  - **Current entries:** planned and active cycles, and unarchived features not
    `done` or `dropped`. `isCurrentCycle` and `isCurrentFeature` exclude
    archived records even in an open lifecycle.
  - **Counts:** per entity, in the `unstarted / started / completed / cancelled`
    groups.
  - **Membership** uses the same rule as `view cycle` and `view feature`.
  - **Items in no cycle or feature:** one line; archived items are not counted.
- **The text layout came from a review round with Cole**, run against a first
  draft on this repository:
  - zeros print as `·`;
  - past features with no items fold into one line per lifecycle, with the
    archived share;
  - current features never fold;
  - past cycles and past features are separate sections, newest first;
  - slugs and titles are both shown, with counts and no item ids.
- **`--all` now means one thing per view.** It is a single option entry, and a
  `WITH_ALL` check refuses it on views it does not apply to:
  - on `board` and `scope`, it includes archived work;
  - on `portfolio`, it adds past cycles and features, archived or not.
- **The archive advisory.** Portfolio calls
  `adviseArchive(ctx, model, ["feature", "cycle"], { why: ARCHIVE_WHY_HIDDEN })`.
  The first wording claimed archiving shortens `--all`. That was false, because
  `--all` lists past work archived or not, and review caught it. It now reads
  "This view already leaves them out; archiving moves them out of the live
  folders."
- **Docs.** SCHEMA (both copies), the work READMEs and the pdocs reference
  describe the view and its inclusion rules. Items whose `cycle` or `parent`
  names nothing are counted nowhere; `pdocs check` reports them.

## Verification

- `view.test.ts` runs the real CLI on temp trees. It pins:
  - inclusion and the text layout;
  - text/JSON parity, empty states and `--all`;
  - archived open features and cycles, the no-fold rule for current features,
    and the unknown-state suffix.
- A mutation of each rule fails its test.
- The gate passed with 1,497 tests on the reviewed tree.
- On this repository, the active cycle's counts match `view cycle`, and
  `skill-surface-cleanup` matches `view feature`.

## Review

Census, read from this session's list of dispatchable agent types (the Agent
tool's roster):

- **`general-purpose`** (Tools: `*`) has shell access. Chosen, briefed for this
  branch, as the review of record.
- **`feature-dev:code-reviewer`** lists Glob, Grep, LS, Read, NotebookRead,
  WebFetch, TodoWrite, WebSearch, KillShell and BashOutput, with no `Bash`.
  Rejected on capability.
- **`code-simplifier:code-simplifier`** and **`project-docs:docs-curator`** (All
  tools) have shell access. Rejected on fit.

**First pass: "Ready to merge: With fixes".** It ran:

- `view portfolio`, with and without `--all`, on this repository, compared
  against `view cycle` and `view feature`;
- `pdocs archive feature/work-taxonomy` on a scratch copy, showing `--all` kept
  its 28 lines;
- an edge-case tree: empty, planned only, archived features and cycles, an
  unknown lifecycle, broken references, and thresholds 5, `"x"` and `-1`;
- 12 mutations, 4 of which survived;
- the full gate (1,495 pass);
- `git merge-tree` against the lookup branch.

Its findings:

- the false `--all` claim in `ARCHIVE_WHY_HIDDEN`;
- no tests for the four rules whose mutations survived;
- a stale test comment;
- undocumented uncounted broken references.

Two nits were kept as they are: `0 cancelled` in the prose line, and long titles
not being truncated. Cole approved the fixes.

**Second pass (`git diff` of the fix commit): "Ready to merge: Yes".** It ran:

- `git grep` for the old wording;
- a diff of both SCHEMA copies;
- the four mutations again in a scratch worktree, each failing exactly one new
  test;
- the full gate (1,497 pass).

## Follow-up

- The [cycle filename lookup](../../pdocs-cycle-filename-lookup/item.md) rebases
  onto this. Both re-padded the views table in SCHEMA and the pdocs reference.
- The [pdocs-board-landscape](../../pdocs-board-landscape.md) research can use
  this view as input.

---

**Related Documents:**

- [Add a portfolio view for cycles and features](../item.md)
