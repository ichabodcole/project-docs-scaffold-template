# Documentation Restructuring: Development Plan

**Status:** Draft **Created:** 2026-02-09 **Proposal:**
[Documentation Restructuring Proposal](./proposal.md)

---

## Overview

Implement the hybrid documentation structure proposed in the restructuring
proposal. The primary deliverable is updating the cookiecutter template to
generate the new layout for new projects. Secondary phases cover dogfooding in
this project and updating plugin tooling.

The core structural change: ephemeral pipeline documents (proposals, plans,
sessions) move from standalone type-based folders into domain-based project
folders. New concepts (backlog, MEMORIES.md, artifacts) are introduced.
Permanent reference docs and discovery/assessment docs stay as-is.

## Current State

### Cookiecutter template (`{{cookiecutter.project_slug}}/docs/`)

**Folders that stay unchanged:**

- `architecture/` — README.md, TEMPLATE.md
- `interaction-design/` — README.md, TEMPLATE.md
- `playbooks/` — README.md, TEMPLATE.md
- `lessons-learned/` — README.md, TEMPLATE.md
- `specifications/` — README.md, TEMPLATE-overview.md, TEMPLATE-domain.md
- `fragments/` — README.md, TEMPLATE.md
- `reports/` — README.md, TEMPLATE.md, archive/.gitkeep
- `investigations/` — README.md, TEMPLATE.md, archive/.gitkeep

**Folders being removed (content moves into projects):**

- `proposals/` — README.md, TEMPLATE.md, archive/.gitkeep
- `plans/` — README.md, TEMPLATE.md, archive/.gitkeep
- `sessions/` — README.md, TEMPLATE.md

**Root files needing updates:**

- `README.md` — Structure descriptions, flowchart, quick reference (major
  rewrite)
- `AGENTS.md` — Doc type listing and documentation cycle
- `CLAUDE.md` — May need updates to reference new structure

**New files/folders to create:**

- `projects/` — README.md, TEMPLATES/ subfolder with proposal, plan, and session
  templates
- `backlog/` — README.md, TEMPLATE.md, archive/.gitkeep
- `archive/` — .gitkeep
- `MEMORIES.md`

### Plugin files referencing doc paths (30+ files)

Per the proposal, plugin updates are deferred to a later phase. The inventory is
captured here for planning:

**Commands (11 files):** finalize-branch.md, investigation-to-proposal.md,
proposal-to-plan.md, project-summary.md, documentation-cleanup.md,
investigate.md, init-branch.md, start-worktree.md, project-recipe.md,
project-manifesto.md, update-deps.md

**Skills (10 files):** document-validation, parallel-worktree-dev,
proposal-to-plan, investigation-to-proposal, review-docs, create-investigation,
generate-spec, dev-discovery, investigation-methodology, create-recipe

**Agents (9 files):** proposal-writer, dev-plan-generator, investigator,
technical-investigator, docs-curator, research-investigator, gopher-dev,
unit-test-writer, web-researcher

### This project's `docs/` folder

Currently mirrors the old cookiecutter structure. Will be restructured in a
later phase to match the new template output.

## Approach Summary

The work follows the rollout plan from the proposal:

1. **Phase 1** — Update the cookiecutter template (primary deliverable)
2. **Phase 2** — Dogfood by restructuring this project's `docs/` folder
3. **Phase 3** — Update plugin tooling (commands, skills, agents)

Phase 1 is the focus of this plan. Phases 2 and 3 are outlined at a high level.

---

## Phase 1: Update Cookiecutter Template

This phase restructures the cookiecutter template at
`{{cookiecutter.project_slug}}/docs/` to generate the new layout.

### Step 1.1: Create new directory structure

**Goal:** Add the new folders and files that don't exist yet.

**Key changes:**

- Create `projects/` directory with:
  - `README.md` — Explains what projects are, when to create one, folder
    conventions, naming, archival, and the project vs. backlog threshold.
    Incorporates relevant guidance from the current proposals/plans/sessions
    READMEs (what each doc type is, when to create them). Does NOT maintain an
    index of active projects — scanning the directory is sufficient.
  - `TEMPLATES/` subfolder containing project-scoped templates:
    - `PROPOSAL.template.md` — Adapted from the current standalone proposal
      template but with path conventions updated (no date prefix in filename,
      relative paths within project folder, references to investigations/reports
      use `../../` paths).
    - `PLAN.template.md` — Same adaptation as above.
    - `YYYY-MM-DD-SESSION.template.md` — Session template. Sessions keep date
      prefixes since there can be multiple per project.

- Create `backlog/` directory with:
  - `README.md` — Explains what backlog items are, when to use backlog vs.
    project, file naming convention (YYYY-MM-DD-short-description.md), lifecycle
    (archive when done).
  - `TEMPLATE.md` — Backlog item template with title, date added, description,
    optional acceptance criteria, optional references.
  - `archive/.gitkeep`

- Create `archive/` directory with:
  - `.gitkeep`

