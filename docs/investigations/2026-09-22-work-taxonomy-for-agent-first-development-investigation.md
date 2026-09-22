---
type: investigation
title:
  "Investigation: What work taxonomy should a file-based, agent-first
  development system have?"
description:
  Which units of work — and which relationships between them — should
  project-docs keep, merge, rename or add, measured against how established and
  newer project tools model work and against agent-paced development?
tags: [taxonomy, work-management, agents]
status: stable
lifecycle: concluded
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Investigation: What work taxonomy should a file-based, agent-first development system have?

**Outcome:** Proposal Recommended

---

## Question / Motivation

project-docs' work vocabulary grew out of one person's way of working: a
backlog, briefs, fragments, investigations, project folders holding a proposal
and a plan, sessions, and — since September — cycles. It is not scaling well,
and several of its concepts do more than one job:

- **There is no unit of work the size of a task or a story.** Backlog items end
  up playing that role, but a backlog item is also a triage inbox and, lately, a
  work order a whole branch lands against.
- **A project folder is several things at once.** It holds a proposal (intent),
  a plan that often covers what elsewhere would be several stories or a whole
  feature, and the execution record (sessions, artifacts). Is it an epic, a
  feature, a project in Linear's sense, or a design document with attachments?
- **Proposal and plan might be documents about a unit of work rather than units
  of work themselves.** The tree currently treats them as both.

Underneath all three is a more basic question: **what are the fundamental
things, and how do they compose?** The current set was built ad hoc, so it mixes
kinds of distinction. A backlog item is the clearest case. It is really a task
that nobody is working on yet, which makes "backlog" a _state_ that has been
given a folder and a type of its own. The alternative is a `tasks/` folder where
some tasks are in play and some are not. The investigation therefore separates
three layers and asks what belongs in each:

1. **Entities** — the fundamental things that exist independently and carry
   their own identity (a task? a feature? a decision document?).
2. **States** — where an entity has got to (open, in play, done, dropped). A
   state is a field, not a folder and not a type.
3. **Organisation and views** — how entities are grouped and seen: folders,
   parent links, cycles, boards, a backlog. Many of these can be derived from
   the first two layers instead of being authored as separate documents.

The goal is a **file-based system that performs many of the conceptual functions
of a tool like Linear or Plane** — not as robust, but idiomatic, so that the
concepts a developer already knows mean what they expect. It has to work very
well for agents and still be plain enough for a person to navigate by hand.
Tooling will follow, including agent-built UIs in the style of Spellbook's
skill-hosted apps that read and write the same files. The foundational concepts,
and how they compose, have to be right first.

There is also a shift to take seriously. Development is moving from human-paced
to agent-paced work, with a human in the loop for product decisions and
occasional hands-on development. The core concepts teams have relied on are not
obsolete, but some of them bend: a two-week sprint does not match work that can
go from proposal to merged in an afternoon. The question is which concepts
survive intact, which change shape, and which exist only because humans were the
bottleneck.

**Decision this feeds:** the type list and relationships that
[Guidance Lifecycle](../projects/guidance-lifecycle/proposal.md) and
[Docs Foundation](../projects/docs-foundation/proposal.md) would build on. The
former retires `memory` and `lesson` as a breaking change, and settling the work
taxonomy first means one breaking change instead of two.

**Scope.** One project's structure and development cycle. A layer above several
projects (a workspace, a portfolio) is noted where the landscape has one, but
designing it is out of scope. The knowledge side of the taxonomy (playbooks,
lessons, memories, architecture) is Guidance Lifecycle's question and appears
here only where it touches the work side.

## Current State Analysis

### What exists

The work-side types, from the contract in [`SCHEMA.md`](../SCHEMA.md):

