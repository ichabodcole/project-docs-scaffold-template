<!--
USAGE: Copy this file to your project folder as `plan.md`.

This template helps you create a development roadmap - showing the route from current codebase to completed feature.
Focus on pivotal points: complex areas, significant changes, migration concerns, key validation gates.

Think "gas stations on a road trip" - highlight important stops and transitions, but don't give turn-by-turn directions.
The developer drives; you're providing the map and calling out where things get tricky.

Adapt sections freely. Not every plan needs all sections (e.g., many won't need Rollback Plans or Observability).
Ground your plan in the actual codebase - reference files, analyze current patterns, show the path forward.

For more guidance on plans, see the projects README: ../README.md
-->

# Migration Script Improvements Implementation Plan

**Created:** 2026-03-08 **Related Proposal:** [proposal.md](./proposal.md)
**Status:** Active

---

## Overview

This plan implements four targeted fixes to the `update-project-docs` skill's
migration scripts and documentation, addressing issues discovered during a real
v1.8.0 → v2.6.0 upgrade. The changes touch three layers: shell scripts in
`plugins/project-docs/skills/update-project-docs/migrations/scripts/`, migration
guide markdown files in the same `migrations/` folder, and the top-level skill
instructions in `SKILL.md`. All changes must also be applied to their identical
mirrors in `dist/`.

The scope is narrow and surgical — no new abstractions, no new files beyond the
existing structure, no architectural changes.

## Outcome & Success Criteria

**Definition of Done:** What must be true to call this complete?

- [ ] `rename_archive` falls back to `mv` when `git mv` fails (e.g., empty
      directory)
- [ ] `migrate-v2.5-to-v2.6.sh` dynamically discovers all `docs/*/archive/`
      directories instead of using 5 hardcoded paths
- [ ] `--scaffold-dir` examples in v2.0-to-v2.3.md, v2.3-to-v2.4.md, and
      v2.4-to-v2.5.md use `.scaffold-tmp/docs` (not
      `.scaffold-tmp/<project-name>/docs`)
- [ ] SKILL.md includes a "Running multiple migrations in sequence" section
      explaining scaffold lifecycle and backup strategy
- [ ] All script changes applied in both `plugins/` and `dist/` mirrors

**Non-Goals:**

- `--keep-scaffold` flag on migration scripts (deferred)
- Full orchestration script for end-to-end multi-hop migration (deferred)
- Fixing v1-to-v2.md path (that guide predates the current cookiecutter output
  pattern; leave for a future migration-authoring pass)

## Approach Summary

Four independent changes, each isolated to specific files. No change depends on
another — they can be implemented in any order and each can be validated
independently.

**Critical note on mirroring:** Every file under
`plugins/project-docs/skills/update-project-docs/` has an identical copy under
`dist/project-docs/skills/update-project-docs/`. Any change to a script or
markdown file in `plugins/` must be applied identically in `dist/`. The easiest
way is to make the change in `plugins/` first, then copy the file over:

```bash
cp plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh \
   dist/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh
```

## Phases

### Phase 1: Fix `rename_archive` git mv fallback

**Goal:** `rename_archive` succeeds on empty directories by falling back to
plain `mv` when `git mv` fails.

**Key Changes:**

- Modify:
  `plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh`
- Modify (mirror):
  `dist/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh`

Current code (lines 75–78):

```bash
if git rev-parse --git-dir > /dev/null 2>&1; then
  git mv "$old" "$new"
else
  mv "$old" "$new"
fi
```

Replace with:

```bash
if git rev-parse --git-dir > /dev/null 2>&1; then
  git mv "$old" "$new" 2>/dev/null || mv "$old" "$new"
else
  mv "$old" "$new"
fi
```

The `|| mv "$old" "$new"` fallback fires when `git mv` exits non-zero (empty
dir, untracked files, etc.).

**Validation:**

- [ ] Create an empty directory at `docs/test-section/archive`, run the script
      with `--dry-run` — confirm no error printed
- [ ] Run without `--dry-run` — confirm directory is renamed to
      `docs/test-section/_archive` and cleanup removes test dir
- [ ] Confirm `ok "Renamed..."` message appears (not just silent skip)

**Dependencies:** None

---

### Phase 2: Dynamic archive directory discovery

**Goal:** `migrate-v2.5-to-v2.6.sh` renames all `docs/*/archive/` directories,
not just the 5 hardcoded ones.

**Key Changes:**

- Modify:
  `plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh`
- Modify (mirror):
  `dist/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh`

Current code (lines 116–127):

```bash
ARCHIVE_DIRS=(
  "docs/backlog/archive"
  "docs/briefs/archive"
  "docs/investigations/archive"
  "docs/projects/archive"
  "docs/reports/archive"
)

for old in "${ARCHIVE_DIRS[@]}"; do
  new="${old/archive/_archive}"
  rename_archive "$old" "$new"
done
```

Replace with:

```bash
while IFS= read -r -d '' old; do
  new="${old/\/archive/\/_archive}"
  rename_archive "$old" "$new"
done < <(find docs -maxdepth 2 -type d -name "archive" -print0 2>/dev/null)
```

`-maxdepth 2` covers `docs/<section>/archive` (the only valid pattern).
`-print0` / `-d ''` handles paths with spaces. The parameter expansion
`${old/\/archive/\/_archive}` is identical in behavior to the original
`${old/archive/_archive}` but more precise (avoids matching "archive" inside a
directory name like `docs/archive-notes/archive` — though that's unlikely, being
explicit is safer).

**Validation:**

- [ ] Run with `--dry-run` on a project that has `docs/architecture/archive` —
      confirm it appears in the dry-run output
- [ ] Run without `--dry-run` — confirm all discovered `archive/` dirs are
      renamed to `_archive/`
- [ ] The 5 originally hardcoded dirs still rename correctly

**Dependencies:** None (can be done alongside Phase 1 — same file)

---

### Phase 3: Fix path examples in migration guide docs

**Goal:** `--scaffold-dir` examples in migration guides reference
`.scaffold-tmp/docs` (the actual cookiecutter output path) rather than
`.scaffold-tmp/<project-name>/docs`.

**Key Changes:**

- Modify:
  `plugins/project-docs/skills/update-project-docs/migrations/v2.0-to-v2.3.md`
- Modify:
  `plugins/project-docs/skills/update-project-docs/migrations/v2.3-to-v2.4.md`
- Modify:
  `plugins/project-docs/skills/update-project-docs/migrations/v2.4-to-v2.5.md`
- Modify (mirrors in `dist/`): all three of the above

In each guide, find the `--scaffold-dir` example block and replace
`.scaffold-tmp/<project-name>/docs` with `.scaffold-tmp/docs`. Example (from
v2.0-to-v2.3.md):

```bash
# Before
bash "${SKILL_DIR}/migrations/scripts/migrate-v2.0-to-v2.3.sh" \
  --scaffold-dir ".scaffold-tmp/<project-name>/docs" --dry-run

# After
bash "${SKILL_DIR}/migrations/scripts/migrate-v2.0-to-v2.3.sh" \
  --scaffold-dir ".scaffold-tmp/docs" --dry-run
```

Also update any prose that describes the scaffold path structure to match.

**Validation:**

- [ ] Grep for `<project-name>` in all three guides — zero matches remaining
- [ ] Grep for `.scaffold-tmp/docs` in all three guides — present in examples

**Dependencies:** None

---

### Phase 4: Add multi-hop migration guidance to SKILL.md

**Goal:** SKILL.md explains the scaffold lifecycle problem and gives a
recommended workflow for chaining multiple migrations.

**Key Changes:**

- Modify: `plugins/project-docs/skills/update-project-docs/SKILL.md`
- Modify (mirror): `dist/project-docs/skills/update-project-docs/SKILL.md`

Add a new subsection immediately after Step 3 ("Find Applicable Migrations") in
SKILL.md. The section should cover:

1. When running multiple migrations in sequence, scripts v2.0→v2.3, v2.3→v2.4,
   and v2.4→v2.5 each delete `.scaffold-tmp/` at the end
2. Each subsequent script that needs the scaffold must have it available
3. Recommended approach: back up the scaffold before running the first script

Suggested content:

````markdown
#### Running Multiple Migrations in Sequence

When upgrading across multiple versions (e.g., v1 → v2.6), be aware that the
migration scripts for v2.0→v2.3, v2.3→v2.4, and v2.4→v2.5 each delete
`.scaffold-tmp/` at the end of their run. If you need to run multiple of these
scripts in sequence, you must back up the scaffold before starting:

```bash
# Generate the scaffold once
cookiecutter gh:ichabodcole/project-docs-scaffold-template -o .scaffold-tmp

# Back it up before running any scripts
cp -r .scaffold-tmp /tmp/docs-scaffold-bak

# Run each migration, restoring the scaffold as needed
bash migrate-v2.0-to-v2.3.sh  # deletes .scaffold-tmp
cp -r /tmp/docs-scaffold-bak .scaffold-tmp
bash migrate-v2.3-to-v2.4.sh  # deletes .scaffold-tmp
cp -r /tmp/docs-scaffold-bak .scaffold-tmp
bash migrate-v2.4-to-v2.5.sh  # deletes .scaffold-tmp
bash migrate-v2.5-to-v2.6.sh  # no scaffold needed
```
````

The v2.5→v2.6 script does not need the scaffold (it only renames archive
directories), so no restoration is needed before running it.

````

**Validation:**

- [ ] SKILL.md contains a "Running Multiple Migrations in Sequence" heading
- [ ] Section mentions scaffold deletion and backup strategy
- [ ] Section includes the `cp -r` restore pattern

**Dependencies:** None

---

### Phase 5: Sync all changes to `dist/` mirrors

**Goal:** All modified files in `plugins/` are mirrored to `dist/`.

**Key Changes:**

Copy each modified file from `plugins/` to its `dist/` counterpart:

```bash
# Scripts
cp plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh \
   dist/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh

# Migration guides
cp plugins/project-docs/skills/update-project-docs/migrations/v2.0-to-v2.3.md \
   dist/project-docs/skills/update-project-docs/migrations/v2.0-to-v2.3.md

cp plugins/project-docs/skills/update-project-docs/migrations/v2.3-to-v2.4.md \
   dist/project-docs/skills/update-project-docs/migrations/v2.3-to-v2.4.md

cp plugins/project-docs/skills/update-project-docs/migrations/v2.4-to-v2.5.md \
   dist/project-docs/skills/update-project-docs/migrations/v2.4-to-v2.5.md

# Skill instructions
cp plugins/project-docs/skills/update-project-docs/SKILL.md \
   dist/project-docs/skills/update-project-docs/SKILL.md
````

**Validation:**

- [ ] `diff` each `plugins/` file against its `dist/` counterpart — zero
      differences

**Dependencies:** Phases 1–4 complete

## Key Risks & Mitigations

- **Dynamic find breaks on non-standard structures:** The
  `find docs -maxdepth 2 -type d -name "archive"` pattern assumes archive dirs
  live exactly one level under `docs/`. If a project has
  `docs/projects/<name>/archive/` (depth 3), those won't be found. Mitigation:
  `maxdepth 2` is intentional — the v2.6 convention only targets top-level doc
  type dirs; deeper archives are out of scope.
- **`git mv` fallback silently succeeds on partially-tracked dirs:** If a dir
  has some tracked and some untracked files, `git mv` may partially succeed
  before failing. The `|| mv` fallback would then try to move the already-moved
  tracked files. Mitigation: test on an empty dir (the known failure case);
  mixed-content dirs are unlikely in practice.

## Testing & Validation Strategy

All validation is manual since there is no test framework for shell scripts in
this codebase. For each phase:

1. **Dry-run first** — every script supports `--dry-run`; run it and read the
   output before applying
2. **Apply on a scratch copy** — if possible, test against a copy of a real
   project before applying to the real one
3. **Grep checks** — use grep to verify path examples are updated and no
   `<project-name>` placeholders remain

## Assumptions & Constraints

**Assumptions:**

- `plugins/` and `dist/` are kept in sync manually (no build step generates
  `dist/` from `plugins/`)
- `maxdepth 2` covers all valid `archive/` dir locations for v2.6 projects

**Constraints:**

- No new files — all changes are edits to existing files
- No new abstractions — keep scripts consistent with existing helpers (`run`,
  `ok`, `warn`, `step`, `sed_inplace`)
- `--keep-scaffold` flag is explicitly out of scope

## Open Questions

1. Is `plugins/` → `dist/` mirroring truly manual, or is there a build/sync
   script that should be used instead? Verify before Phase 5.
2. Should the `v1-to-v2.md` path example also be updated? The guide uses
   `.scaffold-tmp/<project-name>/docs` — it's possible that path was correct for
   the version of cookiecutter in use at that time.

---

**Related Documents:**

- [Proposal](./proposal.md)
- [Discovery](./artifacts/discovery.md)
- [Sessions](./sessions/) (created during implementation)
