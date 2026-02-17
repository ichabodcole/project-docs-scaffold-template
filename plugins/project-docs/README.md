# project-docs Plugin

Specialized commands for managing structured project documentation, proposals,
plans, and reports.

## Overview

This plugin provides a comprehensive suite of commands designed to work with the
[project-docs-scaffold-template](https://github.com/ichabodcole/project-docs-scaffold-template)
documentation structure. It helps you maintain organized, high-quality project
documentation through automated workflows and AI-assisted generation.

## Installation

### From Marketplace

```bash
claude plugins install project-docs
```

### Manual Installation

1. Clone or download this plugin
2. Link to Claude's plugins directory:
   ```bash
   ln -s /path/to/plugins/project-docs ~/.claude/plugins/project-docs
   ```
3. Restart Claude Code

## Commands

All commands are namespaced with `project-docs:` and invoked as
`/project-docs:command-name`.

### `/project-docs:project-summary`

**Description:** Generate a comprehensive project summary and current state
analysis.

**Usage:**

```
/project-docs:project-summary
```

**What it does:**

- Analyzes your codebase structure, dependencies, and recent activity
- Reviews existing documentation across all categories
- Generates two documents:
  - `docs/PROJECT-SUMMARY.md` - Polished overview for onboarding
  - `docs/reports/YYYY-MM-DD-project-summary-report.md` - Detailed discovery
    process

**Use cases:**

- Onboarding new team members or AI agents
- Quarterly project state assessments
- Pre-planning for major features
- Documentation health checks

---

### `/project-docs:project-recipe`

**Description:** Extract your project's structure and patterns as a reusable
recipe.

**Usage:**

```
/project-docs:project-recipe
```

**What it does:**

- Analyzes tooling, dependencies, and configuration
- Identifies architectural and organizational patterns
- Asks which domain-specific systems to include
- Generates `docs/PROJECT-RECIPE.md` with step-by-step setup instructions

**Use cases:**

- Creating templates for similar projects
- Documenting project setup for new developers
- Standardizing patterns across team projects
- Preserving successful architectures

---

### `/project-docs:update-deps`

**Description:** Automate dependency updates with testing and validation.

**Usage:**

```
/project-docs:update-deps
```

**What it does:**

- Detects package manager (npm/pnpm/yarn)
- Creates timestamped branch (`chore/deps-update-YYYYMMDD-HHMM`)
- Updates dependencies within semver ranges
- Runs tests, type checking, and builds
- Commits changes if all checks pass
- Stashes existing changes if needed

**Use cases:**

- Regular maintenance updates
- Pre-deployment dependency freshness checks
- Testing compatibility before major updates

**Safety features:**

- Stashes uncommitted work
- Stops on test/build failures
- Does not force operations
- Creates isolated branch

---

### `/project-docs:review-docs`

**Description:** Review and cleanup documentation status across proposals,
plans, investigations, and reports.

**Usage:**

```
/project-docs:review-docs
```

**What it does:**

- Scans documentation directories for active documents
- Investigates implementation status by searching codebase
- Updates document status markers
- Archives completed/abandoned documents
- Generates `docs/reports/YYYY-MM-DD-doc-status-report.md`

**Use cases:**

- Quarterly documentation audits
- Pre-planning to understand what's pending
- Housekeeping after major feature releases
- Identifying stale or obsolete documents

**Status categories:**

- **Completed** - Implemented and archived
- **Partially Completed** - Some aspects done, marked in document
- **Not Started** - Remains in active folder
- **Abandoned** - Archived with reasoning

---

### `/project-docs:create-project`

**Description:** Create a new project folder with a scaffolded proposal.

**Usage:**

```
/project-docs:create-project [project-name]
```

**Arguments:**

- `project-name` (optional) - Kebab-case name for the project folder (e.g.,
  `search-enhancement`). If omitted, you'll be asked.

**What it does:**

- Creates `docs/projects/<name>/` folder
- Scaffolds `proposal.md` from the project template
- Links to an investigation if one is referenced

**Use cases:**

- Starting a new feature or significant change
- Following up on a completed investigation
- Creating the project home for a body of work

---

### `/project-docs:generate-design-resolution`

**Description:** Resolve design ambiguity in a proposal through interactive Q&A.

**Usage:**

```
/project-docs:generate-design-resolution [project-name]
```

**Arguments:**

- `project-name` - Name of the project folder in `docs/projects/` (e.g.,
  `search-enhancement`)

**What it does:**

- Reads the project's proposal at `docs/projects/<name>/proposal.md`
- Analyzes the proposal for unresolved behavioral, structural, and architectural
  questions
- Conducts structured Q&A with the user, organized by design resolution sections
- Generates `docs/projects/<name>/design-resolution.md` with resolved decisions

**Use cases:**

- Proposal has unresolved system behavior questions
- New entities or state models need clarity before planning
- Architecture or cross-cutting concerns need resolution
- Preventing speculative assumptions in development plans
- Clarifying contracts for parallel agent execution

---

### `/project-docs:generate-dev-plan`

**Description:** Create a detailed development plan from a proposal document.

**Usage:**

```
/project-docs:generate-dev-plan [project-name]
```

**Arguments:**

- `project-name` - Name of the project folder in `docs/projects/` (e.g.,
  `search-enhancement`)

**What it does:**

- Reads the project's proposal at `docs/projects/<name>/proposal.md`
- Analyzes current codebase for relevant patterns
- Identifies implementation requirements
- Assesses complexity and risks
- Generates `docs/projects/<name>/plan.md` with:
  - Overview and approach
  - Current state analysis
  - Ordered implementation steps
  - Technical considerations
  - Testing strategy
  - Open questions

**Use cases:**

- Converting approved proposals into actionable plans
- Scoping feature work
- Identifying technical blockers early
- Creating implementation roadmaps

---

### `/project-docs:generate-test-plan`

**Description:** Generate a tiered test plan from a development plan and
proposal.

**Usage:**

```
/project-docs:generate-test-plan [project-name]
```

**Arguments:**

- `project-name` - Name of the project folder in `docs/projects/` (e.g.,
  `search-enhancement`)

**What it does:**

- Reads the project's plan, proposal, and design resolution (if present)
- Identifies testable surfaces from proposal goals and plan phases
- Applies three-tier prioritization (Smoke, Critical Path, Edge Cases)
- Surfaces external dependencies as prerequisites
- Generates `docs/projects/<name>/test-plan.md` with tiered verification
  scenarios

**Use cases:**

- Defining verification expectations before agent implementation
- Preparing for parallel worktree development
- Features with UI that need visual verification
- Closing the gap between "implementation complete" and "actually verified"

---

## Documentation Structure

This plugin is designed for projects using the documentation structure from
[project-docs-scaffold-template](https://github.com/ichabodcole/project-docs-scaffold-template):

```
docs/
├── projects/          # Co-located project folders (proposal + plan + sessions)
│   ├── TEMPLATES/     # Proposal, plan, and session templates
│   └── archive/       # Completed project folders
├── backlog/           # Small, self-contained work items
├── memories/          # Quick-reference summaries of recent work
├── reports/           # Generated assessments and analysis
├── investigations/    # Research and exploration documents
├── playbooks/         # Reusable implementation guides
├── architecture/      # System design documentation
├── specifications/    # Technology-agnostic behavior descriptions
├── interaction-design/ # User experience flow documentation
├── lessons-learned/   # Problem-solution documentation
└── fragments/         # Incomplete observations and breadcrumbs
```

## Requirements

- Claude Code
- Project using compatible documentation structure (or willing to adopt it)
- Git (for `update-deps` and status tracking)

## Best Practices

1. **Regular summaries** - Run `/project-docs:project-summary` monthly or before
   major planning sessions
2. **Pre-implementation planning** - Use `/project-docs:generate-dev-plan`
   before starting feature work. Use `/project-docs:generate-design-resolution`
   first when a proposal has unresolved system-level questions
3. **Periodic cleanup** - Run `/project-docs:review-docs` quarterly to maintain
   documentation health
4. **Dependency hygiene** - Schedule `/project-docs:update-deps` weekly or
   bi-weekly
5. **Recipe maintenance** - Update recipe when architecture changes
   significantly

## Version History

### 1.6.0 (2026-02-17)

- Renamed `proposal-to-plan` → `generate-dev-plan` (skill + command)
- Renamed `proposal-to-design-resolution` → `generate-design-resolution`
  (skill + command)
- Renamed `investigation-to-proposal` → `generate-proposal` (skill + command)
- Updated all cross-references to use new names
- WORKTREE_TASK template: added `generate-test-plan` step, user review gate

### 1.5.0 (2026-02-17)

- New `screenshot-optimization` skill for converting PNG screenshots to WebP
- Improved WORKTREE_TASK template: user plan review step, skill reference fix,
  flexible execution guidance

### 1.4.1 (2026-02-15)

- Fixed v2.3-to-v2.4 migration guide: step 5a now provides exact before/after
  ASCII art for flowchart update
- Updated `update-project-docs` skill to reference `migration-authoring`
  methodology for guide quality

### 1.4.0 (2026-02-15)

- Added `generate-test-plan` command, skill, and `test-plan-generator` agent
- New `TEST-PLAN.template.md` for tiered verification scenarios
- WORKTREE_TASK.md template now references test-plan.md
- finalize-branch command now checks for test plan results
- Updated lifecycle documentation across README, projects README, manifesto
- Design resolution template gains External Dependencies subsection
- `proposal-to-design-resolution` skill gains external dependencies Q&A
- `proposal-to-plan` skill gains external dependencies awareness

### 1.3.0 (2026-02-14)

- `parallel-worktree-dev` skill now bundles generic worktree scripts
- Scripts auto-discover gitignored `.env` files (no hardcoded paths)
- Removed project-specific references (`pnpm install`, etc.) from skill

### 1.2.0 (2026-02-13)

- Added `proposal-to-design-resolution` command and skill
- New `DESIGN-RESOLUTION.template.md` for project lifecycle
- `proposal-to-plan` now reads `design-resolution.md` when present

### 1.0.0 (2025-12-26)

- Initial plugin release
- Migrated 5 commands from cookiecutter template
- Commands: project-summary, project-recipe, update-deps, review-docs,
  proposal-to-plan

## License

MIT - See LICENSE

## Author

Created by Cole Reed

## Contributing

Issues and contributions welcome at the
[main repository](https://github.com/ichabodcole/project-docs-scaffold-template).
