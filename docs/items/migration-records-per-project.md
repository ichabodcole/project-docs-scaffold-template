---
type: item
title:
  Migration state and move records are shared across projects in one repository
description:
  The v2.10-to-v3.0 state and move records live in the shared .git/ keyed by
  base and docs root only, so two docs projects in one repository (or a --force
  re-run from a reset) mix their records.
status: draft
lifecycle: triage
id: 01a0e3c5-8ab9-729b-b90f-799a801d87bc
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations]
scope: migrations
from: items/spellbook-feedback-round-2/sessions/2026-09-27-v3-migration-spellbook-round-2.md
---

# Migration state and move records are shared across projects in one repository

Found by the correctness re-review of `fix/v3-migration-spellbook-round-2`. The
v2.10-to-v3.0 state record and move record live in the repository's shared
`.git/`. With two docs projects in one repository, the second run picked up the
first's state record as its own (older than that branch). Because the move
record is keyed only by base commit and docs root, both projects' moves also
merged (new with that branch). A `--force` re-run after a reset to the same base
keeps the moves of the tree it replaced. Neither case harmed anything in the
review's runs: suggestions only point at files that exist.

## Definition of done

- [ ] The state and move records are keyed by the project root, and a test runs
      the migration in two projects of one repository without either seeing the
      other's records.

## Related Documents

- [v3 migration, Spellbook round 2 — 2026-09-27](./spellbook-feedback-round-2/sessions/2026-09-27-v3-migration-spellbook-round-2.md)
