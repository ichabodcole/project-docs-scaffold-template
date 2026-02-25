# Project Documentation Scaffold Template

A [Cookiecutter](https://github.com/cookiecutter/cookiecutter) template that
instantly generates a complete, standardized documentation structure for
software projects.

## Why Use This?

Instead of creating documentation folders ad-hoc or copy-pasting from old
projects, get a battle-tested, consistent structure in seconds. Perfect for
developers and teams who want organized, AI-assistant-friendly documentation
without building the structure from scratch each time.

**Key benefits:**

- Pre-organized folders with best practices built in
- AI-ready with CLAUDE.md context templates
- Works seamlessly with the project-docs Claude Code plugin
- Structured for effective AI-assisted development workflows

## What This Template Provides

This template creates a complete documentation structure for your project,
including:

- **Structured documentation folders** organized by purpose: permanent reference
  (architecture, specifications, playbooks, etc.), discovery & assessment
  (investigations, reports), and work tracking (projects, backlog)
- **README files** in each folder explaining purpose and best practices
- **Template files** for quick-start document creation, including project-scoped
  templates for proposals, plans, and sessions
- **memories/** folder for quick onboarding context about recent work
- **CLAUDE.md** template with project context for AI assistants (in docs/)
- **AGENTS.md** guidance file for AI coding assistants
- **Project README** template with standard sections

## Claude Code Plugin

This template is designed to work with the **project-docs** Claude Code plugin,
which provides commands and skills for managing your documentation structure:

**Commands** (explicit user actions):

- `/project-docs:project-summary` - Generate comprehensive project state
  analysis
- `/project-docs:project-recipe` - Extract reusable project patterns
- `/project-docs:update-deps` - Automated dependency management

**Skills** (auto-surfaced by agent + user-invocable):

- `/project-docs:create-project` - Scaffold a new project folder with proposal
- `/project-docs:generate-dev-plan` - Create development plan from proposal
- `/project-docs:generate-design-resolution` - Resolve design ambiguity via Q&A
- `/project-docs:generate-test-plan` - Generate tiered verification scenarios
- `/project-docs:finalize-branch` - Code review, documentation, and merge
  workflow
- `/project-docs:review-docs` - Documentation health checks with parallel agents
- `/project-docs:parallel-worktree-dev` - Orchestrate parallel worktree
  development

**Installation:**

```bash
# Add this repository as a marketplace
/plugin marketplace add ichabodcole/project-docs-scaffold-template

# Install the project-docs plugin
/plugin install project-docs
```

See [plugins/project-docs/README.md](plugins/project-docs/README.md) for
detailed documentation on each command.

## Cross-Agent Skills (OpenCode, Codex, Crush, Cursor, etc.)

The skills from this project follow the [Agent Skills](https://agentskills.io)
open standard and work with any tool that supports SKILL.md files. Pre-built
distribution packages are available in the [`dist/`](dist/) directory.

**OpenPackage (recommended):**

```bash
opkg install gh@ichabodcole/project-docs-scaffold-template/dist/project-docs
```

**Direct clone:**

```bash
git clone https://github.com/ichabodcole/project-docs-scaffold-template.git
```

Then point your tool's skills path at `dist/<plugin>/skills/`. See each plugin's
dist README for tool-specific configuration examples.

| Package                                   | Skills | Description                      |
| ----------------------------------------- | ------ | -------------------------------- |
| [`dist/project-docs`](dist/project-docs/) | 22     | Documentation workflow skills    |
| [`dist/recipes`](dist/recipes/)           | 14     | Implementation recipe blueprints |
| [`dist/operator`](dist/operator/)         | 2      | Operator document triage skills  |

> **Note:** Agents and commands are Claude Code-specific. Other tools will load
> only the skills.

## Installation

First, ensure you have Cookiecutter installed:

```bash
pip install cookiecutter
```

## Usage

Generate a new project documentation structure:

```bash
cookiecutter gh:ichabodcole/project-docs-scaffold-template
```

You'll be prompted to provide:

1. **install_target** - Where to install the docs:
   - "Current directory (existing project)" — installs `docs/` directly into
     your current directory
   - "New project folder" — creates a new folder with `docs/` inside it
2. **project_name** - Human-readable project name (e.g., "My Awesome Project")
3. **project_slug** - Directory/repo name (auto-generated from project_name,
   only used for "New project folder" installs)

### Example: Adding to an Existing Project

```bash
$ cd my-existing-project
$ cookiecutter gh:ichabodcole/project-docs-scaffold-template

Select install_target:
    1 - Current directory (existing project)
    2 - New project folder
    Choose from 1, 2 [1]: 1
project_name [My Project]: My Existing Project
project_slug [my-existing-project]:

✅ Documentation structure installed into current directory!
📂 Location: ./docs/
```

### Example: New Project

```bash
$ cookiecutter gh:ichabodcole/project-docs-scaffold-template

Select install_target:
    1 - Current directory (existing project)
    2 - New project folder
    Choose from 1, 2 [1]: 2
project_name [My Project]: My Awesome Project
project_slug [my-awesome-project]:

✅ Project documentation structure created successfully!
📂 Location: ./my-awesome-project
```

### Generated Structure

```
docs/
├── architecture/
├── specifications/
├── interaction-design/
├── playbooks/
├── lessons-learned/
├── fragments/
├── briefs/
│   └── TEMPLATES/
├── reports/
├── investigations/
├── projects/
│   └── TEMPLATES/
├── backlog/
│   └── _archive/
├── memories/
├── README.md
├── CLAUDE.md
├── AGENTS.md
└── PROJECT_MANIFESTO.md
```

## Documentation Structure

### Permanent Reference

Living documents that evolve over time — not tied to a specific body of work.

- **`/docs/architecture`** — System design documentation, architectural
  decisions, and how major pieces fit together
- **`/docs/specifications`** — Technology-agnostic descriptions of what the
  application does, organized by domain. Portable enough to rebuild in any stack
- **`/docs/interaction-design`** — User experience flows documenting how users
  interact with features and subsystems
- **`/docs/playbooks`** — Reusable implementation guides for recurring patterns
  (migrations, integrations, refactors)
- **`/docs/lessons-learned`** — Specific problems encountered and their
  solutions, preserving hard-won knowledge
- **`/docs/fragments`** — Incomplete observations and "something doesn't feel
  right" moments captured for later consideration

### Discovery & Assessment

Cross-cutting documents that precede and follow projects.

- **`/docs/reports`** — Structured assessments of current state (code quality,
  security, documentation status). Serve as discovery mechanisms that can
  trigger investigations or projects
- **`/docs/investigations`** — Research documents that explore questions before
  committing to action. Determine whether a project is warranted

### Work Tracking

- **`/docs/projects`** — Co-located pipeline documents for defined bodies of
  work. Each project folder contains its proposal, design resolution (optional),
  plan, sessions, and artifacts together
- **`/docs/backlog`** — Small, self-contained work items (bugs, minor refactors,
  papercuts) that don't warrant a full project
- **`/docs/projects/_archive`** — Completed project folders moved here when done
- **`/docs/memories`** — Summaries of recent work for quick onboarding at the
  start of new sessions

## Customization

After generating your project:

1. **Update docs/CLAUDE.md** with project-specific details, commands, and
   conventions
2. **Customize README.md** with actual installation and development instructions
3. **Review docs/README.md** and subfolder READMEs - they're ready to use but
   can be adapted
4. **Install the project-docs plugin** to leverage documentation management
   commands

## Adding to Existing Projects

Select "Current directory (existing project)" when prompted. This installs
`docs/` directly into your current working directory without creating a parent
folder.

If a `docs/` directory already exists, the installer will abort and leave your
files untouched — you can then manually merge from the generated output.

## Requirements

- Python 3.6+
- Cookiecutter

## License

MIT

## Author

Created by {{cookiecutter.author_name}}

## Contributing

Issues and pull requests welcome at
https://github.com/ichabodcole/project-docs-scaffold-template
