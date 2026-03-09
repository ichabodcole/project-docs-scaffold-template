# Technical Discovery: Migration Script Improvements

**Date:** 2026-03-08 **Proposal:** [proposal.md](../proposal.md)

## Affected Systems

- Migration shell scripts
  (`plugins/project-docs/skills/update-project-docs/migrations/scripts/`)
- Migration guide markdown docs
  (`plugins/project-docs/skills/update-project-docs/migrations/`)
- Skill instructions
  (`plugins/project-docs/skills/update-project-docs/SKILL.md`)
- `dist/` mirrors of the above (identical copies, updated in sync)

## Architecture Documentation Status

| System                    | Doc Exists | Action Needed                               |
| ------------------------- | ---------- | ------------------------------------------- |
| Migration scripts         | No         | None — scope too narrow; plan is sufficient |
| update-project-docs skill | No         | None — out of scope                         |

## Explorer Findings

### Migration Scripts: Structure and Content

**Key Files:**

- `migrations/scripts/migrate-v2.0-to-v2.3.sh` (318 lines) — copies scaffold
  content, deletes `.scaffold-tmp`
- `migrations/scripts/migrate-v2.3-to-v2.4.sh` (310 lines) — copies scaffold
  content, deletes `.scaffold-tmp`
- `migrations/scripts/migrate-v2.4-to-v2.5.sh` (276 lines) — copies scaffold
  content, deletes `.scaffold-tmp`
- `migrations/scripts/migrate-v2.5-to-v2.6.sh` (237 lines) — archive renames
  only; no scaffold needed, no deletion

All scripts in `plugins/` are mirrored identically in `dist/`.

**`rename_archive` function** (only in `migrate-v2.5-to-v2.6.sh`, lines 63–80):

```bash
rename_archive() {
  local old="$1"
  local new="$2"
  if [ ! -d "$old" ]; then
    warn "Skipping $old (does not exist)"
    return
  fi
  if $DRY_RUN; then
    echo -e "  ${BLUE}[DRY RUN]${NC} rename $old → $new"
    return
  fi
  if git rev-parse --git-dir > /dev/null 2>&1; then
    git mv "$old" "$new"          # ← BUG: no fallback if git mv fails
  else
    mv "$old" "$new"
  fi
  ok "Renamed $old → $new"
}
```

**Bug:** `git mv` is called unconditionally when inside a git repo. If the
directory is empty (or contains only untracked files), `git mv` exits with
`fatal: source directory is empty`. There is no error handling — the script
continues with `ok "Renamed..."` even though the rename failed.

**Fix:** Wrap `git mv` in an `if` block that falls back to `mv` on non-zero
exit:

```bash
if git rev-parse --git-dir > /dev/null 2>&1; then
  git mv "$old" "$new" 2>/dev/null || mv "$old" "$new"
else
  mv "$old" "$new"
fi
```

---

**Hardcoded archive dirs** (`migrate-v2.5-to-v2.6.sh`, lines 116–127):

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

**Fix:** Replace array with dynamic discovery:

```bash
while IFS= read -r -d '' old; do
  new="${old/\/archive/\/_archive}"
  rename_archive "$old" "$new"
done < <(find docs -maxdepth 2 -type d -name "archive" -print0 2>/dev/null)
```

Scoped to `docs/` only, maxdepth 2 (matches `docs/<section>/archive`), safe for
projects with any number of doc type subdirs.

---

**`.scaffold-tmp` deletion** — present in 3 of 4 scripts:

| Script                  | Deletes `.scaffold-tmp`?    |
| ----------------------- | --------------------------- |
| migrate-v2.0-to-v2.3.sh | Yes (Step 5, lines 256–263) |
| migrate-v2.3-to-v2.4.sh | Yes (Step 5, lines 249–256) |
| migrate-v2.4-to-v2.5.sh | Yes (Step 5, lines 218–225) |
| migrate-v2.5-to-v2.6.sh | No (no scaffold needed)     |

Pattern is identical across all three:

```bash
if [ -d ".scaffold-tmp" ]; then
  run rm -rf .scaffold-tmp
fi
```

For a v1.8 → v2.6 migration, scripts v2.0→v2.3, v2.3→v2.4, and v2.4→v2.5 each
delete the scaffold. The user must regenerate or restore it before each
subsequent script that needs it.

---

