---
type: write-up
title: A work board for project-docs
description:
  What project-docs already holds and derives that a work board would show, and
  what is still to be found out before one is designed.
tags: [pdocs, work-board, research]
status: stable
generated: { by: claude-fable-5-2, at: 2026-11-17 }
---

# A work board for project-docs

**Outcome:** Feature Recommended, as a draft for review. The feature exists
([pdocs work board](../../features/pdocs-work-board/feature.md)); this says what
it should hold, and the mockups come next.

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

### Evidence

Two reports hold the detail:

- [Work board visualization landscape](./reports/2026-11-17-work-board-visualization-landscape-report.md):
  Linear, GitHub Projects, Plane, Jira, Trello, and the agent-native and
  markdown-backed boards (Backlog.md, Beads viewers, Task Master, Vibe Kanban).
- [Work board foundations](./reports/2026-11-17-work-board-foundations-report.md):
  every `pdocs` view run as JSON against this tree, writes tried on a scratch
  copy, and `bounty`, Scriptorium and astrolabe read as installed.

### Key Observations

**From the landscape**

- **Triage is the same four decisions everywhere.** Linear and Plane both offer
  accept, decline, mark duplicate and snooze. Ours are close: `backlog` or
  `ready`, `dropped`, and stay in `triage`.
- **No tool has an agent propose a whole cycle.** The nearest is Linear's Triage
  Intelligence: a suggestion per property, each with its reasoning, that a
  person accepts or declines. An agent-proposed `planned` cycle the human
  adjusts would be new, and the accept-or-decline-per-suggestion pattern is the
  one to borrow.
- **A cycle view is a progress picture as much as a board.** Linear and Plane
  show scope and completion over time. Their cycles are time-boxed; ours close
  on scope, so a burn-down against a date does not apply. Scope added since the
  start does.
- **Feature progress is shown apart from cycles.** Plane's modules show a state
  breakdown and a "needs attention" list of blocked and overdue items.
- **Drag changes the grouped field, universally.** Jira's backlog beside the
  sprint is the standard way to plan by drag.
- **Markdown-backed boards write back to the files**, and their agents use the
  CLI, not the UI. Backlog.md is the closest relative.
- **Agent-native tools add a "ready" or "next" list** derived from dependencies,
  not a column a person fills.

**From the foundations**

- **Reads are nearly there.** Views carry title, kind, lifecycle, priority,
  parent, cycle, `blockedBy` and advisories, and run in about 0.05 s each on 416
  documents. A surface in this repository can import the read functions
  (`treeContext`, `collectWork`, the `view*` functions) and get the full
  frontmatter.
- **The triage inbox has no single call.** Views lack `description`, `from` and
  `source`; `find` has `description` but lacks `priority` and `blockedBy`.
- **Views group by four state groups, not by lifecycle.** `active` and `review`
  arrive merged as `started`. Columns by lifecycle, or by feature or cycle, are
  regrouped by the caller.
- **"Ready and in no cycle" cannot be asked.** `find` takes one value per filter
  and has no negation. Blocked items carry blocker ids only, with no word on
  whether the blocker is done.
- **Writes exist, one at a time.** `set` covers lifecycle, priority, cycle,
  parent and status. It validates values, not transitions: on a scratch copy it
  accepted `backlog` to `done` to `triage`. There is no batch, no dry run, no
  order field, and a drop's reason is body text `set` does not write.
- **Nothing tells a surface the tree changed.** No watch mode and no change
  token. Polling is cheap enough to cover it.
- **`bounty` is not this board.** It tracks its own in-memory tasks in four
  fixed columns, and its skill excludes the `docs/items` board by name.
- **Scriptorium stops at the document.** It reads `type`, `status` and
  `lifecycle` generically and knows nothing of `parent`, `cycle` or `priority`.
  Nothing in it lists documents by state. A board hands a document to it with
  `open` then `show --doc <path>`; there is no URL for one.
- **The Spellbook kit supplies the shell**: daemon, thin CLI, tail, sessions,
  and error envelopes of the same shape as `pdocs`.

### What belongs in the board, and what stays out

