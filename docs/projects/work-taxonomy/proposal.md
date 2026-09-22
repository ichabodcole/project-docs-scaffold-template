---
type: proposal
title: "Work Taxonomy: Feature, Work Item, Cycle"
description:
  Replace the ad hoc mix of backlog/fragment/brief/project-folder with three
  entities (feature, work item, cycle), owned co-located documents, and fields
  for every relationship, so a state is a field and nothing closes silently.
tags: [taxonomy, work-management, schema]
status: draft
lifecycle: draft # where the work has got to; see docs/SCHEMA.md
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# Work Taxonomy: Feature, Work Item, Cycle

## Overview

project-docs' work vocabulary — backlog, briefs, fragments, project folders,
cycles — grew ad hoc, one concept at a time, and several of those concepts now
do more than one job. This proposal replaces it with three entities
(**feature**, **work item**, **cycle**), a rule that a file becomes a folder
only when it owns something, and a discipline that every relationship between
entities — parent, cycle, provenance, blocking — is a field, never a folder.
States are grouped once and mapped consistently; backlog, board and roadmap
become derived views instead of authored documents.

This proposal is based on
[Investigation: What work taxonomy should a file-based, agent-first development system have?](../../investigations/2026-09-22-work-taxonomy-for-agent-first-development-investigation.md),
concluded with Outcome: Proposal Recommended. Its Recommendation, both rounds of
Decisions, and the Open Questions settled after conclusion (one `scope` value,
UUID ids with slug filenames, migration via `update-project-docs`) are
authoritative here.

## Problem Statement

**Backlog is a state wearing a folder.** No tool the investigation surveyed —
Plane, Linear, Jira, GitHub, Azure DevOps, the agent-native systems — gives a
backlog item its own identity separate from the work item; it is a state or a
view
([Plane and Macro report](../../reports/2026-09-22-plane-and-macro-work-model-report.md);
[work-item hierarchy report](../../reports/2026-09-22-work-item-hierarchy-landscape-report.md)).
project-docs' `backlog/` is a state given a folder and a type of its own — and
in practice it plays three roles at once: triage inbox, small intent, and a work
order a whole branch lands against (Investigation, "What exists").

**The project folder does three jobs.** It holds a proposal (intent), a plan
that often spans several stories or a whole feature, and the execution record
(sessions, artifacts) — leaving it unclear whether it is an epic, a feature, a
Linear-style project, or a design document with attachments (Investigation,
Question / Motivation). The investigation's own read of this repository's
history
([how work flows report](../../reports/2026-09-22-how-work-flows-report.md))
found a **versioned feature family** — `grapevine`, `grapevine-v1.6`,
`grapevine-v1.6.7`, `grapevine-v1.7`, `grapevine-backlog` — five folders
standing in for a missing field, and none of them ever closed.

**Nothing closes, and work is lost silently.** The same report counts sixteen
project folders holding sessions and no proposal, seven of nine briefs still
`active`, eight review-finding backlog items with six still open, and one commit
(`b49ce51`) that deleted a brief, an investigation and a backlog item without a
trace. Six live documents hold a state their evidence contradicts, because no
skill has ever written a transition for them.

**A spec or plan behaves like the unit of work, not a document about it.**
`proposal.md`'s `lifecycle` (`draft` · `approved` · `implemented` …) is, in
practice, the feature's state — but the schema does not say so, so a proposal, a
feature, and a container are three different mental models for the same folder
(Investigation, Key Observation 3).

## Proposed Solution

**The principle.** A small, strict set of fundamentals; a type is added only
when a real need shows it fits. Three layers stay apart: **entities** (things
with identity), **states** (a field on an entity), and **organisation and
views** (relationships as fields; boards, backlogs and roadmaps derived, never
authored).

### The entities

| Entity        | What it is                                                                        | Its file                       |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------ |
| **Feature**   | An outcome worth shaping. The proposal _is_ the feature; it closes when delivered | `features/<slug>/feature.md`   |
| **Work item** | The one unit of work, small enough to hand an agent. `kind` says what sort        | `items/<slug>.md`, or a folder |
| **Cycle**     | A scope-bound grouping with an appetite and an outcome                            | `cycles/YYYY-MM-<slug>.md`     |

