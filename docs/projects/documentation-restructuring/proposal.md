# Documentation Restructuring: Domain-Based Project Organization

**Status:** Draft **Created:** 2026-02-09 **Author:** Claude Code + Cole Reed

---

## Overview

Restructure the documentation system from a flat, type-based hierarchy (all
investigations in one folder, all proposals in another) to a hybrid model where
ephemeral pipeline documents are co-located by project domain while permanent
reference documents remain type-based. Additionally, introduce two new
documentation concepts — a `backlog/` folder for small work items and a
`MEMORIES.md` file for agent onboarding context. This addresses growing pain
points around traceability, link fragility, scalability, lightweight task
tracking, and cold-start context loss as the project's documentation footprint
expands.

## Problem Statement

The current documentation structure organizes everything by document type:

```
docs/
  investigations/
  proposals/
  plans/
  sessions/
  architecture/
  interaction-design/
  playbooks/
  lessons-learned/
  specifications/
  fragments/
  reports/
```

This made sense early on, but several pain points have emerged as the
documentation has grown:

**Traceability is manual and fragile.** Following the thread of a body of work —
say, OAuth — requires mentally joining documents across 4+ folders by date
prefix and naming convention. The investigation is in `investigations/`, the
proposal in `proposals/`, the plan in `plans/`, sessions in `sessions/`.
Understanding the full story means hopping between folders and relying on
"Related Documents" links at the bottom of each file.

**Archival breaks links.** When an investigation is completed and moved to
`investigations/archive/`, any proposal that references it via relative path now
has a broken link. This is a recurring issue during documentation cleanup —
every archival pass risks breaking references in documents that are still
active.

**Discovery artifacts have no home.** Pre-planning research — codebase
exploration, dependency analysis, architecture mapping — is generated during
development but has no natural place in the current structure. These artifacts
are currently either discarded or stored in ephemeral `.artifacts/` directories
outside the docs system entirely. They're useful context that gets lost.

**The flat structure doesn't scale.** Each folder accumulates documents from
every feature. The `investigations/` folder had 21 documents before recent
cleanup. Scanning it to find "the OAuth stuff" means reading date prefixes and
titles, mentally filtering by topic. This gets worse over time.

**Small tasks have too much ceremony.** A minor bug fix or small refactor
doesn't warrant a proposal, plan, and session. But there's no lightweight
alternative in the current structure — either you go through the full pipeline
or you do the work without documentation. This leads to small items being
undocumented or proposals being created for work that doesn't justify them.

**New agent sessions start cold.** When a new agent session begins, the agent
has no context for recent work. Orientation requires scanning git logs, reading
session documents, and exploring recent changes — work that could be avoided
with a pre-digested summary of what's been happening. This cold-start tax is
paid on every new session.

## Proposed Solution

Split documentation into two organizational strategies based on document
lifecycle, and introduce new concepts for lightweight task tracking and session
continuity:

- **Permanent, living documents** (architecture, interaction design, playbooks,
  lessons learned, specifications, fragments) stay organized by type. These are
  reference material that evolves over time and isn't tied to a specific body of
  work.
- **Discovery and assessment documents** (investigations, reports) stay
  organized by type at the top level. These precede projects, can be
  cross-cutting, and serve as connective tissue between bodies of work.
- **Ephemeral pipeline documents** (proposals, plans, sessions, artifacts) get
  organized by project domain. Everything related to a body of work lives in one
  folder.
- **Backlog items** get a dedicated folder for small, self-contained tasks that
  don't warrant a full project folder.
- **MEMORIES.md** provides a running summary of recent work for quick agent
  onboarding.

### Target structure