| Unit              | Home                      | Lifecycle                                                                      | What it is used for in practice                              |
| ----------------- | ------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Fragment          | `fragments/`              | `open` · `promoted` · `dropped`                                                | Half-formed capture                                          |
| Brief             | `briefs/`                 | `active` · `spent`                                                             | Framing for a conversation or a phase                        |
| Backlog item      | `backlog/`                | `open` · `done` · `promoted` · `dropped`                                       | Small intent, triage inbox, and branch work order, all three |
| Investigation     | `investigations/`         | `active` · `concluded`                                                         | Research that reduces uncertainty before committing          |
| Project folder    | `projects/<name>/`        | none of its own                                                                | Container for everything below                               |
| Proposal          | `projects/*/proposal.md`  | `draft` · `approved` · `deferred` · `implemented` · `withdrawn` · `superseded` | Shaped intent: the what and why                              |
| Design resolution | `projects/*/`             | `draft` · `resolved` · `superseded`                                            | Answers to open design questions                             |
| Plan              | `projects/*/plan.md`      | `draft` · `active` · `completed` · `abandoned`                                 | Phases and steps: often several stories' worth               |
| Test plan         | `projects/*/test-plan.md` | `draft` · `ready` · `active` · `completed`                                     | Verification scenarios                                       |
| Kickoff, handoff  | `projects/*/`             | none                                                                           | Handover documents between sessions or agents                |
| Session           | `projects/*/sessions/`    | none (frozen)                                                                  | Execution record per branch                                  |
| Cycle             | `cycles/`                 | `planned` · `active` · `closed` · `abandoned`                                  | The in-play index: scope by reference, appetite, outcome     |
| Branch            | git                       | opened by `init-branch`, closed by `finalize-branch`                           | The only unit that reliably opens and closes                 |

### Where this was last examined

[What are the right primitives for "work in play"?](./2026-09-03-work-cycle-taxonomy-landscape-investigation.md)
(concluded) asked a narrower question and kept the existing units, adding the
cycle on top. Its two reports are the starting evidence here and are not redone:

- [PM work-taxonomy landscape](../reports/2026-09-03-pm-work-taxonomy-landscape-report.md)
  — Shape Up, Linear, Scrum/Jira, Kanban, GitHub/GitLab, Basecamp, Notion, and
  Plane in a paragraph.
- [File-based work-tracking landscape](../reports/2026-09-03-file-based-work-tracking-landscape-report.md)
  — RFC/KEP/PEP/RFD processes, ADRs, git-native trackers, PARA, agent plan-file
  conventions.

Its findings that carry forward: every tool separates an outcome-bound grouping
unit from a cadence-bound in-play unit; "accepted" is never "done"; files stay
put and state fields change; the execution trail stays with the feature, not the
period; a cycle is an index over work, not a container for it.

What it did not ask: whether the units themselves are the right ones. That is
this investigation.

## Research Plan

Four tracks, run in parallel and filed as reports with a source per claim:

1. **Plane and Macro in depth.** Plane (open source; work items, sub-items,
   modules, cycles, epics, initiatives, pages, intake) and Macro (a newer
   product, to be characterised by the research rather than assumed). What their
   primitives are, how they nest, which states each carries, how documents
   relate to work, and what each does for agents.
2. **The canonical work hierarchy and what each level is for.** Linear, Jira,
   GitHub Issues and Projects, Azure DevOps, Shape Up: issue, sub-issue, task,
   story, epic, feature, project, milestone, initiative. Where story and task
   genuinely differ, where a spec or design document attaches, and which levels
   small teams actually use.
3. **Agent-native and file-based work systems.** GitHub Spec Kit, Kiro specs,
   Backlog.md, beads, Taskmaster and similar; agent plan-file conventions;
   Linear's and others' agent integrations. What unit an agent is handed, how
   big it is, and what it returns.
4. **Cadence for agent-paced work.** What practitioners and tools report about
   sprints, cycles and continuous flow when agents do most of the
   implementation: what replaces the sprint's jobs (a commitment boundary,
   review and retro, a planning rhythm), and what does not need replacing.

Then: sort every external and internal concept into the three layers (entity,
state, organisation or view), note where one of ours plays several roles or
none, and propose a candidate taxonomy — the entities, their states, and how
they compose — with the relationships drawn.

## Investigation Findings

### Evidence Gathered

Six reports, a source per claim. The first four sort what they found into
entity, state and organisation/view; the last two answer follow-ups raised by
the first round of decisions:

- [Plane and Macro](../reports/2026-09-22-plane-and-macro-work-model-report.md)
- [The work-item hierarchy](../reports/2026-09-22-work-item-hierarchy-landscape-report.md)
  — Linear, Jira, GitHub, Azure DevOps, Shape Up
