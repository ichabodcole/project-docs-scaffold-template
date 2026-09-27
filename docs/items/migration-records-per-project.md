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

<!--
OWNERSHIP (of this template file — not of documents created from it): it is
yours to edit. The scaffold records its hash, so a migration updates it only
while you have not touched it. Frontmatter is the contract the lint enforces;
below it is yours. See docs/SCHEMA.md → "Who owns which file".

USAGE: `bun scripts/pdocs/cli.ts new item <slug> --kind <kind>` writes
docs/items/<slug>.md from this file, with a fresh `id` and `lifecycle: triage`.
Pass `--title`, `--description` and `--by`, and what you know as flags:
`--parent feature/<slug>`, `--blocked-by <ref,ref>`, `--from <path or ref>`.
Do not copy this file by hand: the `id` must be a fresh UUID, and the CLI
checks every reference before it writes.

WHO WRITES EACH FIELD. Add an optional field only when it applies. After
creation, change a field with `pdocs set <ref> --<field> <value>`; it refuses a
value the lint would reject.

  title, description, kind   whoever files the item
  id                         `pdocs new item`, once
  status                     OKF's document-trust marker. It keeps this
                             value; no workflow step moves it
  lifecycle                  `triage` when an agent files it. The user decides
                             at triage (the triage-items skill proposes):
                             `backlog`, `ready`, or `dropped`. Shaping sets
                             `ready`; init-branch sets `active`;
                             finalize-branch sets `review` when its review
                             starts and `done` when it lands. An agent
                             never moves an item out of `triage` itself.

  Optional:
  parent: feature/<slug>     whoever files it, or triage
  scope: <name>              whoever files it; one name from `lint.scopes`
  from: <what spawned it>    whoever files it: an item id, `feature/<slug>`,
                             `cycle/<slug>`, or a docs-root-relative path.
                             A review always writes it.
  source: <external id>      intake from outside the tree: an issue number
  priority: urgent | high | medium | low       triage
  assignee: <agent, seat or name>              triage, when it is routed
  blocked_by: [<item id>, ...]                 shaping
  cycle: <cycle file slug, e.g. 2026-09-auth>  init-branch, when one is active
  released_in: <version>     sweep-project, at release. Never checked.

docs/items/README.md has the states, the kinds and the rules.
-->

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
