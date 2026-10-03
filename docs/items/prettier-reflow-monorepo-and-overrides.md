---
type: item
title: The link reflow misses monorepo ignore files and parser overrides
description:
  pdocs reads .gitignore and .prettierignore only from the docs project's root,
  not the git top level, and asks Prettier for file info without resolving
  config overrides.
status: draft
lifecycle: backlog
id: 01a0fa1b-4537-769a-a219-151ce2f41244
kind: bug
generated: { by: claude-opus-5-5, at: 2026-10-01 }
scope: pdocs
from: items/catalog-line-wraps-into-a-list/sessions/2026-10-01-pdocs-small-fixes.md
priority: low
---

# The link reflow misses monorepo ignore files and parser overrides

`scripts/pdocs/prettier.ts` reformats files whose links `moveAndRewrite`
rewrote, using the project's own Prettier. The review of the change found two
gaps, both low severity, since a file is reformatted only if Prettier already
left it unchanged:

- **Monorepo roots.** `.gitignore` and `.prettierignore` are read from
  `ctx.repoRoot`, the folder holding `.project-docs.json`, not the git top
  level. In a monorepo, a root `.prettierignore` is missed.
- **Parser overrides.** `getFileInfo` is called without `resolveConfig: true`,
  so a Prettier `overrides` entry that changes a file's parser is not seen.

## Definition of done

- [ ] The reflow honours ignore files at the git top level when the docs project
      sits below it, with a test.
- [ ] Parser overrides are resolved before deciding whether and how to format,
      with a test.
