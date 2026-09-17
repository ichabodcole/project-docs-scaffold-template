---
type: backlog
title:
  pdocs check inherits git's hook variables and crashes in a worktree monorepo
  hook
description:
  trackedMarkdown spawns git ls-files with the inherited environment, so a
  pre-commit hook in a linked worktree that runs check from a package directory
  crashes with ENOENT; report records are also parsed back out of problem rows.
tags: [lint, git, hooks]
status: draft # OKF §5.4: draft | stable | deprecated. Nothing else.
lifecycle: open # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-fable-5-1, at: 2026-09-17 }
---

# pdocs check inherits git's hook variables and crashes in a worktree monorepo hook

Found by the reviewer of `feature/spellbook-feedback-round-1`, by execution. All
three are true on `develop` before that branch; none blocked it.

## The three

1. **`trackedMarkdown` spawns `git ls-files` with the inherited environment**
   (`scripts/pdocs/docs-lint/unlinted-links.ts`, ported verbatim). Git exports
   `GIT_DIR` to a hook run from a linked worktree. A pre-commit hook that runs
   `cd packages/app && bun scripts/pdocs/cli.ts check` then gets paths relative
   to the wrong top level and crashes: `ENOENT …/packages/app/CONTRIBUTING.md`.
   A foreign `GIT_DIR` crashes any tree the same way. The fix strips
   `git rev-parse --local-env-vars` from that spawn, which means editing the
   verbatim file or wrapping the call. Decide which.
2. **Report records are parsed back out of problem rows** (`missingFields` in
   `scripts/pdocs/lint/rules.ts`). A path containing two spaces then `(` is
   truncated in `documents[].path`, and with no `type` the slide-deck check
   reads the truncated path and `report` exits 1. Build the records from
   structured findings instead of a regex.
3. **Two behaviours have no test that can fail**: `linkBoundary` returning the
   boundary in `ctx.repoRoot`'s spelling, and the literal `docs/` skip in
   `collect.ts` `readOutside`. Neutering either leaves the suite green.

## Done when

- [ ] `check` run from a package directory inside a linked-worktree commit hook
      exits on its findings, not on `ENOENT`.
- [ ] `docs/briefs/no  (type).md` with no `type` appears whole in
      `report --format json`.
- [ ] Each of the two behaviours in 3 has a test that goes red when neutered.

## References

- [Session record](../projects/spellbook-feedback/sessions/2026-09-17-spellbook-feedback-round-1.md)
