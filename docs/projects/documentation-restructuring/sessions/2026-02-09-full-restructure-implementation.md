# Full Restructure Implementation — 2026-02-09

## Context

Implementing the documentation restructuring proposal to replace flat
directories (`proposals/`, `plans/`, `sessions/`) with co-located project
folders (`projects/<name>/`). This was a multi-phase effort covering the
cookiecutter template, the dogfood docs in this repo, and all plugin tooling.

## What Happened

### Phase 1: Template & Dogfood Structure (Commits f81853d through f7af5a7)

Started by finalizing the proposal and creating the development plan. Then
executed the restructuring in stages:

1. **Cookiecutter template** — Restructured from flat dirs to project folders.
   Created `projects/`, `projects/TEMPLATES/`, `backlog/`, `memories/`
   directories with READMEs and templates. Moved proposal/plan/session templates
   into `projects/TEMPLATES/`. Updated all cross-references throughout the
   template.

2. **Dogfood docs** — Applied the same structure to this repo's own `docs/`.
   Created the `documentation-restructuring` project folder and moved the
   proposal and plan into it. Converted the old `MEMORIES.md` file into
   individual files under `docs/memories/`. Moved `docs/archive/` into
   `docs/projects/_archive/`.

3. **docs/README.md** — Rewrote the documentation index to reflect the new
   three-category structure (permanent reference, discovery & assessment, work
   tracking) with a decision flowchart for choosing document types.

### Phase 2: Plugin Tooling Updates (Commits d6d8df9 through e0ae407)

**Tier 1 — Mechanical path updates** across all plugin commands, agents, and
skills that referenced the old flat directory paths. Updated `proposals/` →
`projects/<name>/proposal.md`, `plans/` → `projects/<name>/plan.md`, etc.

**Tier 2 — Strategic enhancements:**

- **Consolidated investigation agents**: Merged 3 overlapping agents
  (`investigator`, `technical-investigator`, `research-investigator`) into a
  single `investigator` agent with two methodology modes (Evaluative and
  Diagnostic). Created a new `evaluative-research` methodology skill.

- **Added memory creation step to finalize-branch**: Step 5 now creates a memory
  document for quick onboarding context.

- **Created `create-project` command**: New command for scaffolding project
  folders with a proposal template.

**Tier 3 — Versioned migration system:**

- Created `update-project-docs` skill that orchestrates documentation structure
  upgrades between versions, similar to database migrations.

- Created `migrations/v1-to-v2.md` with a complete 10-step migration guide.

- Added `docs_version` YAML frontmatter to `docs/README.md` with
  `x-release-please-version` annotation for automatic version sync.

- Created `release-please-config.json` with extra-files configuration so
  release-please updates the version in both README files.

### Code Review Fixes

During branch finalization, found and fixed stale references to old paths in 5
template files:

- `plugins/project-docs/skills/create-investigation/YYYY-MM-DD-TEMPLATE-investigation.md`
- `docs/investigations/YYYY-MM-DD-TEMPLATE-investigation.md`
- `docs/architecture/TEMPLATE.md`
- `docs/interaction-design/TEMPLATE.md`
- `docs/lessons-learned/TEMPLATE.md`

## Notable Discoveries

- The three investigation agents had significant overlap but genuinely distinct
  methodologies. Consolidating them into one agent with two modes (evaluative
  vs. diagnostic) preserved both approaches while reducing confusion about which
  agent to use.

- Release-please's `x-release-please-version` annotation in generic text files
  provides a clean way to keep documentation version markers in sync with
  package.json without custom scripts.

## Changes Made

72 files changed, +2783 / -1586 lines. Key changes:

- Created `docs/projects/`, `docs/backlog/`, `docs/memories/` with READMEs and
  templates
- Moved all proposal/plan/session templates into `docs/projects/TEMPLATES/`
- Removed old `docs/proposals/`, `docs/plans/`, `docs/sessions/` directories
- Rewrote `docs/README.md` and `docs/AGENTS.md` for new structure
- Consolidated 3 investigation agents into 1
- Created evaluative-research methodology skill
- Created create-project command
- Created update-project-docs skill with v1-to-v2 migration
- Added release-please-config.json for version tracking

## Follow-up

- The `feat!:` commit prefix should trigger a major version bump (1.8.0 → 2.0.0)
  via release-please on next release
- Projects using v1 structure can upgrade using the `update-project-docs` skill

---

**Related Documents:**

- [Plan](../plan.md)
- [Proposal](../proposal.md)