- Create `MEMORIES.md` at docs root with:
  - Header explaining the file's purpose
  - Format guide showing the structure of a memory entry (date, summary, key
    files, references)
  - Guidance on pruning (keep recent, remove old entries)
  - Empty entries section ready for first use

**Validation:** Directories exist, files are non-empty, cookiecutter generates
without errors.

### Step 1.2: Remove deprecated standalone folders

**Goal:** Remove the folders whose content now lives inside project folders.

**Key changes:**

- Remove `proposals/` directory (README.md, TEMPLATE.md, archive/.gitkeep)
- Remove `plans/` directory (README.md, TEMPLATE.md, archive/.gitkeep)
- Remove `sessions/` directory (README.md, TEMPLATE.md)

**Important:** The guidance content from these READMEs should already be
incorporated into `projects/README.md` (Step 1.1) before deletion. Review each
README to ensure no useful guidance is lost.

**Validation:** Folders removed. No orphan references to these paths in other
template files.

### Step 1.3: Update docs/README.md

**Goal:** Rewrite the main documentation README to reflect the new structure.

**Key changes:**

- **Structure section:** Replace the current per-type folder descriptions with
  the new organizational model:
  - Permanent reference docs (architecture, interaction-design, playbooks,
    lessons-learned, specifications, fragments)
  - Discovery & assessment (reports, investigations)
  - Projects (co-located pipeline docs)
  - Backlog (small work items)
  - Archive (completed projects)
  - MEMORIES.md (quick onboarding)

- **Specifications section:** Keep the existing "Specifications: A Living
  Application Description" callout. No changes needed — specs stay outside the
  per-feature lifecycle.

- **Decision flowchart:** Rework to include:
  - The project vs. backlog decision point: "Is this big enough to need a
    proposal?" YES → create project folder. NO → backlog item.
  - Investigation → project flow (investigation concludes → create project
    folder → proposal inside it)
  - Sessions, artifacts as activities within a project
  - Reports as assessment that can trigger new investigations or projects
  - Fragments as pre-investigation capture
  - Permanent docs (architecture, interaction-design, playbooks) as outputs
    after work completes

- **Quick Reference:** Update to reflect new structure:
  - Project: "Here's the full story of building X — proposal, plan, sessions,
    artifacts in one place."
  - Backlog: "Here's a small task that just needs doing."
  - Memories: "Here's what we've been doing lately for quick onboarding."
  - Keep existing entries for investigation, report, specification,
    architecture, interaction design, playbook, lesson learned, fragment

- **Special cases:** Update to include project vs. backlog guidance and
  MEMORIES.md

- **Usage section:** Update to mention that project-scoped templates live in
  `projects/`

**Validation:** Flowchart is coherent. All doc types are represented. Quick
reference covers all types.

### Step 1.4: Update docs/AGENTS.md

**Goal:** Update the agent guidance file to reflect the new structure.

**Key changes:**

- Update the documentation types listing to reflect the new organizational model
- Update the documentation cycle to show
  `Report → Investigation → Project (proposal → plan → sessions) → Report`
- Add mention of backlog and MEMORIES.md

**Validation:** Consistent with README.md. All doc types mentioned.

### Step 1.5: Update investigation template and README

**Goal:** Add guidance on linking investigations to projects.

**Key changes:**

- Update `investigations/README.md` to mention the investigation → project flow:
  when an investigation concludes with "build this," a project folder gets
  created and the project's proposal references the investigation. Add archival
  guidance: archive an investigation once any resulting project work has been
  completed. If no action was needed, archive immediately.
- Update `investigations/YYYY-MM-DD-TEMPLATE-investigation.md`:
  - The template already has an `**Outcome:**` inline metadata field (consistent
    with the bold-text metadata pattern used across all templates). Update its
    options to include project references (e.g.,
    `Project created → projects/oauth-upgrade/`).
  - Update the Related Documents section to show example links to project
    folders using the new path convention
    (`../projects/project-name/proposal.md`).

**Validation:** Outcome field updated with project reference examples. README
describes investigation lifecycle and archival criteria.

### Step 1.6: Update reports template and README

**Goal:** Minor updates to mention relationship to projects.

**Key changes:**

- Update `reports/README.md` to mention that reports can trigger new
  investigations or projects, and that they stay top-level as cross-cutting
  assessments.
- Update Related Documents section in the template to include example links to
  project folders.

**Validation:** Consistent with the organizational model.

### Step 1.7: Review permanent folder READMEs

**Goal:** Ensure permanent reference folder READMEs don't contain stale
references to the old structure.

**Key changes:**

- Review each README in: architecture, interaction-design, playbooks,
  lessons-learned, specifications, fragments
- Update any cross-references that point to the old `proposals/`, `plans/`,
  `sessions/` paths
- Update any mentions of the documentation cycle to reflect the new flow

**Validation:** No references to removed folders. Cross-references use correct
paths.

### Step 1.8: Update root-level project files

**Goal:** Update files outside the cookiecutter template that describe the
documentation structure.

**Key changes:**

- Update project `README.md` — Update the generated directory tree and
  documentation structure descriptions to match the new layout
