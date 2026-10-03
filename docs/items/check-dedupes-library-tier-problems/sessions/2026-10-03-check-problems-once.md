---
type: session
title: Check problems reported once — 2026-10-03
description:
  pdocs check reports each library-page frontmatter problem once, from the
  library field checks, with every problem path repo-relative.
tags: [pdocs, lint, output]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# Check problems reported once — 2026-10-03

Part of
[check and upgrade-skill fixes](../../../cycles/2026-10-check-and-upgrade-fixes.md)

## Context

operator-mono's upgrade saw `pdocs check` print 1,851 rows for about 1,450
problems
([#198](https://github.com/ichabodcole/project-docs-scaffold-template/issues/198)).
A library page's frontmatter problem came out twice: once from the docs-lint
core with a `docs/` path, once from the library field checks without it and in
another format. The two path forms defeated `sort -u`.

## What Happened

- **The library field checks own the frontmatter rules on library pages.**
  `documentProblems`, through `libraryFieldChecks` in `lint/rules.ts`, reports
  presence, `type`, `tags` and `generated` on every page `libraryFiles` types;
  the workbench already used it. The core in `docs-lint/index.ts` takes a
  `fieldsCheckedElsewhere` predicate and skips those rules on those pages. A
  page the library set does not type, such as a loose `docs/loose.md`, keeps the
  core's checks.
- **One path form.** A second core option, `problemPathRoot`, prints problem
  paths repo-relative (`docs/…`), like the rest of `check` and the read
  commands. Nodes and indexes keep docs-root-relative paths, so `orphans` is
  unchanged. `STALE HOOK` now reads `docs/index.md → docs/<page>`.
- **What the field checks picked up from the core.** `MISSING generated.by`,
  which also applies to workbench documents now, and the `(expected …)` hint on
  `MISSING tags` and `MISSING generated`. `BAD type` is no longer reported on a
  library page, since `WRONG TYPE` fires on every case it did.
- Both core options are recorded as a divergence in the ported core's header;
  unset, the core behaves as before.

## Verification

- A CLI test on seven broken playbooks and a loose page pins the exact sorted
  rows in text, the same messages in JSON, and one path form. The golden
  fixture, a CLI test, a rules test and a read test were updated for the new
  path form.
- Mutations of each core option, the loose-page predicate, the empty-tags rule
  and `generated.by` each fail tests.
- The gate passed with 1,587 tests.

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

**Verdict: "Ready to merge: Yes".** It ran develop's and the branch's CLIs,
read-only, on four real trees:

- **Current trees.** operator-mono, Spellbook, media-forge and this repository
  are clean on both, with byte-identical output, so no consumer goes red on
  upgrade.
- **Older, dirty snapshots** (`git archive` of each consumer's earlier docs).
  operator-mono 1,861 → 1,729 rows, Spellbook 872 → 828, media-forge 333 → 285.
  Keyed by rule and normalized path, every removed row was a duplicate with a
  surviving equivalent: no coverage lost, nothing new.
- Page kinds (archived, root pages, loose, `lint.skip`, templates), the
  `WRONG TYPE` ⊇ `BAD type` argument, four mutations in a scratch clone, the
  mirror and the gate (1,587 pass).

Its optional leftovers are filed as
[check output polish](../../check-output-polish.md).

---

**Related Documents:**

- [Print each library-tier problem once, with one path form](../item.md)
