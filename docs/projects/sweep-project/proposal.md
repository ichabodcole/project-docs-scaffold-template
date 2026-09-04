---
type: proposal
title: "Project Sweep & Closure Touchpoint"
status: stable
lifecycle: approved
generated: { by: unknown, at: 2026-08-07 }
---

# Project Sweep & Closure Touchpoint

## Overview

The project-docs pipeline describes archival as its terminal stage, and three
separate READMEs tell you to move completed work into `_archive/`. Nothing
operationalizes it. The result is that finished projects sit in the active tree
until a human happens to notice, and the plans inside them never get reconciled
against what was actually built.

This proposal makes closure an operational stage: a lightweight
plan-reconciliation check inside `finalize-branch`, and a new, separately
invocable `sweep-project` skill that reconciles a project against what was
actually built and then either records what's left or, if nothing is, archives
it with the human's confirmation. It is based on
[Investigation: Missing project-closure and archive touchpoint](../../investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md),
whose four open questions were resolved in discussion on 2026-08-07 and are
carried into this proposal as constraints.

## Problem Statement

Two related drifts accumulate because nothing in the tooling asks the
project-level question at the moment the answer is known:

**Plan drift.** `plan.md` accumulates changes during implementation that never
get written back. Checkboxes stay unchecked after the work ships; deviations
from the original plan go unrecorded. Months later the plan no longer tells you
whether the project is finished.

**Archive drift.** Completed project folders and backlog items stay in their
active locations, and cross-references elsewhere in the docs tree keep pointing
at paths that have moved (or should have).

This is not hypothetical in this repository. Of 24 active project folders in
`docs/projects/` (against 17 already in `_archive/`), at least five are
self-declared finished and still sitting in the active tree:

- `hivemind-plugin` — `**Status:** Completed`
- `grapevine-v1.6.7` — `**Status:** Completed`
- `agent-surface-recipe-evolution` — `**Status:** Completed`
- `recipes-plugin-consolidation` — `**Status:** Approved (shipped)`
- `grapevine` — `**Status:** V1.5 shipped (in spike branch, awaiting merge)`

Seven more carry no status line at all, so their state can only be recovered by
reading them — which is precisely the cost the reconciliation step exists to
avoid paying twice.

Reference drift is real too, and already present:
`docs/PROJECT_MANIFESTO.md:207` makes a current-state claim about
`docs/projects/documentation-restructuring/` — a folder that was archived to
`docs/projects/_archive/documentation-restructuring/`. The pointer is live prose
about a path that no longer exists.

The conventions themselves are not missing. `docs/projects/README.md`,
`docs/backlog/README.md`, and `docs/PROJECT_MANIFESTO.md` all state them
plainly. What is missing is anything that asks the question at the right moment.
`docs-curator` understands the concept but is a read-only, single-document,
user-invoked agent that recommends rather than acts — it answers "is this
document stale?" when asked, not "is this project done?" when the work lands.

## Proposed Solution

Split the work in two, matching each piece to the granularity of the question it
answers. This mirrors the precedent already in the codebase: `finalize-branch`
Step 8 does not own multi-commit consolidation inline — it delegates to
`consolidate-long-branch`.

**Piece 1 — plan reconciliation inside `finalize-branch` (per-branch).** Added
to Step 6 ("Assess Additional Documentation"), which already performs exactly
this class of soft check for test plans. If a `plan.md` or backlog item exists
for this work, review it against what was actually built: check off what is
complete, leave unchecked what is not, and update a `Status:` property if the
document has one. The edits happen **in place** — no new addendum format, no
"Delivered" section grafted onto someone else's document.

This runs on every branch and makes no claim about whether the project is
finished. That is the point: most branches land mid-project, and the reconciled
checklist is what makes the closure question answerable later.

**Piece 2 — a new `sweep-project` skill (per-project).** Its job is to answer
"is this project done, and what's left if not?" — archival is one of two valid
outcomes, not the guaranteed result. The name deliberately describes the pass
over the project rather than a terminal action, because the terminal action is
conditional. Invoked either from `finalize-branch` as a question or directly by
name:

1. **Reconcile** — a full pass over the project's `plan.md` (or backlog item),
   producing a completed-vs-remaining picture. This always happens and always
   leaves the document more accurate than it found it.
2. **Check in** — present that picture and ask. Everything checked off means the
   project is an _archival candidate_, not an archived project. Nothing closes
   unattended.
