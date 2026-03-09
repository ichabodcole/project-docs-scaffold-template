# Fixed update-project-docs migration script issues

**Date:** 2026-03-08

Fixed four issues in the `update-project-docs` migration scripts discovered
during a real v1.8.0 → v2.6.0 upgrade: `rename_archive` now falls back to `mv`
when `git mv` fails on empty directories; archive discovery is dynamic
(`find docs -maxdepth 2`) instead of 5 hardcoded paths; `--scaffold-dir` path
examples in migration guides corrected to `.scaffold-tmp/docs`; multi-hop
migration guidance added to SKILL.md. Note: `plugins/` → `dist/` sync is done
via `npm run build:dist`, not manual copying.

**Key files:**
`plugins/project-docs/skills/update-project-docs/migrations/scripts/migrate-v2.5-to-v2.6.sh`,
`plugins/project-docs/skills/update-project-docs/SKILL.md`

**Docs:** [Project](docs/projects/migration-script-improvements/proposal.md)
