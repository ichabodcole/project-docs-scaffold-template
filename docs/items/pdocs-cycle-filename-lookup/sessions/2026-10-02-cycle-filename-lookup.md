---
type: session
title: Cycle filename lookup — 2026-10-02
description:
  A cycle is named by its filename, with or without .md, live or archived,
  across view, set, archive, new and find; new cycle strips .md and refuses a
  name another cycle already answers to.
tags: [pdocs, cycles, cli]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-02 }
---

# Cycle filename lookup — 2026-10-02

Part of
[pdocs work views and advisories](../../../cycles/2026-10-pdocs-views.md)

## Context

`pdocs view cycle 2026-10-x.md` failed, though that is the name a file listing
shows. A cycle has no `slug` field: its identity is its filename. The item made
both spellings work without adding a second identity to frontmatter. It ran in
parallel with the [portfolio view](../../pdocs-work-portfolio-view/item.md),
which landed first, and was rebased onto it.

## What Happened

- **`cyclesNamed(model, name)` in `work.ts`.** It matches the name as given, and
  with a trailing `.md` removed, in `cycles/` and `cycles/_archive/`, and
  returns every match.
  - `resolveRef`'s `cycle/…` branch uses it, so `view cycle`, `set`, `archive`,
    `new item --cycle` and `new --from` all accept either spelling.
  - The value stored in an item's `cycle:` is still the stem. The lint checks
    stored values strictly, as before.
- **Shared refusals.** `noCycleNamed` and `ambiguousCycle` are used by both
  `view cycle` and `find --cycle`, so the two give the same message. There are
  two ambiguous cases:
  - the same filename both live and archived;
  - `x.md`, when it names both `x` and `x.md.md`. The refusal names the spelling
    that picks each one.
- **`new cycle`, after review:**
  - it strips a trailing `.md`;
  - it refuses a name that `cyclesNamed` already resolves, with or without
    `.md`. That includes an archived cycle, and the `x` / `x.md.md` pair, so the
    CLI cannot create the ambiguity it guards against.
- **Wording.** A cycle's slug is defined as "its filename without `.md`" in
  these places:
  - SCHEMA;
  - `new --help` and `set --help` (`CYCLE_FLAG_NOTE`);
  - the `BAD CYCLE` lint message;
  - the cycles README and template;
  - the pdocs reference;
  - `init-branch`, `finalize-branch` and `sweep-project`.
- **Seed record.** `docs/.pdocs-seed.json` follows the edited
  `cycles/TEMPLATE.md`, as earlier template edits did.
- **Rebase.** Both branches re-padded the views table in SCHEMA and the pdocs
  reference. The resolution kept this branch's table, added the portfolio row,
  and ran Prettier. dist was rebuilt rather than merged, and the payload SCHEMA
  was copied from the root copy.

## Verification

- `view-cycle-filename.test.ts` has 15 tests. Each runs the real CLI on temp
  trees and covers:
  - both spellings, live and archived;
  - an unknown name and both ambiguous cases;
  - `set`, `new item --cycle`, `find --cycle` and `archive`;
  - `new cycle` stripping `.md` and refusing names that are taken;
  - `find` and `view` giving byte-identical refusals.
- In review, a mutation of each rule failed its tests.
- The gate passed with 1,489 tests before the rebase. Its run on the rebased
  tree is in the landing commit's hook.

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

- `view cycle` and `find --cycle` on this repository, live and archived, in both
  spellings;
- odd inputs: empty, `.md`, paths, `x.MD`, `x.md.md`;
- a round trip in a scratch worktree through `new cycle`, `new item --cycle`,
  `set --cycle`, `set --lifecycle abandoned`, `archive` and `new --from`;
- three mutations;
- the full gate (1,485 pass);
- `git merge-tree` against the portfolio branch.

Its findings, all approved by Cole:

- the stale seed hash;
- `new cycle foo.md` could create the ambiguity the lookup guards against;
- `find --cycle` matched an ambiguous name silently;
- "slug" wording left in SCHEMA, help and the lint message;
- an over-long comment in `lint/registry.ts`.

**Second pass (`git diff` of the fix commit): "Ready to merge: Yes".** It ran:

- `new cycle` against nine collision cases;
- `find --cycle` on live, archived, unknown and hand-made ambiguous trees;
- `cmp` of every changed script against the payload;
- three mutations;
- `shasum` of the template against the seed record;
- the full gate (1,489 pass).

Its two notes were left as they are:

- `new cycle` strips `.MD` case-insensitively, while lookups are case-sensitive;
- `new cycle foo`, when `foo` exists, reports "already exists" rather than
  "taken". Both exit 6.

Its stale `cycle <slug>` phrases in SCHEMA were changed to `<filename>` during
the rebase.

---

**Related Documents:**

- [Accept cycle filenames in cycle lookup](../item.md)