```
docs/
  # Permanent reference documentation (type-based)
  architecture/
  interaction-design/
  playbooks/
  lessons-learned/
  specifications/
  fragments/

  # Discovery & assessment (type-based)
  reports/
  investigations/

  # Small work items
  backlog/
    README.md
    TEMPLATE.md
    archive/
    2026-02-09-fix-date-formatting.md
    2026-02-10-rename-sync-endpoint.md

  # Quick onboarding context
  MEMORIES.md

  # Bodies of work — co-located pipeline documents
  projects/
    oauth-upgrade/
      proposal.md
      plan.md
      sessions/
        2026-01-15-initial-implementation.md
        2026-01-20-token-refresh.md
      artifacts/
        codebase-exploration.md
        dependency-analysis.md
    search-enhancement/
      proposal.md
    api-mcp-server/
      proposal.md
      plan.md
      sessions/
      artifacts/

  # Completed work (whole project folders)
  archive/
    operation-chaining/
    built-in-actions/
    ...
```

### Why investigations and reports stay top-level

Investigations and reports share the same organizational logic — they both
operate outside the scope of any single project.

**Investigations** are discovery work. They happen _before_ a project can be
defined — they're the thing that determines whether a project folder gets
created at all:

1. **Investigations precede projects.** You start an investigation to explore
   whether something is worth building. The project doesn't exist yet. Putting
   the investigation inside a project folder is putting the cart before the
   horse.

2. **Investigations can be broad.** The "Product Vision Deep Dive" investigation
   didn't map to a single feature — it led to multiple feature ideas. The "Rich
   Text Editor" investigation evaluated several libraries before concluding with
   one choice. These don't belong to a single project.

3. **Many-to-many relationships.** An investigation might feed multiple
   projects. The OAuth investigation feeds both the OAuth upgrade project and
   (eventually) the API MCP server project. If the investigation lived inside
   one project, the other project would have an awkward cross-project reference.

The flow is: investigation concludes with "yes, build this" → project folder
gets created → project's proposal references the investigation. The
investigation never moves, so the link is always stable.

**Reports** follow the same pattern for similar reasons:

1. **Reports can be cross-cutting.** A documentation status report, security
   audit, or UX consistency check across desktop and mobile spans multiple
   projects. Placing it in one project folder would be arbitrary.

2. **Reports feed multiple outcomes.** One report might trigger a refactor
   within an existing project AND spawn a new investigation for something else.
   If the report lives inside a project, the second outcome creates awkward
   cross-project references.

3. **Reports are observational, not part of the work.** A report assesses state
   — it's external to the doing. Project folders tell the story of building
   something. Reports are someone stepping back and evaluating the result.

4. **One simple rule.** All reports in one place, all investigations in one
   place. No ambiguity about where to look.

Reports and investigations serve as the connective tissue between projects —
they trigger new work and assess completed work, but they don't belong to any
single body of work.

### How project folders work

A project folder is created when there's a committed body of work to do —
typically when an investigation leads to a proposal, or when a feature is ready
for implementation.

**Contents are flexible.** A project folder might contain:

- `proposal.md` — What we're building and why
- `plan.md` — How we're building it (created when implementation begins)
- `sessions/` — Development session journals
- `artifacts/` — Working research generated during the project (see below)
- Any other documents specific to this body of work (task lists, technical
  notes, changelogs)

**Not everything needs every file.** A small project might just have a
`proposal.md`. A complex project might have all of the above plus multiple
session files. The folder accommodates whatever the work requires.

**Projects can span multiple branches.** OAuth might have a desktop
implementation branch and later a mobile implementation branch. Both are part of
the same project folder. The project is the unit of work, not the branch.

**Archival is clean.** When a project is done, the entire folder moves to
`archive/`. No individual files to chase across multiple type-based folders. No
links break within the project because all internal references are relative
within the folder.

### Artifacts

Artifacts are working research documents generated _during_ the course of
project work. Examples include codebase exploration notes, dependency analysis,
source code path mapping, and architecture sketches created to inform a dev plan
or implementation.

**How artifacts differ from investigations:**

- **Investigations** are discovery work done _before_ a project exists. They
  answer "should we build this?" and live top-level because they precede and can
  feed multiple projects.
