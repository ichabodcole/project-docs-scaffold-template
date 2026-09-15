---
type: memory
title: The owned layer must typecheck under any consumer's strict flags
description:
  Spellbook's tsconfig enabled noUncheckedIndexedAccess and the delivered CLI
  failed under it; the flag now lives upstream so CI gates the class, and the
  guides say what a consumer's tools may and may not touch.
tags: [feedback, typecheck, owned-layer, migration]
status: stable
generated: { by: claude-fable-5-1, at: 2026-09-15 }
---

# The owned layer must typecheck under any consumer's strict flags

Spellbook, the second consumer, ran v2.6 → v2.7 and could not commit green: its
`tsconfig` sets `noUncheckedIndexedAccess`, and `scripts/pdocs/` — Owned,
overwritten on every refresh, so unpatchable locally — raised seven errors under
it. Fixed on `fix/pdocs-typechecks-under-nounchecked-indexed-access` (#176):
eight sites narrowed, the flag adopted in this repo's own `tsconfig`, and the
"exclude the directory from your formatter" advice made a step.

**Key files:** `tsconfig.json`, `scripts/pdocs/docs-lint/index.ts`,
`plugins/project-docs/skills/update-project-docs/migrations/v2.6-to-v2.7.md`

**Docs:** the
[session record](../projects/spellbook-feedback/sessions/2026-09-15-owned-layer-under-a-strict-consumer.md).

## What was non-obvious

- **Owned code is judged by the strictest consumer, not by upstream's config.**
  The repo was green because its own `tsconfig` lacked the flag. The cheap guard
  is to adopt the consumer's flag upstream so CI witnesses the class; that is
  what the branch did, and it was watched failing first.
- **A consumer's `tsc` reaching the layer is not the artefact Step 7 hunts.**
  Step 7's tsconfig check exists for an `include` an older migration wrote. A
  project's own typecheck covering the directory is how this defect was found,
  and it is fine only under a Bun-shaped config: the layer imports `.ts`
  specifiers and assumes `types: ["bun"]`, so a conventional `tsconfig` fails on
  those alone.
- **Advice in a parenthetical is advice not given.** The exclusion sentence was
  in the guide; the consumer's agent excluded the directory on its own and then
  asked for the sentence. Placement is a defect class of its own.
