---
type: investigation
title:
  Missing project-closure and archive touchpoint in the finalize-branch
  lifecycle
description:
  finalize-branch closes a branch and nothing closes a project, so finished work
  sits in the active tree indefinitely.
status: stable
lifecycle: concluded
generated: { by: unknown, at: 2026-08-07 }
---

# Investigation: Missing project-closure and archive touchpoint in the finalize-branch lifecycle

## Question / Motivation

`finalize-branch` handles the moment a branch's work is done — review, quality
gates, session/memory docs, squash/merge — but nothing in the project-docs
lifecycle asks the next-level question: **is the _project_ (or backlog item)
this branch belongs to now done, and if so, has it been reconciled and
archived?**

In practice, Cole is the one who notices and says "we just finished that
project, let's archive it" — there's no explicit touchpoint that surfaces this.
The result is two related but distinct drifts:

1. **Plan drift** — `plan.md` (or a backlog item) accumulates changes during
   implementation that never get reflected back into the document: items don't
   get checked off, and deviations from the original plan go unrecorded.
2. **Archive drift** — completed project folders and backlog items sit in their
   active locations indefinitely, and any cross-references elsewhere in the docs
   tree that point at the (now-stale) active path never get updated.

## Current State Analysis

The convention already exists in writing, just not in tooling:

- `docs/projects/README.md:276` — "When a project is complete, move the entire
  folder to `projects/_archive/`." Line 278 covers external references using
  `./_archive/project-name/` paths, but nothing checks or enforces this.