- **Artifacts** are research done _during_ project work. They answer "how do we
  build this?" and live inside the project folder because they're specific to
  that body of work.

Artifacts are inherently freeform and varied — they don't follow a standard
template. A project folder simply includes an `artifacts/` subfolder, and
whatever working documents the project generates go there. They provide useful
context for anyone reviewing the project later, without polluting the main
documentation structure.

### Backlog

The backlog is a dedicated folder for small, self-contained work items — bugs,
minor refactors, papercuts, and small tasks that don't warrant a full project
folder. It provides a lightweight path for tracking work that would otherwise go
undocumented or be forced through the full proposal/plan pipeline.

**Structure:** The backlog follows the standard folder convention with a
`README.md`, `TEMPLATE.md`, and `archive/` subfolder.

**File naming:** Individual backlog items use date-prefixed files following the
existing convention: `YYYY-MM-DD-short-description.md`.

**Format:** Each backlog item is a short document with a title, description,
optional acceptance criteria, and optional references. Detailed enough to act
on, lightweight enough to create without ceremony.

**Lifecycle:** When a backlog item is completed, it moves to `backlog/archive/`.
This keeps the active backlog focused on current work while preserving history.

**When to use backlog vs. project:** If the work can be described and completed
without a proposal — it's a known fix, a small refactor, a clear task — it's a
backlog item. If the work needs exploration of options, has design decisions, or
will span multiple sessions, it's a project.

### MEMORIES.md

`MEMORIES.md` is a single file at the docs root that provides a running summary
of recent work. Its primary purpose is quick onboarding for new agent sessions —
instead of scanning git logs, reading sessions, and exploring recent changes, an
agent can read this file and immediately have context for what's been happening.

**Structure:** Entries are structured with dates and contain a condensed summary
of completed work — what was done, key files affected, and references to
relevant documentation (session docs, architecture docs, etc.) for deeper
context. Each entry is a distilled version of a session — not the detailed
narrative, but the essential takeaways.

**Updated at end of work:** When a branch is finalized or a scope of work is
completed, a memory entry is added summarizing what was accomplished.

**Pruned periodically:** Old entries are removed to keep the file focused on
recent work (roughly the last few weeks to a month). The file should reflect
current project momentum, not be a historical record.

**Complements other docs:** MEMORIES.md is not a replacement for sessions
(detailed journals), architecture docs (permanent reference), or the project
manifesto (foundational vision). It's the quick briefing that tells a new
session "here's what we've been doing lately" and points to deeper docs when
more context is needed.

### What this enables

**Adding new document types is free.** Want to track tasks within a project? Add
a `tasks.md`. Want technical decision notes? Add a `decisions/` subfolder. No
new root-level convention needed, no cross-folder linking ceremony.

**Artifacts become first-class.** Pre-planning research that's currently
discarded or stored outside the docs system can live in project `artifacts/`
folders. It's there for context if someone needs it, without polluting the main
docs structure.

**The full story is readable.** A new contributor can open
`projects/oauth-upgrade/` and read the proposal, plan, sessions, and artifacts
in sequence to understand the complete history of why and how the feature was
built.

**Small work has a home.** Bugs, papercuts, and minor tasks get tracked in the
backlog without the overhead of creating project folders.

**New sessions start warm.** MEMORIES.md eliminates the cold-start tax — agents
begin with context instead of spending tool calls on orientation.

## Scope

**In Scope:**

- Define the new directory structure and conventions
- Define naming conventions for project folders and backlog items
- Define the investigation/report → project flow
- Define archival conventions (whole-folder moves for projects, individual moves
  for backlog)
- Create backlog folder with README and TEMPLATE
- Create MEMORIES.md with format conventions
- Rework the documentation decision flowchart to reflect the new structure
  (project vs. backlog decision point, co-located pipeline docs, artifacts
  during project work)
