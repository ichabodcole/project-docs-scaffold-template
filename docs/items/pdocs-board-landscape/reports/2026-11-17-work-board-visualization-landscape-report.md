---
type: report
title: Work board visualization landscape
description:
  How Linear, GitHub Projects, Plane, Jira, Kanban tools and agent-native boards
  show triage, active work, cycles and features, and what each lets you do from
  the view.
tags: [pdocs, work-board, landscape]
status: draft
generated: { by: Claude Sonnet 5.5, at: 2026-11-17 }
---

# Work board visualization landscape

All pages were read on 2026-11-17. Claims that a page did not state are marked
"not stated" or "unverified". Nothing here recommends a design.

## Scope

**Included:** Linear, GitHub Projects, Plane, Jira, Trello, and the agent-native
or markdown-backed group (Backlog.md, Vibe Kanban, Task Master, Beads, Obsidian
Kanban and Projects). Also how tools present a proposed plan for acceptance and
how they roll up feature progress.

**Excluded:** Shortcut, Height and Notion. The Shortcut help page redirected and
was not read. These are unverified.

## Summary table

| Tool           | Triage / intake                         | Active work                    | Cycle or sprint                        | Feature / project level                      |
| -------------- | --------------------------------------- | ------------------------------ | -------------------------------------- | -------------------------------------------- |
| Linear         | Inbox with accept, decline, dup, snooze | Board or list, My Issues       | Cycle graph, capacity dial, rollover   | Project graph with forecast, initiative page |
| GitHub Project | None built in (filter on a field)       | Table, board, roadmap          | Iteration field, grouping, burn up     | Group by parent, sub-issue progress          |
| Plane          | Intake with four actions                | List, board, table, calendar   | Cycle burn-down, transfer, auto-sched  | Modules: progress bar, state set by hand     |
| Jira           | None named in what was read             | Board columns, sprint-scoped   | Backlog and sprint split, drag to plan | Epics panel, timeline                        |
| Trello         | None                                    | Lists of cards                 | None                                   | None                                         |
| Backlog.md     | None (status To Do)                     | Kanban web UI, CLI board       | Milestones (CLI only)                  | Milestones, dependencies                     |
| Beads          | None                                    | `bd ready`, community kanbans  | None                                   | Epics by hierarchical ID                     |
| Task Master    | None                                    | CLI list, next                 | None                                   | Subtasks, tags                               |
| Vibe Kanban    | None                                    | Planning board plus workspaces | None                                   | Issues and sub-issues                        |

## Linear