### Migration Guide Docs: Path Example Issues

**Key Files:**

- `migrations/v2.0-to-v2.3.md` — uses `.scaffold-tmp/<project-name>/docs` in
  `--scaffold-dir` examples
- `migrations/v2.3-to-v2.4.md` — same issue
- `migrations/v2.4-to-v2.5.md` — same issue
- `migrations/v1-to-v2.md` — manual guide; uses correct
  `.scaffold-tmp/<project-name>/docs` path (cookiecutter used to produce a
  subfolder in v1 era — unclear if this was ever different)
- `migrations/v2.5-to-v2.6.md` — no `--scaffold-dir` usage (not needed for
  archive-rename-only migration)

**Affected example in all three guides (nearly identical):**

```bash
bash "${SKILL_DIR}/migrations/scripts/migrate-v2.0-to-v2.3.sh" \
  --scaffold-dir ".scaffold-tmp/<project-name>/docs" --dry-run
```

**Actual cookiecutter output:** `.scaffold-tmp/docs/` (no project subfolder).

**Fix:** Update `--scaffold-dir` examples in v2.0-to-v2.3.md, v2.3-to-v2.4.md,
and v2.4-to-v2.5.md to use `.scaffold-tmp/docs`.

---

### SKILL.md: Multi-Hop Guidance Gap

**Key section (SKILL.md, Step 3):**

```
Migrations must be applied in sequence — you can't skip versions.
Example: upgrading from v1 to v2.1 requires:
1. migrations/v1-to-v2.md
2. migrations/v2.0-to-v2.1.md (if it exists)
```

This covers the sequencing rule but says nothing about:

- The scaffold being deleted between script runs
- Needing to back up or regenerate `.scaffold-tmp` before starting a multi-hop
  migration
- Recommended workflow when chaining 3+ migrations

**Fix:** Add a "Running multiple migrations in sequence" section to SKILL.md
explaining the scaffold lifecycle and the backup strategy.

## Existing Patterns to Follow

1. **`run` helper for dry-run safety** — all mutations go through
   `run cmd args`, which prints `[DRY RUN] cmd args` when `$DRY_RUN=true`. Any
   new shell operations should use this.
2. **`ok` / `warn` / `step` for output** — consistent logging functions used
   throughout; new code should follow the same pattern.
3. **`sed_inplace` for cross-platform sed** — all `sed -i` calls go through this
   helper to handle macOS vs Linux differences.
4. **Mirroring `plugins/` → `dist/`** — changes to scripts in `plugins/` must
   also be applied identically in `dist/`.

## Integration Map

```
SKILL.md
  └── Upgrade Process (Steps 1–7)
        └── Step 4: Execute each migration
              ├── migrations/v1-to-v2.md         (manual, no script)
              ├── migrations/v2.0-to-v2.3.md     → migrate-v2.0-to-v2.3.sh
              ├── migrations/v2.3-to-v2.4.md     → migrate-v2.3-to-v2.4.sh
              ├── migrations/v2.4-to-v2.5.md     → migrate-v2.4-to-v2.5.sh
              └── migrations/v2.5-to-v2.6.md     → migrate-v2.5-to-v2.6.sh
                    └── rename_archive() [BUG: no empty-dir fallback]
                          └── ARCHIVE_DIRS array [BUG: 5 hardcoded paths]
```

## Open Questions

1. Should the path fix in migration guides also update the `v1-to-v2.md` guide,
   or is the `<project-name>` subfolder genuinely correct for that era of
   cookiecutter templates?
2. For the dynamic `find`-based archive discovery: `maxdepth 2` covers
   `docs/<section>/archive` — is there any case where archive dirs live deeper
   (e.g. `docs/projects/<name>/archive`)?

## Recommendations for Planner

1. **Fix `rename_archive` first** — it's a one-line change with clear correct
   behavior; low risk
2. **Dynamic archive discovery** — replace hardcoded array; scope to `docs/`
   maxdepth 2; verify with dry-run output
3. **Path example fixes** — simple sed-style replacement in 3 migration guide
   files; apply to both `plugins/` and `dist/` mirrors
4. **Multi-hop guidance** — add a new section to SKILL.md after the existing
   Step 3; keep it concise (3–5 bullet points + recommended backup command)
5. **Apply all changes to both `plugins/` and `dist/`** — both directories are
   identical mirrors; any script change must be made in both places