- Update the documentation cycle description
- Migrate existing documents from the current structure to the new one
- Update `docs/README.md`, `docs/AGENTS.md`, and `docs/CLAUDE.md` to reflect the
  new structure
- Update cookiecutter template to generate the new structure for new projects
- Update Claude Code plugin commands, skills, and agents to work with the new
  structure (specific changes deferred to implementation)

**Out of Scope:**

- Changing permanent documentation structure (architecture, playbooks,
  specifications, etc. stay as-is)
- Introducing epics or higher-level grouping above projects (evaluated and
  deferred — taxonomy management overhead outweighs benefits at current scale)
- Automated tooling for tracking project status across folders (can be added
  later)

## Technical Approach

### Conventions

**Project folder naming:** Descriptive kebab-case names without date prefixes.
Examples: `oauth-upgrade`, `search-enhancement`, `milkdown-editor`. Date is
implicit from git history and document metadata.

**Document naming within projects:** Simple descriptive names without date
prefixes. `proposal.md`, `plan.md`. Sessions keep date prefixes since there can
be multiple: `sessions/2026-02-09-initial-implementation.md`.

**Investigation naming:** Keep current convention —
`YYYY-MM-DD-topic-investigation.md`. Date prefix is useful for chronological
scanning of the discovery funnel.

**Report naming:** Keep current convention — `YYYY-MM-DD-topic-report.md`.

**Backlog item naming:** Date-prefixed with short description —
`YYYY-MM-DD-short-description.md`. Follows the same ephemeral document
convention.

**Cross-references:**

