---
type: cycle
title: OKF frontmatter layer
description:
  Put a checked metadata layer on the documentation tree, and give the work in
  play somewhere to be named.
tags: [documentation, tooling, okf]
status: stable
lifecycle: active
started: 2026-09-03
appetite:
  "Until the lint gates CI, every document carries frontmatter, and a scaffolded
  project inherits both."
scope:
  - project/okf-frontmatter-layer
  - backlog/2026-09-02-sweep-project-archive-internal-link-exception
after: []
generated: { by: claude-opus-5, at: 2026-09-03 }
---

# OKF frontmatter layer

## Why now

Two threads arrived at the same place. The documentation tree had grown a
metadata layer by hand — `**Status:** Approved (in flight)` invented in three
proposals because the vocabulary had no word for it — and nothing checked any of
it. Separately, there was no way to say which of twenty-three `Approved`
proposals were actually being worked on.

The first is a schema problem and the second is a missing document type, and
they are the same fix: state the contract, enforce it, and add the one type that
names work in play. Doing them apart would mean writing the schema twice.

This is phase one. Whether the durable folders eventually move under a shared
root is left open deliberately — that question is easier to answer once the
layer has been used for a while than it is now.

## Scope

- **[project/okf-frontmatter-layer](../projects/okf-frontmatter-layer/proposal.md)**
  — OKF frontmatter on every document, a two-tier lint that gates commits and
  CI, per-type `lifecycle` vocabularies, the `cycle` type, and all of it
  shipping in the cookiecutter payload and the project-docs skills.
- **[backlog/2026-09-02-sweep-project-archive-internal-link-exception](../backlog/2026-09-02-sweep-project-archive-internal-link-exception.md)**
  — pulled in because the lint's first run proved it: most of the 32 broken
  links it found are inbound references to projects that were archived, which is
  exactly the failure that item describes. Fixing the links without fixing
  `sweep-project` would leave the next archive to break them again.

Out of scope, deliberately: moving any file, extracting the lint into a shared
package, and a rendered HTML surface. The first is what phase two is for; the
other two are premature while three repositories are still discovering what the
tool should be.

## Outcome

_Written at close, not before._

## Sessions

- feat/okf-frontmatter-layer (open)
