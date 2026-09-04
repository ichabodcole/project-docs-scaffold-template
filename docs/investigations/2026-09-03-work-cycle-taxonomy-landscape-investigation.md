---
type: investigation
title:
  'What are the right primitives for "work in play" in a file-based docs system?'
status: stable
lifecycle: concluded
generated: { by: unknown, at: 2026-09-03 }
---

# Investigation: What are the right primitives for "work in play" in a file-based docs system?

## Question / Motivation

project-docs has one unit of work, the **project folder**, and one dimension
between units, the pipeline stage (brief → investigation → proposal → plan →
sessions → archive). Nothing in the scaffold represents **the scope of work that
is currently in play** — a container that opens, is worked, closes, and is
archived — as distinct from the timeless intent (a proposal) and from the
documents that accrue while implementing (plan, sessions, artifacts).

This was noticed on 2026-09-02 while grounding the
[knowledge-wiki-layer](../briefs/2026-07-23-knowledge-wiki-layer.md) work, and
articulated on 2026-09-03: the project folder is doing three jobs at once —
holding the intent, coupling related documents, and recording execution — and
the "in play" lifecycle belongs to the third job, which is the one a project
folder cannot do because a project never opens or closes; it accumulates.

The working hypothesis was a Shape Up-style **cycle**: a dated document that
names the scope pulled from proposals and backlog items, is worked, and is
closed with a record of what shipped. Before committing to that, this
investigation surveyed what the landscape already does — the product-management
methodologies and tools that model this, and the repo-native, file-based
conventions that manage work with nothing but files in git — so the choice of
primitives is informed rather than improvised. Cole may still choose a lighter
first step; the goal is a foundation, not a mandate.

**Decision this feeds:** the taxonomy of workbench documents in phase one of the
wiki/frontmatter work (which `type`s exist, what `lifecycle` vocabulary each
carries, and whether a `cycle` type is part of that schema), and the deferred
question of whether project folders should eventually be dissolved.

## Current State Analysis

### The units that exist

| Unit               | Home                               | Has a lifecycle?                                                   |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------ |
| Backlog item       | `docs/backlog/YYYY-MM-DD-*.md`     | Implicitly: present or archived                                    |
| Brief              | `docs/briefs/`                     | `Status: Active`; archived when spent                              |
| Investigation      | `docs/investigations/`             | `Status: Active / Concluded` + `Outcome`                           |
| Project (proposal) | `docs/projects/<name>/proposal.md` | Bold inline `Status:` line, free-text vocabulary                   |
| Plan               | `docs/projects/<name>/plan.md`     | Checkbox completion; `Status: Completed` when reconciled           |
| Session            | `docs/projects/<name>/sessions/`   | None — a frozen record, written by `finalize-branch` at branch end |
| Artifact           | `docs/projects/<name>/artifacts/`  | None                                                               |
| Branch             | git                                | Opened by `init-branch`, closed by `finalize-branch`               |

The branch is the only thing that actually opens and closes today. It is the de
facto in-play unit, but it is invisible to the docs: its trace is the session
note written at close, filed under whichever project the branch touched.

### Evidence of the gap in this repo's own tree (2026-09-03)

- **No grouping above projects.** 23 active folders sit flat in
  `docs/projects/`. Five are grapevine (`grapevine`, `grapevine-v1.6`,
  `grapevine-v1.6.7`, `grapevine-v1.7`, `grapevine-backlog`): one product line
  spread across folders with no parent. `spellbook-extraction-cleanup`,
  `toolbox-migration` and `recipes-plugin-consolidation` are one theme with no
  home. The August–September hardening arc (`sweep-project`,
  `finalize-branch-hardening`, project-docs 3.2.0 → 3.6.0) exists as an arc only
  in session notes.
