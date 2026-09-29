---
type: item
title: Pin the migration's lint mirror to the scaffold it installs
description:
  The v3.0 migration's positional-rule and artifact-field tests compare against
  this repository's current lint, not the SCAFFOLD_TAG scaffold the run
  installs, so a future lint change would invite fixing the mirror to a lint the
  migration never uses.
status: draft
lifecycle: triage
id: 01a0eacd-1a1d-70c7-83e6-a5e845d75022
kind: chore
generated: { by: claude-opus-5-5, at: 2026-09-28 }
scope: migrations
from: items/migration-retypes-positional-artifacts/sessions/2026-09-28-positional-retype.md
---

# Pin the migration's lint mirror to the scaffold it installs

`migrate-v2.10-to-v3.0.ts` mirrors the 9.x lint's positional rule (`ownedType`,
the registry tables) and its artifact fields, because it can't import them. The
tests that pin the mirror compare against this repository's current
`scripts/pdocs/lint/`. The run installs and verifies with the scaffold at
`SCAFFOLD_TAG` (9.0.1). The two lints are identical today, but a later lint
change would fail these tests and invite changing the mirror to match a lint the
migration never installs. Migrations are pinned to their era, and their tests
should build from the same tag.

## Definition of done

- [ ] The mirror tests import the registry and rules from the scaffold generated
      at `SCAFFOLD_TAG`, not from the repository's working tree.
