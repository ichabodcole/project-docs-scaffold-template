---
type: session
title: Link check skips URI schemes — 2026-10-03
description:
  Links with any URI scheme are external to pdocs check, through one helper the
  link rewriter shares; a drive letter stays a path.
tags: [pdocs, lint, links]
status: stable
generated: { by: claude-opus-5-5, at: 2026-10-03 }
---

# Link check skips URI schemes — 2026-10-03

Part of
[check and upgrade-skill fixes](../../../cycles/2026-10-check-and-upgrade-fixes.md)

## Context

operator-mono links its documents with app URIs (`operator://documents/<id>`,
`op:doc/<id>`), and after its 9.4.0 upgrade 41 of them failed the gate as
`MISSING FILE`
([#192](https://github.com/ichabodcole/project-docs-scaffold-template/issues/192)).
The link check skipped only `http(s)://` and `mailto:`.

## What Happened

- **One classifier.** `isExternalLink` in `docs-lint/index.ts` decides whether a
  link target is external: it starts with a URI scheme. `checkLinks` and
  `links-rewrite.ts`, which already used the same regex inline, both call it.
  Backlinks, the graph, orphans and the unlinted-links pass all go through
  `checkLinks`, so nothing else classified a target.
- **A scheme is two characters or more.** After review, a drive letter
  (`C:/x.md`) stays a path rather than matching as a one-letter scheme, so it is
  still reported. A bare `a:b.md` is now a path again too.
- No document described which links the check skips, so none changed.

## Verification

- Unit tests in `docs-lint/index.test.ts`: custom and uppercase schemes are
  skipped; `./a:b.md`, `docs/a:b.md` and `C:/a.md` are still checked. A CLI test
  in `lint/rules.test.ts` runs `check` on a fixture and asserts exit 9 and
  exactly the three relative-path problems.
- Mutations: the old http/mailto check, dropping the `i` flag, and a one-letter
  scheme each fail a test.
- The gate passed with 1,580 tests.

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

**Verdict: "Ready to merge: Yes".** It ran:

- `pdocs check` from develop and branch CLIs on a scratch fixture of edge-case
  links: schemes, uppercase, images, padded targets, anchors, relative colons,
  drive letters, reference-style links. 28 problems became 16, all of the
  removed ones scheme links, bare `x:y.md` or drive letters.
- `pdocs archive` from both CLIs on identical fixtures with scheme links; the
  results were identical.
- five mutations, the mirror check and the gate (1,579 pass).

Its two optional findings, an untested uppercase path and drive letters passing
as schemes, were fixed with Cole's approval, and checked by mutation and the
gate. Reference-style links (`[x][ref]`) are not checked, before or after; that
gap is older than this item.

---

**Related Documents:**

- [Skip links with a URI scheme in the link check](../item.md)
