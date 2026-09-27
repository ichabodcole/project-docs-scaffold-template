---
type: item
title:
  update-project-docs Step 5 rewrites version markers the scripts already set
description:
  Step 5 tells the agent to write the new version into the markers after the
  migration scripts have set them, which could write a later tag that has no
  migration.
status: draft
lifecycle: triage
id: 01a0e459-08c7-773d-861b-b03f770257f4
kind: bug
generated: { by: claude-opus-5-5, at: 2026-09-27 }
tags: [migrations]
scope: migrations
from: items/repin-v3-migration-to-9.0.1/sessions/2026-09-27-repin-to-9.0.1.md
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

# update-project-docs Step 5 rewrites version markers the scripts already set

Found by the review of the 9.0.1 re-pin. `update-project-docs/SKILL.md` Step 5
tells the agent to write "the new version" into the version markers after the
migration scripts have already set them to the scaffold release they installed.
An agent that reads "new version" as the latest scaffold tag could write a
version that no migration has brought the tree to. The behaviour predates the
re-pin.

## Definition of done

- [ ] Step 5 says the scripts set the markers, and tells the agent to check them
      rather than write them.

## Related Documents

- [Re-pin to 9.0.1 and plugin 4.1.0 — 2026-09-27](./repin-v3-migration-to-9.0.1/sessions/2026-09-27-repin-to-9.0.1.md)
