# Investigation: Missing project-closure and archive touchpoint in the finalize-branch lifecycle

**Date Started:** 2026-08-07 **Investigator:** Claude Code **Status:** Active
**Outcome:** In Progress

---

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
3. **Two-piece split (leaning direction)** —
   - A lightweight **plan/backlog reconciliation** step inside `finalize-branch`
     Step 6 ("Assess Additional Documentation"): if a `plan.md` or backlog item
     exists for this work, update it to reflect what was actually built (check
     off completed items, note drift from the original plan) before completion
     options are presented. Runs on every branch; makes no claim about whether
     the whole project is finished.
   - A new, separately invocable skill (working name `archive-project`) that
     does the real closure work — move the folder to `_archive/`, sweep and fix
     cross-references to the old path, update `docs/backlog/` links — triggered
     from `finalize-branch` only as a question ("reconciliation shows everything
     checked off — does this complete the project? archive it?"), mirroring the
     `consolidate-long-branch` delegation pattern.

## Recommendation

- [ ] Create Proposal
- [ ] No Action Needed
- [ ] Monitor
- [x] **More Research Needed** — the shape (option 3) is fairly well-formed from
      discussion, but the open questions below (especially the reference-sweep
      mechanism and what a plan-reconciliation addendum should look like) need
      to be resolved before a proposal can specify concrete behavior rather than
      intent.

**Rationale:** The direction is settled enough that "do nothing" and "fold into
finalize-branch inline" are both weaker than the two-piece split. What's not yet
settled is _how_ the reference sweep safely distinguishes a live pointer from a
historical mention (the same nuance the scaffold checklist's "Removing a Plugin
Skill" section already handles for skill removal — "leave history alone... don't
rewrite it"), and what triggers reconciliation vs. archival independently of
`finalize-branch` (e.g., a standalone sweep for already-stale projects Cole
hasn't gotten to yet).

## Next Steps

1. Resolve the open questions below — likely via a short design pass rather than
   further investigation, since the core shape isn't in doubt.
2. Once resolved, move to `generate-proposal` for a `archive-project` project
   folder, scoped to: the new skill, the `finalize-branch` Step 6 addition, and
   the `docs/README.md` / `PROJECT_MANIFESTO.md` pipeline-diagram update the
   `scaffold-update-checklist`'s "Updating Pipeline or Lifecycle" section would
   require once archival becomes an operational stage, not just a described one.

## Open Questions

- **Reference-sweep mechanism.** How does the archive skill find and safely
  rewrite cross-references to a path that's moving to `_archive/`? What counts
  as a live reference (rewrite it) vs. a historical mention (leave it, e.g. in a
  dated session note or memory)? The skill-removal checklist in
  `scaffold-update-checklist` already draws this exact line for a different case
  — worth reusing that reasoning rather than re-deriving it.
- **Plan-reconciliation format.** What should the addendum in `plan.md` look
  like — checkbox updates in place, a dated "Delivered" section, something else?
  Does it differ for backlog items (which are single files, not folders)?
- **Pipeline-diagram update.** Does making archival operational (not just
  described) warrant updating the cycle string in `docs/README.md` and
  `PROJECT_MANIFESTO.md` to show it as an explicit stage agents interact with,
  per `scaffold-update-checklist`'s "Updating Pipeline or Lifecycle" section?
- **Standalone invocation.** Should `archive-project` also be directly invocable
  (not only triggered from `finalize-branch`), so Cole can run a sweep over
  already-completed-but-not-archived projects/backlog items that predate this
  tooling?

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