| In                                                                      | Why                                                   |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Triage inbox: each item with its description, source and a disposition  | The step that most needs a human, and is a list today |
| Now: what is `active` and in `review`, by feature and by cycle          | The question asked most often                         |
| Cycle board: lifecycle columns for one cycle, with candidates beside it | Where "what do we bring in" is decided                |
| Feature progress: a feature's items by state, archived ones included    | A feature outlives its cycles; nothing shows it whole |
| Needs attention: blocked, unreviewed, advisories                        | What stops work from starting                         |
| Agent proposals the human accepts or declines                           | The pattern the landscape supports, and Scriptorium's |

| Out                                           | Who has it                                        |
| --------------------------------------------- | ------------------------------------------------- |
| Editing or reviewing a document's prose       | Scriptorium; the board opens the document there   |
| Ad hoc task lists for a session               | `bounty`                                          |
| Status across projects                        | astrolabe                                         |
| The library (architecture, specs, playbooks)  | Scriptorium's map and `pdocs graph`               |
| Burn-down against a date, estimates, velocity | Cycles close on scope; nothing to measure against |
| Reordering within a column                    | No order field; priority orders, and can be set   |
| Creating items from the board                 | Agents file through `pdocs new`; revisit later    |

### Options Considered

- **Lighter: a read-only dashboard with handoff.** Four views (triage, now,
  cycle, feature) and a needs-attention strip, rendered from the existing reads
  and re-read on a poll. Clicking a document opens it in Scriptorium. Changes
  are asked of the agent in chat. Needs nothing new from the CLI except what the
  triage inbox lacks, which importing the read functions already covers.
- **Robust: an interactive board with proposals.** The same views, plus writes:
  drag between lifecycle columns, pull a candidate into a cycle, set priority,
  triage in place, and agent proposals (a triage disposition, a planned cycle's
  contents) accepted or declined one by one. Every write goes through
  `pdocs set`. Needs CLI work first: a batch or dry-run write, transition rules,
  a drop reason, and queries for candidates and blocked items.
- **In between: read-only plus the two decisions.** The lighter board, with
  writes only where the human already decides today: the triage disposition, and
  cycle membership. Both are single `pdocs set` calls that exist now.
- **Do nothing.** `pdocs view` as text and an agent's summary. It works; the
  cost is that grouping and planning are done from a list.

## Recommendation

- [x] **Propose a feature** — the work is big enough to plan

**Rationale:** the reads a board needs already exist and are fast, no installed
tool covers this, and the two decisions that most want a visual surface (triage,
and what goes in a cycle) are each one `pdocs set` call. Start from the
in-between version and mock up all three so the choice is made by looking.

Where the app lives is not settled. The foundations point to this repository:
importing the read functions is the cheapest path to the full frontmatter, and a
surface elsewhere would have to locate each project's `scripts/pdocs/`. The
Spellbook kit would then be a dependency to copy or share.

## Next Steps

1. Review this write-up, and the in-and-out tables above in particular.
2. Mock up the three versions ([mockups item](../pdocs-work-board-mockups.md))
   on this tree's real data.
3. File the CLI gaps the chosen version needs, under the feature. Candidates: a
   triage view, lifecycle-level grouping, a candidates query, blocker state, and
   for the robust version transition rules and a batch write.
4. Decide where the app lives.

## Open Questions

- Should `pdocs set` refuse a transition such as `done` to `triage`, or is that
  the skills' job? A board that writes by drag makes the gap matter.
- Does an agent's proposal live on the board only, or in the tree (a `planned`
  cycle is already in the tree; a proposed disposition is not)?
- How does a board opened from one project hand a document to a Scriptorium
  session: start one, or join one that is open?

Not checked: no Spellbook surface was opened in a browser for this; Shortcut,
Height and Notion were not read; bulk triage in Linear and Plane was not
confirmed; `set` on features and cycles was not exercised.

---

**Related Documents:**

- [The research item](./item.md)
- [pdocs work board](../../features/pdocs-work-board/feature.md)
- [Mock up the work board in a few variations](../pdocs-work-board-mockups.md)
- [Work board visualization landscape](./reports/2026-11-17-work-board-visualization-landscape-report.md)
- [Work board foundations](./reports/2026-11-17-work-board-foundations-report.md)
