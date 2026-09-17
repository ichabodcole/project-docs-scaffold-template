---
type: memory
title:
  A link may not leave the repository, and the hook may not leak into the tests
description:
  "Under the docs root a link that is absolute, or leaves git's top level, is
  MISSING FILE even when the file exists; report --format json carries
  per-document records; test children are stripped of git's hook variables."
tags: [feedback, lint, links, testing]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-17 }
---

# A link may not leave the repository, and the hook may not leak into the tests

Spellbook's upgrade run produced twelve friction items, and opening the branch
produced a thirteenth. They landed together as plugin 3.13.0.

- **The link rule.** `checkLinks` takes `repoRoot`; a target that is absolute,
  resolves outside it, or climbs above it and re-enters through the checkout's
  folder name is `MISSING FILE` with `outside: true`. The boundary is git's top
  level (`linkBoundary` in `lint/rules.ts`), not the config directory — review
  caught that a monorepo failed otherwise. `unlinted-links.ts` is verbatim and
  keeps the existence-only check.
- **Report records.** `report --format json` carries `data.documents`, one
  `{ path, tier, missing }` per document, beside the unchanged `lines`.
- **The hook leak.** `git commit -a` exports `GIT_INDEX_FILE`; 43 tests failed
  in the hook only. `childEnv()` strips `git rev-parse --local-env-vars`. A Bun
  spawn with no `env` inherits the process's STARTING environment, so in-process
  code that spawns git must be run in a child instead.
- **Guides.** Formatter exclusion sits in `## Before you run it`; v2.9 and v2.10
  say a plain run reverts an unreleased fix and give a probe and the exact
  cookiecutter call.

Detail:
[the session record](../projects/spellbook-feedback/sessions/2026-09-17-spellbook-feedback-round-1.md).
