---
type: memory
title: Migration scripts added to update-project-docs skill
description:
  Migration guides gained shell scripts for their mechanical steps, so an
  upgrade is run rather than transcribed.
tags: [migrations, scripts, update-project-docs]
status: stable
generated: { by: unknown, at: 2026-03-03 }
---

# Migration scripts added to update-project-docs skill

Four shell scripts now automate the mechanical steps in migration guides
(`migrations/scripts/`). All support `--dry-run` and `--scaffold-dir`; the
v2.5→v2.6 script is fully automated with no remaining agent steps. Migration
guides updated with "Run the Script First" sections and `[Agent]` labels.

**Key files:**
`plugins/project-docs/skills/update-project-docs/migrations/scripts/`,
`plugins/project-docs/skills/update-project-docs/migrations/v*.md`

**Docs:**
[Session](../projects/_archive/migration-scripts/sessions/2026-03-03-implement-migration-scripts.md)
