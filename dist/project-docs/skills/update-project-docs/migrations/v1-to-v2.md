# Migration: v1 → v2

## Summary

The v2 structure replaces flat documentation directories (`proposals/`,
`plans/`, `sessions/`) with co-located **project folders** (`projects/<name>/`).
It also introduces several new directories for document types that were added
between v1 and v2 but before versioning was established.

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
| `specifications/`     | Technology-agnostic application behavior descriptions   |
| `fragments/`          | Incomplete observations and open questions              |
| `interaction-design/` | User experience flow documentation                      |
| `reports/`            | Structured assessment and analysis reports              |

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

### 1. Generate v2 scaffold locally

Use cookiecutter to generate a fresh v2 documentation structure in a temporary
directory within your project. This gives you all the new READMEs, templates,
and directory structures locally — no need to fetch files from GitHub.

```bash
cookiecutter gh:ichabodcole/project-docs-scaffold-template -o .scaffold-tmp
```

This creates `.scaffold-tmp/<project-name>/docs/` with the complete v2
structure. You'll copy files from here throughout the migration.

**Tip:** Add `.scaffold-tmp/` to your `.gitignore` temporarily, or just remember
to delete it in the cleanup step.

### 2. Inventory existing documents

List what you have in the old structure:

```bash
ls docs/proposals/*.md 2>/dev/null | grep -v README | grep -v TEMPLATE
ls docs/plans/*.md 2>/dev/null | grep -v README | grep -v TEMPLATE
ls docs/sessions/*.md 2>/dev/null | grep -v README | grep -v TEMPLATE
```

Group them by project — which proposals, plans, and sessions belong together.
Look for matching names, cross-references, or shared topics.

### 3. Copy new directories and files from scaffold

Copy the new v2 directories (with their READMEs and templates) from the scaffold
into your `docs/` folder. Only copy directories that don't already exist in your
project:

```bash
SCAFFOLD=".scaffold-tmp/<project-name>/docs"

# Core v2 directories (always needed)
cp -r "$SCAFFOLD/projects" docs/projects
cp -r "$SCAFFOLD/backlog" docs/backlog
cp -r "$SCAFFOLD/memories" docs/memories

# New document types (copy if you don't already have them)
[ ! -d docs/specifications ] && cp -r "$SCAFFOLD/specifications" docs/specifications
[ ! -d docs/fragments ] && cp -r "$SCAFFOLD/fragments" docs/fragments
[ ! -d docs/interaction-design ] && cp -r "$SCAFFOLD/interaction-design" docs/interaction-design
[ ! -d docs/reports ] && cp -r "$SCAFFOLD/reports" docs/reports
```

This gives you all the correct READMEs, templates, and `.gitkeep` files without
having to write them from scratch.

**If directories already exist:** If you already have `specifications/`,
`fragments/`, etc. from a previous update, skip those — your existing content is
fine. You may want to compare your README against the scaffold's version to pick
up any convention changes.

**Naming collision note:** If your project already has a `docs/project/`
(singular) directory for product-level documents, it is unrelated to the new
`docs/projects/` (plural) directory. `docs/project/` typically contains product
direction or vision documents; `docs/projects/` contains co-located development
pipeline documents. Both can coexist.

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

**Orphaned sessions** (no matching proposal):

- **Many orphaned sessions from early development?** Group them under
  `docs/projects/archive/early-development/sessions/` rather than creating
  individual project folders. These are historical records, not active projects.
- **A few orphaned sessions on distinct topics?** Create individual project
  folders if the topic might become active again. Archive if purely historical.
- **Sessions spanning different topics?** Group by theme into a few archive
  buckets (e.g., `archive/early-ui-work/`, `archive/early-backend-work/`) rather
  than creating one project per session.

### 5. Migrate archives

**For small archives** (under ~50 files), group into project folders:

```bash
mkdir -p docs/projects/archive/old-feature
mv docs/proposals/archive/old-feature-proposal.md \
   docs/projects/archive/old-feature/proposal.md
mv docs/plans/archive/old-feature-plan.md \
   docs/projects/archive/old-feature/plan.md
```

Don't stress about perfection for old archives — grouping what you can is
sufficient.

**For large archives** (50+ files), use a bulk move instead of trying to
organize everything by project:

```bash
# Create a legacy archive bucket
mkdir -p docs/projects/archive/legacy-proposals
mkdir -p docs/projects/archive/legacy-plans
mkdir -p docs/projects/archive/legacy-sessions

# Bulk move all archived files
mv docs/proposals/archive/*.md docs/projects/archive/legacy-proposals/ 2>/dev/null
mv docs/plans/archive/*.md docs/projects/archive/legacy-plans/ 2>/dev/null
mv docs/sessions/archive/*.md docs/projects/archive/legacy-sessions/ 2>/dev/null
```

You can reorganize legacy archives into project folders later if needed, but
it's not required. The priority is getting active documents into the new
structure.

### 6. Convert MEMORIES.md (if applicable)

If a `MEMORIES.md` file exists (at project root or in docs/):

- Split each entry into a separate file in `docs/memories/`
- Name each: `YYYY-MM-DD-short-description.md`
- Delete the original `MEMORIES.md`

If no `MEMORIES.md` exists, skip this step.

### 7. Update cross-references

Search for and update all paths referencing the old structure. This step has
three parts: document content, template files, and root-level files.

**7a. Scan document content:**

