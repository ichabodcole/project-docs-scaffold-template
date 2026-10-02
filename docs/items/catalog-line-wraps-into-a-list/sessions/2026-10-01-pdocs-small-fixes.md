---
type: session
title: pdocs small fixes — 2026-10-01
description:
  The Outcome lint knows every released placeholder, catalog lines and rewritten
  links stay in Prettier's shape, and two lint messages say what they mean.
tags: [pdocs, lint, prettier]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-01 }
---

# pdocs small fixes — 2026-10-01

Part of
[pdocs work views and advisories](../../../cycles/2026-10-pdocs-views.md)

## Context

Three small pdocs items landed as one branch:

- [catalog-line-wraps-into-a-list](../item.md), which owns this record;
- [outcome-lint-old-template-placeholders](../../outcome-lint-old-template-placeholders.md);
- [placeholder-lint-wording-polish](../../placeholder-lint-wording-polish.md).

The branch ran in a git worktree beside the
[archive-closed-cycles](../../archive-closed-cycles.md) branch.

## What Happened

**The Outcome lint.** Reading the cycle template's `## Outcome` at every release
tag showed only two placeholders were ever shipped: v7.0.0–v9.0.0
(`_Written at close, not before._` plus a short bracketed prompt) and v9.0.1
onward. `NO OUTCOME` now recognises both, plus any lone italic
`_Written at close…_` paragraph, on top of the project's own template. A guard
test fails if the shipped template's Outcome changes without being added to the
released list.

One behaviour changed: a project whose cycle template was edited now has a cycle
that still holds the stock prompt reported, where before that prompt counted as
prose. That is what the item asks.

**The catalog line.** Prettier never breaks a line before a word that would read
as a list marker or heading (`-`, `+`, `1.`, `2)`, `#`, `>`); it moves that word
down with the one before it. `catalogEntry` now binds such a word to the
previous one, matching Prettier's own rule (`NO_BREAK_BEFORE` in its markdown
plugin).

**Rewritten links.** `promote`, `new --owner` and `archive` all rewrite links
through `moveAndRewrite`. A rewritten file is now reformatted with the project's
own Prettier, which `scripts/pdocs/prettier.ts` runs in a child under
`bun --no-install`. It is reformatted only if Prettier already left it unchanged
before the move; any other file keeps every byte but its links. Nothing is
formatted when the project has no Prettier, when its config is broken, or when
the child fails or passes its 30-second timeout.

**The wording.** The tags `PLACEHOLDER` row says the tags hold only placeholder
words. The `--title` row in the pdocs reference hangs "which mangles acronyms"
off the slug default.

## Changes Made

- `scripts/pdocs/lint/work.ts` and `rules.ts`: the released Outcome
  placeholders, the italic-prompt pattern, and the reworded messages.
- `scripts/pdocs/commands/new.ts`: the catalog wrap.
- `scripts/pdocs/prettier.ts` (new) and `scripts/pdocs/move.ts`: the reflow.
- `docs/SCHEMA.md`: the `NO OUTCOME` row.
- The pdocs reference and `sweep-project`: wording.
- The payload copies and `dist/` are kept in sync.

## Notable Discoveries

- **The husky pre-commit hook does not run in a git worktree.** Its
  `core.hooksPath` is the relative `.husky/_`, which the worktree lacks. Every
  commit on this branch was gated by hand, and the review re-ran the gate on
  each commit's tree.
- **Prettier escapes some tokens wherever they sit:** a lone `*`, `***`, `___`,
  and code fences. A description containing one is never stable; that is outside
  this item. A trailing run of `=` or `-` can also wrap into a heading
  underline, but Prettier is not idempotent on that input itself.

## Verification

- The gate passed on every commit's tree. On the final commit, 1,432 tests pass.
- **The review's fuzzing:** 9,000 extra `catalogEntry` cases against the real
  Prettier found only the escape and underline cases above.
- **The reflow, driven directly:** it worked correctly with Prettier 1, 2 and 3,
  with a broken config, with a missing plugin, and with no Prettier at all, and
  in a cookiecutter-generated project running the payload's `pdocs`.
- **A trial merge with the archive branch:** all eight of this repository's
  closed cycles archived with `prettier --check` clean after every step, and the
  gate passed (1,445 tests). Without this branch, the same archive left about 26
  files Prettier-dirty.

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

- the gate on HEAD and, in scratch worktrees, on both intermediate commits (all
  passing);
- a direct driver of the Prettier child against projects with Prettier 1, 2 and
  3, a broken config, a missing plugin, no Prettier, and a config that hangs
  (which hung);
- a cookiecutter-generated project running the payload's `pdocs archive`;
- 9,000 extra `catalogEntry` fuzz cases;
- hashes of the cycle template's Outcome at every release tag;
- a trial merge with the archive branch, followed by a replay archiving all
  eight closed cycles.

Its findings: the Prettier spawn had no timeout; the Outcome regex was a little
broad; three reflow failure paths were untested; `sweep-project` quoted a stale
prompt; the monorepo and parser-override gaps; and the commit type, since the
reflow is new behaviour that warrants a minor release. Cole approved fixing the
first four and filing the gaps as a follow-up. The branch lands as a `feat`
commit.

**Second pass (the fix commits only): "Ready to merge: Yes".** It ran:

- the hanging config with the default timeout (30.0 s, nothing formatted) and
  with a 2 s override;
- `pgrep` afterwards (no orphaned children);
- mutation runs proving each new test fails without its fix;
- the regex probes;
- the gate on HEAD: 1,432 pass, with `check:mirror` and `check:dist` clean.

It noted one optional weakness, not taken up: the broken-config test would not
catch a child that falls back to Prettier's defaults.

## Follow-up

- **Follow-up items:**
  [prettier-reflow-monorepo-and-overrides](../../prettier-reflow-monorepo-and-overrides.md).
- **Merge conflict:** this branch and archive-closed-cycles conflict on the
  `docs/SCHEMA.md` lint table (both copies). Resolve it when that branch is
  rebased.

---

**Related Documents:**

- [The catalog line can wrap into a nested list](../item.md)