- [Agent-native work systems](../reports/2026-09-22-agent-native-work-systems-report.md)
  — Spec Kit, Kiro, Backlog.md, beads, Taskmaster, Copilot, Linear for Agents,
  Devin
- [Cadence at agent pace](../reports/2026-09-22-cadence-at-agent-pace-report.md)
- [Plans, discovery and fields](../reports/2026-09-22-plans-discovery-and-fields-report.md)
  — whether plans are kept, where ideas end and delivery begins, which work-item
  fields are idiomatic
- [How work flows here](../reports/2026-09-22-how-work-flows-report.md) — this
  repository's own history, path by path

### Key Observations

1. **"Backlog" is never an entity.** No tool researched gives a backlog item its
   own identity separate from the work item. It is a state (Plane's `Backlog`
   state group, Jira's unscheduled issues) or a view (Azure DevOps' backlog
   levels, a filtered board). Backlog.md, the one tool with a backlog _folder_,
   keeps the folder in sync with a `status` field its CLI writes — the folder is
   a mirror of the field, never the record. project-docs' `backlog/` is a state
   given a folder and a type.
2. **The modern tools converge on one work-item entity.** Linear has only issues
   and calls the story/task split "a cargo cult ritual". Plane folded epics into
   work items as a type (2026) so epic, task and bug share one state machine.
   GitHub keeps one Issue entity with a `type` field. Jira and Azure DevOps keep
   separate entity types per level, and practitioner writing for small teams
   collapses them anyway. Hierarchy is a `parent` link between entities of one
   kind, not a set of kinds.
3. **A spec or plan is a document attached to work, not the work.** Linear
   (project description and project documents), Jira, GitHub, Azure DevOps and
   every agent-native tool (Spec Kit, Kiro, Taskmaster) attach the design
   document to a separately identified unit. Shape Up is the one exception: the
   pitch _is_ the unit until it is bet on. project-docs' `proposal.md` behaves
   like a pitch — its `lifecycle` (`draft` · `approved` · `implemented`…) is in
   practice the feature's state.
4. **The unit an agent is handed is small and structured.** Every agent-native
   system hands an agent one task — never a story or an epic — carrying
   acceptance criteria and a status it writes back mechanically. The genuinely
   agent-driven idea is **dependencies as a queryable field**: `bd ready`,
   Taskmaster's `dependencies`, Spec Kit's `[P]` parallel marker let an agent
   ask "what can I start now" without reading a board.
5. **States come in groups.** Plane names per-project states but rolls them up
   into five fixed groups (backlog, unstarted, started, completed, cancelled);
   only `completed` counts as done. A file-based system can do the same with a
   state field and one mapping table, which is what lets a UI draw a board from
   any vocabulary.
6. **Cadence is a field or a view, not a container.** Linear's cycle, GitLab's
   iteration and GitHub's iteration field are all membership fields on the work
   item. At agent pace the evidence is that review, not coding, is the
   bottleneck (Faros: median time in PR review up 441.5%), so the jobs a sprint
   did either move onto the unit of work (commitment, appetite, review) or
   disappear for a solo developer (capacity planning, stakeholder cadence). A
   scope-bound cycle with an appetite and an outcome survives the evidence; a
   calendar one does not. Membership moves onto the item (see the
   Recommendation).
7. **Agents as assignees.** Macro puts people and agents in one assignee field
   (`bot|<uuid>` beside a person); Linear keeps the human as assignee and adds
   the agent as a contributor. If assignment enters the taxonomy at all, one
   field for both is the cheap shape.
8. **The two places Plane is not clean are the pressure points.** Triage is a
   state that got its own screen, and Initiative is an entity whose substance is
   a roll-up view. A strict entity/state/view split will feel pressure in
   exactly those spots: a special state wanting a home, and a grouping wanting
   to be a thing.

### Today's units, sorted