**Triage.** The Triage inbox lists issues made by integrations, by people
outside the team, or created in the view. Actions are accept (moves to the
team's default status, with an optional comment), decline (moves to Canceled),
mark duplicate (merges attachments and customer requests into the original), and
snooze (hidden until a date or new activity). Keys 1, 2, 3 and H do these. Bulk
actions are not described on the page. Triage rules, Triage Intelligence and a
responsibility rotation need Business or Enterprise. Source:
https://linear.app/docs/triage

**AI-proposed triage.** Triage Intelligence puts suggestions on each triage
issue: team, project, assignee, label, and related or duplicate issues. A person
accepts, declines, or opens the reasoning for each suggestion. Per team and per
property type, a setting picks show, hide, or auto-apply. Suggestions take about
1 to 4 minutes. Source: https://linear.app/docs/triage-intelligence

**Board versus list.** Board shows cards in columns, grouped by Status by
default and groupable by Project, Priority, Cycle, Label and more. Swimlanes add
a second grouping as rows. Dragging a card to another column changes the
grouping value, so on a Status board it changes status. Cards can be reordered
and multi-selected with X. Board and list share one ordering and nearly all
shortcuts. Source: https://linear.app/docs/board-layout

**My Issues.** Four tabs: Assigned to you (grouped by priority), Created by you,
Subscribed, Activity. Source: https://linear.app/docs/my-issues

**Cycles.** Once a cycle starts, a graph shows scope (gray), a target line (blue
dotted), started work (yellow) and completed work (blue). Cycle Success is
percent done, counting started issues at 25 percent. Before a cycle starts, a
capacity dial estimates whether the added issues fit, from the last three
cycles. Actions: assign issues to the current or up to 15 upcoming cycles,
auto-add started or completed issues, unfinished issues roll over, edit future
cycle dates, start the next cycle early. Linear cycles are time-boxed (1 to 8
weeks). Source: https://linear.app/docs/use-cycles

**Projects and initiatives.** The project graph shows scope over time (so scope
creep is visible), started and completed lines, a target date, breakdown by
assignee and label, and a live forecast with optimistic and pessimistic dates
(about plus or minus 40 percent) after one week of data. In-progress issues
count at 25 percent. Source: https://linear.app/docs/project-graph

An initiative page shows a health value from the latest update, a color-coded
list of active projects (green, yellow, red, gray for no update) and one
completion curve per project. Actions are mostly commenting on at-risk projects
and editing properties. Source: https://linear.app/docs/initiatives How progress
rolls up across milestones was not on the pages read (unverified).

**Agents.** An issue can be delegated to an agent while a person stays the
assignee. Delegated issues stay in My Issues, views can filter by Delegate, and
Insights can slice by Delegate. Source: https://linear.app/docs/agents-in-linear

## GitHub Projects

Three layouts: table, board, roadmap. Views filter, sort, slice and group, and
can be saved and shared. On a board, dragging single or multiple items between
columns updates that field. On a roadmap, dragging changes start and target
dates or the iteration. Grouping by a field such as assignee lets you drag items
between groups to reassign. Source:
https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/changing-the-layout-of-a-view
and
https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects

An iteration is a custom field that plans week by week and supports breaks.
Charts: a default burn up (Open, Completed, Not planned) and current charts such
as items per upcoming iteration. Custom charts take filters and a type. Source:
https://docs.github.com/en/issues/planning-and-tracking-with-projects/viewing-insights-from-your-project/about-insights-for-projects

Built-in workflows set fields when items are added or change, auto-archive, and
auto-add from a repo. Sub-issue progress is available in projects for grouping
and filtering by parent, but the page did not say how the progress bar looks
(unverified). Source:
https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues

There is no triage inbox. Triage is a filtered view plus field edits.

## Plane

**Intake.** Off by default, enabled per project. Items arrive in-app, by public
form or by email and sit in a Triage state. Admins and members can accept (to
the default state or a chosen one), decline, mark duplicate (linked to the
original), or snooze to a date. Business plan adds an auto-assigned intake
owner. Sources: https://docs.plane.so/intake/overview and a search summary of
Plane's intake docs. **Conflict:** one page says declined and duplicate items
stay in Intake under Triage; another says they appear under closed items. Bulk
actions were not stated.

**Cycles.** A progress panel shows a burn-down with breakdowns by assignee,
state and label. The Active tab (Pro) shows burn-down or build-up charts against
an ideal pace, green when ahead and red when behind. Work items are added with
the plus button or the Cycle property. One item is in one cycle. "Transfer work
items" moves unfinished items from a completed cycle once. Auto-schedule and
auto-rollover are Business features. Source:
https://docs.plane.so/core-concepts/cycles

**Modules.** A module groups work by a shared goal (a feature, release or
campaign) and lives in one project. It shows a done-count progress bar and a
"Needs attention" area for overdue and blocked items. Layouts are list, gallery
and timeline (drag to change dates). Module state (Backlog, Planned, In
Progress, Paused, Completed, Cancelled) is set by hand, not by item completion.
An item can be in several modules. Source:
https://docs.plane.so/core-concepts/modules

**Layouts.** List, board, calendar (drag to change due dates), table (keyboard
and bulk edit), timeline (drag dates, dependencies). Source:
https://docs.plane.so/core-concepts/issues/layouts

## Jira

Board: cards in status columns for work in the next week or two. Source:
https://support.atlassian.com/jira-software-cloud/docs/what-is-a-jira-software-board/
The page said little about backlog or sprints.

Backlog: one view split into the backlog and sprint sections. Create a sprint,
drag items into it, drag the divider to move several. Start sprint moves items
to the Active sprints view. Later sprints can be planned while one is active but
not started (unless parallel sprints). An epics panel filters and takes dragged
items. Estimates can be edited in place and avatars show each assignee's load.
Bulk edit, bulk status change and bulk delete exist. Source:
https://support.atlassian.com/jira-software-cloud/docs/use-your-scrum-backlog/

Timeline: not read in detail (page returned 404); described only as planning
large initiatives over weeks to quarters. Unverified beyond that.

Proposed plans: native Atlassian Intelligence suggests type, priority, labels
per issue and breaks work into child items. A search summary found no native
batch sprint proposal; sprint-plan generators are marketplace apps (vendor
claims, unverified). Rovo agents are said to be able to suggest sprint
composition, not confirmed.

## Trello (baseline)

Lists of cards. Drag cards between lists, paste a list to bulk-create cards,
Butler automation, Power-Ups, an activity feed. The page names "views" but did
not describe them. No states, cycles or progress beyond list position. Source:
https://trello.com/guide/trello-101

## Agent-native and markdown-backed boards

**Backlog.md.** Each task is a markdown file in a project folder. Views: a live
CLI board (`backlog board`, exportable as markdown), and a local web Kanban
(`backlog browser`, bound to 127.0.0.1). In the web UI a human can drag cards
between columns, multi-select and move cards, create and edit tasks in forms,
tick acceptance criteria, and archive with confirmation. Agents use the CLI or
an MCP server that exposes workflow guides as resources. The README says to
prefer commands over hand-editing files. Fields include acceptance criteria,
plan, notes, final summary, comments, milestones and dependencies. Milestones
are managed from the CLI, and the page lists no milestone view or dashboard in
the web UI. Sources: https://github.com/MrLesk/Backlog.md and its README.

**Beads.** Issues live in a Dolt database, with a JSONL export for viewers. The
tool is agent-first: `bd ready` lists tasks with no open blockers, `bd list`
defaults to a tree, `bd dep tree` shows dependencies, `bd update --claim`
assigns and starts. States are open, in progress, closed, plus deferred and
pinned. Epics use hierarchical IDs. The core ships no UI, but a community list
names many: Bead Me Up Scotty (kanban, list, epics with progress bars, graph;
drag and create), b9s (kanban with epic swimlanes; drag), bd-board (read-only
unless writes enabled), btui and beady-eye (read-only), LazyBeads (ranked ready
work with explanations; claim and close with confirmation), beadcyte (schedule
and plan diffs), BeadBoard (dashboard, dependency graph, agent messaging).
Sources: https://github.com/steveyegge/beads and
https://github.com/gastownhall/beads/blob/main/docs/community-tools.md

**Task Master.** Tasks come from a PRD parsed by the agent. Views are CLI only:
`list` (filter by status, with subtasks), `next` (by dependencies and status),
`show` (single detail or multi-ID summary with an action menu). No dashboard was
found. Interaction is mainly through the editor's chat and MCP tools (7 core, 15
standard, 36 full). The storage format was not on the pages read (unverified).
Sources: https://github.com/eyaltoledano/claude-task-master and its
command-reference.

