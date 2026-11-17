---
type: write-up
title: A work board for project-docs
description:
  What project-docs already holds and derives that a work board would show, and
  what is still to be found out before one is designed.
tags: [pdocs, work-board, research]
status: draft
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# A work board for project-docs

**Outcome:** More Research Needed. This is the framing pass: what exists today,
and what is still to be found out.

---

## Question

What should a project-docs work board be: what does it show, what does it let
you do, and what does it leave to other tools? The answer feeds the
[mockups](../pdocs-work-board-mockups.md), and after them a skill and a small
application.

The board is a dashboard, not a document editor. Scriptorium reviews a document
line by line; the board sits above that. It need not be read-only.

## Current State

### What there is to show

The workbench has three tracked types, each with a `lifecycle`, and three owned
documents that carry one too (`docs/SCHEMA.md`, "Lifecycle by type"):

| Type                | States                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| `item`              | `triage` · `backlog` · `ready` · `active` · `review` · `done` · `dropped` |
| `feature`           | `backlog` · `ready` · `active` · `review` · `done` · `dropped`            |
| `cycle`             | `planned` · `active` · `closed` · `abandoned`                             |
| `plan`              | `draft` · `active` · `completed` · `abandoned`                            |
| `design-resolution` | `draft` · `resolved` · `superseded`                                       |
| `test-plan`         | `draft` · `ready` · `active` · `completed`                                |

An item also has a `kind` (task, bug, chore, research), and optional `priority`,
`assignee`, `parent` (a feature), `cycle`, `blocked_by`, `scope`, `source` and
`released_in`. Every document has `status` (`draft`, `stable`, `deprecated`),
which on an item records whether its content was reviewed.

Documents with no lifecycle: `write-up`, `session`, `report`, `handoff` and
`artifact` in the workbench; `architecture`, `specification`, `playbook`,
`manifesto` and `summary` in the library. Whether the library appears on a board
at all is open.

On 2026-11-17 this repository's own tree held 63 unstarted items and features, 1
started and 95 completed.

### What `pdocs` already derives

`pdocs view` has ten views, all from frontmatter, all available as JSON:
`backlog`, `board` (with `--features`), `ready`, `feature <slug>`,
`cycle <slug>`, `scope <name>`, `unreleased`, `released`, `portfolio` and
`unreviewed`. A view can carry advisories, such as the archive threshold.

Writes go through four verbs: `new`, `set` (which refuses a value the lint would
reject), `promote` and `archive`. `find` queries by type, lifecycle, status,
tag, date or work field; `graph` and `backlinks` give the edges.

So a read-only board is mostly a renderer over `view --json`, and an interactive
one calls `set`. What the CLI lacks for a board has not been examined.

### Prior art here

- `tusk-board`, a live task board built in this repository and now `bounty` in
  Spellbook ([feature](../../features/tusk-board/feature.md)).
- The Spellbook surfaces (Scriptorium, digestify, bounty, magpie), which set the
  pattern: an agent opens a live browser surface, and the human and the agent
  both act on it.
- The
  [work taxonomy research](../work-taxonomy-for-agent-first-development/write-up.md)
  and the [work cycle landscape](../work-cycle-taxonomy-landscape/write-up.md),
  which already surveyed how other tools model work. Their reports cover the
  model, not the visualization.

## Findings

None yet beyond the inventory above.

## Recommendation

- [x] **More research needed**

**Rationale:** the inventory is the easy fifth of the definition of done. The
landscape, the CLI gaps and the in-or-out list are not started.

## Next Steps

1. Landscape: how Linear, GitHub Projects, Plane, Jira and Trello-style boards,
   and agent-native tools, show triage, active work, cycles and features. For
   each: what it shows, and what it lets you do.
2. Read `bounty` and Scriptorium as built, for what a Spellbook surface gives
   for free and where each one's job ends.
3. Walk the views as JSON against a board's needs and list what is missing.
4. Draft the in-or-out list, then the lighter and more robust recommendations.

## Open Questions

- Where the app lives: beside `pdocs` in this repository, or in Spellbook.
- Which writes the board may make. Candidates: a triage disposition, pulling
  items into a `planned` cycle, a state change by drag.
- Whether an agent proposing on the board (a cycle, a grouping) follows the
  Scriptorium pattern of proposals the human accepts.
- Whether features, cycles and items share one board or get a view each.
- How the board hands off to Scriptorium to open a document.

---

**Related Documents:**

- [The research item](./item.md)
- [pdocs work board](../../features/pdocs-work-board/feature.md)
- [Mock up the work board in a few variations](../pdocs-work-board-mockups.md)
