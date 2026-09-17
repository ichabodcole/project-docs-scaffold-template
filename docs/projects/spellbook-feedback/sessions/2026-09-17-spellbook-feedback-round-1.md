---
type: session
title: Spellbook feedback, round 1 — 2026-09-17
description:
  "Thirteen verified items from Spellbook's upgrade run land as one branch:
  report records, the rule that a link may not leave the repository, the outside
  corpus named, guide and script wording, and test children that no longer
  inherit git's hook variables."
tags: [feedback, lint, migrations]
status: stable # A session is frozen the moment it is written; it is never a draft.
generated: { by: claude-fable-5-1, at: 2026-09-17 }
---

# Spellbook feedback, round 1 — 2026-09-17

Part of
[Story-loom feedback, round 1](../../../cycles/2026-09-story-loom-feedback.md).
Work order:
[the backlog item](../../../backlog/2026-09-15-spellbook-feedback-round-1.md).
Branch `feature/spellbook-feedback-round-1`, plugin 3.13.0.

## What landed

| Commit    | What                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `9c26b45` | Owned layer: `data.documents` in `report --format json`; the repository link rule; the outside-corpus count; the `UNKNOWN FIELD` hint; the post-gen hook paragraph; test children stripped of git's hook variables |
| `2ff1600` | Guides and the v2.9 script: `## Before you run it`; the unreleased-fix remedy and probe; byte comparison in v2.9 phase 3; the lint-staged husky shape; two backfill rules; plugin 3.13.0                           |
| `79f1bb6` | The #176 record carries Spellbook's coverage-ward argument and landing SHAs                                                                                                                                        |
| `9e010ce` | Review fixes, below                                                                                                                                                                                                |

The thirteenth item was found opening the branch: `git commit -a` exports
`GIT_INDEX_FILE` to the pre-commit hook, the suite's temporary repositories
inherited it, and 43 tests failed in the hook and nowhere else. `childEnv()` now
strips `git rev-parse --local-env-vars`, every spawn in every test file goes
through it, and a structural test fails on a bare one. Code a test calls
in-process that spawns git itself cannot be reached that way — a Bun spawn with
no `env` inherits the environment the process started with — so those tests run
the code in a child.

## Judgment calls

- The `UNKNOWN FIELD` pointer to `lint.exclude` appears only on a file with no
  `type`. On a declared document a stray key is a key to remove.
- A relative link that climbs above the repository and re-enters through the
  checkout's folder name is refused: it resolves here and fails in CI.
- The outside count restates two private skips of `unlinted-links.ts`, which is
  ported verbatim and exports neither. A test pins the count to what is read.

## Review

Roster read from the Agent tool's dispatchable types in this session.
`feature-dev:code-reviewer` was rejected on capability: `BashOutput` and
`KillShell` without `Bash`. `plugin-dev:skill-reviewer` was rejected: `Read`,
`Grep`, `Glob` only. `general-purpose` (tools `*`, so a shell) was chosen and
briefed to use the system rather than read it, report only. The main session
read the full production diff and every guide change first.

Verdict: **With fixes.** All confirmed by execution, all fixed in `9e010ce`:

1. The link rule bounded links by the config directory, so a docs root nested in
   a monorepo failed on a link to the monorepo's own `CONTRIBUTING.md`. It now
   uses git's top level when that contains the project (`linkBoundary`).
2. An absolute path into the repository passed. Any absolute target is refused.
3. The outside count was right only under a docs root named `docs/`, and its
   test never ran `git init`, so it could not fail. `collect` now takes the real
   docs root out before the link pass, which also ends a double report.
4. A path with a space was truncated in `documents[].path`.
5. The husky append corrupted a hook with no trailing newline.
6. The format-what-you-edited line listed deleted files and missed staged and
   untracked ones.
7. The bare-spawn scan missed `exec`, `execFile`, `spawn` and the Bun shell
   template.
8. The release probe closed an interactive shell, left its clone behind, and
   called a mistyped SHA `NOT RELEASED`.

The reviewer's execution log, quoted: "`git archive develop` and
`git archive HEAD` into the scratch directory"; "`report --format json` and
`--format text` with both CLIs, on the dirty fixture and on an enlarged tree";
"Built `t12` with 20 link cases and ran `check` on HEAD and on `develop`"; "ran
`migrate-v2.8-to-v2.9.ts` four times: dry run, run, run, dry run. Compared
mtimes"; "`GIT_INDEX_FILE=<copy> bun test` exited 0.
`GIT_DIR=… GIT_WORK_TREE=… bun test` exited 0"; "Ran the release probe against
the real remote"; "`npm run check` exit 0 (1228 pass). `npm run typecheck` exit
0"; eight mutations of production code in a scratch copy, each turning the
expected tests red.

After the fixes: `npm run check` exit 0 with 1231 tests, `npm run typecheck`
exit 0, the full suite green under an inherited `GIT_INDEX_FILE`, and the three
rewritten snippets run in a scratch repository.

## Deliberately not done

- `N file(s) written` in the v2.7, v2.9 and v2.10 scripts counts the files that
  differed; `cpSync` rewrites the directory. Shared vocabulary across three
  scripts, left alone.
- A tracked `docs/` folder under a docs root of another name is read by nobody:
  the skip is a literal in the verbatim `unlinted-links.ts`. The count is honest
  about it; the gap stays.
- A broken symlink named `*.md` crashes `check` with `ENOENT`, on `develop` too.
- Consumers past v2.10 receive the owned-layer changes only through a future
  migration.

## Found on the way

The template's `main` was fast-forwarded to `cb00849` on 2026-09-17 and
release-please opened #177 for 8.1.1, so #176's fix is no longer unreleased on
the default branch the v2.9 script fetches.
