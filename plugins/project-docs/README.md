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

Commands are explicit user actions invoked as `/project-docs:command-name`. For
workflow skills that the agent also surfaces automatically, see the
[Skills](#skills) section below.

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

## Skills

Skills are automatically surfaced by the agent when relevant, and can also be
invoked explicitly as `/project-docs:skill-name`. They provide richer guidance
than commands and are the primary way the plugin delivers its workflows.

### Project Lifecycle Skills

| Skill                        | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `create-project`             | Create project folder with proposal scaffold in docs/projects/     |
| `create-investigation`       | Create investigation from rough idea or voice note                 |
| `generate-proposal`          | Create project proposal from completed investigation               |
| `generate-design-resolution` | Resolve design ambiguity via structured Q&A before planning        |
| `generate-dev-plan`          | Create development plan from proposal in docs/projects/            |
| `generate-test-plan`         | Generate tiered verification scenarios from plan and proposal      |
| `finalize-branch`            | Code review, documentation, and merge workflow for completed work  |
| `review-docs`                | Orchestrate documentation review with parallel docs-curator agents |
| `parallel-worktree-dev`      | Orchestrate parallel development using git worktrees with handoffs |
| `dev-discovery`              | Pre-planning technical discovery for complex features              |
| `update-project-docs`        | Upgrade docs structure to newer scaffold template version          |

### Research & Analysis Skills

| Skill                       | Description                                                    |
| --------------------------- | -------------------------------------------------------------- |
| `investigation-methodology` | Systematic investigation framework for research and root cause |
| `evaluative-research`       | Evaluate options and make evidence-based decisions             |
| `tech-integration-research` | Rapid online research for technology integration patterns      |
| `gap-analysis`              | Identify what's missing from proposals or specifications       |
| `document-validation`       | Validate documentation against codebases                       |

### Specification & Design Skills

| Skill                      | Description                                    |
| -------------------------- | ---------------------------------------------- |
| `idea-to-spec`             | Develop an idea into a complete specification  |
| `generate-spec`            | Generate specifications from existing code     |
| `implementation-blueprint` | Prepare for implementation from specifications |

### Utility Skills

| Skill                     | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `screenshot-optimization` | Convert PNG screenshots to WebP for smaller repo size   |
| `mobile-test`             | Automate iOS simulator setup and app launch for testing |

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

### 1.7.1 (2026-02-20)

- `generate-dev-plan` now prompts user to assess test plan need after plan
  creation, with criteria for when to suggest vs skip
- `parallel-worktree-dev` cloud agent responsibilities and workflow diagram now
  include test plan assessment step
- WORKTREE_TASK template step 6 changed from unconditional test plan creation to
  conditional assessment

### 1.7.0 (2026-02-20)

- Consolidated 9 commands into skills — skills are now the primary delivery
  mechanism (auto-surfaced by agent + user-invocable)
- New `finalize-branch` skill (was command) with completion options (merge, PR,
  keep, discard) and common mistakes guidance ported from superpowers
- New `create-project` skill (was command) with triggers for investigation →
  proposal transitions
- Absorbed `start-worktree` command into `parallel-worktree-dev` skill
- Enriched `generate-dev-plan` skill with plan quality principles (bite-sized
  TDD tasks, exact file paths, complete code) and evolved plan philosophy
  (phases with pivotal points, "gas stations on a road trip")
- Enriched `review-docs` skill with status report generation template
- Improved routing descriptions for `generate-dev-plan`, `finalize-branch`,
  `parallel-worktree-dev`, `generate-proposal`, `create-investigation` — all now
  include "Use when" / "Triggers when" and explicit priority over generic skills
- 5 remaining commands: init-branch, project-manifesto, project-recipe,
  project-summary, update-deps
- Restructured plugin README with separate Commands and Skills sections

### 1.6.1 (2026-02-20)

- Worktree completion workflow: merge → smoke test → remove (prevents lost work)
- WORKTREE_TASK template records source branch ("Based on" field)
- create-worktree.sh substitutes base branch into task template

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
