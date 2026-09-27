---
type: item
title: A completing re-run's summary counts only its own plan
description:
  After a stop, the run that completes v2.10-to-v3.0 prints '0 move(s), 0
  document(s) written', counting only its own plan rather than the migration's.
status: draft
lifecycle: triage
id: 01a0e3c5-8b05-72d0-af59-19961bd11b60
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

# A completing re-run's summary counts only its own plan

Found by the implementer of `fix/v3-migration-spellbook-round-2`. When
v2.10-to-v3.0 completes on a re-run after a stop, its last line counts only that
run's plan ("0 move(s), 0 document(s) written"), which reads as if the migration
did nothing. The behaviour predates that branch.

## Definition of done

- [ ] A completing re-run's last line reports the migration's totals from its
      record, with a test that stops, re-runs and checks the line.

## Related Documents

- [v3 migration, Spellbook round 2 — 2026-09-27](./spellbook-feedback-round-2/sessions/2026-09-27-v3-migration-spellbook-round-2.md)
