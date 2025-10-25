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
- Optional Claude Code and Cursor IDE configurations
- Supports both project-specific and cross-project documentation patterns

## What This Template Provides

This template creates a complete documentation structure for your project,
including:

- **Structured documentation folders** for sessions, plans, proposals,
  playbooks, architecture, and lessons learned
- **README files** in each folder explaining purpose and best practices
- **CLAUDE.md** template with project context for AI assistants (in docs/)
- **Optional AI CLI configurations** (.claude/commands/) for custom Claude Code
  commands
- **Optional Cursor IDE configurations** (.cursor/rules/) for custom Cursor
  commands
- **Optional global-docs folder** for cross-project documentation like playbooks
- **Project README** template with standard sections

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
- **include_ai_commands** - Include .claude/ directory? (y/n, default: y)
- **include_cursor_rules** - Include .cursor/ directory? (y/n, default: y)
- **include_global_docs** - Include global-docs/ directory? (y/n, default: y)

### Example

```bash
$ cookiecutter gh:ichabodcole/project-docs-scaffold-template

project_name [My Project]: My Awesome Project
project_slug [my-awesome-project]:
project_description [A brief description of the project]: A revolutionary new app
author_name [Your Name]: Jane Doe
year [2025]:
include_ai_commands [y]:
include_cursor_rules [n]:
include_global_docs [y]:
```

This creates:

```
my-awesome-project/
├── docs/
│   ├── sessions/README.md
│   ├── plans/README.md
│   ├── proposals/README.md
│   ├── playbooks/README.md
│   ├── architecture/README.md
│   ├── lessons-learned/README.md
│   ├── README.md
│   ├── CLAUDE.md
│   └── AGENTS.md
├── global-docs/
│   └── playbooks/
│       └── README.md
├── .claude/
│   └── commands/
│       └── plan-proposal.md
└── README.md
```

## Documentation Structure

### `/docs/sessions`

Chronological records of focused work sessions. Use for tracking progress,
debugging, and resuming work.

### `/docs/plans`

Development plans that translate proposals into actionable roadmaps with phases
and acceptance criteria.

### `/docs/proposals`

Feature proposals and design ideas exploring the "why" and "what" before
implementation.

### `/docs/playbooks`

Reusable implementation guides for recurring patterns (migrations, integrations,
refactors).

### `/docs/architecture`

System design documentation, architectural decisions, and technical
specifications.

### `/docs/lessons-learned`

Specific problems encountered and their solutions, preserving hard-won
knowledge.

### `/global-docs` (optional)

Cross-project documentation that can be referenced across multiple projects.
Currently includes a `playbooks/` subdirectory for organization-wide or personal
development patterns. This is separate from project-specific `docs/` and is
intended for documentation that spans multiple repositories.

## Customization

After generating your project:

1. **Update docs/CLAUDE.md** with project-specific details, commands, and
   conventions
2. **Customize README.md** with actual installation and development instructions
3. **Review docs/README.md** and subfolder READMEs - they're ready to use but
   can be adapted
4. **Add custom Claude Code commands** in `.claude/commands/` (if included)
5. **Add custom Cursor commands** in `.cursor/commands/` (if included)
6. **Add global playbooks** in `global-docs/playbooks/` (if included)

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

## Global Playbooks

This template references global playbooks stored in `~/.code-docs/playbooks/`
(your home directory). This is an optional setup for playbooks that apply across
multiple projects.

**To set up global playbooks:**

```bash
mkdir -p ~/.code-docs/playbooks
```

You can then create reusable playbooks in this directory that are referenced
from any project generated with this template. This is useful for
organization-wide or personal development patterns that span multiple projects.

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