**Vibe Kanban.** A planning board of issue cards with priorities and
assignments, beside agent workspaces (branch, terminal, dev server). Humans
create and prioritize issues, launch agents, review diffs with inline comments
sent back to the agent, preview the app and open PRs. Statuses update
automatically as agents start and PRs are created or merged. Whether cards can
be dragged was not stated. The project is sunsetting (announced around April
2026 per secondary sources) and continues as community open source; hosted
issues, projects and comments were removed. Sources: https://www.vibekanban.com/
and https://github.com/BloopAI/vibe-kanban

**Obsidian Kanban.** Markdown-backed boards. The README gave no details on
storage or actions and says it seeks new maintainers (unverified beyond that).
Source: https://github.com/mgmeyers/obsidian-kanban

**Obsidian Projects.** Table, board, calendar and gallery over folders or
Dataview queries. Archived by its author on 2025-07-18 and no longer maintained.
A third-party review (2024, weak source) says inline frontmatter editing worked.
Source: https://github.com/obsmd-projects/obsidian-projects. A search summary
says a newer plugin, Arcadia Projects, writes the new status into a note's
frontmatter when a card moves (single community source, unverified).

## Proposed plans for human acceptance

- Linear Triage Intelligence: per-suggestion accept or decline with visible
  reasoning, and a per-property auto-apply policy.