Everything else is **owned**: named documents (`plan.md`, `test-plan.md`,
`design-resolution.md`), records (`sessions/`), and anything unnamed
(`artifacts/`) live inside the folder of the feature or item they belong to. An
entity is a single file until it owns something; then it is a folder holding its
own file — named after the entity, `feature.md` or `item.md` — and what it owns,
with named documents at the folder's root under fixed names and `artifacts/`
reserved for the unnamed. A folder means "these files belong to one entity" —
never "these files share a state, a parent or a cycle." A research item is the
asking (its question, definition of done and lifecycle); the investigation's
findings are the output it owns, `write-up.md`, with `reports/` beside it.

**One exception, for people browsing the tree: `_archive/`.** A flat folder of
every item ever filed is noise to a human reading the file tree, so an entity in
a terminal state (`done`, `dropped`) may move into `items/_archive/` or
`features/_archive/`. The lifecycle field stays the source of truth — the folder
mirrors it, as Backlog.md's tool-maintained archive does — and the lint refuses
anything in `_archive/` that is not terminal. `pdocs archive` does the move in
one step: it checks the state, moves the file or folder, and rewrites inbound
and outbound links. References by UUID survive the move untouched.

```
docs/
  features/
    okf-frontmatter/      feature.md                  ← the feature (the proposal; state lives here)
      plan.md                     ← broad plan across its items
      sessions/2026-09-04-phase-one.md
      artifacts/
  items/
    lint-descriptions.md          ← parent: feature/okf-frontmatter
    hook-env/
      item.md                     ← kind: bug, cycle: 2026-09-story-loom
      plan.md                     ← granular plan the agent executed
      sessions/2026-09-22-fix.md
    bump-deps.md                  ← kind: chore, no parent
  cycles/
    2026-09-story-loom.md
```

### Fields

| Field         | On            | Required | Meaning                                                                                 |
| ------------- | ------------- | -------- | --------------------------------------------------------------------------------------- |
| `id`          | item          | yes      | A UUID; stable identity that fields and commit trailers use, so a rename breaks nothing |
| `title`       | all           | yes      |                                                                                         |
| `kind`        | item          | yes      | `task` · `bug` · `chore` · `research` (the list may grow only by a real need)           |
| `state`       | feature, item | yes      | See below                                                                               |
| `parent`      | item          | when set | The feature it serves                                                                   |
| `scope`       | feature, item | when set | The part of the project it touches; a controlled list in `.project-docs.json`           |
| `cycle`       | item          | when set | The cycle it is in play in                                                              |
| `from`        | item          | when set | What spawned it — a review, another item, a feedback round                              |
| `source`      | item          | when set | External IDs: an issue number, an Operator capture                                      |
| `blocked_by`  | item          | when set | Items that must land first; what lets an agent ask "what can I start now"               |
| `released_in` | feature, item | derived  | The first release containing the landing commit                                         |
| `priority`    | item          | optional |                                                                                         |
| `assignee`    | item          | optional | A person or an agent, one vocabulary — see below                                        |

The body of an item carries its definition of done. Out, deliberately: estimates
and due dates — no agent-native tool surveyed carries an estimate, and the
manifesto excludes dates
([fields research](../../reports/2026-09-22-plans-discovery-and-fields-report.md)).

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

`triage` is not the idea stage — ideas are triaged upstream, in Operator, before
anything enters the tree. It is for items already in the tree that nobody has
accepted yet. **Items created by agents start in `triage`** — a review agent
filing findings, an agent hitting a bug mid-task — **and leave it through a
triage step the user has seen**: the `triage-items` skill proposes each item's
disposition (backlog, a feature to join, drop) and applies it once the user has
reviewed it. The safeguard is that default, enforced by the skills, not a gate
in the CLI; it keeps agent-filed work from reading as accepted work nobody
accepted. An item created by someone who already wants it starts at `backlog` or
`ready` directly.

