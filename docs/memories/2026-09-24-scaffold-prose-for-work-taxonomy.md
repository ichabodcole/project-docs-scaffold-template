---
type: memory
title: The scaffold's prose describes the work taxonomy
description:
  SCHEMA.md, the category READMEs and the templates describe features, items and
  cycles as the pdocs code behaves, STYLE.md is seeded, and playbooks are Goal ·
  Steps · Verification.
tags: [taxonomy, templates, prose]
status: stable
generated: { by: claude-opus-5-5, at: 2026-09-24 }
---

# The scaffold's prose describes the work taxonomy

Phase 3 of the work-taxonomy release rewrote the payload's contract and
guidance: `SCHEMA.md` (layout, state groups, a fields table naming each field's
writer, references, archiving, the amended "Theirs" ownership rule), new
`docs/items/README.md` and `docs/features/README.md`, the ITEM, FEATURE,
WRITE-UP and REPORT templates, a Goal · Steps · Verification playbook template,
and a seeded `docs/STYLE.md` linted as a contract page.

When editing it: describe what `scripts/pdocs/` does, not what the plan said —
an accuracy reviewer checks every documented command and finding against a
generated project. Items created by agents start in `triage`; `init-branch`
starts only `backlog` or `ready` items; an item's `status` is never moved by a
workflow step. Seeded templates must stay byte-identical with the payload.

**Key files:** `docs/SCHEMA.md`, `docs/items/README.md`,
`docs/features/README.md`, `docs/TEMPLATES/`, `docs/STYLE.md`,
`scripts/pdocs/seed.ts`

**Docs:**
[Session record](../projects/work-taxonomy/sessions/2026-09-24-phase-3-templates-prose.md),
[plan](../projects/work-taxonomy/plan.md)