- Update project `AGENTS.md` — Update the template directory listing

**Validation:** Root README and AGENTS.md match the actual template structure.

### Step 1.9: Validate cookiecutter generation

**Goal:** Ensure the template generates correctly and the output is usable.

**Key changes:**

- Run `cookiecutter` to generate a test project
- Verify all directories and files are created
- Verify no Jinja2 errors
- Verify no references to removed folders in any generated file
- Run Prettier on generated output to check formatting

**Validation:** Clean generation. No errors. No stale references. All files
properly formatted.

---

## Phase 2: Dogfood in This Project (High-Level)

After Phase 1 is validated, restructure this project's `docs/` folder to match
the new template output.

**Steps:**

1. Create `projects/`, `backlog/`, `archive/` directories in `docs/`
2. Create `MEMORIES.md` in `docs/`
3. Move the restructuring proposal from `docs/proposals/` into
   `docs/projects/documentation-restructuring/proposal.md`
4. Move this plan from `docs/plans/` into
   `docs/projects/documentation-restructuring/plan.md`
5. Remove now-empty `proposals/`, `plans/`, `sessions/` directories
6. Update cross-references in moved documents
7. Update `docs/README.md`, `docs/AGENTS.md`, `docs/CLAUDE.md` to match the new
   structure
8. Add a memory entry to `MEMORIES.md` summarizing this restructuring work

**Validation:** This project's docs structure matches cookiecutter template
output. All links work.

---

## Phase 3: Update Plugin Tooling (High-Level)

After the structure is validated through dogfooding, update plugin commands,
skills, and agents.

**Scope (30+ files):**

- **Commands needing path updates:** finalize-branch, investigation-to-proposal,
  proposal-to-plan, project-summary, documentation-cleanup, investigate,
  init-branch, start-worktree, project-recipe
- **Skills needing path updates:** document-validation, parallel-worktree-dev,
  proposal-to-plan, investigation-to-proposal, review-docs,
  create-investigation, generate-spec, dev-discovery, investigation-methodology
- **Agents needing path updates:** proposal-writer, dev-plan-generator,
  investigator, technical-investigator, docs-curator, research-investigator,
  gopher-dev

**New skills/commands to consider:**

- Backlog item creation (skill or integration into existing workflow)
- Memory entry creation (likely integrated into finalize-branch command)
- Project folder creation (skill for setting up a new project folder with
  templates)
- **Project scaffolding script** — A shell script (callable from skills) that
  creates a new project folder with optional document templates. Example:
  `new-project.sh oauth-upgrade --proposal --plan` would create the project
  directory, copy selected templates from `projects/TEMPLATES/`, and set up
  `sessions/` and `artifacts/` subfolders. This bridges the gap created by
  templates no longer living alongside their target directories. Can be built at
  any time — not blocking Phase 1.

**Approach:** Work through files systematically, updating path references from
`docs/proposals/`, `docs/plans/`, `docs/sessions/` to `docs/projects/<name>/`
conventions. This is mechanical but requires care to maintain correct relative
paths and behavioral logic.

---

## Key Risks & Mitigations

| Risk                                  | Impact                                          | Mitigation                                                                  |
| ------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| Stale references after folder removal | Broken templates, confusing output              | Grep for all removed paths before finalizing (Step 1.9)                     |
| Losing guidance from removed READMEs  | Users don't understand proposals/plans/sessions | Incorporate all guidance into projects/README.md before deletion (Step 1.2) |
| Flowchart complexity                  | New flowchart is confusing or incomplete        | Review against all doc types systematically (Step 1.3)                      |
| Cookiecutter generation errors        | Template fails to generate                      | Test generation as final validation (Step 1.9)                              |
| Plugin updates scope creep            | Phase 1 blocked by plugin work                  | Plugin updates explicitly deferred to Phase 3                               |

## Testing Strategy

- **Template generation test:** Run cookiecutter after each phase step to catch
  errors early
- **Reference grep:** After removing folders, grep the entire template for any
  remaining references to `proposals/`, `plans/`, `sessions/` (as standalone
  paths, not within `projects/`)
- **Prettier check:** Run formatter on all generated markdown
- **Manual review:** Read through generated docs/README.md flowchart to verify
  it's coherent and complete

## Resolved Questions

1. **Project folder templates location:** Templates live in
   `projects/TEMPLATES/` subfolder with naming convention
   `PROPOSAL.template.md`, `PLAN.template.md`, `YYYY-MM-DD-SESSION.template.md`.
   This keeps them visually separate from actual project folders.

2. **Investigation outcome field:** Use the existing inline bold-text metadata
   pattern (`**Outcome:**`) that's already in the investigation template. This
   is consistent with how all templates handle metadata (proposals use
   `**Status:**`, reports use `**Date:**`, etc.). Update the field options to
   include project folder references.

3. **Projects README.md index:** No index of active projects. Scanning the
   directory is sufficient and avoids maintenance burden.

---

**Related Documents:**

- [Documentation Restructuring Proposal](./proposal.md)
- [Current Documentation README](../../README.md)
