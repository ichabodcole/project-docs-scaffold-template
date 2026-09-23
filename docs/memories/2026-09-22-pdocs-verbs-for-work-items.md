---
type: memory
title: pdocs creates, moves and views work items
description:
  pdocs new item/feature, promote, set, archive and view operate on the work
  model, and every move rewrites markdown links, reference definitions and
  path-form from values so the next check still passes.
tags: [taxonomy, cli, pdocs]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# pdocs creates, moves and views work items

Phase 2 of the work-taxonomy release added the verbs: `pdocs new item` (a UUIDv7
id, `triage` by default, `--kind` required) and `pdocs new feature`; `--owner`
for owned documents, which writes the link back to the owner and promotes a
single-file item into a folder first; `promote`, `set`, `archive` (terminal
entities only) and `view` (backlog, board, ready, feature, cycle, scope,
unreleased, released).

When changing it: every move goes through `scripts/pdocs/move.ts`, which
rewrites inline links, reference definitions whose target exists, and path-form
`from:` values — in every document under the docs root and every tracked
markdown file outside it. Ids print 12 characters long and resolve from any
unique prefix of 8 or more (D18). `--owner project/<slug>` is legacy and goes in
Phase 5.

**Key files:** `scripts/pdocs/work.ts`, `scripts/pdocs/move.ts`,
`scripts/pdocs/links-rewrite.ts`, `scripts/pdocs/uuid.ts`,
`scripts/pdocs/commands/{new,promote,set,archive,view}.ts`

**Docs:**
[Session record](../projects/work-taxonomy/sessions/2026-09-22-phase-2-pdocs-verbs.md),
[plan](../projects/work-taxonomy/plan.md)