A feature arrives already accepted: its `draft` is `backlog` and `approved` is
`ready`. Nothing is deleted; it is `dropped`. A cycle keeps its own `planned` ·
`active` · `closed` · `abandoned`, and its scope list is derived from the items
that name it — retiring the cycle's own `scope:` key, since that name now
belongs to the part of the project a feature or item touches.

### Views

Derived by `pdocs`, and later by UIs over the same files: backlog (unstarted
items), board (by state group), a feature's items, a cycle's scope, a scope's
work, what is ready and unblocked, what landed since a release. None of these is
authored as a document.

### What today's types become

| Today                              | Becomes                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| Backlog item                       | Work item                                                        |
| Fragment                           | Removed; ideas live upstream                                     |
| Brief                              | Removed as a type; a framing document is owned by what it frames |
| Investigation                      | Work item, `kind: research`, owning its write-up                 |
| Project folder + proposal          | Feature (`features/<slug>/feature.md`)                           |
| Plan, test plan, design resolution | Named documents inside their owner                               |
| Kickoff, handoff                   | Named documents inside their owner                               |
| Session                            | Record inside its owner                                          |
| Report                             | Owned by the research item that produced it                      |
| Artifact                           | Unnamed file in its owner's `artifacts/` folder (unchanged role) |
| Cycle                              | Cycle; membership moves to the items                             |
| `_archive/`                        | Kept, for terminal entities only, mirroring their lifecycle      |

### The manifesto amendment for `assignee`

The manifesto says project-docs "records scope and state, not people or dates."
That stays true in spirit — project-docs remains a tool for a single developer,
because that is the only experience it is built from, and growing it for human
teams would mean guessing. `assignee` exists to route work to an **agent or
seat** — an Anthill team where seats have handles and their own scope of work —
not to track a person. It is optional because the common case (one person and
the agent they are working with) would otherwise make it boilerplate naming the
same party every time. This proposal amends the manifesto's line to say so
explicitly: an assignee routes work to an agent or seat; project-docs still does
not track people or dates.

### Touch points the skills phase must name

Every field needs a named writer, or it goes stale — the general lesson from the
second round of decisions on `released_in`:

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
- **`sweep-project`** — the release and sweep touch point — writes `released_in`
  where it cannot be derived, closes cycles whose items are all in the completed
  group, and archives terminal entities through `pdocs archive`.
- **The lint** refuses a work item that disappears without reaching `dropped`,
  and checks that `scope` is in the declared list and every `parent`, `from`,
  `blocked_by` and `cycle` resolves.

## Release Sequencing

**Docs Foundation has already shipped.** All four phases in
[its plan](../docs-foundation/plan.md) are marked ✅, and its verb — the
declarable type vocabulary parsed from `.project-docs.json`, plus the seed
manifest — went out with the v2.9 migration
(`plugins/project-docs/skills/update-project-docs/migrations/v2.8-to-v2.9.md`).
[Its proposal](../docs-foundation/proposal.md) is `lifecycle: implemented`
(reconciled 2026-09-22).

Docs Foundation also opened the configuration seam `scope` needs: it made
`.project-docs.json` something the lint parses for a vocabulary (the `types`
map) rather than a fixed table in `registry.ts`. `scope`'s controlled list is a
second vocabulary read the same way — not a type, but declared in the same file
and checked by the same parser.

**This project and [Guidance Lifecycle](../guidance-lifecycle/proposal.md) land
together as one breaking (major) release**, on top of Docs Foundation's
already-shipped foundation. Both are type-retiring changes to the same schema
and the same migration path; shipping them separately would mean two breaking
releases where one does. Where the two touch the same skills:

- **`finalize-branch`.** Guidance Lifecycle's Reflect replaces memory creation
  at Step 5. This project adds the state-transition work at the same step
  (moving an item to `done`, writing its session into the owner's folder,
  creating an item born `done` for work that ran first). Both touch points land
  on the same skill revision rather than two separate edits to
  `finalize-branch`.