- `docs/backlog/README.md:64,76` — same convention for backlog items ("Move the
  completed file to `backlog/_archive/`", "don't leave completed items in the
  active list").
- `docs/PROJECT_MANIFESTO.md:100-101` — the pipeline description itself already
  names archival as the terminal stage: "brief → investigation → proposal →
  [design resolution] → plan → [test plan] → implementation sessions →
  **archival**." The manifesto claims this as part of the cycle; nothing
  operationalizes it.
- `plugins/project-docs/skills/finalize-branch/SKILL.md` — Steps 4-7 handle
  per-branch documentation (session doc, memory, additional-docs assessment,
  commit) but never ask whether this branch is the project's _last_ chapter, or
  reconcile `plan.md` against what was actually built.
- `plugins/project-docs/agents/docs-curator.md` — already understands the
  concept ("recommends appropriate actions... archive, update, no action") and
  is lifecycle-aware, but it's a read-only, single-document, user-invoked agent
  ("review this proposal", "review all proposals in docs/projects/") — not a
  trigger tied to branch completion, and it recommends rather than acts.
- No existing skill performs the archive move, reconciles a plan's checkboxes
  against implementation, or sweeps cross-references to an archived path.
  Confirmed via `grep -rli archive plugins/project-docs/skills/` — no hits
  beyond incidental mentions in unrelated skills.

**Relevant precedent already in this codebase:** `finalize-branch` Step 8
doesn't own multi-commit consolidation logic inline — it delegates to the
`consolidate-long-branch` skill, which provides the full safe workflow (backup
refs, tree-equivalence verification) rather than bloating `finalize-branch`
itself. The same session also just fixed `finalize-branch` for making unverified
assumptions in Step 2 (reviewer capability) and Step 8 (squash strategy) rather
than checking its own preconditions — see version 3.1.0 in
`plugins/project-docs/README.md`. A closure/archive touchpoint should follow the
same shape: a lightweight trigger inside `finalize-branch`, delegating real work
to a dedicated skill, rather than growing `finalize-branch` further.

## Investigation Findings

### Key Observations

- The two drifts (plan reconciliation vs. archival) operate at different
  granularities. A project can span many branches (proposal → plan → multiple
  implementation branches → sessions), so "does this branch complete the plan"
  is answerable per-branch, but "is the whole project done" is not always — most
  branches land mid-project, not at closure.
- This is document-lifecycle hygiene, which `project-docs` already claims
  ownership of via its own pipeline description — this is not a multi-agent
  "team ritual" like anthill's `finalize-session` (which captures team
  _knowledge_ — living docs, seams, retros — a different concern entirely from
  archiving a finished project's documents).

### Options Considered

1. **Do nothing** — keep relying on Cole noticing and asking. Costs nothing to
   build, but the pain point is explicitly recurring and was the reason this
   investigation exists.
2. **Fold everything into `finalize-branch` directly** — add plan reconciliation
   and archive execution as new steps inline. Simple to reason about as "one
   skill, one place," but repeats the anti-pattern the #148/#149 fixes just
   removed: `finalize-branch` making assumptions at a granularity (per-branch)
   that doesn't match the question being asked (per-project), and growing an
   already-long (10-step) skill further.
3. **Two-piece split (chosen)** —
   - A lightweight **plan/backlog reconciliation** step inside `finalize-branch`
     Step 6 ("Assess Additional Documentation"): if a `plan.md` or backlog item
     exists for this work, update it to reflect what was actually built (check
     off completed items, note drift from the original plan) before completion
     options are presented. Runs on every branch; makes no claim about whether
     the whole project is finished.
   - A new, separately invocable skill (named `sweep-project` in the proposal;
     working name during investigation was `archive-project`) that does the real
     closure work — move the folder to `_archive/`, sweep and fix
     cross-references to the old path, update `docs/backlog/` links — triggered
     from `finalize-branch` only as a question ("reconciliation shows everything
     checked off — does this complete the project? archive it?"), mirroring the
     `consolidate-long-branch` delegation pattern.

## Recommendation

- [x] **Create Proposal** — option 3 (the two-piece split), with all four open
      questions resolved in discussion on 2026-08-07 (see "Resolved Questions"
      below). The resolutions are concrete enough to specify behavior rather
      than intent.
- [ ] No Action Needed
- [ ] Monitor
- [ ] More Research Needed

**Rationale:** "Do nothing" and "fold into finalize-branch inline" are both
weaker than the two-piece split, and the questions that were blocking a proposal
all resolved toward _less_ new machinery rather than more: the reference sweep
reuses an existing live-vs-historical rule instead of inventing one, plan
reconciliation edits documents in place instead of introducing an addendum
format, and standalone invocation falls out of skills being invocable by name.
The only genuinely new design decision left — that archival is a **check-in**,
not something an agent does on its own — is a framing constraint the proposal
can carry directly into the skill's shape.

## Next Steps

1. ~~Run `generate-proposal`~~ — **done**, see
   [docs/projects/sweep-project/proposal.md](../projects/sweep-project/proposal.md).
   Scoped to the three pieces below, carrying the resolutions as constraints:
   - the new `sweep-project` skill (reconcile → confirm with the human → either
     record what's left or archive and update live references), directly
     invocable, not dependent on `finalize-branch` having called it;
   - the `finalize-branch` Step 6 plan/backlog reconciliation check plus the
     delegation question, mirroring the `consolidate-long-branch` pattern;
   - the `docs/README.md` / `PROJECT_MANIFESTO.md` pipeline-diagram update,
     framing archival as a check-in stage — required by
     `scaffold-update-checklist`'s "Updating Pipeline or Lifecycle" section once
     archival becomes operational rather than merely described.
2. Note for whoever implements: this adds a skill and modifies one, so the
   `scaffold-update-checklist`'s "Adding a New Plugin Skill" / "Adding or
   Modifying a Plugin Skill" paths both apply (dist rebuild, plugin minor bump,
   README changelog, cold-read verification). It introduces no new root-file
   convention, so no `## Root-Level Conventions` row is needed — unlike the
   sibling finding below.

## Resolved Questions

Resolved in discussion with Cole on 2026-08-07. Recorded here as constraints for
the proposal, not as settled implementation detail.

- **Reference-sweep mechanism** — reuse the existing reasoning rather than
  deriving a second one. `scaffold-update-checklist`'s "Removing a Plugin Skill"
  section already draws exactly this line: scrub **live** current-state
  references, and "leave dated retrospective prose alone (it's historical
  record, not a current-state claim)." Applied to archival: a pointer at
  `docs/projects/<name>/` from an active README, index, or backlog list is live
  → rewrite it to the `_archive/` path. The same path inside a dated session
  note, memory, or retrospective is historical → leave it. No new mechanism to
  invent.
- **Plan-reconciliation format** — reconcile **in place**; do not invent an
  addendum format. Most plans in this scaffold carry phase-level markdown
  checkboxes, so the step is: review the plan against what was actually built,
  check off what's complete, leave unchecked what isn't. The resulting
  checked/unchecked split _is_ the archive-readiness signal — everything checked
  means the plan is finished and the project is an archival candidate; anything
  left means it isn't. If the document carries a status property (frontmatter or
  a `Status:` line), update that too. Backlog items get the same treatment —
  same checklist-and-status pass, then archive — despite being single files
  rather than folders. Checklists are the common case, not a guarantee: for a
  plan without one, report completed vs. remaining narratively rather than
  fabricating checkboxes into someone else's document.
- **Pipeline-diagram update** — yes, update it, but the stage it describes is a
  **check-in, not an automatic action**. The agent surfaces "reconciliation
  shows everything complete — archive this project?" and the human answers;
  nothing closes a project unattended. The pipeline docs should read that way
  rather than implying archival happens on its own at the end of the cycle.
- **Standalone invocation** — yes, and it costs nothing: a skill is invocable by
  name by construction, so there's no separate entry point to build. The only
  real requirement this places on the design is that `sweep-project` must not
  assume it was called _from_ `finalize-branch` — no dependency on branch
  context, a base branch, or a just-created session doc — so it works when
  pointed at an arbitrary already-stale project or backlog item that predates
  this tooling.

## Related Finding: Surfacing Plugin-Driven Root-File Conventions