3. **Then either:**
   - **Not complete** → record it. The reconciled checkboxes and an updated
     `Status:` line are the deliverable; the remaining work is now legible in
     the document instead of in someone's head. A short dated note explaining
     _why_ work remains is added only when the reason isn't self-evident from
     the plan itself. Nothing moves. This is a successful run, not a failed one.
   - **Complete, and confirmed** → `git mv` the folder to `projects/_archive/`
     (or the single file to `backlog/_archive/`), then **update live
     references** — rewrite the live ones, report the historical ones as
     deliberately left alone.

The asymmetry matters for the skill's design: the reconcile-and-record path is
the one that will run most often, since most invocations happen when someone
_suspects_ a project might be done. A skill built as "archive a project" would
treat its most common outcome as an exception — which is why it isn't called
that.

Because a skill is invocable by name by construction, "standalone invocation"
needs no separate entry point — it only requires that `sweep-project` never
assume it was called from `finalize-branch`. No dependency on branch context, a
base branch, or a just-created session doc. That constraint is what lets it be
pointed at the backlog of already-stale folders listed above.

**Piece 3 — pipeline documentation.** With archival becoming operational rather
than merely described, the cycle strings in
`{{cookiecutter.project_slug}}/docs/README.md` (line 254), this project's own
`docs/README.md`, and `docs/PROJECT_MANIFESTO.md` (line 100) should show it as a
stage agents interact with — and should describe it as a **check-in**, not
something that happens automatically at the end of the cycle.

**Alternatives considered.** Doing nothing keeps the status quo, where the human
is the trigger — the recurring cost that motivated the investigation. Folding
everything into `finalize-branch` inline was rejected for repeating the exact
anti-pattern the v3.1.0 fixes to issues #148 and #149 just removed: a per-branch
skill making assumptions at a per-project granularity, while growing an
already-10-step skill further. Extending `docs-curator` was considered and
rejected as a primary vehicle — it is read-only and recommend-only by design,
and changing that would alter what the agent _is_ rather than adding the missing
capability beside it.

## Scope

**In Scope (MVP):**

- New `sweep-project` skill in `plugins/project-docs/skills/`, handling both
  project folders and backlog items.
- `finalize-branch` Step 6 addition: plan/backlog reconciliation check, plus the
  delegation question to `sweep-project` when reconciliation shows everything
  complete.
- Reference updates with live-vs-historical classification and human
  confirmation.
- Pipeline-diagram updates in the cookiecutter template, this project's own
  `docs/README.md`, and `docs/PROJECT_MANIFESTO.md`.
- Standard plugin-change obligations per `scaffold-update-checklist`: `dist/`
  rebuild, `project-docs` minor version bump, README changelog entry, cold-read
  verification.

**Out of Scope:**

- **Archiving without confirmation.** The check-in is a design constraint, not a
  configurable behavior.
- **Running it across this repo's existing backlog** of completed-but-active
  folders. The skill makes that possible; working through 24 folders is a
  separate chore, not part of shipping the tooling.
- **Rewriting git history or touching branches.** Archival is a docs operation.
- **New root-file conventions.** Unlike the v3.1.0 landing-policy change, this
  adds no project-owned configuration, so it needs no
  `## Root-Level Conventions` row in `update-project-docs`.
- **A new agent.** This is a skill; `docs-curator` stays as it is.

**Future Considerations:** a batch mode that sweeps every active project in one
pass, for backlogs of stale folders; optional `docs-curator` integration where
the curator's staleness verdict feeds the archival check-in.

## Technical Approach

**Reconciliation signals, in priority order.** The `PLAN.template.md` already
establishes both conventions this relies on: a
`**Status:** Draft | Active | Completed | Superseded` line and `- [ ]`
acceptance/verification checkboxes. So reconciliation reads checkboxes first
(the common case), updates a `Status:` line when present, and falls back to a
narrative completed-vs-remaining report when a plan has neither — reporting
rather than fabricating checkboxes into a document that never had them.

**The move.** `docs/projects/README.md` already guarantees the safety property
this depends on: "Internal references remain valid because they're relative
within the folder." So the folder moves as a unit and only _external_ references
need attention. Backlog items are single files and move the same way.

