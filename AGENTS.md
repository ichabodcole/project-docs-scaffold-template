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
  that gets generated, with READMEs explaining each subdirectory's purpose.
  Organized into permanent reference (architecture, specifications,
  interaction-design, playbooks, lessons-learned, fragments), discovery &
  assessment (reports, investigations), and work tracking (projects, backlog,
  \_archive, memories)
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

## Branch Landing Policy

Default to a single-commit squash for branches under ~20 commits. Two
exceptions, both narrow:

- **Commits cited by SHA in tracked docs.** A squash rewrites those SHAs and
  leaves the citation pointing at nothing. Merge or PR as-is.
- **More than one Anthill seat authored commits on this branch.** On an Anthill
  team each seat signs its own commits with an `Anthill-Seat:` trailer, and
  squashing collapses who-did-what into one message that can only credit one of
  them. Merge or PR as-is. Two or more distinct _human_ authors lose the same
  thing and count the same way.

The second exception is a fact about **the branch, not the project**. An Anthill
project where only one seat ended up committing squashes normally — what matters
is whether multiple seats actually authored commits in this range.

**`Co-Authored-By: Claude …` never counts toward it.** One human author plus one
AI co-author is a single identity for landing purposes, whichever model version
signed it: the squashed commit carries that same pairing forward, so nothing is
lost. A model change mid-branch (`Opus 4.8` → `Opus 5`) is not a second
contributor either. Without this carve-out the rule would fire on every branch
this repo produces, and the default above would be unreachable.

`finalize-branch` computes both checks before choosing a strategy.

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

The `.claude-plugin/marketplace.json` at the repo root is a discovery index that
defines which plugins are available for installation. It contains only plugin
names, source paths, and discovery metadata (category, tags). All authoritative
metadata (version, description, author) lives in each plugin's own
`.claude-plugin/plugin.json` — do not duplicate these fields in the marketplace.

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