- **Where `investigation` belongs.** Guidance Lifecycle's two-state table puts
  `investigation` beside `session` under Capture, and leaves open whether it
  belongs there. This project answers it differently: an investigation becomes a
  work item of `kind: research` that owns its write-up. The two proposals must
  agree before the plan is written — Guidance Lifecycle's table then lists the
  write-up, not a type called `investigation`.
- **One migration, two type retirements.** Guidance Lifecycle retires `memory`
  and `lesson`; this project retires `backlog`, `fragment` and `brief` as types.
  Both are folded into the same migration guide and script so an adopter runs
  one migration, not two, and sees one major version bump instead of stacking
  breaking changes across releases.

## Scope

**In Scope:**

- Schema, registry and lint changes: the entity/state/field model above, `kind`,
  `scope`'s controlled list, state-group mapping, `released_in` as derived.
- `pdocs` support to create work items (with a generated UUID) and derive the
  views (backlog, board, ready-and-unblocked, a feature's items, a cycle's
  scope).
- The skill touch points named above — `init-branch`, `finalize-branch`,
  shaping, triage, release/sweep — wired to write their fields.
- The migration: a script for what can be automated (folder renames, moves,
  frontmatter rewrites) plus guide steps for what needs judgment, per the Open
  Questions settled in the investigation.
- Dogfooding: run the migration on this repository first, record what the move
  actually took, then run it on one other consumer and revise from that
  feedback.

**Out of Scope:**

- A UI. This taxonomy is the substrate a UI would be built on next, not part of
  this project.
- A multi-project or workspace layer — several projects' work rolled up
  together. Noted where the landscape has one; designing it stays out.
- Team features beyond the single-developer-plus-agents shape: no people
  tracking, no capacity planning, no stakeholder cadence.
- Estimates and due dates, per the manifesto and the fields research.
- Idea capture. Ideas stay upstream, in Operator, per the investigation's
  settled decision; no idea or fragment type re-enters the tree.

## Technical Approach

Four phases, each depending on the one before:

1. **Schema and lint.** Add the entity/state/field model to `SCHEMA.md` and the
   registry: `kind` values, the grouped `state` vocabulary and its mapping
   table, `scope` read from `.project-docs.json` (built on Docs Foundation's
   declarable-type parsing), `released_in` marked derived, and lint rules for
   unresolved `parent`/`from`/`blocked_by`/`cycle` references and for an item
   that disappears without reaching `dropped`.
2. **`pdocs` creation and derived views.** UUID generation on item creation (v4
   or v7; slug filenames stay the readable identity), the file-becomes-a-folder
   mechanics when an item first owns something, and the derived-view commands
   (backlog, board, ready-and-unblocked, feature's items, cycle's scope).
   Depends on Phase 1's schema being in place to validate against.
3. **Skill touch points.** Wire the named writers into `init-branch`,
   `finalize-branch` (co-landing with Guidance Lifecycle's Reflect touch point
   on the same skill revision), triage, shaping, and a release/sweep touch point
   for `released_in` and cycle closure. Depends on Phase 2's commands existing
   for the skills to call.
4. **Migration, dogfood, second consumer.** Write the migration script and
   guide, run it on this repository, record the actual migration experience,
   then run it on one other consumer and revise the migration from that
   feedback. Depends on Phases 1–3 being complete, since the migration targets
   the shape they define.

## Impact & Risks

**Benefits:** One unit of work at task/story size that an agent can be handed
directly. A project folder that is unambiguously a feature. Every relationship a
queryable field, so an agent can ask "what can I start now" instead of reading a
board. States that are enforced rather than asserted by hand. No silent deletion
— `dropped` is always reachable and the lint checks it.

**Risks:**

- **A large breaking change lands mid-migration for consumers.** Story-loom is
  still on 8.0.0 and has not yet run the v2.10 migration its
  [feedback cycle](../../cycles/2026-09-story-loom-feedback.md) is waiting on. A
  major bump that retires `backlog`, `fragment` and `brief` while a consumer is
  already behind compounds the gap. Mitigation: dogfood first, ship the
  migration script and guide together, and treat the second-consumer run as the
  gate before wider rollout.
