---
type: cycle
title: OKF frontmatter layer
description:
  Put a checked metadata layer on the documentation tree, and give the work in
  play somewhere to be named.
tags: [documentation, tooling, okf]
status: stable
lifecycle: closed
started: 2026-09-03
closed: 2026-09-04
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

Both scope entries closed. The layer is on every document, the lint gates
commits and CI, `cycle` exists as a type, and a freshly scaffolded project
inherits all of it and passes its own lint on the first run. The appetite this
cycle set — "until the lint gates CI, every document carries frontmatter, and a
scaffolded project inherits both" — was met without needing to be renegotiated,
which is the first time that has happened here.

**What it actually bought, beyond the schema.** The gate's first run turned an
argument into a list: 31 broken links, 12 of them inbound references to projects
archived after the citing document was written — the exact failure
`backlog/2026-09-02-sweep-project-archive-internal-link-exception` had described
as a hypothesis. And an honesty pass over 17 live proposals, checked against the
tree rather than against their own claims, found **eleven** that had shipped
while still saying `draft` or `approved`. Neither number was knowable before
something checked.

**What was cut.** No file moved — whether the durable folders eventually live
under a shared root is still open, and is what a phase two would decide. The
lint was copied into the scaffold payload rather than extracted into a package;
`scripts/check-mirror.sh` makes that survivable, and three repositories are
still discovering what the tool should be. There is no rendered HTML surface.

**What changes how the next cycle gets scoped.** Every serious defect in this
work was found by a fresh agent using the thing, not by anyone reading it. The
worst of them — the library tier silently not checking any frontmatter, so
`status: approved` passed on all forty library pages — survived six phases,
three cold reads of the prose, and a full test suite, and died in ten minutes
when someone was asked to add a page and then break it. Reading a contract tells
you whether it is coherent. Only using it tells you whether the code agrees. The
next cycle should budget for a use-it pass, not just a read-it one, and should
schedule it early enough that the answer can still change the design.

## Sessions

- feat/okf-frontmatter-layer (landed 2026-09-04)
