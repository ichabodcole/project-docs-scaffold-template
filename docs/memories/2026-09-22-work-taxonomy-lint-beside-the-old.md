---
type: memory
title: The work-taxonomy lint lands beside the old types
description:
  pdocs now lints features, items, grouped states, references and deletions
  while the retired types stay lintable, and each old migration runs against the
  scaffold release it was written for.
tags: [taxonomy, lint, migrations]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-22 }
---

# The work-taxonomy lint lands beside the old types

Phase 1 of the work-taxonomy release: the registry, rules and a new
`scripts/pdocs/lint/work.ts` lint `features/` and `items/`, the grouped state
vocabulary (checked against `SCHEMA.md`'s `## State groups` table), references
between entities, and "no silent deletion" of items against `HEAD` or
`pdocs check --against <ref>`. The old types are `retired`: still lintable, so
this repository's own `docs/` passes, but no longer creatable.

Two things to know when touching it: `features/_archive` and `items/_archive`
are read whatever `lint.skip` says, because the deletion check depends on them;
and the old migration suites build their scaffold from the
`project-docs-scaffold-template-v8.1.0` tag, since each migration now runs
against its own era's scaffold (plan D16).

**Key files:** `scripts/pdocs/lint/work.ts`, `scripts/pdocs/lint/registry.ts`,
`scripts/pdocs/lint/rules.ts`, `scripts/pdocs/docs-lint/config.ts`

**Docs:**
[Session record](../projects/work-taxonomy/sessions/2026-09-22-phase-1-schema-lint.md),
[plan](../projects/work-taxonomy/plan.md)
