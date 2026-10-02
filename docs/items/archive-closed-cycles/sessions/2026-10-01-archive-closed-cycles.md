---
type: session
title: Archive closed cycles — 2026-10-01
description:
  pdocs archive moves a closed or abandoned cycle to cycles/_archive/ and
  rewrites its links, and the docs, lint and skills now say cycles may be
  archived.
tags: [pdocs, cycles, archive]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-01 }
---

# Archive closed cycles — 2026-10-01

Part of
[pdocs work views and advisories](../../../cycles/_archive/2026-10-pdocs-views.md)

## Context

Cycles were the one work entity with no `_archive/`. SCHEMA, the cycles README
and `sweep-project` all said a closed cycle is never moved, and `pdocs archive`
refused one. Cole decided (2026-09-28, extended 2026-10-01) that cycles follow
the same archive rules as items and features.

## What Happened

An implementer (a subagent) built the change while a second implementer worked
the
[pdocs small fixes](../../catalog-line-wraps-into-a-list/sessions/2026-10-01-pdocs-small-fixes.md)
in a separate git worktree. A replay archiving all eight of this repository's
closed cycles found that rewritten links pushed lines past 80 columns, leaving
23 files Prettier-dirty. The small-fixes branch's link reflow fixed that at its
source, so that branch landed first. This one was then rebased onto it, which
conflicted only on the SCHEMA lint table, in both copies. The replay is now
clean: 93 links rewritten, with `prettier --check` and `pdocs check` both clean
afterwards.

## Changes Made

- **The CLI:**
  - `pdocs archive cycle/<slug>` moves a `closed` or `abandoned` cycle through
    the shared `moveAndRewrite`. It refuses a `planned` or `active` one,
    suggesting `closed` or `abandoned`, and archiving twice is a no-op.
  - `work.ts` marks `cycles/_archive/<slug>.md` as archived, keeping its slug,
    so `view cycle`, `find --cycle` and items' `cycle:` fields are unaffected.
  - `new cycle` refuses a slug an archived cycle holds.
- **The lint:**
  - `ARCHIVED NOT TERMINAL` and `DUPLICATE SLUG` cover cycles.
  - `cycles/_archive/` is read even when `lint.skip` lists `_archive`.
- **Docs and payload:** SCHEMA, the cycles README, AGENTS, the READMEs and the
  scaffold checklist now name the third archive. `docs/cycles/_archive/` ships
  in the payload, and `ownership-coverage.test.ts` asserts it.
- **Skills:**
  - `sweep-project`'s cycle path ends by offering to archive, which needs its
    own yes after closing.
  - `finalize-branch`, `review-docs` and the pdocs reference name the cycle
    archive.

No live view lists cycles yet, so there was nothing to hide; hiding archived
cycles and counting them in the advisory belong to
[pdocs-board-archive-advisory](../../pdocs-board-archive-advisory/item.md). No
migration step is needed, because the first archive creates the folder.

## Verification

- **Tests:** 16 new ones, built on real temp trees and the real CLI.
  - The Prettier test uses a line that grows from 76 to 85 columns, and fails
    with the reflow disabled.
- **The gate:** passed on each rebased commit (run by hand, since a rebase runs
  no hook) and on each new commit. The final gate passed 1,448 tests.

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

**First pass: "Ready to merge: With fixes".** In a scratch worktree it archived
five real cycles with the CLI, and probed:

- links from sessions, items and other cycles, and a cycle's link to itself;
- the `after:` field, which the lint has never resolved, before this branch or
  since;
- archiving twice, planned and active refusals (the tree byte-identical
  afterwards), and an abandoned cycle;
- `new cycle` with an archived slug, and `--format json`.

It also ran a `git merge-tree` against the small-fixes branch and the full gate
(1,428 pass). Its findings: the Prettier test only passed on short lines; two
definition-of-done lines were unmet here; the payload test didn't cover
`cycles/_archive/`; the refusal hint omitted `abandoned`; and the SCHEMA
conflict. Cole approved landing small-fixes first and fixing all of them on a
rebase.

**Second pass (the rebase and fix commits): "Ready to merge: Yes".** It ran:

- `cmp` of the two SCHEMA copies, and `check:mirror`;
- a mutation run, with the reflow commented out, which failed the new test;
- the gate on HEAD (1,448 pass);
- the eight-cycle replay (93 links; `pdocs check` and `prettier --check` clean;
  a word-diff showing only link and reflow changes).

It noted one existing nit: when both cycles are archived, the rewriter writes a
sibling link without its leading `./`. The link still resolves.

## Follow-up

This repository's eight closed cycles are eligible for archiving, which is
Cole's call.

---

**Related Documents:**

- [Closed cycles move to cycles/\_archive/](../item.md)