Discovered while shipping the #148/#149 `finalize-branch` fixes (v3.1.0) in this
same session — a smaller, more bounded sibling problem to the main
archive-touchpoint question above, worth tracking here rather than splitting
into its own file.

**The problem:** `finalize-branch` v3.1.0 now looks for a
`## Branch Landing Policy` heading in a project's root `AGENTS.md`/`CLAUDE.md`.
Nothing tells an _existing_ consumer of the `project-docs` plugin that upgrading
introduces this expectation. The natural place to check — `update-project-docs`
— explicitly excludes this case: its own doc states "Plugin-only changes
(commands, skills, agents)" do **not** trigger a `docs_version` bump or
migration guide, because `docs_version` is documented as tracking `docs/`
_structural_ changes specifically, not plugin skill behavior.

**Options considered:**

1. **Bump `docs_version` anyway and add a migration guide**, treating "this
   plugin change requests a user-facing action" as a carve-out from the
   "plugin-only changes don't need a migration" rule — even though nothing in
   `docs/` itself changed structurally. Risk: stretches `docs_version`'s
   documented meaning to cover a second, unrelated category of change.
2. **Extend `update-project-docs` Step 6** ("Ensure Root-Level Agent Context,"
   which already greps root `AGENTS.md`/`CLAUDE.md` for one expected thing — a
   `docs/` pointer — and recommends adding it if missing) to also check for
   `## Branch Landing Policy`, gated on the installed `project-docs` plugin
   version. Risk (raised directly, and correct): this means embedding
   version-specific conditional logic ("if plugin version ≥ 3.1.0, check for X")
   as prose inside the skill body. Every future plugin release that wants a new
   root-file convention adds another such clause, and Step 6 slowly becomes a
   hand-maintained version ledger written in prose — precisely the sprawl the
   `migrations/*.md` + table system already exists to prevent for `docs/`
   structure.
3. **Generalize Step 6 to be data-driven (chosen).** Keep Step 6's own prose
   permanently version-agnostic — exactly like Steps 3–4 already stay generic
   ("find applicable migrations, execute in sequence") while version-specific
   content lives externally in `migrations/*.md` plus the
   `## Available Migrations` table. Add a parallel table
   (`## Root-Level Conventions`), keyed to **introducing plugin@version** for
   human reference, with rows shaped like _(convention name, introduced-in
   plugin version, exact check command)_ and a matching subsection per row for
   the recommended content. Step 6's rewritten prose checks every row
   **unconditionally** — no runtime plugin-version gating, since there's no
   reliable way for the skill to detect an installed plugin's version from
   inside a session, and it isn't needed for correctness: recommending a
   convention someone hasn't upgraded into yet is harmless (inert until they
   do), while missing one for someone who needs it is the real risk the whole
   investigation started from. Every future convention is a new table row plus
   subsection, never a new sentence in Step 6 itself.

**Rationale:** it's the only option that doesn't compromise an existing, working
design principle — `docs_version` stays scoped to `docs/` structure, and Step 6
stays free of accumulating version-specific prose — by applying the same
externalization pattern the migration system already uses, just pointed at a
different category of content (root-file conventions vs. `docs/` structure).

**Implemented** in this same session/branch (fold of scope back in, after
initially deferring it — see `plugins/project-docs/README.md`'s 3.1.0 entry for
the changelog). See `plugins/project-docs/skills/update-project-docs/SKILL.md`'s
`## Root-Level Conventions` table, its `## Branch Landing Policy` and "Docs
structure pointer" subsections, and its "Adding a New Root-Level Convention"
section for the mechanism itself. The plugin README's changelog now links there
instead of embedding the how-to content inline, and
`.claude/skills/scaffold-update-checklist/SKILL.md`'s "Adding or Modifying a
Plugin Skill" checklist points future changes at the same table.

---

**Related Documents:**

- [finalize-branch skill](../../plugins/project-docs/skills/finalize-branch/SKILL.md)
- [consolidate-long-branch skill](../../plugins/project-docs/skills/consolidate-long-branch/SKILL.md)
  (precedent for delegating heavy lifting out of finalize-branch)
- [docs-curator agent](../../plugins/project-docs/agents/docs-curator.md)
- [projects/README.md](../projects/README.md)
- [backlog/README.md](../backlog/README.md)
- [PROJECT_MANIFESTO.md](../PROJECT_MANIFESTO.md)
- [scaffold-update-checklist](../../.claude/skills/scaffold-update-checklist/SKILL.md)
- [update-project-docs skill](../../plugins/project-docs/skills/update-project-docs/SKILL.md)
  (Step 6 precedent for the "Related Finding" section; versioning rules for
  `docs_version` vs. plugin-only changes)
- [project-docs plugin README](../../plugins/project-docs/README.md) (v3.1.0
  changelog entry — links to the Root-Level Conventions mechanism rather than
  duplicating its content, per the resolved "Related Finding" above)