- Projects reference investigations via `../../investigations/filename.md`
  (stable — investigations don't move)
- Projects reference reports via `../../reports/filename.md` (stable — reports
  don't move)
- Projects reference architecture docs via `../../architecture/filename.md`
  (stable — permanent docs don't move)
- Internal project references use relative paths within the folder (stable —
  files move together)

**Archival:**

- Projects: Move the entire project folder from `projects/` to `archive/`.
  Internal references remain valid. External references to archived projects use
  `../archive/project-name/` paths (from the projects directory).
- Backlog items: Move completed items from `backlog/` to `backlog/archive/`.

### Migration strategy

**Option A: Big bang migration.** Move all existing documents at once. Clean,
but requires updating all cross-references in one pass.

**Option B: Incremental adoption.** New work uses the project structure.
Existing documents stay in place and get migrated as they're touched. Allows a
gradual transition but means two systems coexist temporarily.

**Option C: Migrate on archive.** When a body of work is completed and would
normally be archived, migrate it into the project structure as part of the
archival process. New work starts in the project structure.

### Rollout plan

The restructuring will be implemented in phases:

1. **Finalize this proposal.** Resolve any remaining questions and get agreement
   on the structure.
2. **Update the cookiecutter template.** Implement the new structure in the
   scaffold so new projects generate with the updated layout. This can be done
   on a feature branch for testing.
3. **Dogfood in this project.** Restructure this project's `docs/` folder to
   follow the new conventions. This project serves as the test bed — if the
   structure doesn't work here, it won't work elsewhere.
4. **Update plugin tooling.** Once the structure is validated, update commands,
   skills, and agents to work with the new paths and conventions.

### Template and tooling updates

The following would need updating:

- Investigation template — Minor (add guidance on linking to projects)
- Proposal template — Update to expect `projects/name/proposal.md` path
- Plan template — Update to expect `projects/name/plan.md` path
- Session template — Update to expect `projects/name/sessions/` path
- Backlog — New README and TEMPLATE files
- MEMORIES.md — New file with format conventions
- Documentation decision flowchart — Rework to include project vs. backlog
  decision point
- `create-worktree.sh` and `WORKTREE_TASK.template.md` — Update doc references
- Claude Code plugin commands, skills, and agents — Update to understand project
  folder structure, backlog, and memories (specific changes identified during
  implementation)

## Impact & Risks

**Benefits:**

- Improved traceability — full story of any body of work in one folder
- Stable cross-references — investigations and reports don't move, project
  internals move together
- Natural home for artifacts and research
- Extensible — new document types don't require new root folders
- Cleaner archival — whole-folder moves, no scattered file management
- Easier onboarding — read one folder to understand a feature's history
- Lightweight path for small tasks — backlog captures work that would otherwise
  go undocumented
- Faster session starts — MEMORIES.md eliminates cold-start orientation work

**Risks:**

- **Migration effort.** Existing documents have cross-references that would need
  updating. Mitigation: incremental migration reduces blast radius.
- **"What's active?" visibility.** Scanning `projects/` tells you what exists
  but not what's in progress vs. stalled. Mitigation: directory scanning is
  sufficient at current scale; project folders are archived when complete, so
  active folders represent in-progress or pending work.
- **Tooling updates.** Plugin commands, skills, and agents reference current
  paths. Mitigation: update as part of rollout, not separately. Defer specifics
  to implementation phase.
- **Memory maintenance.** MEMORIES.md requires discipline to update and prune.
  Mitigation: integrate into the branch finalization workflow so it's part of
  the existing process, not an extra step.

**Complexity:** Medium — The restructuring is conceptually straightforward but
involves updating cross-references and tooling across the documentation system.

## Resolved Questions

The following questions from the original draft have been resolved through
discussion:

1. **Project folder vs. direct proposal** — Resolved: The `backlog/` folder
   provides a lightweight alternative for small work items. The threshold is
   clear: if the work needs a proposal (design decisions, option exploration),
   it's a project. If it's a known fix or small task, it's a backlog item.

2. **Specifications placement** — Resolved: Specifications stay top-level as
   permanent reference documentation. They are living, cumulative documents that
   track the whole application's behavior — they operate on a different axis
   than the per-feature project lifecycle. Completing a project may result in
   updating specifications, but specs don't belong inside projects.

3. **Reports placement** — Resolved: Reports stay top-level alongside
   investigations. They are cross-cutting, observational documents that serve as
   connective tissue between projects rather than being part of any single body
   of work.

4. **Fragments placement** — Resolved: Fragments stay top-level as permanent
   reference documentation. They capture incomplete observations that precede
   any defined work and don't belong to a specific project.

5. **Index/status tracking** — Resolved: `projects/README.md` does NOT maintain
   an index of active projects. Scanning the directory is sufficient for both
   humans and agents, and avoids unnecessary maintenance burden.

6. **Investigation lifecycle** — Resolved: When an investigation leads to a
   project, update the existing `**Outcome:**` metadata field to reference the
   project (e.g., `Project created → projects/oauth-upgrade/`). Also update the
   Related Documents section to link to the project's proposal. Archive
   investigations once any resulting project work has been completed; if no
   action was needed, archive immediately.

---

**Related Documents:**

- [Current Documentation README](../../README.md)
- [Documentation CLAUDE.md](../../CLAUDE.md)
- [Development Plan](./plan.md)

---

## Notes

This proposal emerged from a broader discussion about documentation scaling.
Several alternative structures were evaluated:

- **Fully flat, type-based (current)** — Works at small scale but doesn't scale
  for traceability or archival
- **Fully domain-based (everything in project folders)** — Clean but
  investigations don't map cleanly to single projects; cross-cutting
  investigations would need awkward duplication or shared ownership
- **Epics layer above projects** — Provides domain grouping ("Authentication",
  "Editor") but introduces a taxonomy problem — naming and scoping epics creates
  overhead that outweighs benefits at current scale. Could be revisited if the
  project folder count grows significantly.
- **Hybrid (proposed)** — Permanent docs stay type-based, pipeline docs go
  domain-based, investigations and reports stay top-level as connective tissue.
  Introduces backlog for lightweight tasks and MEMORIES.md for session
  continuity. Balances co-location benefits with the reality that not everything
  maps to a single project.
