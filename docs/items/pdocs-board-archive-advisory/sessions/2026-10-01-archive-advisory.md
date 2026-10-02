---
type: session
title: Archive advisory — 2026-10-01
description:
  Live views suggest archiving once unarchived finished work of a type passes
  checks.archive.threshold, and a bad setting becomes an advisory rather than a
  refusal.
tags: [pdocs, advisories, archive]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-01 }
---

# Archive advisory — 2026-10-01

Part of
[pdocs work views and advisories](../../../cycles/2026-10-pdocs-views.md)

## Context

This repository's board held 66 unarchived finished items, and nothing suggested
archiving them. The item sets one rule across items, features and cycles: live
views hide archived work unless a flag asks, and one threshold,
`checks.archive.threshold`, decides when to suggest archiving. It ran in
parallel with the [portfolio view](../../pdocs-work-portfolio-view.md), which
was built in a git worktree.

## What Happened

- **The new `scripts/pdocs/advisories.ts`.** The shared advisory shape is
  `Advisory {id, message, action, refs?}`. It provides:
  - `archiveAdvisory`, which is pure and uses a strict greater-than;
  - `adviseArchive`, the one call a view makes;
  - `advisoryLines` for text output.
- **The threshold.** `checks.archive.threshold` defaults to 25 and is counted
  separately for each type. The archive advisory lists its candidates oldest
  first, per type and together in `refs`.
- **The config reader.** `docs-lint/config.ts` reads the new `checks` section
  through a table of section readers. An absent section is skipped, so
  draft-review advisories can add `workItemReview` as a pure addition. Unknown
  keys inside `checks.archive` are issues; unknown sibling sections are not, for
  forward compatibility.
- **A bad setting never takes a view down.** The view runs and carries one
  `bad-config` advisory, while `pdocs check` reports `BAD CONFIG` and exits 9.
  The first version refused instead (exit 6). The review pointed out that the
  next item requires read-only views to stay usable, and Cole chose the
  advisory.
- **Which views hide archived work:**
  - `view board` hides it, and gains `--all`.
  - **`view scope` changed:** it now hides archived records unless `--all` is
    given. The spec's sentence "supplements the views rather than changing their
    default filtering in this pass" lost to its definition of done (live views
    hide archived work). Nothing in the skills calls `view scope`.
  - `unreleased`, `released`, `feature <slug>` and `cycle <slug>` keep archived
    records, as release accounting, history, or the record of one entity.
- **The skill.** `sweep-project` gains an Advisory Path. It offers a concrete
  selection, scans the selection's prose in one batched `git grep`, and archives
  only what the user agreed to.

## Verification

- 26 tests in `view-advisory.test.ts` run the real CLI on temp trees: config
  defaults and invalid shapes, the strict boundary for each type, custom limits,
  zero, archived records not counting, text/JSON parity, `advisories` on every
  view, oldest-first candidates, `--all`, and no writes. Mutation checks in
  review failed the intended tests.
- The final gate passed with 1,474 tests.
- On this repository, `pdocs view board` advises on 66 finished items.

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

- `view board`, JSON, `--features` and `--all` on this repository;
- `view scope` for all six scopes, with and without `--all`;
- invalid and misspelt thresholds in a scratch worktree;
- `pdocs archive` on a candidate (count 66 to 65, then reverted);
- five mutations of the advisory code;
- the full gate (1,470 pass);
- `git merge-tree` against the portfolio branch.

Its findings: the Advisory Path skipped Step 3's prose scan; a README overstated
what the text advisory names; a typo'd key was silently ignored; a nested
parenthesis; test gaps (the date order, `advisories` on every view); and three
design points for the next item (refusal on bad config, a common `refs` field,
`readChecks` returning early). Cole approved all of them.

**Second pass (the fix commits): "Ready to merge: Yes".** It ran:

- ten `checks` shapes against `view board` and `check`;
- `refs` against the candidates (86, unique);
- the `sweep-project` `git grep` pattern on all 66 candidates, matching a looser
  check exactly;
- an archive showing that a path-valued `from:` is rewritten;
- four mutations;
- the gate (1,474 pass).

Its two wording notes were fixed before landing:

- `sweep-project` wrongly said `from:` is never rewritten, and the Advisory Path
  now drops `from:` hits too;
- an advisory run uses its own acceptance block.

## Follow-up

The portfolio view rebases onto this and wires in
`adviseArchive(ctx, model, ["feature", "cycle"])`, with wording suited to a view
that already hides finished features. `pdocs-draft-review-advisories` will reuse
the section table, `bad-config` and `refs`.

---

**Related Documents:**

- [Suggest archiving finished work when a live view grows](../item.md)