- **No time axis.** Status lives in a bold line inside each proposal with an
  unenforced vocabulary: `Draft`, `Approved`, `Approved (in flight)`,
  `Approved (shipped)`, `Completed`, and one that parses as `V`. Seven active
  folders have no proposal at all, so no status anywhere. "What am I working on"
  is answered by `git log` and `ls -t`.
- **No sequencing between units.** `toolbox-migration/proposal.md` says "likely
  post-V1.7-of-grapevine" in three places, all prose. Nothing can read it.
- **Closure is attached to the wrong unit.** `sweep-project` (3.2.0) archives
  _projects_, but a project like grapevine is revisited across versions; "done"
  really belongs to whatever was in play. The
  [closure-touchpoint investigation](2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
  solved the mechanics of archiving without asking what the archivable unit is.

### Boundaries already declared

`docs/PROJECT_MANIFESTO.md` says the scaffold is "not a project management tool
— no sprints, tickets, Kanban boards, or status dashboards … tracking _who_ is
doing _what_ by _when_ belongs in your PM tool." Grouping, in-play scope, and
ordering between bodies of work are none of those three things, but any proposal
must reconcile with this line explicitly rather than drift past it.

### Adjacent work this depends on

Phase one of the wiki work (in discussion, 2026-09-02/03) puts OKF frontmatter
on every doc: `status` (OKF 0.2's `draft | stable | deprecated`) plus a separate
lowercase `lifecycle` field for pipeline state, with a link-lint that computes
backlinks. That layer is what would make a cycle cheap: a cycle's scope is an
authored list, and "which cycle is this project in" becomes a computed backlink
rather than a field maintained in two places.

## Investigation Findings

### Evidence Gathered

Two research passes, filed as reports with a source URL per claim:

- [PM work-taxonomy landscape](../reports/2026-09-03-pm-work-taxonomy-landscape-report.md)
  — Shape Up, Linear, Scrum/Jira, Kanban, GitHub Projects, GitLab, Basecamp,
  Notion, Plane; comparison table of intent / grouping / in-play units, what
  closes each, and where unselected work goes.
- [File-based work-tracking landscape](../reports/2026-09-03-file-based-work-tracking-landscape-report.md)
  — Rust RFCs, Kubernetes KEPs, PEPs, Ember RFCs, Go, TC39, ADRs, git-native
  trackers (git-bug, ticgit, Radicle, beads), Oxide RFDs, GitLab handbook, PARA,
  Johnny.Decimal, Keep a Changelog, `/now`, agent plan-file conventions, OKF;
  comparison table of units, status vocabularies, nesting, closure, and archive
  behaviour.

The load-bearing facts, in brief:

| Source           | Intent unit          | In-play unit              | Closes on               | Unselected work         |
| ---------------- | -------------------- | ------------------------- | ----------------------- | ----------------------- |
| Shape Up         | Pitch                | Cycle (6 wk, fixed)       | Date; scope flexes      | Dropped; re-pitch later |
| Linear           | Initiative → Project | Cycle (2 wk, repeating)   | Date; auto-rollover     | Rolls to next cycle     |
| Scrum/Jira       | Epic                 | Sprint (1–4 wk)           | Date + review/retro     | Persistent backlog      |
| Kanban           | (none)               | (none — WIP-limited flow) | Policy per card         | Stays in queue          |
| GitLab           | Epic → Milestone     | Iteration                 | Date                    | Re-scheduled            |
| Notion           | Project (goal-axis)  | Sprint (time-axis)        | Date                    | Re-added next sprint    |
| Kubernetes KEP   | KEP folder           | `status` field            | `implemented`           | `deferred`              |
| Python PEP       | PEP file             | `Accepted` → `Final`      | Implementation complete | `Deferred`              |
| Oxide RFD        | RFD file             | `state` field             | `committed`/`abandoned` | `abandoned`             |
| ADR              | Decision file        | Append-only numbered log  | `accepted`; superseded  | n/a                     |
| Keep a Changelog | Entry                | `## Unreleased` section   | Heading renamed at cut  | n/a                     |
| PARA             | Project (has an end) | Projects bucket           | Move to Archives        | Areas (no end)          |
| beads (Yegge)    | Work item            | Dependency graph in Dolt  | Explicit close          | Stays in graph          |

### Key Observations

1. **Every tool separates an outcome-bound grouping unit from a cadence-bound
   in-play unit, and nobody has written the principle down.** Shape Up
   (pitch/cycle), Linear (project/cycle), GitLab (epic/milestone/iteration),
   Notion (project/sprint) and Plane (project/cycle) all converge on it under
   different names; Notion states it most plainly ("Projects group tasks by
   goal, Sprints group tasks by when"). No source frames it as a tool-agnostic
   design principle. It is worth naming explicitly in project-docs' own
   documentation rather than citing canon that does not exist.

2. **"Accepted" is never "done" in any mature file-based process.** Rust merges
   the RFC and opens a separate tracking issue; KEPs go `provisional` →
   `implementable` → `implemented`; PEPs go `Accepted` → `Final`; Ember goes
   `Accepted` → `Ready for Release` → `Released`. project-docs' `Approved`
   currently means both "we agreed" and "it shipped", which is why the tree grew
   `Approved (in flight)` and `Approved (shipped)` by hand. The intermediate
   state is not optional; it is the whole point of a lifecycle.

3. **Files do not move; state fields change.** KEPs, PEPs, RFCs, RFDs and ADRs
   all leave the file where it is and mark it inert (`implemented`, `Final`,
   `superseded`), with git history as the audit trail. Only PARA physically
   moves things to an Archives bucket, and it is a personal system.
   project-docs' `_archive/` convention is the PARA pattern. The landscape
   suggests archival should be a lifecycle value first and a physical move
   second, which is consistent with the phase-one plan to make `lifecycle`
   machine-readable and would let `sweep-project` decide on state rather than
   folder position.

4. **Two proven shapes for the in-play record.** The ADR log is append-only,
   numbered, and links forward/backward on supersession. Keep a Changelog keeps
   a single standing `## Unreleased` heading that is _renamed_ to a version and
   date at close, leaving a fresh empty one behind; release-please automates
   exactly that transition, and this repo already runs release-please. The
   `Unreleased` section is the closest widely-adopted precedent for "exactly one
   open cycle, closed by renaming, history kept in place."

5. **The execution trail stays with the feature, not with the period.** This is
   the answer to the open question about where plans, sessions and artifacts go
   if projects dissolve. KEPs keep `kep.yaml` and the README in the KEP folder
   and update them in place. GitHub Spec Kit generates a per-feature folder of
   spec → plan → `tasks.md`. Committed agent plan files under `.claude/plans/`
   are kept as a rationale trail alongside the code. Rust is the one that
   splits, and it splits the _decision_ from the _tracking_, not the tracking
   from the feature. Nobody in either survey files execution artifacts by sprint
   or cycle. A cycle is an **index over features**, not a container for their
   documents. The corollary: dissolving project folders into per-cycle execution
   folders would run against every precedent found. The project folder is
   already the topical feature record the landscape recommends; what is wrong
   with it is only that it also has to carry the in-play state.

6. **Unselected work needs an honest state, not a backlog or a purge.** Shape Up
   drops it (and Basecampers keep private lists anyway); Linear rolls it over
   automatically; Scrum re-triages a persistent backlog every sprint. The
   file-based processes all have a `deferred` or `abandoned` value instead. For
   a tree with 23 "active" folders that are mostly not in play, KEP's `deferred`
   is the cheapest honesty available: the folder stays, its lifecycle says it is
   not being worked, and the active set becomes small enough to read.

7. **Fixed time is the wrong axis for a solo developer plus agents.** Shape Up's
   hard six-week deadline exists to force scope-cutting in a multi-team org;
   Linear's own guidance is that cycles are "a scheduling lens over ongoing
   project work", not a scope commitment, with unfinished work rolling forward.
   The risk in this repo is not overrun but a cycle that never closes.
   Scope-bound closure with a stated appetite ("this cycle ends when X ships or
   when I decide to cut it") fits better than a calendar, and it keeps clear of
   the manifesto's "who does what by when".

8. **Sequencing between units is the one thing frontmatter handles better than
   any surveyed file convention.** None of the RFC-style processes express
   dependencies structurally; beads was built precisely because agents need a
   dependency graph across work items and files do not give them one. With a
   link-lint that computes backlinks, an `after: [project/x]` list on a proposal
   or a cycle is a queryable edge at zero tooling cost, which is as far as
   project-docs should go without becoming a tracker.

9. **OKF gives no lifecycle for free.** OKF 0.2's `status` is
   `draft | stable | deprecated` and is about the document's trustworthiness,
   not the work's state. Every vocabulary above has to be layered on as a local
   convention, which the phase-one `lifecycle` field already anticipates.

10. **The manifesto line survives.** A cycle records scope and state. It does
    not assign people or dates, and it does not render a dashboard. The line
    should be reworded to say that rather than to say "no sprints", which now
    reads as prohibiting the thing this recommends.

### Options Considered

| Option                                                                                       | What it gives                                                                                                         | What it costs                                                                                                                          |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Do nothing**                                                                            | No change                                                                                                             | The 23-folder pile, hand-invented statuses, and "what am I working on = git log" persist; sweep-project keeps archiving the wrong unit |
| **B. `cycle` as a thin index document beside projects** (recommended)                        | One open cycle listing scope by link; closes with an outcome; grouping across projects for free; sequencing via edges | One new `type`, one new folder, one more thing to open and close; requires phase-one frontmatter to be cheap                           |
| **C. `cycle` as a container** — per-cycle execution folders holding plans/sessions/artifacts | Everything that happened in a period in one place                                                                     | Against every precedent found (obs. 5); splits a feature's record across cycles; a large restructure with no evidence it is wanted     |
| **D. Fields only** — `cycle:` on each project's frontmatter, no cycle document               | Cheapest; Linear-like lens                                                                                            | No place for appetite, outcome, or retro; membership authored in N places instead of one; nothing to close                             |
| **E. Adopt an external or git-native tracker** (beads, git-bug)                              | Real dependency graph, agent-native                                                                                   | A second system of record beside the docs; violates the file-based, tooling-light premise the scaffold exists for                      |

## Recommendation

- [x] **Create Proposal** — action is warranted, and it belongs inside phase one
      of the wiki/frontmatter project rather than in a project of its own.

**Rationale:** The landscape is unanimous on the split (obs. 1) and on the
intermediate state between accepted and done (obs. 2), and it is equally
unanimous that execution artifacts live with the feature (obs. 5). That
combination points at option B and away from C: keep the project folder as the
topical feature record, add a cycle as the in-play index, and stop the project
folder from carrying state it cannot close. Phase one's frontmatter makes B
nearly free, and B is what makes phase one's `lifecycle` field mean something
for workbench docs.

**Proposed primitive set** (four; none new except the cycle):

| Primitive        | Role                                        | Home                                  |
| ---------------- | ------------------------------------------- | ------------------------------------- |
| Backlog item     | Small, unshaped intent                      | `docs/backlog/` (unchanged)           |
| Proposal         | Shaped intent, timeless                     | `docs/projects/<name>/proposal.md`    |
| Cycle            | The in-play index: scope, appetite, outcome | `docs/cycles/YYYY-MM-<slug>.md` (new) |
| Execution record | Plan, sessions, test plan, artifacts        | `docs/projects/<name>/` (unchanged)   |

**Proposed `lifecycle` vocabularies** (lowercase, per `type`; drawn from KEP,
PEP and RFD; the physical `_archive/` move is a separate act that any terminal
value permits):

| `type`        | `lifecycle` values                                                             | Notes                                                                                           |
| ------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| backlog       | `open` · `promoted` · `dropped`                                                | `promoted` links to the proposal or cycle it became                                             |
| proposal      | `draft` · `approved` · `deferred` · `implemented` · `withdrawn` · `superseded` | `approved` ≠ `implemented` (obs. 2); `deferred` is the honest state for most of today's folders |
| plan          | `draft` · `active` · `completed` · `abandoned`                                 | `completed` requires the sweep-project reconciliation                                           |
| cycle         | `planned` · `active` · `closed` · `abandoned`                                  | At most one `active`; closing writes the outcome section                                        |
| investigation | `active` · `concluded`                                                         | Existing; `Outcome` stays a separate field                                                      |
| brief         | `active` · `spent`                                                             | `spent` links to what it spawned                                                                |

**Cycle document shape** (sketch, to refine in the proposal):

```yaml
---
type: cycle
title: Wiki phase one
lifecycle: active # planned | active | closed | abandoned
started: 2026-09-03
appetite: until the frontmatter lint gates CI and three doc types are backfilled
scope:
  - project/knowledge-wiki-layer
  - backlog/2026-09-02-task-agent-tool-name-drift
after: [] # cycles or projects this one waits on
---
```

Body sections: **Why now**, **Scope** (the same list, with a line each),
**Outcome** (written at close: what shipped, what was cut, what was learned),
and links to the session notes that landed in the cycle.

**Skill touchpoints** the proposal should name:

- `init-branch` asks which active cycle the branch belongs to (or none).
- `finalize-branch` rolls the branch's session into the cycle's outcome section
  and checks whether the cycle's scope is exhausted, instead of asking "is the
  project done" per branch.
- `sweep-project` reorients toward "is this cycle closed" and treats archival as
  a lifecycle value first, folder move second (obs. 3).
- The manifesto's "no sprints" line is reworded to "records scope and state, not
  people or dates".

**What stays deferred:** dissolving project folders. The evidence says not to
(obs. 5). Revisit only if, after using cycles, the project folder still feels
wrong — and if so, the more likely move is renaming what it _is_ (a feature
record) rather than relocating what it holds.

## Next Steps

1. Fold this into the phase-one wiki/frontmatter proposal as the workbench half
   of the schema: the `cycle` type, the per-type `lifecycle` vocabularies, and
   the three skill touchpoints.
2. Open the first cycle for phase one itself, so the primitive is dogfooded by
   the work that introduces it.
3. Run a one-time `lifecycle` backfill over `docs/projects/` marking most
   folders `deferred` or `implemented`, which is what makes the active set
   readable.
4. Name the grouping/in-play principle in the projects README and the manifesto,
   since no external canon exists to cite.

## Open Questions

- Should a cycle be allowed to contain another cycle (a grapevine-v1.7 cycle
  inside a "grapevine" arc), or is the arc just a `tags`/`related` cluster?
  Lean: tags; add nesting only if a real arc demands it.
- Does the changelog-style single `## Unreleased`-like file (one `CYCLE.md`
  renamed at close) beat one file per cycle? One-per-cycle keeps the lint and
  backlinks simple; revisit if the folder grows past a dozen.
- Fossil ticket states and beads' exact status enum were not confirmed from
  primary sources; neither affects the recommendation.

---

**Related Documents:**

- [PM work-taxonomy landscape report](../reports/2026-09-03-pm-work-taxonomy-landscape-report.md)
- [File-based work-tracking landscape report](../reports/2026-09-03-file-based-work-tracking-landscape-report.md)
- [Knowledge Wiki Layer brief](../briefs/2026-07-23-knowledge-wiki-layer.md)
- [Wiki structure & OKF schema investigation](2026-07-23-wiki-structure-and-okf-schema-investigation.md)
- [Project closure & archive touchpoint investigation](2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
- [Projects README](../projects/README.md) — the current project-folder contract
- [Project Manifesto — What It Doesn't Do](../PROJECT_MANIFESTO.md)
