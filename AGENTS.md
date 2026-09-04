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
  cycles, \_archive, memories). Also carries the frontmatter layer:
  `docs/SCHEMA.md` (the contract), `docs/index.md` (the catalog, seeded empty),
  `docs/cycles/`, and `docs/lint.ts`
- `{{cookiecutter.project_slug}}/scripts/docs-lint/` - The lint's portable core
  (`index.ts`, `config.ts`, `unlinted-links.ts`, `index.test.ts`), copied rather
  than shared as a package — three repositories are still discovering what this
  tool should be, and a package would freeze that early
- `{{cookiecutter.project_slug}}/.project-docs.json`, `package.json`,
  `tsconfig.json` - Root config for a generated project. The `package.json` and
  `tsconfig.json` ship only in the new-folder install; an existing project keeps
  its own, and the hook prints the four scripts to add
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

It has two branches. **New project folder** leaves the whole payload in place.
**Current directory (existing project)** moves `docs/`, `scripts/docs-lint/` and
`.project-docs.json` up into the existing repository and deletes the rest —
deliberately including `package.json` and `tsconfig.json`, which an existing
project already has and which are not worth overwriting to install a doc lint.
Their four scripts get printed instead. Anything that would collide is left
alone with a warning rather than replaced.

Note that `--no-input` selects the **first** `install_target` choice, which is
the current-directory branch. Generating a reference copy of the payload means
passing `install_target="New project folder"` explicitly.

`bun test` runs 6 files, one of which is the payload's own copy of
`scripts/docs-lint/index.test.ts`. That is duplication — the mirror check
guarantees it is byte-identical to this repo's copy — but it is the only thing
that proves the shipped copy actually executes from where it will sit in a
generated project, so it stays.

### The Mirror Check

`scripts/check-mirror.sh` (`npm run check:mirror`, part of `npm run check`)
compares every payload document against this repository's own copy. It compares
them **normalized** — both sides piped through Prettier — because
`.prettierignore` excludes the payload by design, so `npm run format` reflows
one side and not the other. Those wrapping differences are expected and mean
nothing; a changed sentence means everything, and a byte comparison cannot tell
them apart. The `.ts` files are compared byte for byte, since Prettier's scope
here is `**/*.md` and code has no excuse to differ at all.

Two files are exempt, listed in the script with their reasons:
`docs/PROJECT_MANIFESTO.md` and `docs/index.md` are structurally mirrored but
their content differs by design — this repository's are filled in, the payload's
are the empty forms a new project fills. Adding to that list is a decision, not
a convenience: every entry is a place the two copies can drift silently.

## Development Commands

### Formatting

```bash
npm run format        # Auto-format all markdown files with Prettier
npm run format:check  # Check markdown formatting without changes
```

### Documentation Lint

Every document under `docs/` carries an OKF frontmatter block, and
[docs/SCHEMA.md](./docs/SCHEMA.md) is the contract for it — which fields, which
vocabularies per type, and what the two lint tiers check. Read it before
creating or editing a document. [docs/index.md](./docs/index.md) is the catalog
every library page must appear in; `.project-docs.json` at the root configures
the lint.

```bash
npm run check         # The gate: format:check + docs:lint + check:mirror + test
npm run check:mirror  # Payload and docs/ agree, normalized through Prettier
npm run docs:lint     # Frontmatter, links, anchors and the document graph
npm run docs:graph    # The same walk, emitted as JSON
npm run docs:report   # Worklist of documents missing required fields
npm run typecheck     # tsc --noEmit over docs/*.ts and scripts/*.ts
npm test              # bun test
```

### Two Runtimes, One Gate

This repo runs **Node (via pnpm)** for Prettier, Husky and Slidev, **Python (via
uv)** for the skill-validation script, and **Bun** for the documentation lint
under `docs/*.ts` and `scripts/docs-lint/`. The split is deliberate: the lint is
zero-dependency TypeScript that Bun executes directly, with no build step and no
Node type-stripping flags to keep current.

`pnpm-lock.yaml` is the lockfile — `packageManager` in `package.json` pins the
version, and `pnpm install --frozen-lockfile` is what CI runs. Do not
`npm install` here; it produces a mixed `node_modules` that pnpm then refuses to
install over. Bun is used only to _run_ `.ts` files, never to install.

`npm run check` is the single entry point for both the pre-commit hook and CI,
so there is one definition of "checked".

### Git Workflow

- Pre-commit hook automatically runs `npm run check`
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

Default to a single-commit squash, at any commit count. Split into chapters only
when each one builds and delivers value on its own; a high commit count is a
reason to ask that question, not an answer to it. Two exceptions, both narrow:

- **Commits cited by SHA in tracked markdown.** A squash rewrites those SHAs and
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
