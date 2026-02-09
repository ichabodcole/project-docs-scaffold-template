# Migration: v1 → v2

## Summary

The v2 structure replaces flat documentation directories (`proposals/`,
`plans/`, `sessions/`) with co-located **project folders** (`projects/<name>/`).
It also introduces two new directories: `backlog/` for small tasks and
`memories/` for quick-reference work summaries.

**Why this changed:** The flat structure scattered related documents across
three directories, making it hard to follow the full story of a feature. Project
folders keep everything together — proposal, plan, and sessions live side by
side and archive as a unit.

## What's New

| Directory             | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `projects/`           | Co-located project folders (proposal + plan + sessions) |
| `projects/TEMPLATES/` | Shared templates for proposals, plans, sessions         |
| `projects/archive/`   | Completed project folders                               |
| `backlog/`            | Small, self-contained work items                        |
| `memories/`           | Quick-reference summaries of recent work                |

## What Moved

| Before                    | After                                               |
| ------------------------- | --------------------------------------------------- |
| `proposals/<name>.md`     | `projects/<name>/proposal.md`                       |
| `plans/<name>.md`         | `projects/<name>/plan.md`                           |
| `sessions/<name>.md`      | `projects/<name>/sessions/<name>.md`                |
| `proposals/TEMPLATE*.md`  | `projects/TEMPLATES/PROPOSAL.template.md`           |
| `plans/TEMPLATE*.md`      | `projects/TEMPLATES/PLAN.template.md`               |
| `sessions/TEMPLATE*.md`   | `projects/TEMPLATES/YYYY-MM-DD-SESSION.template.md` |
| `proposals/archive/`      | `projects/archive/` (grouped by project)            |
| `plans/archive/`          | `projects/archive/` (merged into project folders)   |
| `sessions/archive/`       | `projects/archive/` (merged into project folders)   |
| `MEMORIES.md` (if exists) | `memories/` (individual files per entry)            |

## What's Removed

| Directory/File        | Reason                                            |
| --------------------- | ------------------------------------------------- |
| `proposals/`          | Replaced by `projects/<name>/proposal.md`         |
| `proposals/README.md` | Conventions now in `projects/README.md`           |
| `plans/`              | Replaced by `projects/<name>/plan.md`             |
| `plans/README.md`     | Conventions now in `projects/README.md`           |
| `sessions/`           | Replaced by `projects/<name>/sessions/`           |
| `sessions/README.md`  | Conventions now in `projects/README.md`           |
| `MEMORIES.md`         | Replaced by `memories/` directory (if applicable) |

## Step-by-Step Migration

### 1. Inventory existing documents

List what you have in the old structure:

```bash
ls docs/proposals/*.md 2>/dev/null | grep -v README | grep -v TEMPLATE
ls docs/plans/*.md 2>/dev/null | grep -v README | grep -v TEMPLATE
ls docs/sessions/*.md 2>/dev/null | grep -v README | grep -v TEMPLATE
```

Group them by project — which proposals, plans, and sessions belong together.
Look for matching names, cross-references, or shared topics.

### 2. Create new directories

```bash
mkdir -p docs/projects/TEMPLATES
mkdir -p docs/projects/archive
mkdir -p docs/backlog
mkdir -p docs/backlog/archive
mkdir -p docs/memories
```

### 3. Move templates

```bash
# Rename and move proposal template
cp docs/proposals/TEMPLATE*.md docs/projects/TEMPLATES/PROPOSAL.template.md

# Rename and move plan template
cp docs/plans/TEMPLATE*.md docs/projects/TEMPLATES/PLAN.template.md

# Rename and move session template
cp docs/sessions/TEMPLATE*.md docs/projects/TEMPLATES/YYYY-MM-DD-SESSION.template.md
```

Review each template after moving — update any path references that assumed the
old flat structure. In particular, cross-reference paths change depth (e.g.,
`../investigations/` becomes `../../investigations/`).

### 4. Create project folders and move documents

For each group of related documents:

```bash
# Example: a project called "milkdown-editor"
mkdir -p docs/projects/milkdown-editor/sessions

# Move proposal (strip date prefix, rename to proposal.md)
mv docs/proposals/2026-02-01-milkdown-editor-proposal.md \
   docs/projects/milkdown-editor/proposal.md

# Move plan (rename to plan.md)
mv docs/plans/milkdown-editor-plan.md \
   docs/projects/milkdown-editor/plan.md

# Move sessions (keep date prefixes on session files)
mv docs/sessions/2026-02-03-milkdown-initial-setup.md \
   docs/projects/milkdown-editor/sessions/
```

**Project folder naming:**

- Kebab-case, no date prefix: `milkdown-editor`, `auth-upgrade`
- Derive the name from the topic, not the old filename

**Proposal-only projects** (no plan or sessions yet): just create the folder
with `proposal.md`. Don't pre-create `sessions/` or `plan.md`.

**Orphaned sessions** (no matching proposal): create a minimal project folder,
or archive if purely historical.

### 5. Migrate archives

For each archived proposal/plan/session, group into project folders:

```bash
mkdir -p docs/projects/archive/old-feature
mv docs/proposals/archive/old-feature-proposal.md \
   docs/projects/archive/old-feature/proposal.md
mv docs/plans/archive/old-feature-plan.md \
   docs/projects/archive/old-feature/plan.md
```

Don't stress about perfection for old archives — grouping what you can is
sufficient.

### 6. Create README and template files for new directories

You need three new READMEs and two new templates. Copy these from the scaffold
template, or write them following these purposes:

