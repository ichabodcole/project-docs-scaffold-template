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

- **project_name** - Human-readable project name (e.g., "My Awesome Project")
- **project_slug** - Directory/repo name (auto-generated from project_name)
- **project_description** - Brief description of the project
- **author_name** - Your name
- **year** - Current year (auto-filled)

### Example

```bash
$ cookiecutter gh:ichabodcole/project-docs-scaffold-template

project_name [My Project]: My Awesome Project
project_slug [my-awesome-project]:
project_description [A brief description of the project]: A revolutionary new app
author_name [Your Name]: Jane Doe
year [2025]:
```

This creates:

```
my-awesome-project/
├── docs/
│   ├── architecture/
│   ├── specifications/
│   ├── interaction-design/
│   ├── playbooks/
│   ├── lessons-learned/
│   ├── fragments/
│   ├── reports/
│   ├── investigations/
│   ├── projects/
│   │   └── TEMPLATES/
│   ├── backlog/
│   │   └── archive/
│   ├── memories/
│   ├── README.md
│   ├── CLAUDE.md
│   ├── AGENTS.md
│   └── PROJECT_MANIFESTO.md
└── README.md
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
- **`/docs/projects/archive`** — Completed project folders moved here when done
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

By default, Cookiecutter will **not overwrite** existing directories. If you try
to generate a project in a location that already exists, you'll get an error.

**Options:**

1. **Generate with a different name** - Use a different `project_slug` value
2. **Generate in a temp location and copy** - Generate the template elsewhere,
   then manually copy only the files/folders you need into your existing project
3. **Use `--overwrite-if-exists` flag** - Explicitly allow overwriting
   (Cookiecutter 2.0+):
   ```bash
   cookiecutter gh:ichabodcole/project-docs-scaffold-template --overwrite-if-exists
   ```

**Recommended approach for existing projects:** Generate in a temporary
location, review the generated files, then selectively copy what you need.

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