- Linear and Plane intake: the item is the proposal; accept (with a chosen
  state), decline, duplicate, snooze.
- Linear cycle capacity dial: a forecast shown before the cycle starts, from
  past cycles. No tool read proposes cycle contents on its own.
- Jira backlog: the human builds the sprint by dragging. AI sprint generators
  exist only as third-party apps (unverified).
- Beads LazyBeads: ranked ready work with explanations, then claim or close with
  a confirmation step. Beads `rules compact` previews until forced.
- Backlog.md archive and Linear decline both use a confirmation or a comment
  step before the change lands.

I found no tool where an agent proposes a whole planned cycle and a human pulls
items in or out of it as a distinct state.

## Feature or epic progress across cycles

- Linear project graph: scope, started and completed over time, with a forecast.
  One curve per project on an initiative.
- Plane module: done count and state breakdown, independent of cycles. An item
  can be in a cycle and a module at once. Module state is manual.
- Jira epics panel and timeline: filter the backlog by epic. Progress bars on
  the timeline are unverified.
- GitHub: group by parent, burn-up chart, items per iteration chart.
- Beads community UIs: epic progress bars and swimlanes.
- Backlog.md: milestones exist but no progress view in the web UI.

## Patterns

**Recurring view types.**

- Inbox list with per-row decisions (Linear, Plane).
- Board of columns by status (all tools).
- Table or list with grouping, filters and saved views.
- Time-scoped view with a burn-down or burn-up graph (Linear, Plane, GitHub).
- Pre-start capacity or scope view (Linear dial, Jira estimates).
- Project or module card with a progress bar and health (Linear, Plane).
- Timeline or roadmap (GitHub, Plane, Jira).
- Dependency tree or ready list (Beads, Task Master `next`).

**Recurring interactions.**

- Drag a card to change the grouped field (Linear, GitHub, Plane, Backlog.md,
  Trello).
- Drag into a sprint or cycle (Jira) or set a Cycle field (Linear, Plane).
- Accept, decline, duplicate, snooze with a comment (Linear, Plane).
- Multi-select then bulk move or edit (Linear, Jira, GitHub, Backlog.md).
- Keyboard shortcuts for triage and moves (Linear).
- Rollover or transfer of unfinished items at cycle end (Linear, Plane).

**Distinctive to agent-native tools.**

- Files or a database are the source of truth, and the UI writes back to them
  (Backlog.md, Beads, Obsidian plugins).
- A "ready" or "next" query by dependencies instead of a human-chosen column
  (Beads, Task Master).
- Claiming a task for an agent (Beads) and delegating while a human stays owner
  (Linear).
- Human review of agent output is a first-class view (Vibe Kanban diff review
  with comments sent back to the agent).
- Agent-readable workflow guides served as MCP resources (Backlog.md).
- Read-only viewers by default, with writes switched on explicitly (bd-board,
  btui).
- Status that updates itself from agent and PR events (Vibe Kanban).

## Could not verify

- Shortcut, Height, Notion (not read).
- Jira timeline details and Jira backlog totals (pages 404 or silent).
- Linear initiative progress across milestones.
- Bulk triage in Linear and Plane.
- Vibe Kanban card dragging and MCP tools; shutdown date (secondary sources).
- Task Master storage format; Obsidian Kanban behavior.
- Maintenance state of Beads community UIs.

## Related documentation

- [A work board for project-docs: what we have, the landscape, and what to build](../item.md)
