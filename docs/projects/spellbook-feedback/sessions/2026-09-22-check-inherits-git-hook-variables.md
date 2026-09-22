---
type: session
title: pdocs check inherits git's hook variables — 2026-09-22
description:
  The three defects the Spellbook branch's re-review found on develop are fixed:
  check strips git's repository variables from its own spawns, report records
  come from findings rather than rows, and two unguarded behaviours have tests
  that fail when neutered.
tags: [lint, git, hooks]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# pdocs check inherits git's hook variables — 2026-09-22

Part of
[Story-loom feedback, round 1](../../../cycles/2026-09-story-loom-feedback.md).
Work order:
[the backlog item](../../../backlog/2026-09-17-check-inherits-git-hook-variables.md).
Branch `fix/check-inherits-git-hook-variables`. No plugin change; the owned
layer and its payload mirror only.

## What landed

| Commit    | What                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `89909ed` | The branch and the backlog item attached to the cycle                                                                                                   |
| `b54b8b0` | `gitEnv()` in `lint/rules.ts`; `trackedMarkdown` and `linkBoundary` spawn git through it; `test-env.ts` takes the variable list from there              |
| `716e44e` | Tests for the boundary's spelling (through an explicit symlink, so Linux CI sees what macOS does) and for the literal `docs/` skip in the outside count |
| `2ca995d` | `documentProblems` returns `missing` as data; `pdocs report` builds its records from it instead of a regex over the rows                                |
| `9ea4fe4` | Review fix: a tracked page that is not on disk is not read; the hook tests pin `core.hooksPath`                                                         |

The hook test is a real one: a monorepo, a linked worktree, a `pre-commit` that
runs `check` from `packages/app`, and a `git commit` in the worktree. It went
red on each spawn separately — ENOENT for `ls-files`, a false `not portable` for
`rev-parse --show-toplevel`.

## Judgment calls

- **Edit the verbatim file, minimally.** The backlog item asked whether to edit
  `unlinted-links.ts` or wrap the call. Wrapping cannot work: a Bun spawn with
  no `env` inherits the environment the process started with, so clearing
  `process.env` first changes nothing. `trackedMarkdown` gained an optional
  `env` — omitted, it behaves as the source's — and the header records the
  exception. Which variables to drop is policy and lives in `rules.ts`.
- **One list.** `test-env.ts` re-exports `GIT_LOCAL_ENV` from `rules.ts` rather
  than keeping a second copy; the test that compares it with
  `git rev-parse --local-env-vars` still guards it.
- **Skip missing paths, not keep the hook's index.** Git's `GIT_INDEX_FILE` is
  `index.lock` under `commit -a` and a path relative to a top level the hook may
  not be at under a plain commit, so it cannot be kept. Only deletions differ
  between the two indexes, and the lint reads contents from disk either way, so
  a tracked path that is not on disk is dropped from the corpus.

## Review

Roster read from the Agent tool's dispatchable types in this session.
`feature-dev:code-reviewer` was rejected on capability: `BashOutput` and
`KillShell` without `Bash`. `Plan` (all tools except the editing and agent ones,
so a shell) was rejected on shape: there is no plan to check against, only the
backlog item's done-when list. `general-purpose` (tools `*`) was chosen and
briefed with that list, report only.

Verdict: **With fixes.** One blocking finding, confirmed by execution: dropping
`GIT_INDEX_FILE` made `ls-files` in a hook read the real index, so
`rm NOTES.md && git commit -a` crashed `check` with ENOENT where `develop`
exited 0 — a regression for a plain single repository, not only the monorepo
case. Fixed in `9ea4fe4`, with a hook test red before it. Two minor findings
taken in the same commit: pin `core.hooksPath` in the hook tests, and the
`gitEnv` import order Biome flagged in `collect.ts`. The reviewer's execution
log, quoted: "`bun test scripts/pdocs` — 555 pass, 0 fail"; "`npx tsc --noEmit`
— clean"; "`npm run check` — … `bun test` 1235 pass, 0 fail"; five
neuter-and-run cycles, each red, "each followed by `git checkout --`"; a scratch
repository with a pre-commit hook running `commit -a` with a deletion,
`commit <path>`, and a plain commit after `git rm`, "first with the branch's
code and then with `develop`'s `scripts/pdocs`".

**Re-review of the fix**, same reviewer resumed with its context: **Ready to
merge: Yes.** Its log, quoted: "`bun test scripts/pdocs` (twice: 1 transient
failure, then 556 pass)" — the failure was `check` on the live tree while this
session's documents were half-written; "removed the `existsSync` clause …
`git checkout -- scripts/pdocs/lint/collect.ts`", red then green; the
single-repository `commit -a` and `commit <path>` deletions and the
linked-worktree monorepo run "with the branch's code and with `develop`'s
`scripts/pdocs`", and a broken link added to prove the corpus is still read:
"reported `1 problem(s)`, `1 tracked page(s) outside docs/`".

## Deliberately not done

- The migration scripts (the v2.6 codemod, v2.8→v2.9, v2.9→v2.10) spawn git
  without stripping the variables. A person runs them, not a hook.
- `unlintedLinkProblems` in the verbatim file still calls `trackedMarkdown` with
  no `env`. Nothing calls it.
- Consumers past v2.10 receive this only through a future migration, as with the
  Spellbook round.