```bash
# Find stale references in all docs
grep -rn "docs/proposals/" docs/ --include="*.md"
grep -rn "docs/plans/" docs/ --include="*.md"
grep -rn "docs/sessions/" docs/ --include="*.md"
grep -rn "\.\./proposals/" docs/ --include="*.md"
grep -rn "\.\./plans/" docs/ --include="*.md"
grep -rn "\.\./sessions/" docs/ --include="*.md"
```

**7b. Scan template files in non-migrated directories:**

Template files in directories that don't move (architecture, interaction-design,
lessons-learned, investigations) often contain relative paths to the old
structure. These are easy to miss but important — they seed broken links into
every new document created from the template.

```bash
# Find stale references in template files specifically
grep -rn "\.\./proposals/\|\.\./plans/\|\.\./sessions/" docs/ --include="TEMPLATE*"
grep -rn "\.\./proposals/\|\.\./plans/\|\.\./sessions/" docs/ --include="*TEMPLATE*"
```

Template path transformations:

| Old Template Path               | New Template Path                                   |
| ------------------------------- | --------------------------------------------------- |
| `../proposals/proposal-name.md` | `../projects/project-name/proposal.md`              |
| `../sessions/session-name.md`   | `../projects/project-name/sessions/session-name.md` |
| `../plans/plan-name.md`         | `../projects/project-name/plan.md`                  |

**7c. Scan root-level files:**

`AGENTS.md` and `CLAUDE.md` at the project root are read by AI tools and often
contain session creation instructions or path references. Check and update both:

```bash
grep -n "proposals/\|plans/\|sessions/" AGENTS.md CLAUDE.md docs/CLAUDE.md 2>/dev/null
```

Also check `docs/README.md` and any architecture docs that reference the
pipeline.

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

### 8. Audit .claude/ local overrides

If your project has local command, agent, or skill overrides in `.claude/`
(copied from the project-docs plugin), these likely reference the old directory
structure.

```bash
# Check for stale references in local overrides
grep -rn "proposals/" .claude/ --include="*.md" 2>/dev/null
grep -rn "plans/" .claude/ --include="*.md" 2>/dev/null
grep -rn "sessions/" .claude/ --include="*.md" 2>/dev/null
```

**If the project-docs plugin has been updated to v2:** Delete your local
overrides and let the plugin's updated versions take effect. Local copies in
`.claude/` override plugin files — stale local copies will prevent you from
getting the plugin's v2-aware commands and agents.

```bash
# Example: remove local overrides that the plugin now handles
# (only remove files you copied from the plugin, not custom files)
rm .claude/commands/finalize-branch.md    # if copied from plugin
rm .claude/agents/investigator.md         # if copied from plugin
```

**If you have custom (non-plugin) files in `.claude/`:** Update paths manually
using the same transformations from Step 7.

### 9. Update docs/README.md

Replace your existing `docs/README.md` with the scaffold's version, then
customize it:

```bash
cp "$SCAFFOLD/README.md" docs/README.md
```

Review the copied file and adjust:

- Remove sections for document types you don't use
- Add any project-specific guidance
- Verify the `docs_version` frontmatter is present at the top:

```yaml
---
docs_version: "2.0.0" # x-release-please-version
docs_template: https://github.com/ichabodcole/project-docs-scaffold-template
---
```

**Note:** Set the `docs_version` to match the scaffold template version you're
upgrading to.

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

# Remove .gitkeep files (these block rmdir)
git rm -f docs/proposals/archive/.gitkeep 2>/dev/null
git rm -f docs/plans/archive/.gitkeep 2>/dev/null
git rm -f docs/sessions/archive/.gitkeep 2>/dev/null
git rm -f docs/proposals/.gitkeep 2>/dev/null
git rm -f docs/plans/.gitkeep 2>/dev/null
git rm -f docs/sessions/.gitkeep 2>/dev/null

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

### 11. Clean up scaffold

Remove the temporary scaffold directory:

```bash
rm -rf .scaffold-tmp
```

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

# New document types should exist
ls docs/specifications/
ls docs/fragments/
ls docs/interaction-design/
ls docs/reports/

# Version marker should be present
grep "docs_version" docs/README.md

# No stale local overrides
grep -rn "proposals/\|plans/\|sessions/" .claude/ --include="*.md" 2>/dev/null
```

## Checklist

- [ ] Generated v2 scaffold locally via cookiecutter
- [ ] Inventoried all proposals, plans, and sessions
- [ ] Grouped related documents into project sets
- [ ] Copied new directories from scaffold (`projects/`, `backlog/`,
      `memories/`, `specifications/`, `fragments/`, `interaction-design/`,
      `reports/`)
- [ ] Created project folders and moved documents into them
- [ ] Handled orphaned sessions
- [ ] Migrated archived documents (grouped by project or bulk-moved to legacy)
- [ ] Converted `MEMORIES.md` to individual files (if applicable)
- [ ] Updated cross-references in document content
- [ ] Updated cross-references in template files (TEMPLATE*, *TEMPLATE\*)
- [ ] Updated `AGENTS.md` / `CLAUDE.md` / `docs/CLAUDE.md` for old paths
- [ ] Audited `.claude/` local overrides for stale paths
- [ ] Updated `docs/README.md` from scaffold (with version frontmatter)
- [ ] Removed old empty directories (`proposals/`, `plans/`, `sessions/`)
- [ ] Removed `.scaffold-tmp/` directory
- [ ] Verified no stale references remain