**Reference updates.** The live-vs-historical rule is not new — it is the same
one `scaffold-update-checklist`'s "Removing a Plugin Skill" section already
applies: scrub live current-state references, and "leave dated retrospective
prose alone (it's historical record, not a current-state claim)." Applied here:

- A link or path in an active README or index → **live**, rewrite to the
  `_archive/` path.
- The same path inside a dated session note, memory, or retrospective →
  **historical**, leave it.
- A path embedded in a **prose current-state claim** → live, but **flag rather
  than rewrite**: show the human the surrounding sentence and ask. Substituting
  a path is mechanical; rewriting a sentence that asserts something about the
  project is a judgment call the skill shouldn't make unattended.

An empirical check on four already-completed projects found their only external
references were in dated `docs/memories/` files — all historical, all correctly
left alone. So this step is frequently a near-no-op, which is a feature: the
conservative rule matches what the data looks like. The `PROJECT_MANIFESTO.md`
case above shows the live category is real and does need handling.

**Dependencies.** No new external dependencies. Consumes existing conventions
(`_archive/` directories, the plan template's status/checkbox shapes) and
existing skill infrastructure. `finalize-branch` gains one delegation point.

## Impact & Risks

**Benefits:** The documented convention becomes operational instead of
aspirational. Reconciliation happens at the moment the knowledge exists — while
the branch that did the work is still in context — rather than being
reconstructed months later. Closure stops depending on a human noticing.

**Risks:**

- _Over-eager rewriting of other people's documents._ Mitigated on three fronts:
  the conservative live-vs-historical rule, the prose carve-out (flag and ask
  rather than rewrite), and the whole operation being a reviewable git diff. The
  same restraint governs the not-done path — no explanatory prose gets added
  unless it earns its place.
- _Reconciliation misreading a plan as complete._ Mitigated by the check-in —
  the reconciliation output is evidence presented to a human, not a verdict.
- _Growing `finalize-branch` further._ Mitigated by keeping Piece 1 to a soft
  check in an existing step and delegating everything heavier.

**Complexity:** Low-Medium. The individual operations are simple; the judgment
calls (is this plan complete, is this reference live) are where the care goes,
and both reuse reasoning that already exists in writing.

## Resolved Design Decisions

Settled in discussion on 2026-08-07. Recorded here because each one is a
deliberate choice a plan could otherwise re-litigate.

- **Reconciliation stays in Step 6.** Moving it before Step 4 would let the
  session doc cite what reconciliation found, but that's speculative benefit
  against a concrete cost — reordering a 10-step skill. Ship it at Step 6 and
  move it only if real friction shows up.
- **Prose references get flagged, never auto-rewritten.** A path inside a
  current-state _claim_ (the `PROJECT_MANIFESTO.md:207` case) is surfaced to the
  human with the surrounding context and a question about how to proceed. Plain
  links and paths still get rewritten directly. The distinction is judgment
  depth: substituting a path is mechanical, rewriting a sentence that asserts
  something about the project is not.
- **A "why" addendum only when the reason isn't self-evident.** Default to
  silence. Often the remaining work explains itself from the plan's own
  structure — phases 1 and 2 done, phase 3 obviously its own session or branch —
  and a note restating that is noise. When the gap _isn't_ self-evident
  (abandoned approach, blocked on something external, scope changed mid-flight),
  a short dated note earns its place. The bar is reflection, not routine: the
  skill should not add prose to someone's plan reflexively on every run.

## Success Criteria

- Finishing a branch that completes a project surfaces the closure question
  without a human raising it first.
- A reconciled `plan.md` answers "is this project done?" from the document
  alone, without re-reading the implementation.
- Running `sweep-project` on any of the five stale folders named above produces
  a clean, reviewable diff: folder moved, live references rewritten, dated
  memories untouched.
- Running it on a project that _isn't_ done leaves the plan more accurate than
  it found it and moves nothing — and reads as a successful run, not a failure.
- No project is ever archived without an explicit human confirmation.

---

**Related Documents:**

- [Investigation: Missing project-closure and archive touchpoint](../../investigations/2026-08-07-project-closure-and-archive-touchpoint-investigation.md)
  — the four resolved questions carried here as constraints
- [finalize-branch skill](../../../plugins/project-docs/skills/finalize-branch/SKILL.md)
  — Step 6 (reconciliation) and Step 8 (delegation precedent)
- [consolidate-long-branch skill](../../../plugins/project-docs/skills/consolidate-long-branch/SKILL.md)
  — the delegation pattern this follows
- [docs-curator agent](../../../plugins/project-docs/agents/docs-curator.md) —
  adjacent, deliberately unchanged
- [projects/README.md](../README.md) — archival convention and the relative-link
  safety property
- [backlog/README.md](../../backlog/README.md) — backlog archival convention
- [scaffold-update-checklist](../../../.claude/skills/scaffold-update-checklist/SKILL.md)
  — the live-vs-historical rule, and the plugin-change obligations this incurs
