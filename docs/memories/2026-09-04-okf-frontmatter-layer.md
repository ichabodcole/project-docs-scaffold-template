---
type: memory
title: "OKF frontmatter layer shipped; the gate that did not gate half the tree"
description:
  A checked metadata layer on every document, and the lesson that a guardrail is
  only verified where you actually try to break it.
tags: [documentation, tooling, okf, review]
related: [lesson/migration-steps-uniform-specificity]
status: stable
generated: { by: claude-opus-5, at: 2026-09-04 }
---

# OKF frontmatter layer shipped; the gate that did not gate half the tree

Shipped the OKF 0.2 frontmatter layer: every document under `docs/` carries a
checked block, `bun docs/lint.ts` gates the pre-commit hook and CI,
`docs/SCHEMA.md` is the contract and `docs/index.md` the catalog, `cycle` is a
document type with at most one active at a time, and a freshly scaffolded
project inherits all of it and passes on the first run. project-docs 3.7.0
teaches the skills to write `lifecycle` and to open and close cycles. No file
moved.

**The durable lesson is about verifying guardrails, not about the schema.** The
two-tier design put every vocabulary check inside `thinTier`, which walks the
workbench folders only. The library — 40 pages — got links, catalog reachability
and `related` edges, and **no frontmatter enforcement at all**. A memory could
say `status: approved`, the exact hand-invented value whose appearance in three
proposals is the origin story the layer opens with, and the gate printed
`docs-lint: clean`.

It survived six phases, 500 tests, three cold reads of the prose, and a
deliberate regression sweep in which I broke six rules and confirmed each fired.
The sweep is why it survived: I tested each rule **in the folder where I had
implemented it**, and the `status` and `lifecycle` cases went into
`docs/backlog/`. Knowing the check was there is what stopped me trying it
somewhere else.

Three agents read `SCHEMA.md`'s claim that the graph tier checks "everything
Thin checks, plus" the graph obligations, and none could falsify it — falsifying
it requires running the tool. A fourth agent, asked to add a page to a generated
project and then break it, found it in ten minutes. **Reading a contract tells
you whether it is coherent; only using it tells you whether the code agrees.**

Second-order: the schema table's self-check (`docs/lint.ts` parses the lifecycle
table and fails if its `SPEC` disagrees) is real, and it guards the table's
contents. It could never have caught this, because the false claim was two
sections earlier and was about behaviour, not values. An anti-drift mechanism is
narrower than the sentence advertising it.

**Key files:** `docs/lint.ts` (`documentProblems`, called by both tiers),
`docs/SCHEMA.md`, `scripts/check-mirror.sh`, `.project-docs.json`

**Docs:**
[session](../projects/okf-frontmatter-layer/sessions/2026-09-04-okf-frontmatter-layer-implementation.md)
— the full account, including three defects the read-it agents did find
