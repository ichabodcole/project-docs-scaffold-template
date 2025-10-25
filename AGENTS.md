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
  (sessions, plans, proposals, playbooks, architecture, lessons-learned)
- `{{cookiecutter.project_slug}}/_claude/` - Template for Claude Code custom
  commands (renamed to `.claude/` post-generation)
- `{{cookiecutter.project_slug}}/_cursor/` - Template for Cursor IDE rules
  (renamed to `.cursor/` post-generation)
- `{{cookiecutter.project_slug}}/global-docs/` - Optional cross-project
  documentation structure
- `hooks/post_gen_project.py` - Python hook that runs after template generation
  to rename directories and conditionally remove optional features
- `cookiecutter.json` - Template configuration defining user prompts and
  variables

### Variable Substitution

Cookiecutter uses `{{ cookiecutter.variable_name }}` syntax throughout template
files. Key variables:

- `project_name` - Human-readable project name
- `project_slug` - Directory-safe version (auto-generated from project_name)
- `project_description` - Brief project description
- `author_name` - Author's name
- `include_ai_commands`, `include_cursor_rules`, `include_global_docs`,
  `include_braindump_docs` - Boolean flags for optional features

### Post-Generation Hook

The `hooks/post_gen_project.py` script:

1. Renames `_claude` → `.claude` and `_cursor` → `.cursor` (underscore prefix
   prevents Cookiecutter from treating them as template directories)
2. Conditionally removes `.claude/`, `.cursor/`, `global-docs/`, or
   `docs/BRAINDUMP.md` based on user preferences
3. Provides user feedback about next steps

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

## Custom AI Commands

The template includes two custom Claude Code commands in
`{{cookiecutter.project_slug}}/_claude/commands/`:

1. **plan-proposal.md** - Reads a proposal from `docs/proposals/` and generates
   a comprehensive implementation plan in `docs/plans/`
2. **update-deps.md** - Automates dependency updates with git branching,
   testing, and verification

When modifying these commands:

- Follow the YAML frontmatter format with `description` and `allowed_tools`
- Use `$1` for command arguments (e.g., proposal filename)
- Structure as detailed workflows with numbered steps
- Include error handling and validation steps

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

## Optional Features

### Braindump Integration

The template includes optional Braindump integration via
`include_braindump_docs`:

- **BRAINDUMP.md** - Comprehensive guide to using Braindump as an intake layer
  for documentation
- **Conditional sections** in `AGENTS.md` and `docs/README.md` using Jinja2
  `{% if cookiecutter.include_braindump_docs == 'y' %}` blocks
- **Post-generation cleanup** - Hook removes BRAINDUMP.md if not requested

Braindump is a quick-capture application for messy thoughts that feeds into
formal documentation workflows (investigations → proposals → plans).

## Important Notes

- This is a template repository - changes here affect what gets generated for
  users
- Test template changes locally with `cookiecutter .` before committing
- Markdown must pass Prettier formatting checks before commit
- The generated documentation structure is designed to work well with AI
  assistants (Claude Code, Cursor)
- Use Jinja2 conditionals (`{% if cookiecutter.variable %}`) for optional
  features
