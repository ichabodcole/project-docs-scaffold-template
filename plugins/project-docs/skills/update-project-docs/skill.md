---
name: update-project-docs
description:
  Upgrade a project's documentation structure to a newer version of the
  project-docs scaffold template
---

# Update Project Docs

Orchestrate the upgrade of a project's documentation structure when the
project-docs scaffold template has released structural changes.

## When to Use

Activate when:

- User mentions upgrading their docs structure
- User says they downloaded a new version of the scaffold template
- User asks to migrate or update their documentation layout
- A version mismatch is detected between the project and the template

## How Versioning Works

The docs structure version is tracked in `docs/README.md` frontmatter:

```yaml
---
docs_version: "2.0.0" # x-release-please-version
docs_template: https://github.com/ichabodcole/project-docs-scaffold-template
---
```

This version is kept in sync with the scaffold template's package version by
release-please. The `x-release-please-version` annotation tells release-please
to update this line automatically when a new version is released.

**How to read the version:**

- No `docs_version` frontmatter → **pre-2.0** (original flat structure)
- `docs_version: "X.Y.Z"` → matches the scaffold template release version

**What triggers a version bump (with a migration guide):**

- New documentation category added (e.g., `backlog/`, `memories/`)
- Structural reorganization (e.g., flat dirs → project folders)
- Template content changes that affect how documents are created
- README convention changes that affect document lifecycle

Not every version bump requires a migration. Minor and patch releases that don't
change structure won't have a migration file — only major structural changes do.

**What does NOT trigger a version bump:**

- Prose fixes in READMEs
- Minor template wording adjustments
- Plugin-only changes (commands, skills, agents)

## Upgrade Process

### Step 1: Detect Current Version

Check the project's `docs/README.md` for the version marker:

```bash
grep "docs_version" docs/README.md
```

If no version marker exists, the project is on **v1** (the original flat
structure with `proposals/`, `plans/`, `sessions/`).

### Step 2: Identify Target Version

Check the latest version available. The target is typically the version in the
scaffold template you're upgrading to. Migration files in this skill document
each version transition.

### Step 3: Find Applicable Migrations

Look in this skill's `migrations/` folder for each version step between current
and target. Migrations must be applied **in sequence** — you can't skip
versions.

Example: upgrading from v1 to v2.1 requires:

1. `migrations/v1-to-v2.md`
2. `migrations/v2.0-to-v2.1.md` (if it exists)

### Step 4: Execute Each Migration

For each migration file:

1. Read the migration guide
2. Follow its steps in order
3. Verify the checklist at the end
4. Move to the next migration

### Step 5: Update Version Marker

After all migrations are applied, update the version comment in `docs/README.md`
to reflect the new version.

### Step 6: Verify

Run a final check that no stale references to old structure remain:

```bash
# Check for references specific to the migration
# (each migration file lists what to grep for)
```

## Available Migrations

| Migration                                                | From    | To    | Summary                                                                                               |
| -------------------------------------------------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------- |
| [migrations/v1-to-v2.md](migrations/v1-to-v2.md)         | pre-2.0 | 2.0.0 | Flat dirs → project folders, add backlog/memories/specifications/fragments/interaction-design/reports |
| [migrations/v2.0-to-v2.3.md](migrations/v2.0-to-v2.3.md) | 2.0–2.2 | 2.3.0 | Add design resolution and handoff templates, update READMEs with new pipeline stage                   |
| [migrations/v2.3-to-v2.4.md](migrations/v2.3-to-v2.4.md) | 2.3     | 2.4.0 | Add test plan template, external dependencies in DR template, update lifecycle across docs            |

## Creating New Migration Guides

When the scaffold template releases structural changes:

1. Create a new migration file: `migrations/vX-to-vY.md`
2. Use the `migration-authoring` skill to ensure every step is agent-executable
3. Run the quality checklist before finalizing
4. Update the table above
5. The version in `docs/README.md` is bumped automatically by release-please

**Migration file structure:**

```markdown
# Migration: vX → vY

## Summary

[What changed and why]

## What's New

[New directories, files, or conventions]

## What Moved

[Files or directories that changed location]

## What's Removed

[Directories or files no longer used]

## Step-by-Step Migration

[Ordered steps to perform the upgrade]

## Cross-Reference Updates

[Paths that change and need updating]

## Verification

[How to confirm the migration succeeded]

## Checklist

[Checkbox list of all migration actions]
```