| Today                        | Layer it really is                                       | Note                                                    |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| Backlog item                 | Work item, in an unstarted state                         | Obs. 1                                                  |
| Fragment                     | Work item (or note) in a triage state                    | Plane's intake: a reserved state, not a separate entity |
| Project folder               | A feature: an outcome-bound entity with child work items | Linear project, Plane epic                              |
| Proposal                     | Document attached to the feature — or the feature itself | Obs. 3: attachment (Linear) or pitch-as-unit (Shape Up) |
| Plan                         | Document; its steps are candidate child work items       | Spec Kit keeps them as `tasks.md`, Backlog.md as files  |
| Design resolution, test plan | Documents attached to the feature                        |                                                         |
| Investigation                | Document, or a research-kind work item (a spike)         | Its `active`/`concluded` is a work state                |
| Brief                        | Document (context for a feature, cycle or conversation)  |                                                         |
| Session, report              | Frozen records                                           | Attached to the work they record                        |
| Kickoff, handoff             | Documents attached to a feature                          |                                                         |
| Cycle                        | Organisation: a scope-bound grouping with an outcome     | Obs. 6                                                  |
| `_archive/`                  | A state (terminal) expressed as a folder                 | 09-03 finding: files stay put, state fields change      |

### Candidate taxonomy, first draft

_Superseded by the revised candidate below; kept because the decisions that
follow answer it._

**Entities — two kinds of thing that do work, and documents about them:**

1. **Work item** — the one unit of work, in `tasks/` (name open). Small enough
   to hand an agent: one branch or less. Carries `id`, `state`, `parent`,
   `blocked_by`, acceptance criteria, optionally `cycle` and `assignee`. Absorbs
   today's backlog items and fragments.
