# AGENTS.md

This file provides guidance to AI coding assistants when working with code in
this repository.

## Project Overview

This is a Cookiecutter template repository that generates standardized
documentation structures for software projects. The template itself lives in the
`{{cookiecutter.project_slug}}/` directory and uses Jinja2 templating with
Cookiecutter variable substitution.

## Key Architecture

### Template Structure

The template is organized with these key directories:

- `{{cookiecutter.project_slug}}/docs/` - Contains the documentation scaffold
  that gets generated, with READMEs explaining each subdirectory's purpose
  (reports, investigations, sessions, plans, proposals, playbooks, architecture,
  specifications, lessons-learned, fragments)
- `hooks/post_gen_project.py` - Python hook that runs after template generation
- `cookiecutter.json` - Template configuration defining user prompts and
  variables
- `plugins/project-docs/` - Claude Code plugin providing documentation
  management commands

### Variable Substitution

Cookiecutter uses `{{ cookiecutter.variable_name }}` syntax throughout template
files. Key variables:

- `project_name` - Human-readable project name
- `project_slug` - Directory-safe version (auto-generated from project_name)
- `project_description` - Brief project description
- `author_name` - Author's name

### Post-Generation Hook

The `hooks/post_gen_project.py` script provides user feedback about next steps,
including plugin installation instructions.

## Development Commands

### Formatting

```bash
npm run format        # Auto-format all markdown files with Prettier
npm run format:check  # Check markdown formatting without changes
```

### Git Workflow

- Pre-commit hook automatically runs `npm run format:check`
- Release Please workflow on `main` branch handles automated releases
- Use conventional commits (e.g., `feat:`, `fix:`, `chore:`) for automatic
  changelog generation

### Testing the Template

```bash
# Test template generation locally
cookiecutter .

# Test with overwrite
cookiecutter . --overwrite-if-exists
```

## Claude Code Plugins

This repository develops Claude Code plugins alongside the cookiecutter
template. Plugins live in the `plugins/` directory.

### project-docs Plugin

The main plugin at `plugins/project-docs/` provides documentation management
capabilities for projects that use the generated scaffold. It contains:

- **Commands** (`plugins/project-docs/commands/`) - User-invoked slash commands
  (e.g., `/project-docs:finalize-branch`, `/project-docs:project-summary`)
- **Agents** (`plugins/project-docs/agents/`) - Specialized sub-agents for
  autonomous tasks (e.g., `docs-curator`, `investigator`, `proposal-writer`)
- **Skills** (`plugins/project-docs/skills/`) - Auto-invoked capabilities that
  Claude uses when relevant (e.g., `generate-spec`, `document-validation`,
  `review-docs`)

The plugin manifest is at `plugins/project-docs/.claude-plugin/plugin.json`.

### Plugin Development Conventions

When working on plugin components:

- **Commands** use YAML frontmatter with `description` and `allowed_tools`;
  support `$1`, `$2` for arguments
- **Skills** use YAML frontmatter with `name` and `description`; the description
  controls when Claude auto-invokes the skill
- **Agents** use YAML frontmatter with `name`, `description`, and tool
  configuration
- Structure all components as detailed workflows with numbered steps
- See `plugins/project-docs/README.md` for full documentation

### Marketplace Configuration

The `.claude-plugin/marketplace.json` at the repo root defines which plugins are
available for installation. This is how end users discover and install the
plugins after generating a project from the template.

## File Structure Conventions

### Documentation READMEs

Each docs subdirectory has a README explaining:

- Purpose and use cases
- When to create documents
- File naming conventions
- Recommended document structure

### Template Files

- Use `_` prefix for directories that should become dotfiles (handled by
  post-gen hook)
- Keep template files minimal and focused on structure over content
- Include helpful READMEs that explain the "why" and "how"

## Release Management

- Uses Release Please for automated versioning
- Version tracked in `.release-please-manifest.json`
- Changelog auto-generated in `CHANGELOG.md`
- Releases trigger on merge to `main` branch

## Important Notes

- This is a template repository - changes here affect what gets generated for
  users
- Test template changes locally with `cookiecutter .` before committing
- Markdown must pass Prettier formatting checks before commit
- The generated documentation structure is designed to work well with AI
  assistants (Claude Code, Cursor)
- Use Jinja2 conditionals (`{% if cookiecutter.variable %}`) for optional
  features