- **Fields go stale without a writer.** The investigation's own finding — six
  live documents held a state their evidence contradicted — is the exact failure
  mode a field-based model reproduces if a touch point is skipped. Mitigation:
  the touch-points list above names a writer for every field, and Phase 3 is
  scoped as "wire the touch points," not "add the fields and hope."
- **`released_in` depends on commit trailers being written.** If a commit lands
  without the item's `id` in its trailer, `released_in` cannot be derived and
  falls to the release/sweep touch point, which is a person or a periodic agent
  pass rather than something automatic. Mitigation: none enforced — see Open
  Questions. "Done but not released" is visible as a view; nothing fails on it.
- **Folder-to-file churn.** An item that starts as a single file and later gains
  a plan becomes a folder; a migration tool or a hand-edit that assumes a fixed
  path breaks when this happens. Mitigation: `pdocs` commands resolve an item by
  `id`, not by a hardcoded path, so the promotion is transparent to anything
  going through the CLI.

## Success Criteria

- `pdocs check` enforces the state vocabulary, the state-group mapping, and that
  every `parent`, `from`, `blocked_by` and `cycle` field resolves.
- A `backlog/` folder no longer exists in this repository; the backlog is a
  derived view (`pdocs` output), not an authored folder.
- `finalize-branch` writes `done` on the item it lands, writes the session into
  the owner's folder, and creates an item born `done` for work that ran without
  one.
- `init-branch` writes `active` and sets `cycle` when one is active.
- A work item created with no `title`, `kind` or `id` fails the lint rather than
  passing silently.
- The migration is dogfooded on this repository, then run to completion on a
  second consumer, and revised from that run's feedback.
- `npm run check` (or the equivalent `pdocs` gate) is green after the migration.

## Open Questions

- **What a UI needs beyond the fields.** Ordering within a state (a rank or
  sequence field, or left to view-time sort), and whether a generated index per
  feature or cycle is worth maintaining versus computing on demand. Left to
  whichever project builds the UI on top of this taxonomy.
- **Where `released_in` sits in the flow.** Deferred on purpose. It is a new
  field without a defined touch point, and not every item that reaches `done` is
  necessarily released (a docs change, an internal chore). Until the flow
  answers whether every `done` item gets a `released_in`, the field stays
  optional and **the lint does not check it** — no error for its absence, and no
  staleness window. What is wanted now is only that "done, no `released_in`" is
  easy to see, which a derived view gives without new tooling. Revisit once the
  release touch point exists and has been used.

---

**Related Documents:**

- [Investigation: What work taxonomy should a file-based, agent-first development system have?](../../investigations/2026-09-22-work-taxonomy-for-agent-first-development-investigation.md)
- [Guidance Lifecycle: Touch Points & Type Retirement](../guidance-lifecycle/proposal.md)
  — lands together with this project as one breaking release
- [Docs Foundation: Ownership Classes & Declarable Types](../docs-foundation/proposal.md)
  — already shipped; provides the declarable-type vocabulary `scope` builds on
- [PM work-taxonomy landscape report](../../reports/2026-09-03-pm-work-taxonomy-landscape-report.md)
- [File-based work-tracking landscape report](../../reports/2026-09-03-file-based-work-tracking-landscape-report.md)
- [Plane and Macro work-model report](../../reports/2026-09-22-plane-and-macro-work-model-report.md)
- [The work-item hierarchy landscape report](../../reports/2026-09-22-work-item-hierarchy-landscape-report.md)
- [Agent-native work systems report](../../reports/2026-09-22-agent-native-work-systems-report.md)
- [Cadence at agent pace report](../../reports/2026-09-22-cadence-at-agent-pace-report.md)
- [Plans, discovery and fields report](../../reports/2026-09-22-plans-discovery-and-fields-report.md)
- [How work flows here report](../../reports/2026-09-22-how-work-flows-report.md)
- [Story-loom feedback cycle](../../cycles/2026-09-story-loom-feedback.md) —
  evidence for the mid-migration consumer risk