2. **Feature** — an outcome-bound unit that groups work items, in its own folder
   (today's project folder, renamed or not). Carries its own `state` and holds
   its documents. Could instead be a work item of `kind: feature` with children,
   as Plane now does; the folder is what files add.
3. **Document** — proposal (the pitch), design resolution, plan, test plan,
   brief, investigation. Documents have OKF `status` (trustworthy or not), not a
   work state; the work state lives on the entity they attach to.
4. **Record** — session, report. Frozen; attached by link.

**States — one field, one grouped vocabulary for every entity:** triage →
backlog → ready → active → review → done, plus dropped; mapped onto Plane-style
groups (unstarted / started / completed / cancelled) in one table in
`SCHEMA.md`. Folders follow entity type, never state.

**Organisation and views:**

- **Parent links** give the hierarchy (work item → feature).
- **Cycle** stays as the scope-bound grouping with an appetite and an outcome
  record; open whether items point at it (`cycle:` field, the Linear shape) or
  it lists them (`scope:`, today's shape).
- **Backlog, board and roadmap are views** derived by the CLI from state, parent
  and cycle — `pdocs` output, or a UI over the same files — never authored.

### Decisions the first draft needed

1. **One entity or two?** A single work-item kind with features as parents
   (Plane, GitHub), or distinct work items and features (Linear's issue and
   project)?
2. **Is the proposal the feature or attached to it?** Shape Up's pitch-as-unit
   matches how the tree works today; every other tool attaches it.
3. **Plan steps: checklist or files?** Keep them as a checklist inside the plan
   (Spec Kit's `tasks.md`), or give each its own work-item file (Backlog.md) so
   an agent can be handed one and a UI can show it?
4. **Cycle membership: on the cycle or on the item?**
5. **Which fields enter at all:** `assignee` (with agents), `blocked_by`,
   priority, estimate? The manifesto's "records scope and state, not people or
   dates" bears on `assignee` (people) and on due dates; an estimate is neither,
   but no agent-native tool carries one either.

### Decisions so far (2026-09-22)

Cole's answers to the five decisions:

1. **One work-item entity, features as parents.** Settled.
2. **The proposal is the feature** (Shape Up's pitch-as-unit), not a document
   attached to one. Settled, with a question it opens: proposals began as a way
   to capture an idea, and fragments as a way to capture one not yet ready for
   development — partly because ideas were captured in Operator. The tree may be
   mixing **idea development** with **software development**. Is the idea phase
   part of project-docs, a document type at its edge, or a separate phase that
   belongs elsewhere and only hands over? (The landscape's name for this split
   is dual-track agile: a discovery track and a delivery track.)
3. **Plan steps are probably not separate work items.** As agents get more
   capable, a work item can state what is wanted and a definition of done, and
   the agent can plan for itself — with the plan reviewed if it is worth
   reviewing. Open: is a plan a durable document, attached to the work item, or
   an agent's scratch file that is never kept? What is emerging as idiomatic?
4. **Cycle membership: no strong preference.** Change it only if the landscape
   or agent efficiency argues for it. The test for this and for every choice
   here: what does the agent doing the work need, what is most efficient for it,
   and what scales — within project-docs' scope of one project's work as files.
5. **Fields: bring in what is idiomatic and foundational now, even if lightly
   used,** so tooling and UIs can build on them — but not the whole kitchen
   sink. Whether each is always required or optional (an estimate on every item,
   or only when useful) is part of the decision.

**Where documents live — the plan as the test case.** Cole's refinement of
decision 3: if a plan is something an agent refers back to, it should not end up
in a `plans/` folder collecting every project's plans. Either it is owned by
something — a task, a feature — and lives with its owner, or it is abstracted
further into a work item of its own kind. Three shapes to weigh:

- **(a) The plan is a work item** (`kind: plan`), linked to the task or feature
  it serves. The work item _is_ the output.
- **(b) A work item produces the plan** ("write the plan for X"), and the plan
  is a document owned by that item or by the feature.
- **(c) The plan is a document inside its owner.** An entity is a file; one that
  owns documents becomes a folder holding its own file and them (the way a
  feature folder holds `proposal.md` today). No document-type folders at all.

The research leans towards documents attached to an owner: no tool surveyed
models a plan as a work item, and the ones that keep plans (Spec Kit, Kiro,
ExecPlans) keep them beside the feature they serve
([report](../reports/2026-09-22-plans-discovery-and-fields-report.md)). The rule
chosen has to hold for every document type — plan, design resolution, test plan,
research — not just plans.

**Added to the scope: map how work gets done.** The practice evolved from
proposals for new features toward backlog items and tasks. Before designing the
skills that orchestrate the work, map the distinct ways work arrives and moves —
a bug, a new feature, an idea, research, consumer feedback, a chore — and check
the foundational structures cover every path.

### How work actually flows here

From the repository's own history
([report](../reports/2026-09-22-how-work-flows-report.md)), nine ways work
arrived:

| Path                      | What it looked like                                                   | How it closed                              |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| Planned feature           | brief or investigation → proposal → plan → sessions (12 folders)      | Proposal lifecycle, archive                |
| Work first, record after  | sessions with no proposal (16 folders); proposals committed with code | Often never                                |
| Versioned feature family  | grapevine v1.6 … v1.7, finalize-branch-hardening, html-mockup         | Per version; the family never              |
| Idea shaping              | briefs and investigations (7 of 9 briefs still `active`)              | Rarely; three contradicted by shipped work |
| Consumer feedback round   | story-loom, Spellbook: one backlog item per round, one branch         | `done`, or `open` awaiting a release       |
| Review finding            | a backlog item spawned by a branch review (8; 6 still open)           | Mostly open                                |
| Small-fix backlog (early) | one item per fix, archived in the fixing commit                       | Moved to `_archive/`                       |
| Chore and release         | commits only                                                          | The commit                                 |
| Captured outside the repo | Operator, GitHub issues; no fragment was ever committed               | Upstream                                   |

The map adds nine requirements the candidate did not meet: a state between
_landed_ and _released_; a provenance link (`from:`) distinct from `parent`; an
external identity field (issue numbers, Operator captures); items created after
the work (born `done`, the most common shape here); a parent that never closes
(a versioned family); a home for records that belong to a work item rather than
a feature; an idea stage that reaches a terminal state; transitions written by
the skills that land work, since six live documents hold a state their evidence
contradicts; and no silent deletion (`b49ce51`, a recipe commit, removed a
brief, an investigation and a backlog item without a trace).

### Candidate taxonomy, revised

_The second round of decisions below changes three things here — `released`
became a field, the versioned family became a `scope` field, and the idea stage
moved upstream. The Recommendation is the current statement._

**Entities.**

- **Work item** — the one unit of work, `kind: task | bug | chore | research`
  (list open). A file; it becomes a folder when it owns documents or records.
  Absorbs backlog items (fragments depend on the idea-stage decision below);
  review findings and consumer rounds are work items with `from:` and `source:`.
- **Feature** — the proposal _is_ the feature: `proposal.md` in a folder, its
  `lifecycle` the feature's state. Work items point up to it with `parent:`. A
  versioned family is a feature that parents features, or an `area` (open).
- **Documents live inside their owner** (shape (c) above): a plan, design
  resolution, test plan or research write-up is a file in the folder of the
  feature or work item it serves. No folders by document type. A durable plan
  belongs to feature-sized work, as Spec Kit, Kiro and ExecPlans keep it; a work
  item's plan is the agent's scratch unless it was reviewed and is worth
  keeping.
- **Records** — sessions and reports, frozen, inside their owner too; a session
  for a work item with no feature lives in that item's folder.

**Fields** (from the
[fields research](../reports/2026-09-22-plans-discovery-and-fields-report.md)):
required `id`, `title`, `kind`, `state`; used when they apply `parent`, `from`,
`blocked_by`, `source` (external IDs, a list), `cycle`, and an acceptance or
definition-of-done section in the body. Optional `priority` and `assignee` (a
person or an agent, one vocabulary). No `estimate` and no due date: no
agent-native tool carries an estimate, and the manifesto excludes dates.

**States**, grouped once in `SCHEMA.md`: `triage` · `backlog` · `ready` ·
`active` · `review` · `done` (landed) · `released` (optional, for work a
consumer receives) · `dropped`. A work item is never deleted, only dropped.
Transitions are written by the skills that open and land work (`init-branch` →
`active`, `finalize-branch` → `done`), which may also create an item born `done`
for work that ran first.

**Organisation and views.** `parent` gives the hierarchy and `from` the trail.
Cycle membership moves onto the item as a `cycle:` field — the Linear, GitLab
and GitHub shape, and the one an executing agent reads without opening a second
file — while the cycle document keeps its appetite and outcome, and the CLI
derives its scope list. Backlog, board and roadmap are views the CLI derives.

**The idea stage** is the one question the evidence does not settle for this
tree. Every delivery tool keeps raw ideas out of its backlog, and here the idea
phase already happens mostly upstream in Operator while in-tree briefs rarely
close. Two shapes: keep ideas upstream and start project-docs at a work item or
a feature in `draft`; or keep a lightweight idea document in-tree with a
terminal state (`shaped` into a feature, or `dropped`).

### Second round of decisions (2026-09-22)

1. **The idea stage — decided: upstream.** Ideas are captured and triaged
   outside project-docs (Operator today) and enter as a feature or a work item
   once they are ready. No idea or fragment type. Cole's principle, which
   applies to every choice here: start with a small, strict set of fundamentals
   and add a type only when a real need shows it fits. The current system tried
   to do too much and was not strict enough.
2. **Plan placement — decided: ownership and co-location.** Folders by entity
   type (`features/`, `items/`, `cycles/`); a folder means "these files belong
   to one entity", and every relationship between entities (parent, cycle,
   provenance, blocking) is a field, so no file moves when one changes. An
   entity is a single file until it owns something, then a folder holding its
   own file and what it owns. A feature can own a broad plan across its items;
   an item can own a granular plan an agent executes. Today's `artifacts/`
   folder was the same instinct — things accumulated while doing the work belong
   to the work. Open: whether named documents (plan, test plan, sessions) sit at
   the folder's root under fixed names and `artifacts/` stays for everything
   unnamed.
3. **The versioned family — decided: an anti-pattern, replaced by a `scope`
   field.** `grapevine`, `grapevine-v1.6`, `grapevine-v1.6.7`, `grapevine-v1.7`
   and `grapevine-backlog` were five folders standing in for a missing field.
   Each version is an ordinary feature; the backlog folder becomes items. What
   they share is the part of the project they touch — an app or package in a
   monorepo — recorded as `scope:` on features and items. The name matches the
   conventional-commit scope this repository already writes (`fix(pdocs)`) and
   Nx's `scope:` tags for monorepo boundaries. A controlled list, declared in
   `.project-docs.json` (Docs Foundation's configuration seam) and checked by
   the lint; optional for a single-app project.
4. **`released` — decided: a field, `released_in`, not a state.** `done` always
   means landed. Cole's concern: a field that can only be known after the
   release is cut is exactly the kind that stops being updated unless a touch
   point writes it. So it should be derived rather than authored where possible
   — commits carry the item's ID in a trailer, and the first release tag
   containing the landing commit is the answer — and written only by the release
   or sweep touch point where it cannot be derived. The general lesson for the
   skills phase: every field needs a named writer, or it goes stale.

## Recommendation

- [x] **Create Proposal** — the work taxonomy below, landed together with
      [Guidance Lifecycle](../projects/guidance-lifecycle/proposal.md) and
      [Docs Foundation](../projects/docs-foundation/proposal.md) as one breaking
      release.

**The principle.** A small, strict set of fundamentals; a type is added only
when a real need shows it fits. Three layers kept apart: **entities** (things
with identity), **states** (a field on an entity), and **organisation and
views** (relationships as fields; boards, backlogs and roadmaps derived, never
authored).

### The entities

| Entity        | What it is                                                                        | Its file                            |
| ------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| **Feature**   | An outcome worth shaping. The proposal _is_ the feature; it closes when delivered | `features/<slug>/proposal.md`       |
| **Work item** | The one unit of work, small enough to hand an agent. `kind` says what sort        | `items/<id>-<slug>.md`, or a folder |
| **Cycle**     | A scope-bound grouping with an appetite and an outcome                            | `cycles/YYYY-MM-<slug>.md`          |

Everything else is **owned**: named documents (`plan.md`, `test-plan.md`,
`design-resolution.md`), records (`sessions/`), and anything unnamed
(`artifacts/`) live inside the folder of the feature or item they belong to. An
entity is a single file until it owns something; then it is a folder holding its
own file and what it owns. A folder means "these files belong to one entity"; no
file lives in a folder because of its state, its parent or its cycle.

```
docs/
  features/
    okf-frontmatter/
      proposal.md                 ← the feature (state lives here)
      plan.md                     ← broad plan across its items
      sessions/2026-09-04-phase-one.md
      artifacts/
  items/
    WI-012-lint-descriptions.md   ← parent: feature/okf-frontmatter
    WI-020-hook-env/
      item.md                     ← kind: bug, cycle: 2026-09-story-loom
      plan.md                     ← granular plan the agent executed
      sessions/2026-09-22-fix.md
    WI-021-bump-deps.md           ← kind: chore, no parent
  cycles/
    2026-09-story-loom.md
```

### Fields

| Field         | On            | Required | Meaning                                                                       |
| ------------- | ------------- | -------- | ----------------------------------------------------------------------------- |
| `id`          | item          | yes      | Stable identity; links and commit trailers use it                             |
| `title`       | all           | yes      |                                                                               |
| `kind`        | item          | yes      | `task` · `bug` · `chore` · `research` (the list may grow only by a real need) |
| `state`       | feature, item | yes      | See below                                                                     |
| `parent`      | item          | when set | The feature it serves                                                         |
| `scope`       | feature, item | when set | The part of the project it touches; a controlled list in `.project-docs.json` |
| `cycle`       | item          | when set | The cycle it is in play in                                                    |
| `from`        | item          | when set | What spawned it — a review, another item, a feedback round                    |
| `source`      | item          | when set | External IDs: an issue number, an Operator capture                            |
| `blocked_by`  | item          | when set | Items that must land first; what lets an agent ask "what can I start now"     |
| `released_in` | feature, item | derived  | The first release containing the landing commit                               |
| `priority`    | item          | optional |                                                                               |
| `assignee`    | item          | optional | A person or an agent, one vocabulary — see below                              |

The body of an item carries its definition of done. Out, deliberately: estimates
and due dates.

**`assignee` — decided 2026-09-22: kept, optional.** The manifesto says
project-docs "records scope and state, not people or dates", and that stays true
in spirit: project-docs remains a tool for a single developer, because that is
the only experience it is built from, and growing it for human teams would mean
guessing. The use for `assignee` is agent teams — an Anthill team, where seats
have handles and their own scope of work, and an item can be routed to the seat
that owns it. It is optional because in the common case — one person and the
agent they are working with — it would be boilerplate naming the same party
every time. The proposal amends the manifesto line to say so: an assignee routes
work to an agent or seat; project-docs still does not track people or dates.

### States

One vocabulary for features and items, grouped once in `SCHEMA.md` so every view
reads the same groups:

| Group     | State     | Means                                                                  |
| --------- | --------- | ---------------------------------------------------------------------- |
| unstarted | `triage`  | Created, not yet accepted — nobody has decided whether it is wanted    |
|           | `backlog` | Accepted as wanted, not yet ready to start                             |
|           | `ready`   | Has a definition of done and nothing blocking it; an agent can take it |
| started   | `active`  | Being worked                                                           |
|           | `review`  | Waiting on a human or a reviewer                                       |
| completed | `done`    | Landed                                                                 |
| cancelled | `dropped` | Decided against                                                        |

**`triage` is not the idea stage.** Ideas are triaged upstream before they enter
the tree (decision 1 above); this state is for items already in the tree that
nobody has accepted yet. **It is the one state only a human leaves.** Anything
may create an item there — a review agent filing findings, an agent hitting a
bug mid-task — and only a person accepts it into `backlog` or drops it, so
agents can file freely without growing the backlog. An item created by someone
who already wants it starts at `backlog` or `ready`. (It was called `new` in the
drafts, which also reads as "recently created"; `triage` is Linear's and Plane's
name and means only the one thing.)

A feature arrives already accepted, since ideas are triaged upstream: its
`draft` is `backlog` and `approved` is `ready`. Nothing is deleted; it is
`dropped`. A cycle keeps its own `planned` · `active` · `closed` · `abandoned`,
and its scope list is derived from the items that name it — which retires the
cycle's own `scope:` key, since that name now means the part of the project a
feature or item touches.

### Views

Derived by `pdocs` from the fields, and later by UIs over the same files:
backlog (unstarted items), board (by state group), a feature's items, a cycle's
scope, a scope's work, what is ready and unblocked, what landed since a release.

### What today's types become

| Today                              | Becomes                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| Backlog item                       | Work item                                                        |
| Fragment                           | Removed; ideas live upstream                                     |
| Brief                              | Removed as a type; a framing document is owned by what it frames |
| Investigation                      | Work item, `kind: research`, owning its write-up                 |
| Project folder + proposal          | Feature                                                          |
| Plan, test plan, design resolution | Named documents inside their owner                               |
| Kickoff, handoff                   | Named documents inside their owner                               |
| Session                            | Record inside its owner                                          |
| Report                             | Owned by the research item that produced it                      |
| Artifact                           | Unnamed file in its owner's `artifacts/` folder (unchanged role) |
| Cycle                              | Cycle; membership moves to the items                             |
| `_archive/`                        | Removed; a terminal state is the archive                         |

### Touch points the skills phase must name

Every field needs a named writer or it goes stale:

- **Whoever creates an item** — intake from upstream, a review agent filing a
  finding, `finalize-branch` for work that ran first, a person — writes `kind`,
  `title`, `id`, and what it knows of `parent`, `scope`, `from` and `source` at
  creation. Intake from upstream always writes `source:`; a review writes
  `from:`.
- **Triage** (a person) accepts or drops an item and sets `priority`, and
  `assignee` when the item is routed to a particular agent or seat.
- **Shaping** — writing a feature's plan, or an item's definition of done — sets
  `blocked_by` and moves the item to `ready`.
- **`init-branch`** moves an item to `active` and sets `cycle` if one is active.
- **`finalize-branch`** moves it to `done`, writes its session into the owner's
  folder, and creates an item born `done` for work that ran without one.
- **Commits** carry the item's `id` in a trailer, which is what lets
  `released_in` be derived.
- **A release or sweep** touch point writes `released_in` where it cannot be
  derived, and closes cycles whose items are all in the completed group.
- **The lint** refuses a work item that disappears without reaching `dropped`,
  and checks that `scope` is in the declared list and every `parent`, `from`,
  `blocked_by` and `cycle` resolves.

## Open Questions

- `scope`: one value or a list? One maps onto a commit prefix; a list covers a
  change to shared code used by two apps. Lean: one.
- The item ID format: sequential (`WI-020`), date-based, or a short hash — and
  who allocates it, so two agents working in parallel cannot collide.
- What a UI needs beyond the fields: ordering within a state, and whether a
  generated index is worth having.
- The consumer migration: what an existing `backlog/`, `projects/` and
  `_archive/` become, staged with Guidance Lifecycle's retirements as one
  release.

## Next Steps

1. Write the proposal — the taxonomy, the migration, and the touch points — and
   reconcile the recommendation with Guidance Lifecycle and Docs Foundation, so
   the type changes can land as one breaking release.