**`docs/projects/README.md`** — Explains project folder conventions: when to
create a project, folder structure, naming, proposals, plans, sessions,
artifacts, archival. This is the most important new file — it replaces the three
old READMEs.

**`docs/backlog/README.md`** — Explains backlog items: small self-contained
tasks that don't warrant a project folder. Include a template reference.

**`docs/backlog/TEMPLATE.md`** — Simple template for backlog items.

**`docs/memories/README.md`** — Explains memories: short summaries for
onboarding context. When to create, naming convention, pruning guidance.

**`docs/memories/TEMPLATE.md`** — Short template: heading, date, 1-3 sentences,
key files, doc links.

The easiest approach: download the latest scaffold template and copy these files
from its `docs/` directory.

### 7. Convert MEMORIES.md (if applicable)

If a `MEMORIES.md` file exists (at project root or in docs/):

- Split each entry into a separate file in `docs/memories/`
- Name each: `YYYY-MM-DD-short-description.md`
- Delete the original `MEMORIES.md`

If no `MEMORIES.md` exists, skip this step.

### 8. Update cross-references

Search for and update all paths referencing the old structure:

```bash
# Find stale references
grep -rn "docs/proposals/" docs/ --include="*.md"
grep -rn "docs/plans/" docs/ --include="*.md"
grep -rn "docs/sessions/" docs/ --include="*.md"
grep -rn "\.\./proposals/" docs/ --include="*.md"
grep -rn "\.\./plans/" docs/ --include="*.md"
grep -rn "\.\./sessions/" docs/ --include="*.md"
```

**Common path transformations:**

| Old Path                                     | New Path                                       |
| -------------------------------------------- | ---------------------------------------------- |
| `docs/proposals/foo.md`                      | `docs/projects/foo/proposal.md`                |
| `docs/plans/foo.md`                          | `docs/projects/foo/plan.md`                    |
| `docs/sessions/2026-01-15-foo.md`            | `docs/projects/foo/sessions/2026-01-15-foo.md` |
| `../proposals/foo.md` (from investigations/) | `../projects/foo/proposal.md`                  |
| `../plans/foo.md` (from investigations/)     | `../projects/foo/plan.md`                      |

**Important depth change:** Documents inside project folders are one level
deeper than before. A proposal that was at `docs/proposals/foo.md` referencing
`../investigations/bar.md` now lives at `docs/projects/foo/proposal.md` and
needs `../../investigations/bar.md`.

**Also check:**

- `AGENTS.md` / `CLAUDE.md` at project root
- `docs/README.md` (documentation index)
- Architecture docs that reference the pipeline
- Plugin command/skill files (if using the project-docs plugin)

### 9. Update docs/README.md

Update the documentation index to reflect the new structure:

- Replace references to `proposals/`, `plans/`, `sessions/` as separate
  categories
- Add `projects/` section explaining project folders
- Add `backlog/` section
- Add `memories/` section
- Update any directory tree diagrams

Add the version frontmatter at the top of the file (before the `# Documentation`
heading):

```yaml
---
docs_version: "2.0.0" # x-release-please-version
docs_template: https://github.com/ichabodcole/project-docs-scaffold-template
---
```

The `x-release-please-version` annotation keeps the version in sync with the
scaffold template's package version automatically. The `docs_template` link
points to the source repository for updates and documentation.

### 10. Remove old directories

Only after everything is moved and references are updated:

```bash
# Remove old READMEs
rm -f docs/proposals/README.md
rm -f docs/plans/README.md
rm -f docs/sessions/README.md

# Remove old templates (already copied)
rm -f docs/proposals/TEMPLATE*.md
rm -f docs/plans/TEMPLATE*.md
rm -f docs/sessions/TEMPLATE*.md

# Remove empty archive directories
rmdir docs/proposals/archive 2>/dev/null
rmdir docs/plans/archive 2>/dev/null
rmdir docs/sessions/archive 2>/dev/null

# Remove empty directories
rmdir docs/proposals 2>/dev/null
rmdir docs/plans 2>/dev/null
rmdir docs/sessions 2>/dev/null
```

If `rmdir` fails, the directory isn't empty — check for files you missed.

## Verification

After completing the migration:

```bash
# Should return no results (ignoring archives and this migration doc)
grep -rn "docs/proposals/" . --include="*.md" | grep -v node_modules | grep -v migrations
grep -rn "docs/plans/" . --include="*.md" | grep -v node_modules | grep -v migrations
grep -rn "docs/sessions/" . --include="*.md" | grep -v node_modules | grep -v migrations

# Should show the new structure
ls docs/projects/
ls docs/backlog/
ls docs/memories/

# Version marker should be present
grep "docs_version" docs/README.md
```

## Checklist

- [ ] Inventoried all proposals, plans, and sessions
- [ ] Grouped related documents into project sets
- [ ] Created `docs/projects/`, `docs/projects/TEMPLATES/`,
      `docs/projects/archive/`
- [ ] Created `docs/backlog/` with README and template
- [ ] Created `docs/memories/` with README and template
- [ ] Moved templates to `docs/projects/TEMPLATES/`
- [ ] Created project folders and moved documents into them
- [ ] Handled orphaned sessions
- [ ] Migrated archived documents into project archive folders
- [ ] Converted `MEMORIES.md` to individual files (if applicable)
- [ ] Updated all cross-references in documentation
- [ ] Updated `docs/README.md` (structure sections + version frontmatter with
      `docs_version` and `docs_template`)
- [ ] Updated `AGENTS.md` / `CLAUDE.md` if they reference old paths
- [ ] Removed old empty directories (`proposals/`, `plans/`, `sessions/`)
- [ ] Verified no stale references remain
